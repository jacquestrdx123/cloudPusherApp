# iOS Rich Push Notifications ("Temu style")

This document explains how cloudPusher renders **rich** push notifications on
iOS — big images/GIFs, custom sounds, and action buttons — and exactly what the
**Laravel backend must send** to trigger them.

If you only read one thing: on iOS a notification cannot show an image unless
(a) the push payload contains `"mutable-content": 1`, (b) the app ships a
**Notification Service Extension**, and (c) the media URL is served over
**HTTPS**. All three are now in place on the client — the remaining work is the
payload the backend sends.

---

## 1. How the "fancy" notifications actually work

There is no single magic flag. Temu-style notifications are the combination of
four iOS features:

| Feature | What the user sees | Who provides it |
| --- | --- | --- |
| **Media attachment** | Large image/GIF/video in the banner, expandable on long-press | Notification Service Extension downloads a URL from the payload |
| **Custom sound** | Branded chime instead of the default "ding" | Sound file bundled in the app + `sound` in payload |
| **Action buttons** | "View", "Buy now", "Dismiss" under the notification | `category` in payload → category registered in the app |
| **Relevance / ranking** | Notification floats to the top of the stack | `relevance-score` in payload (iOS 15+) |

The key component is the **Notification Service Extension (NSE)** — a tiny
separate binary that ships inside the app. When a push with `mutable-content: 1`
arrives, iOS wakes the NSE *before* showing the notification and gives it ~30
seconds to mutate the content. Our NSE uses that window to download the image
and attach it. (See `ios/App/NotificationService/`.)

```
APNs push (mutable-content: 1, media_url: https://…/promo.jpg)
        │
        ▼
NotificationService.swift  ──►  downloads promo.jpg  ──►  UNNotificationAttachment
        │
        ▼
iOS shows the notification with the image
```

---

## 2. What was added to this repo (client side — already done)

- **`ios/App/NotificationService/NotificationService.swift`** — the extension
  entry point. Applies sound/category/relevance overrides and kicks off the
  media download.
