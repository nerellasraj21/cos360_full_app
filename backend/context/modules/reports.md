# Module Context - Reports

Version: 1.0
Generated On: 2025-12-26
Source: Codebase Analysis
Confidence Level: High

---

## Responsibility

[EVIDENCE-BASED]

The Reports module provides analytical and export capabilities:
- Student reports and summaries
- Staff reports and summaries
- Fee collection and pending reports
- Attendance reports
- Financial reports
- Export functionality (CSV, Excel, PDF)
- Background job support for large exports

Evidence: `app/api/v1/reports/`, `app/service/reports/`, `context_guide.json:771-901`

---

## Key Components

[EVIDENCE-BASED]

### Services
| Service | File | Purpose |
|---------|------|---------|
| BaseReportService | `base_report_service.py` | Common export functionality |
| StudentReportService | `student_report_service.py` | Student analytics |
| StaffReportService | `staff_report_service.py` | Staff analytics |
| FeeReportService | `fee_report_service.py` | Fee analytics |
| AttendanceReportService | `attendance_report_service.py` | Attendance analytics |
| FinancialReportService | `financial_report_service.py` | Financial analytics |

### API Endpoints
| Endpoint File | Routes |
|--------------|--------|
| `student_reports.py` | `/api/v1/reports/students/` |
| `staff_reports.py` | `/api/v1/reports/staff/` |
| `fee_reports.py` | `/api/v1/reports/fees/` |
| `attendance_reports.py` | `/api/v1/reports/attendance/` |
| `financial_reports.py` | `/api/v1/reports/financial/` |
| `reports.py` | `/api/v1/reports/` (audit, download) |

---

## Report Types

[EVIDENCE-BASED]

### Student Reports
- Student summary report
- Student export (CSV, Excel, PDF)

### Staff Reports
- Staff summary report
- Staff export (CSV, Excel, PDF)

### Fee Reports
- Fee collection summary
- Pending fees report
- Fee structure report
- Statistics for each report type

Evidence: `context_guide.json:854-887`

### Attendance Reports
- Attendance summary
- Attendance by class/section
- Attendance trends

### Financial Reports
- Revenue reports
- Expense summaries
- Financial trends

---

## Export Capabilities

[EVIDENCE-BASED]

### Supported Formats
1. **CSV** - Standard comma-separated values
2. **Excel** - Professional formatting via openpyxl
3. **PDF** - Professional layout via reportlab

### Excel Export Features
- Professional table formatting
- Header styling
- Alternating row colors

Evidence: `context_guide.json:798-810`

### PDF Export Features
- A4 page size
- Custom title and subtitle
- Generation timestamp
- Styled tables
- Record count display

Evidence: `context_guide.json:811-828`

---

## Background Job Support

[EVIDENCE-BASED]

### Implementation
- Uses Celery for async task processing
- Redis as message broker
- Automatic routing based on data size

### Thresholds
- >1000 records: Background job
- >500 records (Excel): Background job
- >300 records (PDF): Background job

Evidence: `context_guide.json:829-853`

### Job Tracking
```
GET /api/v1/reports/audit
  - Export history

GET /api/v1/reports/audit/{audit_id}
  - Export status

GET /api/v1/reports/download/{audit_id}
  - Download completed file
```

---

## Public Interfaces

[EVIDENCE-BASED]

### Student Report Endpoints
```
GET    /api/v1/reports/students/summary
  - Student summary statistics

GET    /api/v1/reports/students/export
  - Export student data
  - Query params: format (csv, excel, pdf)
```

### Staff Report Endpoints
```
GET    /api/v1/reports/staff/summary
  - Staff summary statistics

GET    /api/v1/reports/staff/export
  - Export staff data
```

### Fee Report Endpoints
```
GET    /api/v1/reports/fees/collection-summary
  - Fee collection report

GET    /api/v1/reports/fees/collection-summary/stats
  - Collection statistics

GET    /api/v1/reports/fees/pending-fees
  - Pending fees report

GET    /api/v1/reports/fees/pending-fees/stats
  - Pending fees statistics

GET    /api/v1/reports/fees/fee-structure
  - Fee structure report

GET    /api/v1/reports/fees/fee-structure/stats
  - Fee structure statistics

GET    /api/v1/reports/fees/export
  - Export fee reports
```

### Attendance Report Endpoints
```
GET    /api/v1/reports/attendance/summary
GET    /api/v1/reports/attendance/by-class
GET    /api/v1/reports/attendance/trends
GET    /api/v1/reports/attendance/export
```

### Financial Report Endpoints
```
GET    /api/v1/reports/financial/revenue
GET    /api/v1/reports/financial/expenses
GET    /api/v1/reports/financial/summary
GET    /api/v1/reports/financial/export
```

---

## Permissions Required

[EVIDENCE-BASED]

### Student Reports
- `student_reports:read`
- `student_reports:export`

### Staff Reports
- `staff_reports:read`
- `staff_reports:export`

### Fee Reports
- `fee_reports:read`
- `fee_reports:export`
- `fee_reports:stats`

### General
- `reports:read`
- `reports:audit`

Evidence: `context_guide.json:782-792`

---

## Dependencies

[EVIDENCE-BASED]

### Internal Dependencies
- Student Module (student data)
- Masters Module (staff, classes)
- Fee Module (transactions, mappings)
- Authentication Module (permissions)

### External Dependencies
- `openpyxl` - Excel generation
- `reportlab` - PDF generation
- `celery` - Background jobs
- `redis` - Task queue

---

## Known Issues

[EVIDENCE-BASED]

### Fee Reports Permission Issue
- Plan permissions not inherited by Admin role
- Admin role returns 403 Forbidden on fee reports
- Student reports work, fee reports don't

Evidence: `context_guide.json:888-899`

### Excel Export 500 Errors
- Export methods work in isolation
- Endpoints return 500 errors
- Needs debugging

Evidence: `context_guide.json:803-810`

---

## Known Risks

[INFERENCE]

### Performance
1. **Large Datasets**: Reports on large data may timeout
2. **Concurrent Exports**: Multiple large exports may strain resources

### Storage
1. **Export Files**: Completed exports stored on filesystem
2. **Cleanup Policy**: File retention policy not visible

---

## Test Coverage

[EVIDENCE-BASED]

Phase 1 Complete (2025-09-23):
- Student reports: Working
- Staff reports: Working
- Permission integration verified

Evidence: `context_guide.json:771-792`

---

## Uncertainties

[UNCERTAIN]

1. **Scheduled Reports**: No scheduled/recurring report generation visible
2. **Email Delivery**: Report email delivery not documented
3. **Custom Reports**: Custom report builder not observed
4. **Dashboard Integration**: Real-time dashboard capabilities unclear

---

## Module Status

[EVIDENCE-BASED]

- **Phase 1**: COMPLETE - Basic reports working
- **Phase 2 (Excel/PDF Export)**: 70% complete - 500 errors pending
- **Phase 3 (Fee Reports)**: Permission issues to resolve

Evidence: `context_guide.json:793-901`

---

## Compliance Statement

> This document complies with **AI_HALLUCINATION_SOP.md**.
> All statements are evidence-based or explicitly marked.
