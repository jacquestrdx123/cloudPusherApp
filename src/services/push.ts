import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications'
import {
  PushNotifications,
  type PushNotificationSchema,
  type Token,
} from '@capacitor/push-notifications'
import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging'
import { config, isFirebaseConfigured } from '@/config/env'
import { registerDeviceToken } from '@/services/api'
import { playNotificationSound } from '@/services/sound'
import { pushError, pushLog, pushWarn } from '@/services/log'
import type { AppSettings } from '@/types/notification'

export type PushPayload = {
  title: string
  body: string | null
  data: Record<string, unknown>
}

type PushHandler = (payload: PushPayload) => void | Promise<void>

let firebaseApp: FirebaseApp | null = null
let messaging: Messaging | null = null
let initialized = false
let initializing: Promise<string> | null = null
let currentToken: string | null = null
let messageHandlerBound = false
let pushReceivedHandler: PushHandler | null = null
let pushOpenedHandler: PushHandler | null = null

function setPushHandlers(onReceived: PushHandler, onOpened?: PushHandler): void {
  pushReceivedHandler = onReceived

  if (onOpened !== undefined) {
    pushOpenedHandler = onOpened
  }
}

async function dispatchReceived(payload: PushPayload): Promise<void> {
  await pushReceivedHandler?.(payload)
}

async function dispatchOpened(payload: PushPayload): Promise<void> {
  await pushOpenedHandler?.(payload)
}

function parsePushData(
  data: Record<string, string> | undefined,
): Record<string, unknown> {
  if (!data) {
    return {}
  }

  const parsed: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    try {
      parsed[key] = JSON.parse(value)
    } catch {
      parsed[key] = value
    }
  }

  return parsed
}

function payloadFromNative(notification: PushNotificationSchema): PushPayload {
  const data = parsePushData(notification.data as Record<string, string> | undefined)

  return {
    title: notification.title ?? (data.title as string) ?? 'Notification',
    body: notification.body ?? (data.body as string) ?? null,
    data,
  }
}

async function ensureLocalNotificationPermissions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return
  }

  const status = await LocalNotifications.checkPermissions()

  if (status.display !== 'granted') {
    await LocalNotifications.requestPermissions()
  }
}

async function showForegroundNotification(payload: PushPayload): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await ensureLocalNotificationPermissions()

    const notification: LocalNotificationSchema = {
      id: Math.floor(Math.random() * 1_000_000),
      title: payload.title,
      body: payload.body ?? '',
      sound: 'default',
      extra: payload.data,
    }

    await LocalNotifications.schedule({ notifications: [notification] })

    return
  }

  // Web: prefer the service worker registration to show the notification. The
  // `new Notification()` constructor throws an "Illegal constructor" error on
  // Android Chrome / installed PWAs, so it only works on desktop.
  if (!('Notification' in window)) {
    pushWarn('Notification API is unavailable in this browser')

    return
  }

  if (Notification.permission !== 'granted') {
    pushWarn('cannot show notification, permission is', Notification.permission)

    return
  }

  const options: NotificationOptions = {
    body: payload.body ?? undefined,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: String(payload.data.push_notification_id ?? Date.now()),
    data: payload.data,
  }

  try {
    const registration = await navigator.serviceWorker?.getRegistration()

    if (registration) {
      await registration.showNotification(payload.title, options)
      pushLog('foreground notification shown via service worker')
    } else {
      new Notification(payload.title, options)
      pushLog('foreground notification shown via Notification constructor')
    }
  } catch (error) {
    pushError('failed to show foreground notification', error)
  }
}

async function resolveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.')
  }

  const existing = await navigator.serviceWorker.getRegistration()

  if (existing) {
    return navigator.serviceWorker.ready
  }

  // Fallback when VitePWA has not registered yet (or for non-PWA hosts).
  await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/',
  })

  return navigator.serviceWorker.ready
}

