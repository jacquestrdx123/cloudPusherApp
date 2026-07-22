import { Capacitor } from '@capacitor/core'
import firebaseJson from '../../firebase.json'

/** Default API host for native builds, PWA, and production. */
export const API_ORIGIN = 'https://cloudpusher-backend.on-forge.com'

type FirebaseJson = typeof firebaseJson & { vapidKey?: string }

const firebaseDefaults = firebaseJson as FirebaseJson

function resolveApiBaseUrl(): string {
  const override = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

  if (override) {
    return override
  }

  // Native (iOS/Android) always talks to Forge — including live-reload / DEV builds.
  if (Capacitor.isNativePlatform()) {
    return API_ORIGIN
  }

  // Browser `npm run dev`: same-origin `/api` via the Vite proxy (avoids CORS).
  if (import.meta.env.DEV) {
    return ''
  }

  return API_ORIGIN
}

export const config = {
  apiBaseUrl: resolveApiBaseUrl(),
  /** Public contact / access-request page (closed-circuit signup). */
  contactUrl: `${API_ORIGIN}/register`,
  /** Public privacy policy for App Store / in-app disclosure. */
  privacyUrl: `${API_ORIGIN}/privacy`,
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseDefaults.apiKey || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseDefaults.authDomain || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseDefaults.projectId || '',
    storageBucket:
      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseDefaults.storageBucket || '',
    messagingSenderId:
      import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseDefaults.messagingSenderId || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseDefaults.appId || '',
    measurementId:
      import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseDefaults.measurementId || '',
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || firebaseDefaults.vapidKey || '',
  },
  soundPath: '/sounds/notification.mp3',
  appName: 'cloudPusher',
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    config.firebase.apiKey &&
      config.firebase.projectId &&
      config.firebase.messagingSenderId &&
      config.firebase.appId &&
      config.firebase.vapidKey,
  )
}
