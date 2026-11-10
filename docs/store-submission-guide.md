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
| Signed binary | ✅ 1.1 build 4 resubmitted 10 Nov 2026, waiting for review | ✅ `cloudpusher-1.0.aab` (versionCode 1) |
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

**Status: resubmitted on 10 November 2026, waiting for review.**

Apple rejected 1.1 (3) on 26 August 2026 (reviewed on iPad Air 11-inch M3,
iPadOS 26.6.1). What was done for build 4:

1. **Guideline 2.3.10 — metadata** — The live description still said "iOS (APNs)
   and Android (FCM)" and the keywords included `fcm`. Description, promotional
   text, keywords and App Review Notes were replaced from the **APP STORE CONNECT
   (iOS)** half of the metadata doc. No Android, Google Play, Play Store, or FCM
   wording anywhere.
2. **Guideline 2.1(a) — login error** — The demo login was replaced with a
   dedicated demo account (see below) and checked on an iPad Air 11-inch
   simulator: sign in, Inbox, Send, Approvals and Settings. Sign-in is rate
   limited separately (`PUSH_LOGIN_RATE_LIMIT`, default 10/min) with a readable
   message, and the app no longer shows raw `Request failed (N)` errors.
3. **Guideline 1.5 — Support URL** —
   `https://cloudpusher-backend.on-forge.com/support` must load and show the
   contact e-mail. Keep the Forge site up for the whole review.

### Demo accounts for App Review

Reviewers sign in to an isolated "Demo Company" (slug `app-review-demo`) on the
production backend, so they never see real company data. Create or reset it on
the Forge server, in the site directory:

```
php artisan app-review:demo +277760813541 +277949010334
```

- Account one (Alex Reviewer, company admin) goes into Sign-In Information in App
  Store Connect. Account two (Sam Colleague) is listed in the review notes.
- Every run prints a **new random password** and resets the demo: five sample
  notifications, one pending registration ("Jordan Applicant"), and nobody a
  previous run approved or invited.
- After the final run, paste the printed password into the Sign-In Information
  password field and save. Then do not run the command or sign in to the demo
  again until the review is finished, or the saved password and the clean state
  are lost.

### Reply sent in App Store Connect

```
Thank you for the review. This resubmission uses a new build, 1.1 (4).

1. Guideline 2.3.10: We have revised the app description, promotional text,
   keywords, and review notes. They no longer reference any other platform.

2. Guideline 2.1(a): Sign in errors now show clear, specific messages, and we
   have replaced the demo account. The Sign-In Information fields now contain a
   new demo account in a dedicated "Demo Company", and the review notes list a
   second demo account plus step-by-step testing instructions. We tested sign
   in, the Inbox, sending a message, and approving a new team member with these
   credentials on an iPad Air 11-inch. Please retry with the new credentials.

3. Guideline 1.5: The Support URL
   https://cloudpusher-backend.on-forge.com/support is live and includes help
   for sign in, registration, and account deletion, plus a contact form and a
   direct support e-mail address.

This build also adds the ability to send messages to colleagues, groups, or
the whole company from the new Send tab.
```

### Where to click when resubmitting

1. Apps → CloudPusher → **iOS App 1.1** (left sidebar): edit text, swap the
   build under **Build**, update **App Review Information**, then **Save**.
2. **Update Review** (top right of the same page).
3. **General → App Review** → open the unresolved submission → **Reply to App
   Review** → **Resubmit to App Review**.

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
