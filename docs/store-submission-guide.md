# cloudPusher — Store Submission Guide

Master checklist for shipping v1.0 to the **App Store** and **Google Play**.
Paste-ready copy lives in [store-listing-metadata.md](store-listing-metadata.md).
Generated graphic assets live in `store-assets/`.

> The store consoles must be driven by you (the automation can't reach
> `appstoreconnect.apple.com` / `play.google.com`). Everything below is
> paste-ready so it's just clicks.

---

## Status at a glance

| Item | iOS | Android |
|---|---|---|
| Signed binary | ✅ uploaded to ASC (1.0 build 1) | ✅ `cloudpusher-1.0.aab` (versionCode 1) |
| App icon | ✅ in project | ✅ `store-assets/play/play-icon-512.png` |
| Feature graphic | n/a | ✅ `store-assets/play/feature-graphic-1024x500.png` |
| Privacy policy URL | ✅ live | ✅ live |
| Listing copy | ✅ drafted | ✅ drafted |
| Privacy / Data-safety answers | ✅ drafted | ✅ drafted |
| **Screenshots** | ⬜ capture on device | ⬜ capture on device |

Privacy policy: https://cloudpusher-backend.on-forge.com/privacy
Support: https://cloudpusher-backend.on-forge.com/support

---

## App Review resubmission (1.1 build 4)

Apple rejected 1.1 (3) on 26 August 2026 (reviewed on iPad Air 11-inch M3,
iPadOS 26.6.1). Before submitting build 4:

1. **Guideline 2.3.10 — metadata** — Re-paste every App Store Connect field
   from the **APP STORE CONNECT (iOS)** half of the metadata doc, using its
   paste checklist. Check the App Review Notes too: no Android, Google Play,
   Play Store, or FCM wording anywhere.
2. **Guideline 2.1(a) — login error** — Sign in with the exact demo credentials
   on an iPad (or the iPad simulator) against production. The demo user must
   belong to an **active** company; a user whose only company is inactive gets
   "These credentials do not match our records." Sign-in is now rate limited
   separately (`PUSH_LOGIN_RATE_LIMIT`, default 10/min) with a readable message,
   and the app no longer shows raw `Request failed (N)` errors.
3. **Guideline 1.5 — Support URL** — Open
   `https://cloudpusher-backend.on-forge.com/support` in a private browser
   window right before pressing Submit. It must load and show the contact
   e-mail. Keep the Forge site up for the whole review.

### Reply you can paste in App Store Connect

```
Thank you for the review.

1. Guideline 2.3.10: We have revised the app description, promotional text,
   keywords, release notes, and review notes. They no longer reference any
   other platform.

2. Guideline 2.1(a): We tested sign in on iPad Air (iPadOS 26) with the demo
   credentials in the review notes and confirmed the demo account is active.
   Sign in errors now show clear, specific messages. Please retry with the
   credentials provided.

3. Guideline 1.5: The Support URL
   https://cloudpusher-backend.on-forge.com/support is live and includes help
   for sign in, registration, and account deletion, plus a contact form and a
   direct support e-mail address.

This build also adds the ability to send messages to colleagues, groups, or
the whole company from the new Send tab.
```

---

## App Review resubmission (1.0 build 2)

Apple rejected 1.0 (1) on 4 August 2026. Fix these in App Store Connect before
submitting the new binary:

1. **Guideline 4 — in-app account** — Sign in and Register stay in the app.
   Account deletion is already in Settings. Do not send reviewers to Safari.
2. **Guideline 2.3.10 — metadata** — Paste the **App Store (iOS only)**
   description from the metadata doc. It must not mention Android.
3. **Guideline 2.1(a) — Sign in** — Confirm the backend is online. Demo
   credentials must actually sign in. If the API is unreachable the app now
   shows an alert (it no longer fails silently).
4. **Guideline 1.5 — Support URL** — Set Support URL to
   `https://cloudpusher-backend.on-forge.com/support` and keep that host up
   during review. Deploy the `push-service` support page first.

