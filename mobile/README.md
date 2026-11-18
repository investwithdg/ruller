# Preferred Solutions Transport — Native Mobile App (iOS & Android)

Native iOS and Android mobile suite for **Preferred Solutions Transport (PST)** built with **Expo SDK 57**, **Expo Router**, **TypeScript**, **NativeWind**, and **Supabase**.

Designed to ship to both the **Apple App Store** and **Google Play Store** from a single codebase via **EAS Build & Submit**, while isolating all tenant branding and default pricing inside `lib/brand-config.ts` so the platform can be white-labeled or licensed to other courier/logistics operators in minutes.

---

## 1. All 4 Operational Roles Included

| Role | Screen | Core Native Capabilities |
|---|---|---|
| **Customer** (`recipient`) | `app/(app)/customer.tsx` | Instant distance & weight quote calculator, Stripe Checkout payment trigger, real-time 6-stage order tracker, live driver GPS readout, 1-tap call/map handoff, and Proof of Delivery (PoD) viewer |
| **Driver** (`driver`) | `app/(app)/driver.tsx` | On-duty GPS telemetry broadcasting (`driver_locations`), Accept/Decline job flow, 1-tap safe-driving status progression (`Accepted` → `PickedUp` → `InTransit` → `Delivered`), native Apple/Google Maps turn-by-turn navigation handoff, and native Camera/Photo Library + Digital Signature Proof of Delivery capture |
| **Dispatcher** (`dispatcher`) | `app/(app)/dispatcher.tsx` | Live KPI command strip, filterable order queue (`ReadyForDispatch`, `Assigned`, `InTransit`, `Delivered`), 1-tap driver assignment/reassignment modal, and live fleet telemetry roster |
| **Admin** (`admin`) | `app/(app)/admin.tsx` | 5-tab executive console: (1) Revenue/Order KPIs & System Health diagnostics, (2) Live Pricing Engine editor (`pricing_settings`), (3) User & Role governance, (4) Fleet driver onboarding, and (5) Real-time `dispatch_events` audit stream |
| **Account & Switcher** | `app/(app)/profile.tsx` | Instant 4-role switcher, White-Label Tenant Config inspector, Privacy/Terms links, and Apple Guideline 5.1.1(v) **Delete Account** control |

---

## 2. Apple App Store Review Compliance Built In

1. **Guideline 4.2 (Minimum Functionality):** Native tab navigation, native camera/photo library integration (`expo-image-picker`), native turn-by-turn map deep-linking, GPS telemetry, and offline-resilient **Instant 4-Role Portal Launchpad** so Apple App Review can test every role with one tap.
2. **Guideline 3.1.3(e) (Physical Goods & Services Outside of the App):** Real-world freight and courier delivery is exempt from Apple In-App Purchase; payments process through Stripe Checkout.
3. **Guideline 5.1.1(v) (Account Deletion):** Users can permanently delete their account inside `Account` → `Delete Account Permanently`, backed by the `public.delete_own_account()` Supabase RPC (`supabase/migrations/004_mobile_and_white_label_schema.sql`).
4. **Export Compliance (`ITSAppUsesNonExemptEncryption: false`):** Pre-configured in `app.json` so TestFlight and App Store builds do not stall on encryption questionnaires.

---

## 3. Local Development & Typechecking

```bash
cd "/Volumes/T7 Shield/Enterprise/Chief of Staff/CTO/Repositories/preferredsolutionstransport/mobile"

# Copy environment variables
cp .env.example .env

# Run strict TypeScript check
npm run typecheck

# Start Expo development server
npm run start
```

---

## 4. Building & Submitting to the App Store & Google Play (EAS)

```bash
# 1. Install EAS CLI globally (if not installed) and sign in
npm install -g eas-cli
eas login

# 2. Link this mobile workspace to your Expo account
eas project:init

# 3. Build for internal TestFlight / Android APK testing
npm run build:preview:ios
npm run build:preview:android

# 4. Build production binaries for App Store Connect & Google Play Console
npm run build:prod:all

# 5. Submit to Apple App Store & Google Play
npm run submit:ios
npm run submit:android
```

---

## 5. White-Labeling for Additional Courier Clients

1. Edit `lib/brand-config.ts` (`companyName`, `shortName`, `tenantSlug`, `defaultCoordinates`, `defaultPricing`, `supportPhone`, `supportEmail`).
2. Update `expo.name`, `expo.slug`, `expo.ios.bundleIdentifier`, and `expo.android.package` in `app.json`.
3. Replace `./assets/icon.png` and `./assets/splash-icon.png`.
