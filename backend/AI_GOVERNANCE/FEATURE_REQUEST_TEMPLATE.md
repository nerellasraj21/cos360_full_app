# Feature Request Template

> Fill this template and provide it when requesting a new feature implementation.

---

## Feature Information

**Feature Name:** [e.g., Student Attendance Tracking]

**Target Module:** [e.g., student_management / masters / fee / expense / admin / reports]

**Priority:** [High / Medium / Low]

---

## Description

**What should this feature do?**

[Describe in 2-3 sentences what the feature accomplishes]

**Why is this feature needed?**

[Business justification or user story]

---

## Data Requirements

**Primary Entity:** [e.g., Attendance]

**Fields/Attributes:**

| Field Name | Type | Required | Description |
| ---------- | ---- | -------- | ----------- |
| | | | |
| | | | |
| | | | |

**Relationships:**

- Related to: [e.g., Student, Class, Academic Year]
- Foreign keys: [e.g., student_id, class_id]

---

## API Endpoints Required

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | /api/v1/... | |
| POST | /api/v1/... | |
| PUT | /api/v1/... | |
| DELETE | /api/v1/... | |

---

## Access Control

**Who can use this feature?**

| Operation | Allowed Roles |
| --------- | ------------- |
| Create | [e.g., Teacher, Admin] |
| Read | [e.g., Teacher, Admin, Parent] |
| Update | [e.g., Teacher, Admin] |
| Delete | [e.g., Admin only] |

**Plan Restrictions:** [Should this be limited to certain subscription plans? Yes/No]

---

## Business Rules

1. [Rule 1: e.g., Attendance can only be marked once per student per day]
2. [Rule 2: e.g., Cannot mark attendance for future dates]
3. [Rule 3: ...]

---

## Validation Rules

| Field | Validation |
| ----- | ---------- |
| | [e.g., Must be positive number] |
| | [e.g., Cannot be empty] |
| | [e.g., Must be valid date] |

---

## UI/Response Requirements

**List Response Fields:**
- [ ] field1
- [ ] field2
- [ ] Include related entity names (not just IDs)

**Filters Required:**
- [ ] Filter by date range
- [ ] Filter by [field]
- [ ] Search by [field]

**Sorting:**
- Default sort: [e.g., created_at DESC]
- Sortable fields: [e.g., name, date, status]

**Pagination:** [Yes / No]

---

## Reference Feature (Optional)

**Similar to:** [e.g., "Similar to how Fee Collection works" or "Like the Expense Type CRUD"]

**Reference files:** [If you know them, e.g., app/api/v1/fee/fee_collection_endpoints.py]

---

## Additional Notes

[Any other requirements, edge cases, or considerations]

---

## Checklist (For AI to verify)

- [ ] Multi-tenant compatible (schema-aware)
- [ ] UUID primary keys
- [ ] Proper permission checks
- [ ] Follows project patterns
- [ ] Database migration included
- [ ] Error handling implemented
