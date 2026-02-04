# AI Agent Handover Document

## Metadata

- **Agent Name:** Business Intent Agent (Frontend)
- **Issue / Feature ID:** Student Admission Form Feature Requests
- **Date:** 2025-12-28

---

## 1. Inputs Received

| Input Type              | Source                                                     | Status    |
| ----------------------- | ---------------------------------------------------------- | --------- |
| Business Change Request | `features/student admission/student_admission_features.md` | Reviewed  |
| Business Approval       | User confirmation                                          | Confirmed |
| Project Context         | `context/PROJECT_CONTEXT.md`                               | Reviewed  |
| Students Module Context | `context/modules/students.md`                              | Reviewed  |
| Masters Module Context  | `context/modules/masters.md`                               | Reviewed  |

---

## 2. Outputs Produced

### Summary

Analyzed 11 business-approved feature requests across 4 pages of the Student Admission Form. Produced clarified business intent for each feature with success criteria, failure modes, and dependency identification.

### Feature Classification

| Category                  | Features                | Count |
| ------------------------- | ----------------------- | ----- |
| **Frontend-Only**         | #1, #2, #3, #4, #6, #11 | 6     |
| **Backend Required**      | #5, #7, #9, #10         | 4     |
| **Existing API (Verify)** | #8                      | 1     |

### Feature Summary Table

| #   | Feature                                 | Page | Confidence | Backend Needed |
| --- | --------------------------------------- | ---- | ---------- | -------------- |
| 1   | Remove Academic Year from Page 1        | 1    | Medium     | No             |
| 2   | Fix Tab Navigation for Dropdowns        | 1    | Medium     | No             |
| 3   | Optimize Class/Section UX               | 1    | Medium     | No             |
| 4   | Move Primary Status to Page 1           | 1→1  | Medium     | No             |
| 5   | Auto-Generate Admission Number          | 1    | Low        | **Yes**        |
| 6   | Mother Tongue Dropdown                  | 1    | High       | No             |
| 7   | Caste/Sub-Caste from Masters            | 2    | Low        | **Yes**        |
| 8   | Parent Search by Phone                  | 2    | Medium     | Verify         |
| 9   | Salary Range Dropdown                   | 2    | Low        | **Yes**        |
| 10  | Location Fields (State/District/Mandal) | 3    | Low        | **Yes**        |
| 11  | Remove "Experience" from Label          | 4    | High       | No             |

---

## 3. Evidence References

### Context Documents

- `context/PROJECT_CONTEXT.md` - Multi-tenant architecture, state management via Zustand (academicYearStore)
- `context/modules/students.md:149-175` - Student admission is permission-protected, multi-step form
- `context/modules/masters.md:114-127` - Academic year selection logic and validation

### Codebase Locations (Inferred, Not Verified)

- Admission form routes: `src/routes/_app/students/admission.tsx`
- Admission step components: `src/components/students/admission-steps/`
- Academic year store: `src/lib/academicYearStore.ts`

---

## 4. Assumptions

### Feature-Specific Assumptions

| Feature | Assumption                                                                    |
| ------- | ----------------------------------------------------------------------------- |
| #1      | Header always has valid academic year before form opens                       |
| #1      | Admitted Year = Current Year (no backdating allowed)                          |
| #3      | "Class/Section" = admission class; "Current Class/Section" = enrollment class |
| #4      | No Page 1 fields depend on Primary Status value                               |
| #5      | Primary Status must be selected before fetching admission number              |
| #6      | Language list will be maintained as master data or hardcoded                  |
| #7      | Caste → Sub-Caste is one-to-many relationship                                 |
| #8      | Phone number is unique identifier for parents                                 |
| #9      | Salary range field is optional                                                |
| #10     | Location data is India-specific (states, districts, mandals)                  |

---

## 5. Open Questions

### Requires Business Clarification

1. **Feature #3**: Should Class and Current Class be linked by default with option to unlink, OR should there be a checkbox "Same as Admission Class"?

