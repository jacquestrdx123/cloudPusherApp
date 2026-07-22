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
  // Backend sends data-only messages for web; title/body live in `data`.
  const data = payload.data ?? {}
  const title = data.title ?? payload.notification?.title ?? 'Notification'
  const body = data.body ?? payload.notification?.body ?? ''

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: payload.data?.push_notification_id ?? String(Date.now()),
    data: payload.data,
    silent: false,
  })
})

function notificationDeepLink(data) {
  const pushId = data && data.push_notification_id

  if (pushId === undefined || pushId === null || pushId === '') {
    return '/tabs/inbox'
  }

  return '/tabs/inbox?push_notification_id=' + encodeURIComponent(String(pushId))
}

async function openOrFocusDeepLink(url) {
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

    client.postMessage({ type: 'NOTIFICATION_CLICK', url: url })
    return
  }

  await self.clients.openWindow(url)
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  event.waitUntil(openOrFocusDeepLink(notificationDeepLink(data)))
})
