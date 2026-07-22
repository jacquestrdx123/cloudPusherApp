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

// Keep in sync with src/services/media.ts (MEDIA_URL_KEYS).
const MEDIA_URL_KEYS = [
  'media_url',
  'image_url',
  'image',
  'attachment_url',
  'attachment-url',
  'media-url',
  'picture',
  'fcm_image',
]

function extractMediaUrl(data) {
  if (!data) {
    return null
  }

  for (const key of MEDIA_URL_KEYS) {
    const value = data[key]

    if (typeof value === 'string' && /^https?:\/\//i.test(value.trim())) {
      return value.trim()
    }
  }

  const image = data.fcm_options && data.fcm_options.image

  if (typeof image === 'string' && /^https?:\/\//i.test(image.trim())) {
    return image.trim()
  }

  return null
}

messaging.onBackgroundMessage((payload) => {
  // Backend sends data-only messages for web; title/body live in `data`.
  const data = payload.data ?? {}
  const title = data.title ?? payload.notification?.title ?? 'Notification'
  const body = data.body ?? payload.notification?.body ?? ''
  const image = extractMediaUrl(data)

  const options = {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: payload.data?.push_notification_id ?? String(Date.now()),
    data: payload.data,
    silent: false,
  }

  if (image) {
    options.image = image
  }

  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow('/'))
})
