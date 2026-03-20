# COS360 Mobile App — Testing Guide

**Version:** 1.0.0
**Date:** March 2026

---

## 1. Setup Before Testing

### 1.1 Start the Backend

```bash
# In the Python backend directory
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API must be running at `http://<server-ip>:8000`.

### 1.2 Update the API Base URL

Edit `.env` (copy from `.env.example` if it doesn't exist) and set the correct IP of the machine running the backend:

```env
EXPO_PUBLIC_API_URL=http://192.168.0.110:8000/api/v1
```

Both your backend machine and the test device must be on the **same Wi-Fi network**.

> After changing `.env`, restart with `npx expo start --clear` and clear Expo Go app data on Android.

### 1.3 Install Dependencies

```bash
cd cos360_mobile_app
npm install
```

### 1.4 Start the App

```bash
# Start Expo dev server
npm start

# Then choose:
# a — open on Android emulator/device
# i — open on iOS simulator (Mac only)
# w — open in web browser
```

---

## 2. Testing on Physical Device (Recommended)

### Android
1. Enable **Developer Options** on the device
2. Enable **USB Debugging**
3. Connect via USB
4. Run `npm run android`

OR scan the QR code from `npm start` using the **Expo Go** app.

### iOS
1. Install **Expo Go** from the App Store
2. Scan the QR code from `npm start`

---

## 3. Testing on Emulator

### Android Emulator (Android Studio)
1. Open Android Studio → Device Manager
2. Create/start an AVD (API 33 or higher recommended)
3. Run `npm run android`

> **Note:** The Android emulator uses `10.0.2.2` to reach your computer's localhost. If your backend is on the same machine, use `http://10.0.2.2:8000/api/v1` as the base URL.

### iOS Simulator (Mac only)
1. Open Xcode → Simulators
2. Run `npm run ios`

> iOS simulator uses `localhost` directly — no IP change needed.

---

## 4. Manual Test Cases

### 4.1 Authentication

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 1 | Login with valid credentials | Enter email + password → tap Login | Navigates to Home tab |
| 2 | Login with wrong password | Enter wrong password → tap Login | Shows error message |
| 3 | Auto token refresh | Leave app idle 30+ min, reopen | Still logged in, token refreshed transparently |
| 4 | Logout | Profile → Logout | Returns to login screen, tokens cleared |
| 5 | Permission-filtered tabs | Login as teacher | Only permitted tabs visible |

### 4.2 Home / Dashboard

| # | Test Case | Expected Result |
| --- | --------- | --------------- |
| 6 | Admin login — dashboard loads | All 7 module cards visible (Students, Fees, Masters, Transport, Staff, Expense, Exam) |
| 7 | Restricted role — no module permissions | Lock icon + "No modules available. Contact your administrator." message shown |
| 8 | Navigate to module | Tap card → navigates to correct tab |
| 9 | Greeting hero card | Shows correct greeting (Morning/Afternoon/Evening), username, and today's date |
| 10 | Dark mode | All module cards show correct tinted backgrounds |

### 4.3 Exam Module (New)

#### 4.3.1 Exam List

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 9 | View exam list | Exam tab → All Exams | List of exams with status badges |
| 10 | Search exams | Type in search bar | List filters in real-time |
| 11 | Filter by status | Tap status chip (Active, Published, etc.) | Only matching exams shown |
| 12 | Refresh list | Pull down on list | Fetches latest data |

#### 4.3.2 Create Exam

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 13 | Create exam | Exam tab → Create Exam → fill form → submit | New exam created, navigates to detail |
| 14 | Validation — missing title | Submit without title | Red error message below title field |
| 15 | Validation — end before start | End date < start date → submit | Error: "End date must be after start date" |
| 16 | Edit exam | Exam detail → Edit → change title → save | Exam updated, changes visible on detail |

#### 4.3.3 Exam Detail

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 17 | View detail | Tap any exam | Shows title, status, dates, subjects, schedule |
| 18 | Navigate to marks | Exam detail → Marks (only visible when active) | Opens mark entry with exam pre-selected |
| 19 | Navigate to results | Exam detail → Results (only when published) | Opens results with exam pre-selected |
| 20 | Navigate to hall tickets | Exam detail → Hall Tickets | Opens hall tickets screen |
| 21 | Delete exam | Exam detail → Delete → confirm | Exam deleted, navigates back to list |
| 22 | Unlock exam | Published exam → Unlock → confirm | Exam status changes to allow corrections |

#### 4.3.4 Mark Entry

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 23 | Load marks grid | Exam tab → Enter Marks → select exam | List of students with marks input |
| 24 | Enter marks | Type a number in a student's marks field | Input highlighted in blue |
| 25 | Mark student absent | Tap "P" toggle → turns to "AB" | Marks field disabled and cleared |
| 26 | Save marks | Tap Save Marks | Success alert, changes persisted |
| 27 | Filter by subject | Tap subject chip | Only shows that subject's marks |
| 28 | Save with no changes | Tap Save when nothing changed | "No Changes" alert |

#### 4.3.5 Results

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 29 | View results list | Exam tab → View Results → select exam | List of students with pass/fail, percentage |
| 30 | Tap student result | Tap any student row | Detailed subject-wise breakdown |
| 31 | Compute results | Tap Compute (admin) → confirm | Results computed, list refreshes |
| 32 | Publish results | Tap Publish → confirm | Success alert |

#### 4.3.6 Hall Tickets

| # | Test Case | Steps | Expected Result |
|---|-----------|-------|-----------------|
| 33 | Compute eligibility | Hall Tickets → select exam → Compute → confirm | Students split into Eligible/Ineligible |
| 34 | View eligible | Eligible tab | List with attendance % and fee status |
| 35 | View ineligible | Ineligible tab | List with reason for ineligibility |
| 36 | Override eligibility | Tap toggle on student card | Student moves to other tab |
| 37 | Publish hall tickets | Tap Publish → confirm | Success alert |

### 4.4 Students Module

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 38 | Student list loads | Shows all students with active/inactive badge |
| 39 | Search student | Search by name or admission number | Filtered results |
| 40 | View student detail | Tap student | Full profile with class, section |
| 41 | New admission | Students → New Admission → fill form | Student created |
| 42 | Mark attendance | Students → Mark Attendance → select class | Attendance form loads |

### 4.5 Fees Module

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 43 | Fee categories list | Shows all categories |
| 44 | Create fee category | Form validates required fields |
| 45 | Fee transactions | Shows transaction history |
| 46 | Record transaction | Select student, fee type, amount → submit |

### 4.6 Permission Enforcement

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 47 | Admin login | All tabs visible |
| 48 | Teacher login | Only permitted tabs visible (e.g., Students, Exam) |
| 49 | Parent login | Only Profile tab + student-specific views |
| 50 | Locked action | Grayed out with lock icon, tap has no effect |

---

## 5. API Testing (via Postman / curl)

### Login
```bash
curl -X POST http://192.168.0.110:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "cschema: school1" \
  -d '{"username": "admin", "password": "testpass123"}'
```

### Create Exam
```bash
curl -X POST http://192.168.0.110:8000/api/v1/exams \
  -H "Authorization: Bearer <token>" \
  -H "cschema: school1" \
  -H "Content-Type: application/json" \
  -d '{
    "exam_name": "Term 1 Unit Test",
    "academic_year_id": 1,
    "exam_type": "unit_test",
    "board": "CBSE",
    "level": "class",
    "nature": "internal"
  }'
```

### Get Marks Grid
```bash
curl http://192.168.0.110:8000/api/v1/exams/<exam_id>/marks \
  -H "Authorization: Bearer <token>" \
  -H "cschema: school1"
```

---

## 6. Network Debugging

If the app cannot reach the backend:

1. **Check Wi-Fi** — device and server must be on same network
2. **Check IP** — run `ipconfig` (Windows) or `ifconfig` (Mac/Linux), use the IPv4 address
3. **Check firewall** — allow port 8000 in Windows Defender Firewall
4. **Test in browser** — open `http://192.168.0.110:8000/docs` on the device browser

---

## 7. Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Network Error" on all requests | Check backend is running and `EXPO_PUBLIC_API_URL` in `.env` is correct; restart with `npx expo start --clear` |
| App stuck on "Loading permissions..." | Backend `/auth/mobile/permissions/sync` endpoint may be down |
| Tab not showing after login | User role may not have any of the module's permissions assigned |
| Login succeeds but blank screen | Check `cschema` value — must match a valid tenant schema in the database |
| Expo Go shows "Something went wrong" | Run `npm start --reset-cache` to clear Metro bundler cache |
| TypeScript errors in editor | Run `npx tsc --noEmit` to see full error list |

---

## 8. Test Accounts (Setup in Backend)

Login uses **username** (not email) + org code as `cschema`. Configure these users in the backend for testing:

| Role | Username | Org Code (cschema) | Expected Dashboard Cards |
| ---- | -------- | ------------------ | ------------------------ |
| Admin | admin | test_tenant | All 7 cards |
| Staff | staff | test_tenant | Students, Fees, Staff, Expense, Exam |
| Teacher | teacher | test_tenant | Students, Exam |
| Student | student | test_tenant | None — empty state (lock icon) |
| Parent | parent | test_tenant | None — empty state (lock icon) |

---

## 9. Checking Logs

### Mobile App Logs
- In Expo: logs appear in the terminal where `npm start` is running
- On device: shake device → tap "Open in Expo" → check console

### Network Logs
The Axios client logs all requests:
```
API Request: POST http://192.168.0.110:8000/api/v1/auth/login
API Request: GET http://192.168.0.110:8000/api/v1/exams
```
These appear in the Metro bundler terminal output.

### Backend Logs
FastAPI logs all requests to the terminal where `uvicorn` is running.

---

*COS360 School Management System — Testing Guide*
*March 2026*
