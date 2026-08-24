# cloudPusher — Store Listing Metadata

Ready-to-paste copy for App Store Connect and Google Play. Bundle/app IDs:
- iOS: `com.cloudpusher.receiver`
- Android: `africa.ncloud.pusher`
- Privacy policy URL: https://cloudpusher-backend.on-forge.com/privacy
- Support URL: https://cloudpusher-backend.on-forge.com/support
  (dedicated support page — keep this URL online during App Review)

---

## App name
cloudPusher

## Subtitle (iOS, max 30 chars)
Push notification inbox

## Promotional text (iOS, max 170 chars — updatable without review)
Get instant push notifications from your cloudPusher backend. Rich images, custom sounds, and an offline inbox — all in one place.

## Category
- Primary: **Productivity**
- Secondary: **Business**

## Keywords (iOS, max 100 chars, comma-separated, no spaces)
push,notifications,inbox,alerts,messaging,apns,pusher,cloud,reminders,rich,notify

## Description — App Store (iOS only — do not mention Android)
cloudPusher is the companion app for the cloudPusher notification platform. Receive
push notifications from your organization's backend the moment they're sent, and keep
every alert organized in a clean, searchable inbox.

FEATURES
• Instant push notifications with Apple Push Notification service
• Rich notifications — big images, GIFs, custom sounds, and action buttons
• Unified inbox with unread badges and pull-to-refresh
• Offline cache — read recent notifications without a connection
• Sound and haptic feedback when notifications arrive
• Company approvals — admins approve new team members in the app
• Per-device notification preferences in Settings

HOW IT WORKS
Create an account in the app with your company slug, name, email, and mobile number.
Once a company admin approves you, sign in to start receiving notifications routed to
your device. Your inbox syncs with the server on every launch.

cloudPusher requires an account with a cloudPusher-powered backend.

## Description — Google Play
cloudPusher is the companion app for the cloudPusher notification platform. Receive
push notifications from your organization's backend the moment they're sent, and keep
every alert organized in a clean, searchable inbox.

FEATURES
• Instant push notifications on Android (FCM)
• Rich notifications — big images, GIFs, custom sounds, and action buttons
• Unified inbox with unread badges and pull-to-refresh
• Offline cache — read recent notifications without a connection
• Sound and haptic feedback when notifications arrive
• Company approvals — admins approve new team members in-app
• Per-device notification preferences in Settings

HOW IT WORKS
Register with your company slug, name, email, and mobile number. Once a company admin
approves you, sign in to start receiving notifications routed to your device. Your inbox
syncs with the server on every launch.

cloudPusher requires an account with a cloudPusher-powered backend.

## What's New (version 1.0)
Initial release: push notifications, rich media, unified inbox, offline cache,
and in-app company approvals.

## Support / Marketing URLs
- Support URL: https://cloudpusher-backend.on-forge.com/support
- Marketing URL (optional): (leave blank or add landing page)

---

## App Privacy (App Store Connect questionnaire) — DRAFT based on live privacy policy

Data collected and LINKED to the user's identity (used for App Functionality only,
NOT for tracking, NOT for advertising):

| Data type | Collected? | Linked to user | Purpose |
|---|---|---|---|
| Name | Yes | Yes | App Functionality |
| Email address | Yes | Yes | App Functionality |
| Phone number | Yes | Yes | App Functionality (login is by mobile number) |
| Device ID / push token | Yes | Yes | App Functionality (routing notifications) |
| User content (notifications) | Yes | Yes | App Functionality |

- Tracking: **No** (data is not used to track across other apps/websites)
- Third-party advertising: **No**
- Data used for developer's advertising/marketing: **No**

> Verify each answer against the live policy at the privacy URL before submitting.

---

## Google Play — Data safety form (mirror of the above)
- Data collected: Personal info (name, email, phone), Device IDs, Messages (notification content)
- Data shared with third parties: **No** (unless backend forwards — confirm)
- Data encrypted in transit: **Yes** (HTTPS)
- Users can request deletion: **Yes** (via contact form in privacy policy)

## Google Play — Content rating
- Category: Utility / Productivity / Communication
- Answer "No" to all violence/sexual/gambling/etc. questions → expected rating: Everyone

## Google Play — Target audience
- Target age: 18+ (business tool). Not directed at children.

---

## Screenshots required
### iOS (App Store Connect)
- **6.7" iPhone (1290 × 2796)** — REQUIRED (min 1, max 10). This one set covers all
  modern iPhones.
- 6.5"/5.5" no longer required if 6.7" is provided (as of current ASC rules).
- iPad screenshots only if the app is offered on iPad (it can inherit iPhone).

### Google Play
- **Phone screenshots**: min 2, 16:9 or 9:16, each 320–3840 px. (1080 × 1920 works.)
- **Feature graphic**: 1024 × 500 (REQUIRED for Play listing).
- **App icon**: 512 × 512 (already have 1024 source to downscale).

### Suggested screens to capture
1. Inbox with a few notifications (shows unread badges)
2. A rich notification detail (image + content)
3. Settings (preferences toggles)
4. Login screen (or Approvals, showing team management)

---

## Release notes

### Google Play — Internal testing release notes (per language, <500 chars)
```
First internal build of cloudPusher.
- Push notifications via FCM with rich images and custom sounds
- Unified inbox with unread badges, filters, and pull-to-refresh
- Offline cache of recent notifications
- Per-device sound and notification preferences
Please test: registration/approval, receiving a push, opening a rich notification,
and toggling sound in Settings. Report anything odd to the team.
```

### Production release notes — v1.0 (both stores, "What's New")
```
Welcome to cloudPusher 1.0.
- Instant push notifications from your cloudPusher backend
- Rich notifications with images, GIFs, and custom sounds
- Unified inbox with unread badges, company filters, and offline access
- Sound and haptic feedback on arrival
```

### iOS — "What's New in This Version" (v1.0)
```
In-app sign in and registration, clearer connection errors, and account
deletion from Settings.
```

---

## Internal tester invite (email / message)

**Subject:** You're invited to test cloudPusher

```
Hi,

You're invited to test cloudPusher before its public release.

ANDROID (Google Play)
1. Tap this link on your Android phone: [Play internal-testing opt-in link — paste
   from Play Console → Internal testing → Testers → Copy link]
2. Accept the invite, then install cloudPusher from the Play Store.

iPHONE (TestFlight)
1. Install TestFlight from the App Store.
2. Open this invite link on your iPhone: [TestFlight public/internal link — paste
   from App Store Connect → TestFlight]
3. Install cloudPusher from TestFlight.

ONCE INSTALLED
- Register with your company slug, name, email, and mobile number.
- A company admin will approve you (ask us if you're not approved within a few minutes).
- Sign in with your mobile number + password.
- You should start receiving notifications in your inbox.

What to check: registration + approval, receiving a push, opening a notification with
an image, and the sound toggle in Settings.

Reply here with any issues — screenshots welcome. Thanks for testing!
```

### Screenshot caption ideas (optional, if you add text overlays later)
1. Inbox — "Every alert, one inbox."
2. Notification — "Rich notifications with images & actions."
3. Settings — "Your devices, your preferences."
