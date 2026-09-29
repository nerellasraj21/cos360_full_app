# Exam Module User Flow Documentation

## Overview
The Exam Module manages the complete lifecycle of academic examinations from creation through result publication, with multi-role workflows for Admin, Staff, Teachers, Students, and Parents.

---

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXAM MODULE WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: EXAM SETUP (Admin/Staff)
├── 1. Create Exam
│   └── Define: Name, Academic Year, Status (Draft/Active/Completed)
│
├── 2. Configure Exam Settings
│   ├── Max marks, Pass marks, Grade scale
│   ├── Result calculation rules
│   └── Grade point assignment
│
├── 3. Create Exam Dates/Timetable
│   ├── Set exam date & time
│   ├── Assign subject to each date slot
│   └── Assign classes/sections to dates
│
└── 4. Configure Subjects per Stream
    ├── Select stream (Commerce, Science, etc.)
    ├── Assign subjects for that stream
    └── Set marks weight per subject

                           ↓

PHASE 2: MARK ENTRY & SUBMISSION (Teachers)
├── 1. Teacher Views Exam & Subjects
│   └── See assigned classes/subjects for mark entry
│
├── 2. Enter Student Marks
│   ├── Select class → section → subject
│   ├── Input marks for each student
│   └── Save/Submit marks
│
└── 3. View Mark Sheet
    └── Verify entered marks before final submission

                           ↓

PHASE 3: RESULT PROCESSING (Admin/Staff)
├── 1. Generate Results
│   ├── Calculate total marks (sum of subjects)
│   ├── Apply grades based on settings
│   └── Generate report cards
│
├── 2. Publish Results
│   └── Make results visible to students/parents
│
└── 3. View Reports/Analytics
    ├── Class-wise performance
    ├── Subject-wise analytics
    └── Student-wise grade cards

                           ↓

