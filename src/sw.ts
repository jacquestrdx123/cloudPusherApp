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

self.addEventListener('notificationclick', (event) => {
  console.info('[push-sw] notification clicked', event.notification?.tag)
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
