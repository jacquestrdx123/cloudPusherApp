# Android Rich Push Notifications ("Temu style")

The Android equivalent of the iOS rich notification. The good news: Android needs
**far less** native code than iOS, because Firebase Cloud Messaging renders the
big picture for you. There is **no "extension" to build** — the two moving parts
are a **notification channel** (owns the custom sound) and the **FCM payload**
(carries the image).

> Read the iOS guide first for the overall model:
> [ios-rich-push-notifications.md](ios-rich-push-notifications.md).

---

## 1. How rich notifications work on Android

| Feature | How it's delivered | Who provides it |
| --- | --- | --- |
| **Big picture** (large image) | FCM `notification.image` → `BigPictureStyle` automatically when app is backgrounded | Backend payload |
| **Custom sound** | Bound to a **notification channel** (Android 8+); payload selects the channel | App creates the channel; backend sends `channel_id` |
| **Heads-up banner** | Channel importance = HIGH | App (channel) |
| **Action buttons** | Not supported by plain FCM notification messages — needs the optional service in §6 | Optional native service |

The crucial Android-8+ rule: **sound, importance and vibration live on the
channel, not the message.** A push can't "turn up" its own sound; it can only
point at a channel that was created with that sound. Channels are also
**immutable** — you can't change a channel's sound after creation, you must make
a new channel id.

---

## 2. What was added to this repo (client side — already done)

- **`src/services/push.ts`** — `ensureAndroidChannels()` creates the
  `rich_messages_v1` channel (HIGH importance, custom sound, public lock-screen
  visibility) during push registration. Change the sound/importance later by
  bumping the `_vN` suffix in `ANDROID_RICH_CHANNEL_ID` **and** the backend's
  `channel_id`.
- **`android/app/src/main/res/raw/notification.mp3`** — the channel's custom
  sound (reused from the web sound).
- Rich-media rendering in the in-app views is shared with iOS/web via
  `src/services/media.ts`.

Nothing else is required for the **big picture** — FCM draws it automatically
from `notification.image` when the notification arrives in the background.

---

## 3. Backend payload — FCM v1 (this is the important part)

Android device tokens register as `platform: "fcm"`. Send a message with an
`android` block:

```jsonc
{
  "message": {
    "token": "<fcm-token>",
    "notification": {
      "title": "Flash sale — 80% off",
      "body": "Tap to see today's deals"
    },
    "android": {
      "priority": "HIGH",
      "notification": {
        "image": "https://cdn.example.com/promo/flash-sale.jpg",  // big picture
        "channel_id": "rich_messages_v1",                          // custom sound
        "sound": "notification",                                   // res/raw name, no ext
        "notification_priority": "PRIORITY_HIGH",
        "visibility": "PUBLIC"
      }
    },
    "data": {
      "push_notification_id": "12345"   // your existing tracking data (strings only)
    }
  }
}
```

Notes:
- `android.notification.image` is the whole trick for the big picture. Serve it
  over **HTTPS** from a CDN; keep it small (≈ 1 MB) so it downloads before the
  notification is shown. Recommended ratio ~2:1 (e.g. 1024×512).
- `channel_id` **must** match a channel the app has created
  (`rich_messages_v1`), otherwise Android falls back to the default channel and
  your custom sound is ignored.
- Keep everything in `data` as **strings** — FCM rejects non-string data values.
- `google-services.json` must be present in `android/app/` (already required for
  any FCM on this app), and the backend must have `PUSH_FCM_ENABLED=true`.

### Legacy note
If the backend still uses the deprecated FCM legacy HTTP API, the equivalents are
`notification.image`, `android_channel_id`, and `notification.sound`.

---

## 4. Custom sounds

- Put the file in **`android/app/src/main/res/raw/`** (e.g. `notification.mp3`).
- Formats: **`.mp3`, `.ogg`, `.wav`** all work in `res/raw`.
- Reference it by **file name without extension** — both in
  `PushNotifications.createChannel({ sound: 'notification' })` and, for older
  Android paths, in the payload's `sound` field.
- Because channels are immutable, to swap the sound you must create a **new
  channel id**. Bump `ANDROID_RICH_CHANNEL_ID` (e.g. `rich_messages_v2`) and the
  backend's `channel_id` together. The old channel lingers in the user's system
  settings until reinstall — that's normal.
- The user can always override or mute a channel's sound in Android system
  settings; the app cannot force it back.

---

## 5. google-services.json

Rich or not, Android push needs Firebase configured:

1. Download `google-services.json` from the Firebase console for the
   `com.cloudpusher.receiver` app.
2. Place it at `android/app/google-services.json` (the gradle file applies the
   Google Services plugin only when this file exists — see `android/app/build.gradle`).
