/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { initializeApp } from 'firebase/app'
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw'
import firebaseJson from '../firebase.json'
import { extractMediaUrl } from './services/media'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>
}

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
void self.skipWaiting()
clientsClaim()

const firebaseApp = initializeApp({
  apiKey: firebaseJson.apiKey,
  authDomain: firebaseJson.authDomain,
  projectId: firebaseJson.projectId,
  storageBucket: firebaseJson.storageBucket,
  messagingSenderId: firebaseJson.messagingSenderId,
  appId: firebaseJson.appId,
  measurementId: firebaseJson.measurementId,
})

const messaging = getMessaging(firebaseApp)

console.info('[push-sw] service worker loaded, FCM background handler registered')

onBackgroundMessage(messaging, (payload) => {
  console.info('[push-sw] background message received', payload)

  // The backend sends data-only messages for web so the browser doesn't
  // auto-display a duplicate; title/body live in `data` (notification block is
  // native-Android only).
  const data = payload.data ?? {}
  const title = data.title ?? payload.notification?.title ?? 'Notification'
  const body = data.body ?? payload.notification?.body ?? ''
  const image = extractMediaUrl(data)

  self.registration
    .showNotification(title, {
      body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      ...(image ? { image } : {}),
      tag: payload.data?.push_notification_id ?? String(Date.now()),
      data: payload.data,
      silent: false,
    } as NotificationOptions)
    .then(() => console.info('[push-sw] background notification shown:', title))
    .catch((error) => console.error('[push-sw] failed to show notification', error))
})

function notificationDeepLink(data: Record<string, unknown> | undefined): string {
  const pushId = data?.push_notification_id

  if (pushId === undefined || pushId === null || pushId === '') {
    return '/tabs/inbox'
  }

  return `/tabs/inbox?push_notification_id=${encodeURIComponent(String(pushId))}`
}

async function openOrFocusDeepLink(url: string): Promise<void> {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })

  for (const client of clients) {
    if (!('focus' in client)) {
      continue
    }

    await client.focus()

    if ('navigate' in client && typeof client.navigate === 'function') {
      await client.navigate(url)

      return
    }

    client.postMessage({
      type: 'NOTIFICATION_CLICK',
      url,
    })

    return
  }

  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  console.info('[push-sw] notification clicked', event.notification?.tag)
  event.notification.close()

  const data = (event.notification.data ?? {}) as Record<string, unknown>
  const url = notificationDeepLink(data)

  event.waitUntil(openOrFocusDeepLink(url))
})
