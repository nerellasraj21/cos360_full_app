# iOS Phase 1 — Compatibility Fixes

**Status: ✅ COMPLETE**
**Goal:** Fix all existing code issues that would break or degrade the experience on iOS.

---

## Summary of Issues Found (from audit)

| # | File | Issue | Severity |
|---|------|-------|----------|
| 1 | `app/exam/create.tsx` | `KeyboardAvoidingView behavior={undefined}` on Android — keyboard covers inputs | Medium |
| 2 | `app/exam/marks.tsx` | Same as above | Medium |
| 3 | `app/login.tsx` | Uses `react-native` `StatusBar` (not `expo-status-bar`) — inconsistent bar style on iOS | Low |
| 4 | `app/login.tsx` | Hardcoded `paddingTop: 64` for iOS — breaks on newer iPhones with Dynamic Island | Medium |
| 5 | `components/haptic-tab.tsx` | Uses `process.env.EXPO_OS` instead of `Platform.OS` | Low |

---

## Fix 1 — KeyboardAvoidingView in exam/create.tsx

**File:** `app/exam/create.tsx`

Find:
```tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
```

Replace with:
```tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```

---

## Fix 2 — KeyboardAvoidingView in exam/marks.tsx

**File:** `app/exam/marks.tsx`

Find:
```tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
```

Replace with:
```tsx
<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
```

---

## Fix 3 — StatusBar in login.tsx

**File:** `app/login.tsx`

Current import:
```ts
import { StatusBar } from 'react-native';
```

Replace with:
```ts
import { StatusBar } from 'expo-status-bar';
```

Current usage (two instances — one in each stack screen's header area):
```tsx
<StatusBar barStyle="light-content" backgroundColor={BRAND_COLOR} />
```

Replace with:
```tsx
<StatusBar style="light" backgroundColor={BRAND_COLOR} />
```

> `expo-status-bar` uses `style="light"` (not `barStyle`). The `backgroundColor` prop only affects Android.

---

## Fix 4 — Hardcoded paddingTop in login.tsx

**File:** `app/login.tsx`

Find:
```ts
paddingTop: Platform.OS === 'ios' ? 64 : 52,
```

Replace with:
```ts
paddingTop: Platform.OS === 'ios' ? (StatusBar.currentHeight ?? 44) + 12 : (RNStatusBar.currentHeight ?? 0) + 12,
```

However, the correct approach for iOS is to rely on `SafeAreaView` instead of manual padding. Check whether this `paddingTop` is inside a `SafeAreaView` context. If it is, replace the hardcoded value with `0` on iOS and let safe area insets handle it:

```ts
paddingTop: Platform.OS === 'ios' ? 0 : (StatusBar.currentHeight ?? 0) + 12,
```

---

## Fix 5 — haptic-tab.tsx: use Platform.OS

**File:** `components/haptic-tab.tsx`

Find:
```ts
if (process.env.EXPO_OS === 'ios') {
```

Replace with:
```ts
if (Platform.OS === 'ios') {
```

Add import at top if missing:
```ts
import { Platform } from 'react-native';
```

---

## Testing Checklist (Phase 1)

Run on iOS Simulator (iPhone 15 Pro) after all fixes:

- [ ] Open Exam tab → tap "Create Exam" → type in any field → keyboard does NOT cover the input
- [ ] Open Exam tab → tap any exam → tap "Enter Marks" → keyboard does NOT cover the marks input
- [ ] Open login screen → status bar text is **white** (light) on the blue background
- [ ] Login screen → top padding is NOT excessive on iPhone 15 Pro (Dynamic Island)
- [ ] Tap any bottom tab → subtle haptic feedback fires on iOS
- [ ] No TypeScript errors: `npx tsc --noEmit`

> **Note:** All code changes applied (see git history). Testing on iOS Simulator required to verify visual results.

---

## How to Run iOS Simulator (macOS required)

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Build development client for iOS simulator
eas build --profile development --platform ios

# Or run directly with Expo Go (limited native modules)
npx expo start --ios
```

> ⚠️ iOS builds REQUIRE a macOS machine with Xcode installed. Use EAS Build (cloud) if on Windows.

---

Last updated: March 2026
