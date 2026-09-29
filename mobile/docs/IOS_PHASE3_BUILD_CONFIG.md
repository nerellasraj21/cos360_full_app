# iOS Phase 3 — Build Configuration & App Store Setup

**Status: ⏳ Pending**
**Goal:** Configure EAS Build for iOS, set up Apple credentials, and prepare for TestFlight/App Store distribution.
**Depends on:** Phase 1 and Phase 2 complete

---

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Apple Developer account | Paid ($99/year) — enroll at developer.apple.com |
| macOS with Xcode 15+ | Required for local builds; EAS Build can run in cloud without macOS |
| EAS CLI | `npm install -g eas-cli` |
| EAS account | `eas login` |

---

## 3.1 — Initialize EAS Project

```bash
# In project root
eas init

# This creates / updates the projectId in app.json:
# "extra": { "eas": { "projectId": "<your-real-id>" } }
```

Update `app.json` — replace placeholder:
```json
"extra": {
  "eas": {
    "projectId": "<paste-real-id-from-eas-init>"
  }
}
```

---

## 3.2 — Configure iOS App Identifiers

**File:** `app.json`

Current values are already set:
```json
"ios": {
  "bundleIdentifier": "com.cos360.mobile",
  "buildNumber": "1",
  "supportsTablet": true
}
```

Register the bundle ID in Apple Developer Portal:
1. Go to [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers)
2. Add identifier → App IDs → Bundle ID: `com.cos360.mobile`
3. Enable capabilities needed: Push Notifications, Associated Domains (if deep links used)

---

## 3.3 — iOS App Icons

The current `app.json` references `./assets/images/icon.png` for the iOS app icon.

iOS requires a **single 1024×1024 PNG** (no transparency, no rounded corners — Apple rounds it automatically).

### Verify icon file:
```bash
# Check dimensions
identify assets/images/icon.png
# Should be: 1024x1024
```

If not 1024×1024, replace it with the correct size.

### Also needed for iOS:
- No alpha channel (transparent background = rejection)
- No rounded corners in the source file

---

## 3.4 — Update eas.json with Real Apple Credentials

**File:** `eas.json`

Replace the placeholder submit config:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@email.com",        ← replace
      "ascAppId": "your-app-store-connect-app-id",  ← replace (numeric ID from App Store Connect)
      "appleTeamId": "your-apple-team-id",          ← replace (10-char alphanumeric)
      "ascApiKeyPath": "./apple-store-connect-key.p8", ← replace with real key file
      "ascApiKeyIssuerId": "your-issuer-id",        ← replace
      "ascApiKeyId": "your-key-id"                  ← replace
    }
  }
}
```

### How to get Apple API Key:
1. Go to App Store Connect → Users and Access → Integrations → App Store Connect API
2. Generate a new key with **App Manager** role
3. Download the `.p8` file (only downloadable once)
4. Note the Key ID and Issuer ID
5. Place the `.p8` file in the project root (add to `.gitignore`)

### Add to .gitignore:
```
*.p8
google-service-account.json
```

---

## 3.5 — Push Notifications (APNs)

The Communication module sends push notifications. iOS requires APNs configuration.

### Add to `app.json`:
```json
"ios": {
  "bundleIdentifier": "com.cos360.mobile",
  "buildNumber": "1",
  "supportsTablet": true,
  "entitlements": {
    "aps-environment": "production"
  },
  "infoPlist": {
    ...existing keys...
  }
}
```

### EAS automatically handles APNs provisioning when using `eas build`.

### Install expo-notifications if not already installed:
```bash
npx expo install expo-notifications
```

Add plugin to `app.json`:
```json
"plugins": [
  "expo-router",
  "expo-notifications",
  ...
]
```

---

## 3.6 — Deep Linking (Universal Links)

The app uses `cos360://` scheme. For iOS, also configure Universal Links (HTTPS) for better App Store behavior.

**File:** `app.json`
```json
"ios": {
  "associatedDomains": ["applinks:cos360.app"]
}
```

This requires a `apple-app-site-association` file on `https://cos360.app/.well-known/apple-app-site-association`.

---

## 3.7 — Build Commands

### Development build (iOS Simulator — cloud):
```bash
eas build --profile development --platform ios
```

### Preview build (physical device via TestFlight internal):
```bash
eas build --profile preview --platform ios
```

### Production build (App Store):
```bash
eas build --profile production --platform ios
```

### Submit to App Store after production build:
```bash
eas submit --platform ios
```

---

## 3.8 — eas.json Final Configuration

Update `eas.json` to ensure proper iOS profiles:

```json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "simulator": true
      },
      "env": {
        "APP_ENV": "development"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      },
      "env": {
        "APP_ENV": "staging"
      }
    },
    "production": {
      "autoIncrement": true,
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "image": "latest"
      },
      "env": {
        "APP_ENV": "production"
      }
    }
  }
}
```

> eas.json is already correct ✅ — just fill in real credentials in the `submit` section.

---

## 3.9 — App Store Connect Setup

1. Log in to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps → `+` → New App
3. Platform: iOS
4. Bundle ID: `com.cos360.mobile`
5. Fill in:
   - App Name: **COS360**
   - Primary Language: English
   - SKU: `cos360-mobile`
6. Note the **Apple ID** (numeric) → paste as `ascAppId` in eas.json

---

## 3.10 — Privacy Manifest (Required for App Store since iOS 17)

Apple requires a `PrivacyInfo.xcprivacy` file for apps using certain APIs.

**File to create:** `ios/COS360/PrivacyInfo.xcprivacy`

> This file is generated automatically by EAS Build if using managed workflow. No manual action needed for Expo managed workflow.

However, you must declare what data your app collects in App Store Connect under **App Privacy**.

Data collected by COS360:
- Name, Email, Phone (collected for account management)
- User ID (linked to identity)
- Usage data (analytics, if any)

---

## Testing Checklist (Phase 3)

- [ ] `eas init` completed — real `projectId` in `app.json`
- [ ] Bundle ID registered in Apple Developer Portal
- [ ] App icon is 1024×1024 PNG with no alpha
- [ ] `.p8` key file downloaded and in project root
- [ ] `.p8` and `google-service-account.json` added to `.gitignore`
- [ ] `eas.json` submit section has real Apple credentials
- [ ] `eas build --profile development --platform ios` succeeds
- [ ] Development build installs on iOS Simulator
- [ ] App launches on simulator without crash
- [ ] Login flow works on iOS
- [ ] `eas build --profile preview --platform ios` succeeds
- [ ] Preview build installs via TestFlight (internal testing group)

---

Last updated: March 2026
