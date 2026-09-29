# Mobile release (EAS)

How the Expo app in `mobile/` is configured, built and shipped to Android and iOS, and what must change before a
store release.

_Last verified against code: 2026-09-29_

## Identity (`mobile/app.json`)

- Name `COS360`, slug `cos360`, scheme `cos360://`. Android `package` and iOS `bundleIdentifier` are both
  `com.cos360.mobile`. Changing either after a store release creates a different app.
- User-facing version is `expo.version` (currently `1.0.0`). The "1.6.0" in `mobile/README.md` is a feature-tracking
  label, not the shipped version. `package.json` `version` is not used for builds.
- `extra.eas.projectId` is still a placeholder. Run `eas init` once, then commit the real id; it is not a secret.
- New Architecture, typed routes and the React Compiler are enabled.

## Build profiles (`mobile/eas.json`)

| Profile | Android | iOS | Distribution |
|---|---|---|---|
| `development` | debug APK (`:app:assembleDebug`), dev client | simulator build | internal |
| `preview` | release APK | device build | internal (QA, stakeholders) |
| `production` | AAB for Play | store build (`image: latest`) | store |

- `appVersionSource: "remote"` with `autoIncrement` on production means **EAS owns the build numbers**
  (`versionCode` / `buildNumber`). The values in `app.json` are ignored for builds, so don't bump them by hand.
  Bump `expo.version` for a user-visible release.
- `developmentClient: true` needs `expo-dev-client`, which is not installed. Run
  `npx expo install expo-dev-client` before using the `development` profile, or use `preview`.
- Each profile sets only `APP_ENV` (development/staging/production). No code reads `APP_ENV`; it is informational.

## Environment variables

- `EXPO_PUBLIC_*` values are inlined into the JS bundle at build time and are visible to anyone with the app.
  Only put public config there, never secrets.
- Used by code:
  - `EXPO_PUBLIC_API_URL` — must include `/api/v1`. Defaults to `http://localhost:8000/api/v1`
    (`src/api/client.ts`, `src/api/auth.ts`, and a few screens that read it directly).
  - `EXPO_PUBLIC_DEFAULT_TENANT` — the `cschema` fallback used before an org code is stored. Defaults to
    `test_tenant`. Missing from `.env.example`.
- **Cloud builds don't see your `.env`**: it is gitignored, so EAS doesn't upload it. Without further setup a store
  build silently talks to `localhost`. Set the variables per profile, either in the `env` block of `eas.json`
  (fine for public URLs) or as EAS environment variables (`eas env:create`).
- Local dev: copy `.env.example` → `.env`. After any change run `npx expo start --clear`; on Android with Expo Go,
  also clear the app's data. The Android emulator reaches the host at `10.0.2.2`. A physical device needs the
  host's LAN IP on the same Wi-Fi, a backend started with `uvicorn ... --host 0.0.0.0` (the default binds
  127.0.0.1 only), and port 8000 allowed through the Windows firewall.

## Credentials

- `submit.production` in `eas.json` still holds placeholders: Apple ID, ASC app id, team id, API key id/issuer.
  Android uses `serviceAccountKeyPath: ./google-service-account.json` with `track: internal`.
- Key files (`google-service-account.json`, `*.p8`, keystores, provisioning profiles) are gitignored. Never commit
  them; keep them in EAS credentials or a secret store. Let EAS manage the Android keystore and the iOS
  certificates (`eas credentials`).

## Android release

1. Set `EXPO_PUBLIC_API_URL` (HTTPS production API) for the `production` profile.
2. Bump `expo.version` if this is a user-visible release.
3. `eas build --platform android --profile production` produces an `.aab`.
4. `eas submit --platform android --profile production` uploads it to the Play **internal** track (or upload the
   `.aab` in Play Console). Promote tracks in Play Console.
5. For internal QA before that: `eas build -p android --profile preview` produces an installable APK.
6. Without EAS (e.g. build quota used up): `npx expo prebuild -p android`, then `cd android && ./gradlew
   assembleRelease` (needs Android Studio + JDK). `android/` and `ios/` are generated and gitignored, so make
   native changes in `app.json`/config plugins, never in those folders.

Declared permissions (`android.permissions`): internet/network state, camera, media read (images/video/audio),
and legacy external-storage read/write. Remove any a feature doesn't use; Play review asks about media
permissions.

## iOS release

- Needs a paid Apple Developer account. EAS cloud builds work from Windows; local builds need macOS + Xcode.
- Before the first store build:
  - `infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads` is `true`, which allows plain HTTP. Remove it (the
    production API must be HTTPS), or App Review will ask for a justification.
  - The app icon must be 1024×1024 with no alpha channel.
  - `ITSAppUsesNonExemptEncryption: false` is already set (HTTPS only), which answers export compliance.
  - Don't add the `aps-environment` entitlement until push is implemented. `expo-notifications` is not installed,
    and the Communication module sends SMS/WhatsApp/email, not push.
  - App Review needs a working demo org code and account. Put them in App Store Connect review notes, not in the
    repo.
  - Submission also needs the App Privacy answers in App Store Connect (the app collects name, email, phone and
    user id), a privacy-policy URL and a support URL.
- `preview` iOS builds are ad-hoc: they install only on devices registered first with `eas device:create`.
- `eas build --platform ios --profile production`, then `eas submit --platform ios`. TestFlight internal testing
  comes before the store release.
- Code-level iOS compatibility (KeyboardAvoidingView behaviour per platform, `expo-status-bar`, safe-area padding
  instead of fixed offsets, platform-specific date pickers, iOS swipe-back disabled on `login`/`set-password`
  via `gestureEnabled: false` in `app/_layout.tsx`) is in place. The app has not had a full iOS device QA
  pass; use the regression list in `testing.md`.

TLS certificate pinning is not implemented on either platform (deferred from the 2026 mobile security audit;
it needs native build configuration).

## OTA updates

`eas update` is **not available**: `expo-updates` is not installed and no `runtimeVersion` or update URL is
configured. Every JS change currently needs a new store build. If OTA is adopted, install `expo-updates`, set
`runtimeVersion`, and remember that any native change (plugins, permissions, native modules) still needs a new
build.

## Pre-release checklist

- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` pass (from `mobile/`).
- [ ] The production profile's `EXPO_PUBLIC_API_URL` points at the HTTPS production API, including `/api/v1`.
- [ ] Backend changes the release depends on are deployed and migrated in every tenant schema.
- [ ] `expo.version` bumped; EAS handles build numbers.
- [ ] Manual regression pass on a real device for all five roles (`testing.md`).
- [ ] No debug screens reachable. Debug components return `null` unless `__DEV__`; keep it that way.