### Reply you can paste in App Store Connect

```
Thank you for the review.

1. Sign in and account creation now happen entirely in the app. Register is an
   in-app form. We no longer open the system browser for authentication.
   Account deletion is available in Settings → Delete account.

2. The App Store description no longer mentions Android or other platforms.

3. Sign in now shows a blocking error if the server cannot be reached, with a
   15-second timeout. The previous “no action” result was a hung request while
   the API host was offline. Please retry with the demo credentials provided
   in the review notes.

4. The Support URL is now https://cloudpusher-backend.on-forge.com/support
   and is a dedicated help page (sign in, registration, account deletion,
   and contact).
```

---

## SCREENSHOTS (both stores) — the one manual asset left

Capture on a real device for best quality (correct resolution automatically):

- **iOS**: on any iPhone → screenshots are 6.7″ (1290×2796) if taken on a Pro Max /
  Plus, which App Store Connect accepts as the primary size.
- **Android**: any phone screenshot works (min 2, 1080×1920 ideal).

Screens to capture (all verified to look great):
1. **Inbox** — the notification list (shows "Push active", unread count, live alerts)
2. **A notification** — tap one with an image (rich notification detail + action button)
3. **Settings** — profile, companies, preferences

Then either upload directly in the console, or drop them to me and I'll frame/caption.

---

## APPLE — App Store Connect

1. **Build check** — [Apps → cloudPusher](https://appstoreconnect.apple.com/apps) →
   **TestFlight** → build **1.0 (1)** should be "Ready to Submit".
2. **App Store** tab → version **1.0** → paste **Promotional text, Description,
   Keywords, Support URL** from the metadata doc. Category: **Productivity** /
   **Business**.
3. **Screenshots** → drag the 3 iPhone shots into the **6.7″ Display** well.
4. **App Privacy** (sidebar) → declare Name, Email, Phone, Device ID, User Content →
   all **Linked to user**, purpose **App Functionality**; **No** tracking, **No** ads.
   Privacy Policy URL as above.
5. **Age rating** → all "None" → 4+. **Pricing** → Free. Encryption → "No" (standard
   HTTPS exemption). Content rights → no third-party content.
6. **Add for Review → Submit for Review**.

---

## GOOGLE — Play Console

1. **Create app** — [Play Console](https://play.google.com/console) → **Create app**
   → name **cloudPusher**, App, Free, accept declarations.
2. **Internal testing** (recommended first) — Testing → **Internal testing** →
   **Create new release** → upload
   `cloudpusher-1.0.aab` → Save → Review → **Start rollout to Internal testing**.
   Add tester emails under the **Testers** tab.
3. **Store listing** — Grow → **Main store listing**:
   - App name: **cloudPusher**
   - Short description (80 chars): `Instant push notifications with a rich, offline inbox.`
   - Full description: paste from metadata doc
   - **App icon**: `store-assets/play/play-icon-512.png`
   - **Feature graphic**: `store-assets/play/feature-graphic-1024x500.png`
   - **Phone screenshots**: the 2–8 device shots
4. **Data safety** (Policy → App content) — declare Personal info (name, email, phone),
   Device IDs, Messages. Encrypted in transit **Yes**; deletion available **Yes**;
   shared with third parties **No** (confirm against your backend).
5. **Content rating** questionnaire → answer honestly (all "No" for a utility) → likely
   **Everyone**.
6. **Target audience** → 18+, not directed at children.
7. **Privacy policy** (App content) → paste the privacy URL.
8. Complete any remaining **App content** declarations (ads: No; news: No;
   government: No; data collection as above), then promote the release from Internal →
   Closed/Open → Production when ready.

---

## Notes
- **Play signing**: uploading the AAB enrolls Play App Signing; Google manages the app
  signing key. Keep `android/key.properties` + the upload keystore safe (gitignored).
- **iOS rich push**: assign a signing team to the `NotificationService` extension in
  Xcode once (see [ios-rich-push-notifications.md](ios-rich-push-notifications.md)).