- **`ios/App/NotificationService/MediaDownloader.swift`** — resolves the media
  URL from the payload, downloads it, and builds the attachment with the correct
  file extension (the #1 cause of silently-dropped attachments).
- **`ios/App/NotificationService/Info.plist`** — registers the extension as a
  `com.apple.usernotifications.service` extension point.
- **`ios/App/App.xcodeproj/project.pbxproj`** — the `NotificationService` target,
  its build phases/configs, and the "Embed Foundation Extensions" step on the
  main app target.
- **`ios/App/App/AppDelegate.swift`** — registers a `RICH_MESSAGE` notification
  category (View / Dismiss actions).
- **Web / in-app parity** — `src/services/media.ts` extracts the image URL; the
  web service workers (`src/sw.ts`, `public/firebase-messaging-sw.js`) and the
  in-app detail view (`src/views/NotificationDetailPage.vue`) all render it.

### One-time Xcode / Apple setup still required

The target is already in the Xcode project, but a human with the Apple developer
account must do the signing/capability bits once:

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select the **NotificationService** target → **Signing & Capabilities** →
   choose your Team. Confirm the bundle id is
   `com.cloudpusher.receiver.NotificationService` (it must be a child of the app
   id `com.cloudpusher.receiver`).
3. Make sure the **App** target has the **Push Notifications** capability
   (already required for basic push) and **Background Modes → Remote
   notifications** enabled.
4. Build & run. To confirm the extension is embedded: the built `App.app` should
   contain `PlugIns/NotificationService.appex`.

> If Xcode ever reports the project is corrupt after a `npx cap sync`, delete the
> `NotificationService` target and re-add it via **File → New → Target →
> Notification Service Extension**, then drop our three source files back in. The
> Swift files are the real work and are independent of the project wiring.

**Custom sound files** must be added to the **App** target (not the extension):
drag e.g. `chime.caf` into the App target in Xcode so it lands in the app
bundle. See §5.

### Will this survive `npx cap sync` / rebuilds? — Yes

Capacitor treats the whole `ios/` folder as **your** project after the one-time
`npx cap add ios`. `npx cap sync`, `copy`, `update` and `build` only regenerate
the files listed in `ios/.gitignore`: `App/build`, `App/Pods`, `App/output`, the
copied web assets in `App/App/public`, `DerivedData`, and the generated
`capacitor.config.json` / `config.xml`.

They do **not** rewrite `project.pbxproj`, `AppDelegate.swift`, or the
`NotificationService/` sources — all of which are committed to git. There is no
`cap build` step that regenerates the Xcode project. The only command that
recreates the project from the template is `npx cap add ios`, which you run once;
if you ever re-run it you would re-add the extension (see the fallback note
below). Because everything is under version control, any change Capacitor *did*
make would show up as a reviewable git diff.

---

## 3. Backend payload — raw APNs (this is the important part)

iOS devices in this app register a **native APNs token** (`platform: "apns"` in
`POST /api/v1/{company}/device-tokens`), so the backend talks to APNs directly
over HTTP/2. The JSON body must look like this:

```jsonc
{
  "aps": {
    "alert": {
      "title": "Flash sale — 80% off",
      "subtitle": "Ends in 2 hours",       // optional
      "body": "Tap to see today's deals"
    },
    "mutable-content": 1,                   // REQUIRED for the image to work
    "sound": "chime.caf",                   // custom sound, or "default"
    "category": "RICH_MESSAGE",             // enables View / Dismiss buttons
    "badge": 3,                             // optional app-icon badge
    "relevance-score": 1.0,                 // optional, iOS 15+ ranking (0.0–1.0)
    "interruption-level": "active"          // optional: passive|active|time-sensitive
  },

  // --- Custom data (any keys outside `aps`). The NSE reads these: ---
  "media_url": "https://cdn.example.com/promo/flash-sale.jpg",
  "media_type": "image",                    // only needed if the URL has no extension
  "push_notification_id": 12345            // your existing tracking id
}
```

### Required headers on the APNs HTTP/2 request

| Header | Value |
| --- | --- |
| `apns-push-type` | `alert` (must NOT be `background`) |
| `apns-priority` | `10` |
| `apns-topic` | `com.cloudpusher.receiver` |

> **Critical:** `mutable-content: 1` is what wakes the extension. Without it the
> notification still shows, but with **no image**. Likewise the push type must be
> `alert` — a `background` push never wakes the NSE for display.

### The media URL keys the NSE understands

The backend may use whichever key is convenient; the extension checks them in
this order and takes the first HTTPS URL it finds (kept in sync with
`src/services/media.ts`):

```
media_url, image_url, image, attachment_url, attachment-url,
media-url, picture, fcm_image
```

It also understands FCM's nested shape `fcm_options.image`.

---

## 4. Backend payload — if you send iOS via Firebase (FCM → APNs)

If the backend routes iOS through Firebase instead of talking to APNs directly,
put the same values inside the `apns` override block so FCM forwards them
verbatim:

```jsonc
{
  "message": {
    "token": "<apns-or-fcm-token>",
    "apns": {
      "headers": {
        "apns-priority": "10",
        "apns-push-type": "alert"
      },
      "payload": {
        "aps": {
          "alert": { "title": "Flash sale", "body": "80% off today" },
          "mutable-content": 1,
          "sound": "chime.caf",
          "category": "RICH_MESSAGE"
        },
        "media_url": "https://cdn.example.com/promo/flash-sale.jpg"
      }
    },
    "android": {
      "notification": { "image": "https://cdn.example.com/promo/flash-sale.jpg" }
    }
  }
}
```

`fcm_options.image` also works and is the simplest option if you already send
through FCM — the NSE picks it up automatically.

---

## 5. Custom sounds

- The sound **file must be bundled inside the app** (added to the **App**
  target). APNs cannot stream a sound; the payload only references it **by
  filename**.
- Allowed formats: **`.caf`, `.aiff`, `.wav`** — Linear PCM, MA4, µ-law or
  a-law. `.mp3`/`.m4a` are **not** reliable for notification sounds.
- Max length **30 seconds**; longer sounds fall back to the default.
- Reference it exactly by filename in the payload: `"sound": "chime.caf"`.
- Use `"sound": "default"` for the system sound.

Convert a source file with:

```bash
afconvert chime.mp3 chime.caf -d ima4 -f caff -v
```

Then drag `chime.caf` into the **App** target in Xcode (Copy items if needed,
target = App).

> For a *critical* alert sound (rings even on silent/DND) you need the special
> **Critical Alerts** entitlement from Apple and
> `"sound": { "critical": 1, "name": "chime.caf", "volume": 1.0 }`. This requires
> Apple's approval and is usually not needed for marketing pushes.

---

## 6. Action buttons (categories)

Buttons are defined **in the app**, not the payload — the payload only selects a
category by id. `RICH_MESSAGE` (View / Dismiss) is registered in
`AppDelegate.swift`. To use it, send `"category": "RICH_MESSAGE"`.

To add a new set of buttons (e.g. "Buy now" / "Save for later"):

1. Add a new `UNNotificationCategory` in
   `AppDelegate.registerNotificationCategories()` with a unique identifier.
2. Send that identifier as `aps.category` from the backend.

Tapping a foreground action is delivered to the app via Capacitor's
`pushNotificationActionPerformed` listener (already wired in
`src/services/push.ts`); the action id is available on the event so the app can
route accordingly.

---

## 7. Media hosting requirements & limits

- **HTTPS only.** The NSE rejects `http://` URLs. Use a valid certificate (no
  self-signed certs — the extension has no way to bypass ATS easily).
- The download must finish within the extension's **~30 second** budget, so keep
  assets small and served from a CDN. Practical guidance: images **≤ 1–2 MB**.
- Apple's hard attachment size limits (enforced when the attachment is created):
  **image 10 MB, audio 5 MB, video 50 MB**.
- Supported types: JPEG, PNG, GIF, WebP*, MP3/AIFF/WAV audio, MP4/MOV video.
  (*WebP renders on modern iOS; prefer JPEG/PNG/GIF for the widest support.)
- If a URL has **no file extension** (signed CDN links, `?sig=…`), send a
  `media_type` hint (`"image"`, `"png"`, `"gif"`, `"video"`, `"audio"`, or a full
  MIME type like `"image/webp"`) so the NSE saves it with the right extension.
- To hide the small thumbnail in the collapsed banner (show it only when
  expanded), send `"media_thumbnail_hidden": true`.

---

## 8. Full payload key reference

| Key | Location | Purpose |
| --- | --- | --- |
| `aps.mutable-content` | `aps` | **Required = 1** to wake the NSE / show media |
| `aps.alert.title` / `.subtitle` / `.body` | `aps` | Text content |
| `aps.sound` | `aps` | `"default"` or a bundled filename e.g. `"chime.caf"` |
| `aps.category` | `aps` | Category id for action buttons (`"RICH_MESSAGE"`) |
| `aps.badge` | `aps` | App icon badge number |
| `aps.relevance-score` | `aps` | 0.0–1.0 ranking within a stack (iOS 15+) |
| `aps.interruption-level` | `aps` | `passive` / `active` / `time-sensitive` |
| `media_url` (or aliases) | custom data | HTTPS URL of the image/GIF/video/audio |
| `media_type` | custom data | Type hint for extensionless URLs |
| `media_thumbnail_hidden` | custom data | Hide the collapsed-banner thumbnail |
| `sound_name` | custom data | Alternative to `aps.sound` (NSE applies it) |
| `relevance_score` | custom data | Alternative to `aps.relevance-score` |
| `push_notification_id` | custom data | Existing tracking id (unchanged) |

---

## 9. Testing checklist

1. Build & install on a **real device** (the simulator does not receive real
   pushes, though Xcode can drag a `.apns` file onto the simulator to test the
   NSE — see below).
2. Send a test push with `mutable-content: 1` and a valid `media_url`. The
   banner should show the image; long-press to expand it full size.
3. **No image?** Check, in order:
   - `mutable-content: 1` present and `apns-push-type: alert`?
   - Media URL is HTTPS and publicly reachable?
   - NSE embedded (`App.app/PlugIns/NotificationService.appex` exists)?
   - URL has an extension or a `media_type` hint?
4. **Simulator NSE test:** create `test.apns` containing the payload and add
   `"Simulator Target Bundle": "com.cloudpusher.receiver"`, then drag it onto the
   running simulator. Attachments download over the Mac's network.
5. Watch the extension logs in Console.app (filter by `NotificationService`).

---

## 10. Why not a Notification Content Extension too?

A **Notification Content Extension** gives a *fully custom* UI (carousels,
buttons inside the notification, live counters) when the user long-presses.
Temu uses the Service Extension (image) for the vast majority of notifications;
the fully-custom content view is only needed for interactive layouts. It can be
added later as a second target following the same pattern — start with the
Service Extension shipped here, which covers images, GIFs, custom sounds and
action buttons.
