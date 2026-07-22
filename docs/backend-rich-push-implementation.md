# Backend Implementation Spec — Rich Push Notifications

Target: the **cloudPusher Laravel backend** (`push-service`). This is the
server-side companion to the client work in this repo. Read alongside:

- [ios-rich-push-notifications.md](ios-rich-push-notifications.md) — APNs payload reference
- [android-rich-push-notifications.md](android-rich-push-notifications.md) — FCM payload reference

The client is **done**: iOS ships a Notification Service Extension, Android
creates a custom-sound channel, and web/in-app render images. None of it shows a
picture until the backend puts the media into the push payload. This spec is
everything the backend must change to make that happen.

---

## 1. Architecture: two send paths, three targets

The app registers tokens on `POST /api/v1/{company}/device-tokens` with a
`platform` field:

| Client | Registered `platform` | Delivery | Payload style |
| --- | --- | --- | --- |
| iOS | `apns` | **APNs** (HTTP/2, direct) | `aps` + `mutable-content: 1` + custom `media_url` |
| Android | `fcm` | **FCM** | `android.notification.image` + `channel_id` |
| Web (PWA) | `fcm` | **FCM** | **data-only** (title/body/image in `data`) |

> **The core complication:** Android and Web both register as `platform: fcm`
> but need *different* FCM payloads. Android wants a `notification` block (FCM
> auto-draws the big picture); Web must stay **data-only** (the service worker
> renders it — a `notification` block double-shows). §3 solves this.

---

## 2. Data model & API changes

### 2.1 Persist the media on the push

Add nullable columns to the notifications/pushes table (names illustrative):

```php
// database/migrations/xxxx_add_rich_media_to_push_notifications.php
Schema::table('push_notifications', function (Blueprint $table) {
    $table->string('image_url')->nullable()->after('body');
    $table->string('sound')->nullable()->after('image_url');     // 'chime.caf' | 'default'
    $table->string('category')->nullable()->after('sound');       // e.g. 'RICH_MESSAGE'
    $table->string('android_channel_id')->nullable()->after('category');
});
```

Add them to the model's `$fillable`.

### 2.2 Accept them on the send endpoint

In the FormRequest that creates/sends a push:

```php
public function rules(): array
{
    return [
        // ...existing title/body/audience rules...
        'image_url'  => ['nullable', 'url', 'starts_with:https://', 'max:2048'],
        'sound'      => ['nullable', 'string', 'max:64'],
        'category'   => ['nullable', 'string', 'max:64'],
    ];
}
```

`https://` is mandatory — the iOS extension rejects `http://`, and Android FCM
requires a reachable HTTPS asset.

### 2.3 Defaults

Pick sensible fallbacks in one place so callers can omit them:

```php
$sound    = $push->sound   ?? 'default';
$category = $push->category ?? 'RICH_MESSAGE';
$channel  = $push->android_channel_id ?? 'rich_messages_v1'; // must match the app's channel
```

---

## 3. Distinguishing Web FCM tokens from Android FCM tokens

Both arrive as `platform: fcm`, so the sender needs a reliable discriminator.
**Recommended:** record a device type at registration time.

The client sends a `name` and platform today. Two options, in order of
preference:

1. **Add an explicit sub-platform (best).** Extend the client registration to
   send `platform: 'fcm_web'` for the PWA and `platform: 'fcm_android'` for
   native Android, and store it. Requires a one-line change in the app's
   `push.ts` (`registerWebPush` vs `registerNativePush`) plus accepting the new
   values on the endpoint. Cleanest and unambiguous.
2. **Infer from stored metadata (no client change).** The web path registers
   with `name: 'Web browser'` (see `registerWebPush`), native uses the device
   name. You can flag `is_web = (name === 'Web browser')` at store time, or add a
   `user_agent` column. Less robust but ships without touching the app.

Everything below assumes a boolean/enum you can branch on:
`$token->isWeb()` vs Android.

> If you cannot distinguish them yet, the **safe** interim default is to send
> **data-only** to *all* FCM tokens (keeps web correct) and rely on the app's
> optional Android `RichMessagingService` (see the Android doc §6) to draw the
> image. But the clean fix is the sub-platform above.

---

## 4. iOS — APNs payload

iOS tokens are native APNs tokens, so send via your APNs path (e.g.
`laravel-notification-channels/apn`, which wraps `pushok`).

### 4.1 Using the `apn` notification channel

```php
use NotificationChannels\Apn\ApnMessage;

public function toApn($notifiable): ApnMessage
{
    return ApnMessage::create()
        ->title($this->push->title)
        ->body($this->push->body)
        ->sound($this->sound)                 // 'chime.caf' or 'default'
        ->category($this->category)           // enables action buttons
        ->mutableContent()                    // => aps.mutable-content = 1  (REQUIRED)
        ->badge($this->push->badge ?? 1)
        ->custom('media_url', $this->push->image_url)   // the extension downloads this
        ->custom('push_notification_id', (string) $this->push->id);
}
```

### 4.2 Raw pushok (if you build payloads directly)

```php
use Pushok\Payload;
use Pushok\Payload\Alert;
use Pushok\Notification;

$alert = Alert::create()->setTitle($push->title)->setBody($push->body);

$payload = Payload::create()
    ->setAlert($alert)
    ->setSound($sound)
    ->setCategory($category)
    ->setMutableContent(true)               // REQUIRED
    ->setContentAvailability(false);        // do NOT set content-available for an alert push

if ($push->image_url) {
    $payload->setCustomValue('media_url', $push->image_url);
}
$payload->setCustomValue('push_notification_id', (string) $push->id);

$notification = new Notification($payload, $deviceToken);
```