3. It is **gitignored** by default; distribute it out of band.

---

## 6. (Optional) Action buttons + images on data-only / foreground messages

Plain FCM `notification` messages can't show action buttons, and they only draw
the big picture when the app is **backgrounded**. If you need buttons, or you
want images on **data-only** messages (to match the web pipeline) and in the
**foreground**, add a custom messaging service that extends Capacitor's — so the
JS `pushNotificationReceived` event still fires via `super`.

Create `android/app/src/main/java/com/cloudpusher/receiver/RichMessagingService.java`:

```java
package com.cloudpusher.receiver;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

/**
 * Extends Capacitor's MessagingService so the standard JS push events keep
 * working (we call super). We additionally draw a BigPictureStyle notification
 * when the payload carries an image URL — covering data-only and foreground
 * messages, which the default FCM display path does not.
 */
public class RichMessagingService extends MessagingService {

    private static final String CHANNEL_ID = "rich_messages_v1";

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message); // keep Capacitor's JS event flowing

        Map<String, String> data = message.getData();
        String image = firstNonEmpty(data,
                "media_url", "image_url", "image", "attachment_url", "picture", "fcm_image");

        // Only take over display for data-carrying messages with an image; let
        // FCM handle plain notification messages to avoid duplicates.
        if (image == null || message.getNotification() != null) {
            return;
        }

        String title = data.containsKey("title") ? data.get("title") : "Notification";
        String body = data.containsKey("body") ? data.get("body") : "";

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setAutoCancel(true)
                .setContentIntent(contentIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH);

        Bitmap picture = downloadBitmap(image);
        if (picture != null) {
            builder.setLargeIcon(picture)
                   .setStyle(new NotificationCompat.BigPictureStyle()
                           .bigPicture(picture)
                           .bigLargeIcon((Bitmap) null));
        }

        // Optional action buttons from the payload (label|action pairs).
        if (data.containsKey("action1_label")) {
            builder.addAction(0, data.get("action1_label"), contentIntent);
        }

        int id = (int) System.currentTimeMillis();
        NotificationManagerCompat.from(this).notify(id, builder.build());
    }

    private String firstNonEmpty(Map<String, String> data, String... keys) {
        for (String k : keys) {
            String v = data.get(k);
            if (v != null && v.startsWith("http")) return v;
        }
        return null;
    }

    private Bitmap downloadBitmap(String url) {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setDoInput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.connect();
            InputStream in = conn.getInputStream();
            return BitmapFactory.decodeStream(in);
        } catch (Exception e) {
            return null;
        }
    }
}
```

Then register it in `android/app/src/main/AndroidManifest.xml`, **above** other
services inside `<application>`:

```xml
<service
    android:name=".RichMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

> Trade-off: taking over the service is powerful but must be tested on device —
> a misconfigured service can produce **duplicate** notifications (yours + the
> default). The guard above (`message.getNotification() != null → return`) keeps
> FCM in charge of plain notification messages so only data+image messages are
> handled here. Ship §1–§5 first; only add this if you specifically need buttons
> or data-only images.

---

## 7. Will this survive `npx cap sync` / rebuilds? — Yes

Capacitor treats the whole `android/` folder as **your** project after the
one-time `npx cap add android`. `npx cap sync`, `copy`, `update` and `build`
only ever regenerate the files listed in `android/.gitignore`:

- `build/`, `.gradle/`, copied web assets (`app/src/main/assets/public`), and
  generated config (`capacitor.config.json`, `capacitor.plugins.json`, `config.xml`).

They do **not** touch `AndroidManifest.xml`, your Java/Kotlin sources,
`res/raw/`, or `build.gradle` customisations. The only command that rebuilds the
native project from the template is `npx cap add android`, which you run once.

Everything added here (the channel code is in the shared web bundle; the sound is
in `res/raw`; any custom service is your source) is committed and rebuild-safe.
The same applies to the iOS extension — see the note in the iOS guide.

---

## 8. Testing checklist

1. `google-services.json` in place, then `npm run cap:android`.
2. First launch grants notification permission and creates the
   `rich_messages_v1` channel (check **Settings → Apps → cloudPusher →
   Notifications** — you should see "Alerts & Promotions" with your sound).
3. Send a test FCM message with `android.notification.image` + `channel_id`.
   Background the app → the notification shows the big picture and plays the
   custom sound; expand it to see the full image.
4. **No image?** Confirm the URL is HTTPS/reachable, `priority: HIGH`, and the
   app was in the background (FCM only auto-draws the picture when backgrounded —
   for foreground/data-only, use the optional service in §6).
5. **No custom sound?** Confirm `channel_id` matches and the channel was created
   *before* the push (reinstall if you changed the sound without bumping `_vN`).