async function registerNativePush(settings: AppSettings): Promise<string> {
  let permStatus = await PushNotifications.checkPermissions()

  if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
    permStatus = await PushNotifications.requestPermissions()
  }

  if (permStatus.receive !== 'granted') {
    throw new Error('Push notification permission was denied.')
  }

  const tokenPromise = new Promise<string>((resolve, reject) => {
    void PushNotifications.addListener('registration', async (token: Token) => {
      try {
        currentToken = token.value
        const platform = Capacitor.getPlatform() === 'ios' ? 'apns' : 'fcm'
        const device = await Device.getInfo()

        await registerDeviceToken(settings, {
          platform,
          token: token.value,
          name: settings.deviceName || device.name || device.model,
        })

        resolve(token.value)
      } catch (error) {
        reject(error)
      }
    })

    void PushNotifications.addListener('registrationError', (error) => {
      reject(new Error(error.error || 'Push registration failed'))
    })
  })

  await PushNotifications.addListener(
    'pushNotificationReceived',
    async (notification: PushNotificationSchema) => {
      const payload = payloadFromNative(notification)

      await playNotificationSound(settings.soundEnabled)
      await showForegroundNotification(payload)
      await dispatchReceived(payload)
    },
  )

  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    async (action) => {
      const payload = payloadFromNative(action.notification)

      await dispatchReceived(payload)
      await dispatchOpened(payload)
    },
  )

  await PushNotifications.register()

  return tokenPromise
}

async function registerWebPush(settings: AppSettings): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase web push is not configured. Add vapidKey to firebase.json or VITE_FIREBASE_VAPID_KEY.',
    )
  }

  pushLog('registering web push...')

  const supported = await isSupported()
  pushLog('firebase messaging supported:', supported)

  if (!supported) {
    throw new Error('This browser does not support Firebase messaging.')
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(config.firebase)
    messaging = getMessaging(firebaseApp)
  }

  if (!messaging) {
    throw new Error('Firebase messaging could not be initialized.')
  }

  const permission = await Notification.requestPermission()
  pushLog('notification permission:', permission)

  if (permission !== 'granted') {
    throw new Error('Notification permission was denied.')
  }

  const registration = await resolveServiceWorkerRegistration()
  pushLog('service worker registration resolved, scope:', registration.scope)

  const token = await getToken(messaging, {
    vapidKey: config.firebase.vapidKey,
    serviceWorkerRegistration: registration,
  })

  if (!token) {
    throw new Error('Firebase did not return a device token.')
  }

  pushLog('FCM web token acquired:', `${token.slice(0, 12)}…`)
  currentToken = token

  await registerDeviceToken(settings, {
    platform: 'fcm',
    token,
    name: settings.deviceName || 'Web browser',
  })

  if (!messageHandlerBound) {
    messageHandlerBound = true
    onMessage(messaging, async (message) => {
      pushLog('foreground message received', message)

      // Data-only web messages: title/body come from `data`, not `notification`.
      const rawData = (message.data ?? {}) as Record<string, string>

      const payload: PushPayload = {
        title: rawData.title ?? message.notification?.title ?? 'Notification',
        body: rawData.body ?? message.notification?.body ?? null,
        data: parsePushData(rawData),
      }

      await playNotificationSound(settings.soundEnabled)
      await showForegroundNotification(payload)
      await dispatchReceived(payload)
    })
    pushLog('foreground onMessage handler bound')
  }

  return token
}

export async function initializePushNotifications(
  settings: AppSettings,
  onReceived: PushHandler,
  options: { force?: boolean; onOpened?: PushHandler } = {},
): Promise<string> {
  setPushHandlers(onReceived, options.onOpened)

  if (initialized && !options.force && currentToken) {
    return currentToken
  }

  if (initializing && !options.force) {
    return initializing
  }

  initializing = (async () => {
    try {
      if (Capacitor.isNativePlatform() && options.force) {
        await PushNotifications.removeAllListeners()
      }

      const token = Capacitor.isNativePlatform()
        ? await registerNativePush(settings)
        : await registerWebPush(settings)

      initialized = true

      return token
    } catch (error) {
      initialized = false
      currentToken = null
      throw error
    } finally {
      initializing = null
    }
  })()

  return initializing
}

export function getCurrentPushToken(): string | null {
  return currentToken
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const status = await PushNotifications.requestPermissions()

    return status.receive === 'granted'
  }

  if (!('Notification' in window)) {
    return false
  }

  return (await Notification.requestPermission()) === 'granted'
}
