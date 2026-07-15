/* global firebase */
/**
 * Fallback FCM service worker used only when the VitePWA worker is not registered.
 * Production/dev normally use src/sw.ts (injectManifest) which includes FCM + Workbox.
 */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js')
importScripts('/firebase-config.js')

firebase.initializeApp(self.FIREBASE_CONFIG)

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Notification'
  const body = payload.notification?.body ?? ''

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: payload.data?.push_notification_id ?? String(Date.now()),
    data: payload.data,
    silent: false,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
