# COS360 Mobile App — Android Build Guide

**Target Platform:** Android
**Framework:** React Native + Expo SDK 54
**Build Tool:** EAS Build (Expo Application Services)

---

## 1. App Identity

| Property | Value |
|----------|-------|
| App Name | COS360 |
| Android Package | `com.cos360.mobile` |
| Version | 1.0.0 |
| Android versionCode | 1 |
| Scheme (Deep Links) | `cos360://` |

---

## 2. Android Permissions Configured

Declared in [app.json](../app.json) under `android.permissions`:

| Permission | Why Needed |
|------------|-----------|
| `INTERNET` | API calls to backend server |
| `ACCESS_NETWORK_STATE` | Check connectivity for offline mode |
| `READ_EXTERNAL_STORAGE` | Read uploaded documents |
| `WRITE_EXTERNAL_STORAGE` | Save downloaded files |
| `READ_MEDIA_IMAGES` | Select images for document upload (Android 13+) |
| `READ_MEDIA_VIDEO` | Select video files (Android 13+) |
| `READ_MEDIA_AUDIO` | Select audio files (Android 13+) |
| `CAMERA` | Take photos for document uploads |

---

## 3. Android Adaptive Icon

Configured in `app.json` with all required layers:

| Asset | File |
|-------|------|
| Foreground | `assets/images/android-icon-foreground.png` |
| Background | `assets/images/android-icon-background.png` |
| Monochrome | `assets/images/android-icon-monochrome.png` |
| Background Color | `#E6F4FE` |

---

## 4. Environment Setup (Required Before Building)

### Step 1 — Set API URL

Copy `.env.example` to `.env` and set the API server URL:

```bash
cp .env.example .env
```

Edit `.env`:
```env
EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000/api/v1
APP_ENV=production
```

> For production, use a domain name: `https://api.yourschool.com/api/v1`

### Step 2 — Install Node dependencies

```bash
npm install
```

### Step 3 — Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 4 — Log in to Expo

```bash
eas login
```

### Step 5 — Link project to EAS

```bash
eas init
```
This generates a real `projectId` for `app.json > extra.eas.projectId`.

---

## 5. Build Profiles

Three build profiles are defined in [eas.json](../eas.json):

| Profile | Output | Use For |
|---------|--------|---------|
| `development` | Debug APK | Local testing with dev client |
| `preview` | Release APK | Internal QA / stakeholder testing |
| `production` | AAB (App Bundle) | Google Play Store upload |

---

## 6. Build Commands

### Development Build (APK for testing)

```bash
eas build --platform android --profile development
```

Output: `.apk` file, installable directly on any Android device.

### Preview Build (Release APK)

```bash
eas build --platform android --profile preview
```

Output: `.apk` — share via QR code or direct download for internal testing.

### Production Build (App Bundle for Play Store)

```bash
eas build --platform android --profile production
```

Output: `.aab` file, upload to Google Play Console.

---

## 7. Local Build (without EAS cloud)

To build locally on your machine (requires Android Studio + JDK):

```bash
# Install Expo prebuild to generate native android/ folder
npx expo prebuild --platform android

# Build debug APK
cd android
./gradlew assembleDebug

# The APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on connected Android device

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 8. Run on Android Device / Emulator (Dev Mode)

### On Physical Device

1. Enable **Developer Options** on Android device
2. Enable **USB Debugging**
3. Connect via USB cable
4. Run:
```bash
npm run android
# or
npx expo run:android
```

### On Android Emulator (Android Studio)

1. Open Android Studio → Device Manager → Start an AVD (API 33+)
2. Run:
```bash
npm run android
```

> **Note:** When using the emulator, set API URL in `.env`:
> ```
> EXPO_PUBLIC_API_URL=http://10.0.2.2:8000/api/v1
> ```
> The emulator uses `10.0.2.2` to reach your computer's localhost.

---

## 9. Over-the-Air Updates (OTA)

For quick bug fixes without a full app store release:

```bash
eas update --branch production --message "Fix: exam mark entry crash"
```

Users get the update automatically on next app launch.

---

## 10. Google Play Store Submission

### Step 1 — Create Google Play Developer account
Sign up at [play.google.com/apps/publish](https://play.google.com/apps/publish) ($25 one-time fee).

### Step 2 — Create app in Play Console
- Package: `com.cos360.mobile`
- App category: Education
- Target audience: School administrators, teachers, parents

### Step 3 — Generate signing key
```bash
eas credentials
```
EAS manages the keystore automatically.

### Step 4 — Submit to Play Store
```bash
eas submit --platform android --profile production
```
Or upload the `.aab` file manually in Google Play Console → Internal Testing.

---

## 11. Version Management

To release a new version:

1. Update `version` in `package.json` (e.g., `"1.1.0"`)
2. Increment `android.versionCode` in `app.json` (must always increase: 1, 2, 3...)
3. Run production build:
   ```bash
   eas build --platform android --profile production
   ```
4. Submit to Play Store

---

## 12. Build Checklist

Before publishing to Play Store:

- [ ] API URL set to production domain in `.env` (not a local IP)
- [ ] `APP_ENV=production` in `.env`
- [ ] `android.versionCode` incremented in `app.json`
- [ ] `version` updated in `package.json`
- [ ] Tested on a real Android device (not just emulator)
- [ ] Login, permission flow, and all modules verified
- [ ] `eas build --platform android --profile production` completes successfully
- [ ] App Store listing (screenshots, description) ready in Play Console

---

## 13. Troubleshooting

| Problem | Solution |
|---------|----------|
| "Network request failed" on device | Set correct IP in `.env` — use server's LAN IP, not localhost |
| Build fails: "SDK not found" | Run `npx expo doctor` to check for version mismatches |
| APK installs but crashes on launch | Check Expo logs: `npx expo start --clear` |
| "INSTALL_FAILED_UPDATE_INCOMPATIBLE" | Uninstall old version from device first |
| Emulator can't reach backend | Use `10.0.2.2` instead of `localhost` or `192.168.x.x` |
| EAS build quota exceeded | Use local build: `npx expo prebuild && cd android && ./gradlew assembleRelease` |

---

*COS360 School Management System — Android Build Guide*
*March 2026*
