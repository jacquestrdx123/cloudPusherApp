# cloudPusher — Store Listing Metadata

Ready-to-paste copy. The document has two halves:

1. **App Store Connect (iOS)** — everything above the "Google Play" divider.
2. **Google Play** — everything below it. Never paste any of it into App Store Connect.

> App Review rejected 1.0 and 1.1 (3) under Guideline 2.3.10 for Android references.
> Every App Store Connect field — description, promotional text, keywords,
> What's New, **and App Review Notes** — must contain zero mentions of Android,
> Google Play, Play Store, FCM, or "other platforms".

---

# APP STORE CONNECT (iOS)

- Bundle ID: `com.cloudpusher.receiver`
- Privacy policy URL: https://cloudpusher-backend.on-forge.com/privacy
- Support URL: https://cloudpusher-backend.on-forge.com/support
  (dedicated support page — keep this URL online during App Review)
- Marketing URL (optional): leave blank

## Paste checklist (App Store tab → version 1.1)

| ASC field | Section below |
|---|---|
| Promotional Text | Promotional text |
| Description | Description |
| Keywords | Keywords |
| Support URL | URL above |
| What's New in This Version | What's New (v1.1) |
| App Review Information → Notes | App Review notes |

## App name
cloudPusher

## Subtitle (max 30 chars)
Push notification inbox

## Promotional text (max 170 chars — updatable without review)
Get instant push notifications from your cloudPusher backend and message your team. Rich images, custom sounds, and an offline inbox — all in one place.

## Category
- Primary: **Productivity**
- Secondary: **Business**

## Keywords (max 100 chars, comma-separated, no spaces)
push,notifications,inbox,alerts,messaging,team,pusher,cloud,reminders,rich,notify

## Description
cloudPusher is the companion app for the cloudPusher notification platform. Receive
push notifications from your organization's backend the moment they're sent, send
messages to your colleagues, and keep every alert organized in a clean inbox.

FEATURES
• Instant push notifications with Apple Push Notification service
• Rich notifications — big images, GIFs, custom sounds, and action buttons
• Send messages to one colleague, several people, a group, or your whole company
• Unified inbox with unread badges and pull-to-refresh
• Offline cache — read recent notifications without a connection
• Sound and haptic feedback when notifications arrive
• Company approvals — admins invite and approve new team members in the app
• Per-device notification preferences in Settings

HOW IT WORKS
Create an account in the app with your company slug, name, email, and mobile number.
Once a company admin approves you, sign in to start receiving notifications routed to
your device. Your inbox syncs with the server on every launch.

cloudPusher requires an account with a cloudPusher-powered backend.

## What's New (v1.1)
```
In-app sign in and registration, clearer connection errors, and account
deletion from Settings.
Send push messages to people, groups, or your whole company.
Admins can invite new team members.
```

## App Review notes
```
cloudPusher requires an account on a cloudPusher-powered backend. A demo
account is provided:

Mobile number: <demo phone>
Password: <demo password>

1. Launch the app and tap Sign in.
2. Enter the mobile number and password above.
3. The Inbox tab lists notifications sent to the demo company.
4. The Send tab lets you message a colleague, a group, or the whole company.
5. Settings → Delete account removes the account.

Support: https://cloudpusher-backend.on-forge.com/support
```

## App Privacy questionnaire — DRAFT based on live privacy policy

Data collected and LINKED to the user's identity (used for App Functionality only,
NOT for tracking, NOT for advertising):

| Data type | Collected? | Linked to user | Purpose |
|---|---|---|---|
| Name | Yes | Yes | App Functionality |
| Email address | Yes | Yes | App Functionality |
| Phone number | Yes | Yes | App Functionality (login is by mobile number) |
| Device ID / push token | Yes | Yes | App Functionality (routing notifications) |
| User content (notifications and messages) | Yes | Yes | App Functionality |

- Tracking: **No** (data is not used to track across other apps/websites)
- Third-party advertising: **No**
- Data used for developer's advertising/marketing: **No**

> Verify each answer against the live policy at the privacy URL before submitting.