2. **Feature #5**: Can users override the auto-generated admission number, or is it read-only?

3. **Feature #6**: What languages should be included in the Mother Tongue dropdown? Is there a master list?

4. **Feature #9**: Is salary range per parent (Father/Mother separately) or per household?

### Requires Backend Investigation

| Feature | Investigation Needed                                                                    |
| ------- | --------------------------------------------------------------------------------------- |
| #5      | Does endpoint exist for next admission number? Format specification?                    |
| #7      | Do caste/sub-caste master tables exist? API endpoints?                                  |
| #8      | Does parent search by phone endpoint exist? Response format?                            |
| #9      | Is parent table ready for salary_range field?                                           |
| #10     | Do location master tables exist (states, districts, mandals)? Pincode lookup available? |

---

## 6. Confidence Level

**Medium**

**Rationale:**

- Business intent is clear from the change request document
- 4 of 11 features have backend dependencies with uncertain availability
- Current form field structure not fully documented in context files
- Field locations (which fields are on which page) are inferred, not verified

---

## 7. Backend Handover Requirements

For features requiring backend work, the following specifications are needed:

### Feature #5: Admission Number Auto-Generation

```
Endpoint: GET /students/admissions/next-number
Query Params: type=primary|non_primary
Response: { "next_admission_number": "string" }
Notes: Separate sequences for Primary and Non-Primary admissions
```

### Feature #7: Caste/Sub-Caste Masters

```
Tables:
- castes (id, name, is_active)
- sub_castes (id, caste_id, name, is_active)

Endpoints:
- GET /masters/castes → List all castes
- GET /masters/castes/{id}/sub-castes → List sub-castes for caste

Student Schema Update:
- Add caste_id (FK)
- Add sub_caste_id (FK)
```

### Feature #9: Parent Salary Range

```
Parent Table Update:
- Add salary_range (enum or string)
- Suggested values: "below_1l", "1l_3l", "3l_5l", "5l_10l", "above_10l"

API Update:
- Include salary_range in parent create/update/read endpoints
```

### Feature #10: Location Masters

```
Tables:
- states (id, name, code, is_active)
- districts (id, state_id, name, is_active)
- mandals (id, district_id, name, is_active)

Endpoints:
- GET /masters/states
- GET /masters/states/{id}/districts
- GET /masters/districts/{id}/mandals
- (Optional) GET /masters/pincode/{pincode} → { state, district, mandal, city }

Address Schema Update:
- Add state_id (FK)
- Add district_id (FK)
- Add mandal_id (FK)
- Add pincode (string)
- Add city (string)
```

---

## 8. Recommended Implementation Order

### Phase 1: Frontend-Only (No Backend Dependency)

1. **#11** - Remove "Experience" from label (trivial)
2. **#6** - Mother Tongue dropdown (simple)
3. **#4** - Move Primary Status to Page 1 (field relocation)
4. **#1** - Remove Academic Year, use header value
5. **#2** - Fix Tab navigation for dropdowns
6. **#3** - Optimize Class/Section UX

### Phase 2: After Backend Confirmation

1. **#8** - Parent search by phone (if API exists)
2. **#5** - Admission number auto-generation
3. **#9** - Salary range dropdown
4. **#7** - Caste/Sub-Caste masters
5. **#10** - Location fields

---

## 9. Next Agent Handoff

This document is ready for:

1. **Technical Impact Agent** - To analyze codebase changes required for each feature
2. **Backend Team** - To review backend handover requirements (Section 7)
3. **Developer Agent** - To implement frontend-only features (Phase 1)

---

## Declaration

> This output complies with **AI_HALLUCINATION_SOP.md**.

All assertions are either:

- Directly quoted from input documents
- Marked as [UNCERTAIN] where evidence is lacking
- Listed as assumptions requiring validation

No APIs, files, or behaviors have been invented.