VIEW PERMISSIONS (by Role)
├── Admin → Full access (create, edit, view all)
├── Staff → Mark entry & result publication
├── Teacher → Mark entry only
├── Student → View own marks & results
└── Parent → View child's marks & results
```

---

## Data Flow

```
Exam → ExamSettings → ExamDates → ExamSubjectConfig → MarkedResults → GradeCard
```

---

## Phase 1: Exam Setup

### 1.1 Create Exam
**User**: Admin/Staff
**Action**: Create a new exam record
**Input Fields**:
- Exam Name (e.g., "Mid Term Exam", "Final Exam")
- Academic Year (e.g., 2024-2025)
- Description (optional)
- Status: Draft → Active → Completed

**Output**: Exam ID created, ready for configuration

---

### 1.2 Configure Exam Settings
**User**: Admin/Staff
**Action**: Define grading and evaluation criteria
**Configuration**:
- Maximum marks per subject
- Pass marks threshold
- Grade scale (A, B, C, D, F, etc.)
- Grade point mapping (A = 4.0, B = 3.0, etc.)
- Result calculation method (total, average, weighted)

**Stored in**: ExamSettings table

---

### 1.3 Create Exam Dates & Timetable
**User**: Admin/Staff
**Action**: Schedule when exams will be held
**Details**:
- Exam date (calendar date)
- Start time & end time
- Duration (in minutes)
- Subject to be examined
- Classes/Sections participating

**Example**:
```
Date: 2025-03-20, Time: 09:00-11:00, Subject: Mathematics, Classes: 9A, 9B, 10A
Date: 2025-03-21, Time: 09:00-11:00, Subject: English, Classes: 9A, 9B, 10A
```

**Stored in**: ExamDate table

---

### 1.4 Configure Subjects per Stream
**User**: Admin/Staff
**Action**: Assign subjects to academic streams
**Logic**:
- Select stream (Commerce, Science, Humanities, General)
- Add subjects for that stream (Math, Physics, Chemistry, etc.)
- Define subject weight in final result (if weighted calculation)

**Example**:
```
Stream: Science
├── Physics (weight: 25%)
├── Chemistry (weight: 25%)
├── Mathematics (weight: 25%)
└── English (weight: 25%)
```

**Stored in**: ExamSubjectConfig table

---

## Phase 2: Mark Entry & Submission

### 2.1 Teacher Views Assignments
**User**: Teacher
**Action**: See which classes/subjects they need to enter marks for
**View Shows**:
- List of assigned classes
- List of subjects for each class
- Status: Pending, In Progress, Submitted

---

### 2.2 Enter Student Marks
**User**: Teacher
**Action**: Input marks for students in assigned subject
**Steps**:
1. Select Exam → Class → Section → Subject
2. System shows all students in that section
3. Enter marks for each student (validated against max marks)
4. Save draft or submit

**Validation**:
- Marks must be ≤ max marks
- Marks must be ≥ 0
- All students must have marks before submission

**Stored in**: Mark Entry records (linked to Exam → Subject → Student)

---

### 2.3 View & Verify Mark Sheet
**User**: Teacher
**Action**: Review entered marks before final submission
**Shows**:
- Student name
- Entered marks
- Max marks
- Percentage

---

## Phase 3: Result Processing

### 3.1 Generate Results
**User**: Admin/Staff
**Automatic Process**:
1. Fetch all marks for students in exam
2. Calculate total marks (sum of all subject marks)
3. Calculate percentage
4. Assign grade based on ExamSettings grade scale
5. Assign grade points

**Example**:
```
Student: Ram
├── Math: 85/100
├── Physics: 78/100
├── Chemistry: 92/100
├── English: 88/100
├── Total: 343/400 (85.75%)
└── Grade: A (Grade Point: 4.0)
```

---

### 3.2 Publish Results
**User**: Admin/Staff
**Action**: Make results visible to students and parents
**Toggles**:
- Change exam status to "Completed"
- Enable result visibility flag
- Results become visible to Student/Parent roles

---

### 3.3 View Reports & Analytics
**User**: Admin/Staff
**Available Reports**:
- Class-wise average marks
- Subject-wise performance
- Grade distribution (A: 5%, B: 15%, C: 40%, etc.)
- Student-wise report cards

---

## Role-Based Permissions

| Role | Create Exam | Configure Settings | Mark Entry | View Results | Publish Results |
|------|:-----------:|:------------------:|:----------:|:------------:|:---------------:|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| Staff | ✓ | ✓ | ✓ | ✓ | ✓ |
| Teacher | ✗ | ✗ | ✓ | ✓ | ✗ |
| Student | ✗ | ✗ | ✗ | ✓* | ✗ |
| Parent | ✗ | ✗ | ✗ | ✓* | ✗ |

*Only their own/child's results

---

## Key Entities

### Exam
- **Purpose**: Root entity for an examination
- **Fields**: id, name, academic_year, description, status, created_at, updated_at
- **Status**: Draft → Active → Completed

### ExamSettings
- **Purpose**: Grading rules and criteria
- **Fields**: exam_id, max_marks, pass_marks, grade_scale (A/B/C/D/F), grade_point_mapping

### ExamDate
- **Purpose**: Timetable and scheduling
- **Fields**: exam_id, date, start_time, end_time, subject_id, duration_minutes

### ExamSubjectConfig
- **Purpose**: Subject-stream mapping
- **Fields**: exam_id, stream_id, subject_id, weight_percentage

### ExamClassSection
- **Purpose**: Classes/sections participating in exam
- **Fields**: exam_id, class_id, section_id, stream_id

### ExamStream
- **Purpose**: Academic streams available in exam
- **Fields**: exam_id, stream_id, stream_name

---

## Status Transitions

```
EXAM STATUS FLOW:
Draft → Active → Completed
 ↓       ↓         ↓
 │      Can add   Can view
 │    subjects,   results &
 └─────  dates,   analytics
         marks
```

---

## Common Workflows

### Scenario 1: Mid-Term Exam Setup
1. Admin creates exam "Mid-Term 2025"
2. Admin configures settings (max marks = 100, pass = 40)
3. Admin creates exam dates (3 subjects over 3 days)
4. Teachers enter marks for their subjects
5. Admin publishes results
6. Students & Parents view results

### Scenario 2: Mark Entry by Teacher
1. Teacher logs in → Views "Mark Entry" section
2. Selects exam, class, and subject
3. Sees student list with empty marks field
4. Enters marks for each student
5. Validates and submits
6. System records submission timestamp

### Scenario 3: Student Views Results
1. Student logs in after results published
2. Views "My Results" → Selects exam
3. Sees marks for each subject, total, and grade
4. Can download report card

---

## Notes

- **Multi-Tenant**: Separate exam data per school/organization
- **Async Processing**: Mark entry and result generation use async tasks
- **Validation**: All mark entries validated against max marks and data integrity rules
- **Audit Trail**: Created/Updated timestamps tracked for all entities
- **Phase Status**: Phase 1 & 2 complete; Phase 3 endpoints ready (result generation & publishing)

---

**Document Version**: 1.0
**Last Updated**: March 2026
**Module Status**: Exam Phase 1+2 Complete (12 endpoint files, 15 models)
