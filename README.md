# cloudPusher Receiver (Ionic Vue)

Cross-platform push notification receiver for the cloudPusher Laravel backend. Runs as:

- **iOS** native app (Capacitor + APNs)
- **Android** native app (Capacitor + FCM)
- **PWA** in the browser (Firebase Cloud Messaging + service worker)

## Features

- Push notification registration with the cloudPusher API
- Inbox UI with unread badges and pull-to-refresh
- **Sound on receive** (foreground app audio + native system sound)
- Haptic feedback on native platforms
- Offline cache of recent notifications
- Sync inbox from server on launch

## Setup

```bash
cd cloudPusher-app
cp .env.example .env
npm install
npm run dev
```

**Register** with company slug + name + email + mobile + password. A company admin must approve you (Filament **Registrations**, or the app **Approvals** tab).

**Sign in** with mobile number + password. The API host is hardcoded to `https://cloudpusher-backend.on-forge.com`. In `npm run dev`, API calls are proxied to avoid CORS. After login the app stores your company from the authenticated user. Device preferences live under **Settings**.

## Environment variables

Firebase defaults live in `firebase.json` (including the public VAPID key). Optional overrides:

```env
VITE_FIREBASE_VAPID_KEY=
```

## Native builds

```bash
npm run cap:ios       # build web + sync + open Xcode
# or
npm run build && npx cap sync ios && npx cap open ios
```

### iOS requirements

1. In Xcode: select your **Team** under Signing & Capabilities (bundle id `com.cloudpusher.receiver`)
2. Confirm **Push Notifications** capability is on (entitlements ship with the project)
3. Run on a **physical iPhone** — APNs does not work on the Simulator
4. Backend: `PUSH_APNS_ENABLED=true` plus APNs key/cert config (`APN_*` in Laravel `.env`)
5. After login, Inbox should register an `apns` device token

### Android requirements

1. `google-services.json` is in `android/app/` (package `africa.ncloud.pusher` must match `applicationId`)
2. JDK **21** required (set via `android/gradle.properties` → `org.gradle.java.home`)
3. Backend: `PUSH_FCM_ENABLED=true` plus Firebase credentials
4. Tokens register as platform `fcm`

```bash
# Build debug APK
cd android && ./gradlew assembleDebug

# Run on a connected phone / running emulator
npm run cap:run:android
npx cap run android --list
npx cap run android --target <device-id>

# Or install the already-built APK
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Android Studio is optional — not required if you use `cap run` / `adb`.

## PWA install

```bash
npm run build
npm run preview
```

Install from the browser menu. Background notifications require Firebase configuration and a valid VAPID key.

## Sound

- Foreground: plays `/public/sounds/notification.mp3` when a push arrives
- Background (native): system notification sound via APNs/FCM `sound` payload from backend
- Toggle in Settings → "Play sound on receive"

## API endpoints used

- `POST /api/v1/{company}/device-tokens` — register push token
- `GET /api/v1/{company}/inbox?user[email]=...` — sync stored notifications (`delivered_at`, `read_at`)
- `PATCH /api/v1/{company}/inbox/{id}/read` — mark one notification read
- `PATCH /api/v1/{company}/inbox/read-all` — mark all read