## Screenshots
- **6.7" iPhone (1290 × 2796)** — REQUIRED (min 1, max 10). This one set covers all
  modern iPhones.
- **13" iPad** — required because the app runs on iPad (`TARGETED_DEVICE_FAMILY = 1,2`).

Suggested screens:
1. Inbox with a few notifications (shows unread badges)
2. A rich notification detail (image + content)
3. Send — composing a message to a group
4. Settings (preferences toggles)

Caption ideas (optional):
1. Inbox — "Every alert, one inbox."
2. Notification — "Rich notifications with images & actions."
3. Send — "Message your whole team in seconds."
4. Settings — "Your devices, your preferences."

## Release notes history

### v1.0 — "What's New"
```
Welcome to cloudPusher 1.0.
- Instant push notifications from your cloudPusher backend
- Rich notifications with images, GIFs, and custom sounds
- Unified inbox with unread badges, company filters, and offline access
- Sound and haptic feedback on arrival
```

## TestFlight tester invite (email / message)

**Subject:** You're invited to test cloudPusher

```
Hi,

You're invited to test cloudPusher before its public release.

1. Install TestFlight from the App Store.
2. Open this invite link on your iPhone or iPad: [TestFlight link — paste
   from App Store Connect → TestFlight]
3. Install cloudPusher from TestFlight.

ONCE INSTALLED
- Register with your company slug, name, email, and mobile number.
- A company admin will approve you (ask us if you're not approved within a few minutes).
- Sign in with your mobile number + password.
- You should start receiving notifications in your inbox.

What to check: registration + approval, receiving a push, opening a notification with
an image, sending a message from the Send tab, and the sound toggle in Settings.

Reply here with any issues — screenshots welcome. Thanks for testing!
```

---
---

# GOOGLE PLAY (do not paste into App Store Connect)

- Application ID: `africa.ncloud.pusher`
- Privacy policy URL: https://cloudpusher-backend.on-forge.com/privacy

## Short description (80 chars)
Instant push notifications with a rich, offline inbox.

## Full description
cloudPusher is the companion app for the cloudPusher notification platform. Receive
push notifications from your organization's backend the moment they're sent, send
messages to your colleagues, and keep every alert organized in a clean inbox.

FEATURES
• Instant push notifications on Android (FCM)
• Rich notifications — big images, GIFs, custom sounds, and action buttons
• Send messages to one colleague, several people, a group, or your whole company
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

## Data safety form
- Data collected: Personal info (name, email, phone), Device IDs, Messages (notification content)
- Data shared with third parties: **No** (unless backend forwards — confirm)
- Data encrypted in transit: **Yes** (HTTPS)
- Users can request deletion: **Yes** (Settings → Delete account, or the contact form)

## Content rating
- Category: Utility / Productivity / Communication
- Answer "No" to all violence/sexual/gambling/etc. questions → expected rating: Everyone

## Target audience
- Target age: 18+ (business tool). Not directed at children.

## Screenshots and graphics
- **Phone screenshots**: min 2, 16:9 or 9:16, each 320–3840 px. (1080 × 1920 works.)
- **Feature graphic**: 1024 × 500 (REQUIRED for Play listing).
- **App icon**: 512 × 512 (already have 1024 source to downscale).

## Internal testing release notes (per language, <500 chars)
```
First internal build of cloudPusher.
- Push notifications via FCM with rich images and custom sounds
- Unified inbox with unread badges, filters, and pull-to-refresh
- Offline cache of recent notifications
- Per-device sound and notification preferences
Please test: registration/approval, receiving a push, opening a rich notification,
and toggling sound in Settings. Report anything odd to the team.
```

## Production release notes — v1.0
```
Welcome to cloudPusher 1.0.
- Instant push notifications from your cloudPusher backend
- Rich notifications with images, GIFs, and custom sounds
- Unified inbox with unread badges, company filters, and offline access
- Sound and haptic feedback on arrival
```

## Android tester invite

```
1. Tap this link on your Android phone: [Play internal-testing opt-in link — paste
   from Play Console → Internal testing → Testers → Copy link]
2. Accept the invite, then install cloudPusher from the Play Store.
```