### 4.3 Required APNs headers

| Header | Value | Why |
| --- | --- | --- |
| `apns-push-type` | `alert` | A `background` push never wakes the extension for display |
| `apns-priority` | `10` | Deliver immediately |
| `apns-topic` | `com.cloudpusher.receiver` | App bundle id |

**Failure mode to watch:** if you send `content-available: 1` *and* an alert,
or omit `mutable-content`, the notification still delivers but with **no image**.

---

## 5. Android — FCM payload (native)

```php
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;
use Kreait\Firebase\Messaging\AndroidConfig;

$message = CloudMessage::withTarget('token', $token->value)
    ->withNotification(
        FcmNotification::create($push->title, $push->body, $push->image_url) // 3rd arg = image
    )
    ->withAndroidConfig(AndroidConfig::fromArray([
        'priority' => 'high',
        'notification' => [
            'image'        => $push->image_url,
            'channel_id'   => $channel,          // 'rich_messages_v1'
            'visibility'   => 'PUBLIC',
            'sound'        => 'notification',     // res/raw/notification.mp3 (no ext)
        ],
    ]))
    ->withData([
        'push_notification_id' => (string) $push->id,
    ]);
```

- `channel_id` **must** equal the channel the app creates (`rich_messages_v1`).
  A mismatch silently drops your custom sound and uses the default channel.
- FCM draws the `BigPictureStyle` automatically when the app is **backgrounded**.
- All `data` values must be **strings**.

---

## 6. Web — FCM data-only payload

Keep it data-only so the service worker (`src/sw.ts` /
`public/firebase-messaging-sw.js`) renders it without a duplicate:

```php
$message = CloudMessage::withTarget('token', $token->value)
    ->withData([
        'title' => $push->title,
        'body'  => $push->body,
        'image' => $push->image_url ?? '',   // media.ts / SW read this key
        'push_notification_id' => (string) $push->id,
    ]);
// NOTE: intentionally NO ->withNotification() for web tokens.
```

The service worker already understands the `image` key (and the aliases
`media_url`, `image_url`, etc. — see `src/services/media.ts`).

---

## 7. Custom sounds — server side is just a filename

The audio files live **in the apps**, not on the server. The payload only
references them by name:

- iOS: `sound = 'chime.caf'` (file bundled in the iOS App target; `.caf/.aiff/.wav`, ≤30s).
- Android: `channel_id = 'rich_messages_v1'` (the channel already carries
  `res/raw/notification.mp3`). The FCM `sound` field is a fallback for pre-Oreo.
- `'default'` → system sound on both.

So all the backend does is store and pass the string. No upload/hosting needed
for sound.

---

## 8. Media hosting

- **HTTPS with a valid cert** (no self-signed — iOS ATS will refuse it).
- Keep images small (**≈ 1 MB**); the iOS extension has a ~30s budget and FCM
  fetches the image before display. Recommend ~1024×512 (2:1).
- Apple hard limits: image 10 MB / audio 5 MB / video 50 MB. Android: images
  only for `notification.image`.
- If your CDN URLs have **no file extension** (signed links, `?sig=…`), also send
  `->custom('media_type', 'image')` on APNs so the extension names the file
  correctly.

---

## 9. Implementation checklist

- [ ] Migration: `image_url`, `sound`, `category`, `android_channel_id`.
- [ ] Validate `image_url` as an HTTPS URL on the send endpoint.
- [ ] Decide the **web-vs-Android FCM discriminator** (§3) — sub-platform preferred.
- [ ] APNs: add `mutableContent()`, `sound`, `category`, and the `media_url`
      custom key; confirm `apns-push-type: alert`.
- [ ] Android FCM: add `notification.image`, `channel_id`, `priority: high`.
- [ ] Web FCM: add `image` to `data`, keep it data-only (no `notification` block).
- [ ] Keep all FCM `data` values as strings.

---

## 10. Test matrix

| Case | Expectation |
| --- | --- |
| iOS, app backgrounded, `image_url` set | Banner shows image; long-press expands it |
| iOS, `mutable-content` omitted | Text-only notification (proves the flag matters) |
| iOS, custom `sound` bundled | Custom chime plays |
| Android, backgrounded, `image` + `channel_id` | Big picture + custom sound |
| Android, wrong `channel_id` | Default sound (diagnostic) |
| Web, data-only + `image` | Service worker shows one notification with hero image |
| Web, notification block sent by mistake | Duplicate notification (don't do this) |
| No `image_url` on any platform | Plain notification, no errors |

### Quick manual APNs test (bypass the app entirely)

```bash
# JWT auth key .p8; replace TEAM_ID, KEY_ID, TOKEN, and the .p8 path
curl -v -d '{
  "aps": { "alert": {"title":"Test","body":"Rich push"}, "mutable-content": 1, "sound": "default" },
  "media_url": "https://picsum.photos/1024/512"
}' \
  -H "apns-topic: com.cloudpusher.receiver" \
  -H "apns-push-type: alert" \
  -H "apns-priority: 10" \
  --http2 \
  https://api.sandbox.push.apple.com/3/device/<DEVICE_TOKEN>
```

If that shows the image but your app code doesn't, the bug is in the backend
payload construction, not the client.

---

## 11. Backward compatibility

Every field is optional and additive. Existing pushes with no `image_url`,
`sound`, or `category` behave exactly as before — `mutableContent()` on a push
with no media just delivers a normal notification. No client version gate is
needed; older app builds ignore keys they don't understand.
