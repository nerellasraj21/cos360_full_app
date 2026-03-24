# iOS Phase 4 — Testing, TestFlight & App Store Release

**Status: ⏳ Pending**
**Goal:** Full QA on iOS, TestFlight beta, and App Store submission.
**Depends on:** Phase 3 complete (EAS credentials configured, first build successful)

---

## 4.1 — iOS Simulator Test Matrix

Test the following on **iPhone 15 Pro** (iOS 17) and **iPhone SE 3rd gen** (iOS 16, small screen):

### Authentication
- [ ] Launch app → redirects to login (not dashboard)
- [ ] Enter org code → academic year list loads
- [ ] Enter wrong password → error toast shown
- [ ] Enter correct credentials → navigates to dashboard
- [ ] Logout → back to login, cannot swipe back

### Dashboard
- [ ] Module cards render correctly (no overflow)
- [ ] Permission-filtered cards hidden for restricted roles
- [ ] No horizontal scroll bleed on small screen (iPhone SE)

### Students
- [ ] Student list loads and scrolls smoothly
- [ ] Search filters list in real-time
- [ ] Tap student → detail screen opens
- [ ] Admission form: all 6 steps navigate correctly
- [ ] Date pickers show iOS spinner in bottom sheet modal
- [ ] Photo picker opens iOS Photos library

### Fees
- [ ] Fee categories / types / terms list correctly
- [ ] Fee term date picker works (iOS spinner modal)
- [ ] Create/edit modal keyboard does not cover inputs

### Exam
- [ ] Exam list loads
- [ ] Create exam form keyboard does not cover inputs *(Phase 1 fix)*
- [ ] Mark entry keyboard does not cover inputs *(Phase 1 fix)*
- [ ] Results show correctly

### Transport
- [ ] Routes list loads
- [ ] Route stops: time pickers stay open on iOS after selection
- [ ] Student transport: route/stop dropdowns work

### Staff
- [ ] Staff list loads
- [ ] Enrollment form: date picker works on iOS
- [ ] Profile edit saves

### Masters
- [ ] Timetable date picker works
- [ ] All list screens scroll correctly

### Navigation
- [ ] Swipe left from any sub-screen navigates back
- [ ] Login screen blocks back swipe
- [ ] Drawer opens from left on tap (hamburger) and swipe
- [ ] Tab bar does not clip behind iOS home indicator

---

## 4.2 — Physical Device Testing (iPhone required)

Before TestFlight, test on a real device:

```bash
# Register device UDID with Apple Developer Portal
# Then run:
eas device:create

# Build for the device
eas build --profile preview --platform ios

# Install via EAS / Expo Go link
```

### Physical device test focus:
- Touch responsiveness (real touch latency)
- Haptic feedback (tabs, success actions)
- Camera/photo picker for student photos
- Notch / Dynamic Island safe area

---

## 4.3 — TestFlight Internal Distribution

1. Build production (or preview) via `eas build --profile preview --platform ios`
2. Submit to App Store Connect: `eas submit --platform ios`
3. In App Store Connect → TestFlight → Internal Testing
4. Add testers (Apple ID emails)
5. Testers install via TestFlight app

### Internal Testing Checklist:
- [ ] 3+ testers on different iPhone models
- [ ] Test all modules for 2–3 days
- [ ] Collect crash reports via App Store Connect → Crashes
- [ ] Fix all critical crashes before external beta

---

## 4.4 — App Store Metadata (Required for Submission)

Prepare these in App Store Connect before final submission:

### App Information:
- **App Name:** COS360
- **Subtitle:** School Management System
- **Category:** Education
- **Age Rating:** 4+ (no objectionable content)

### App Description (App Store):
```
COS360 is a comprehensive school management system for administrators, teachers, and parents.

Features:
• Student Management — Admissions, attendance, certificates, documents
• Fee Management — Fee terms, transactions, collections, refunds
• Exam Management — Create exams, enter marks, generate results and hall tickets
• Transport — Route management, vehicle tracking, student transport assignments
• Staff Management — Enrollments, attendance, profiles
• Communication — Send SMS, email, and push notifications
• Expense Management — Track school expenses, approvals, reports
• Masters — Classes, subjects, timetables, academic years

Secure multi-tenant architecture — each school operates in its own isolated environment.
```

### Keywords (100 chars max):
`school management,student,fees,attendance,exam,transport,staff,admission,education,ERP`

### Screenshots Required:
- iPhone 6.7" (iPhone 15 Pro Max): 1290×2796
- iPhone 6.5" (iPhone 14 Plus): 1242×2688
- iPhone 5.5" (iPhone 8 Plus): 1242×2208

Take screenshots of:
1. Dashboard (module cards)
2. Student list
3. Exam mark entry
4. Fee collection
5. Login screen

### Privacy Policy URL:
- Must provide a URL to a privacy policy page
- Minimum: `https://cos360.app/privacy`

### Support URL:
- `https://cos360.app/support`

---

## 4.5 — App Review Submission Checklist

Apple reviews all app submissions (typically 24–48 hours):

- [ ] Screenshots uploaded (6.7", 6.5", 5.5")
- [ ] App description written
- [ ] Privacy policy URL set
- [ ] Export compliance answered (No encryption beyond HTTPS = No)
- [ ] IDFA (Advertising ID) answered (likely: No — unless analytics added)
- [ ] App Review notes added:
  ```
  This is a school management system for institutional use.
  To review, use these demo credentials:
  Org Code: [demo org code]
  Username: admin
  Password: [demo password]
  ```
- [ ] Production build submitted via `eas submit --platform ios`
- [ ] Version set to 1.0.0, Build Number set to 1

---

## 4.6 — Post-Release Monitoring

After App Store approval:

1. Monitor **App Store Connect → Crashes** for new crash reports
2. Monitor **Expo EAS → Updates** for OTA update delivery
3. **OTA Updates** (JavaScript-only changes): Use `eas update` — no re-submission needed
4. **Native changes** (new permissions, new native modules): Requires new App Store build

### OTA Update command:
```bash
eas update --branch production --message "Fix exam marks keyboard issue"
```

> OTA updates work for JS/TS changes. Any change to `app.json` plugins, permissions, or native code requires a new build.

---

## 4.7 — Version Strategy

| Version | Build | Change Type | Process |
|---------|-------|-------------|---------|
| 1.0.0 | 1 | Initial release | Full App Store review |
| 1.0.0 | 2+ | Bug fix (JS only) | OTA update via `eas update` |
| 1.0.1 | 3 | Bug fix (native) | New build + App Store review |
| 1.1.0 | 4 | New feature | New build + App Store review |

---

## Summary: Full iOS Development Timeline

| Phase | Goal | Key Actions |
|-------|------|-------------|
| **Phase 1** | Code compatibility | Fix KeyboardAvoidingView, StatusBar, hardcoded padding |
| **Phase 2** | UI polish | iOS date pickers, modal styles, swipe gestures, keyboard types |
| **Phase 3** | Build config | EAS init, Apple credentials, app icons, eas.json |
| **Phase 4** | Testing & release | Simulator QA, TestFlight, App Store submission |

---

Last updated: March 2026
