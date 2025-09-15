# Expense Tracker Workflow - COS360 School Management System

## 📋 **OVERVIEW**
The Expense Tracker module provides comprehensive expense management for educational institutions, enabling tracking, categorization, approval workflows, and detailed reporting of all institutional expenses.

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **Database Structure**
```
Expense Management Hierarchy:
├── expense_categories (Operational, Academic, Infrastructure, etc.)
├── expense_types (Office Supplies, Utilities, Equipment, etc.)
├── expense_transactions (Main expense records)
│   └── expense_transaction_items (Line items within transactions)
├── expense_attachments (Receipts, invoices, documents)
├── expense_settings (Approval limits, workflows, policies)
├── expense_audit_logs (Complete audit trail)
└── expense_reports (Generated reports and analytics)
```

### **Permission Structure**
- **Plan Level**: Enterprise plan includes all expense features
- **Role Level**: Admin, Finance Manager, Department Heads with varying permissions
- **Actions**: create, read, update, delete, list for each resource

---

## 🔄 **COMPLETE EXPENSE WORKFLOW**

### **Phase 1: Setup & Configuration**

#### **1.1 Initial System Setup**
```
1. Admin creates expense categories
   └── Examples: Operations, Academics, Infrastructure, HR, Marketing

2. Admin defines expense types per category
   └── Operations: Office Supplies, Utilities, Maintenance
   └── Academics: Books, Lab Equipment, Software Licenses
   └── Infrastructure: Building Repairs, Technology, Furniture

3. Admin configures expense settings
   └── Approval limits by role/amount
   └── Required documentation rules
   └── Workflow automation settings
```

#### **1.2 Access Control Setup**
```
1. Plan Assignment (Super Admin)
   └── Assign Enterprise plan to tenant
   └── Expense resources automatically available

2. Role Permission Assignment (Tenant Admin)
   └── Admin: Full access (create, read, update, delete, list)
   └── Finance Manager: Transaction management, reporting
   └── Department Head: View department expenses, create requests
   └── Staff: Submit expense requests only
```

### **Phase 2: Expense Transaction Lifecycle**

#### **2.1 Expense Request Creation**
```
Workflow: Staff/Department → Finance Review → Admin Approval → Payment

1. User Access
   POST /api/v1/expense/transactions/
   Headers: Authorization: Bearer <token>, cschema: <tenant>

2. Transaction Creation
   ├── Select expense category and type
   ├── Enter transaction details (amount, description, date)
   ├── Add line items if multi-item expense
   ├── Attach supporting documents (receipts, invoices)
   └── Submit for approval

3. System Validation
   ├── Check user permissions
   ├── Validate required fields
   ├── Verify attachment requirements
   ├── Apply approval workflow rules
   └── Create audit log entry
```

#### **2.2 Document Management**
```
Attachment Workflow:
1. Upload Receipt/Invoice
   POST /api/v1/expense/attachments/

2. Document Processing
   ├── Virus scanning
   ├── File type validation
   ├── Size limit enforcement
   ├── Metadata extraction
   └── Secure storage

3. Document Verification
   ├── Link to transaction
   ├── Integrity verification (SHA-256)
   ├── Access control enforcement
   └── Backup creation
```

#### **2.3 Approval Workflow**
```
Multi-Level Approval Process:

1. Department Level (if applicable)
   ├── Department Head review
   ├── Budget validation
   ├── Approve/Reject/Request changes
   └── Forward to Finance

2. Finance Review
   ├── Financial policy compliance
   ├── Budget availability check
   ├── Documentation verification
   ├── Approve/Reject/Request additional info
   └── Forward to final approval

3. Final Approval (Admin/Finance Manager)
   ├── Final authorization
   ├── Payment approval
   ├── Vendor management
   └── Transaction completion
```

### **Phase 3: Transaction Management**

#### **3.1 Transaction Processing**
```
API Endpoints for Transaction Management:

1. List Transactions
   GET /api/v1/expense/transactions/
   ├── Filtering: date range, category, status, amount
   ├── Sorting: date, amount, status
   ├── Pagination: efficient large dataset handling
   └── Role-based visibility

2. Update Transactions
   PUT /api/v1/expense/transactions/{id}
   ├── Status updates (pending, approved, rejected, paid)
   ├── Amount modifications (with approval)
   ├── Document updates
   └── Approval workflow progression

3. Transaction Items Management
   GET/POST/PUT/DELETE /api/v1/expense/transaction-items/
   ├── Line-item details
   ├── Quantity and unit pricing
   ├── Category-specific fields
   └── Cost center allocation
```

#### **3.2 Expense Categories & Types**
```
Master Data Management:

1. Category Management
   GET/POST/PUT/DELETE /api/v1/expense/categories/
   ├── Hierarchical structure support
   ├── Budget allocation per category
   ├── Approval workflow assignment
   └── Reporting groupings

2. Type Management
   GET/POST/PUT/DELETE /api/v1/expense/types/
   ├── Category association
   ├── Required field definitions
   ├── Default approval limits
   └── Tax treatment settings
```

### **Phase 4: Monitoring & Compliance**

#### **4.1 Audit & Logging**
```
Complete Audit Trail:

1. Audit Log Creation
   POST /api/v1/expense/audit-logs/
   ├── User action tracking
   ├── Data change logging
   ├── Approval workflow steps
   └── System-generated events

2. Audit Log Review
   GET /api/v1/expense/audit-logs/
   ├── Chronological activity view
   ├── User-specific action history
   ├── Compliance reporting
   └── Forensic analysis support
```

#### **4.2 Settings & Configuration**
```
System Configuration Management:

1. Settings Management
   GET/POST/PUT /api/v1/expense/settings/
   ├── Approval limits by role
   ├── Required documentation rules
   ├── Auto-approval thresholds
   ├── Integration settings
   └── Notification preferences

2. Policy Enforcement
   ├── Spending limits by category/user
   ├── Required approval chains
   ├── Documentation requirements
   ├── Time-based restrictions
   └── Budget ceiling controls
```

### **Phase 5: Reporting & Analytics**

#### **5.1 Standard Reports**
```
Built-in Reporting Suite:

1. Financial Reports
   GET /api/v1/expense/reports/
   ├── Monthly/Quarterly/Annual summaries
   ├── Category-wise breakdowns
   ├── Department-wise spending
   ├── Vendor analysis
   └── Budget vs. actual comparisons

2. Operational Reports
   ├── Approval workflow efficiency
   ├── Average processing times
   ├── User activity summaries
   ├── Compliance metrics
   └── Outstanding approvals
```

#### **5.2 Custom Analytics**
```
Advanced Reporting Capabilities:

1. Trend Analysis
   ├── Spending patterns over time
   ├── Seasonal variations
   ├── Cost center performance
   └── Vendor relationship analysis

2. Budget Management
   ├── Real-time budget tracking
   ├── Variance analysis
   ├── Forecast vs. actual
   └── Alert systems for overruns
```

---

## 🔐 **SECURITY & ACCESS CONTROL**

### **Authentication Flow**
```
1. User Login
   POST /api/v1/auth/login
   Headers: cschema: <tenant_name>
   Body: {"username": "admin", "password": "testpass123"}

2. JWT Token Validation
   ├── User authentication
   ├── Role assignment verification
   ├── Tenant context establishment
   └── Permission matrix loading

3. Request Authorization
   ├── Plan-level permission check (Enterprise plan)
   ├── Role-level permission check (Admin role)
   ├── Resource-action validation
   └── Access granted/denied
```

### **Permission Matrix**
```
Role-Based Access Control:

Admin (Full Access):
├── expense_categories: create, read, update, delete, list
├── expense_types: create, read, update, delete, list
├── expense_transactions: create, read, update, delete, list
├── expense_transaction_items: create, read, update, delete, list
├── expense_attachments: create, read, update, delete, list
├── expense_settings: create, read, update, delete, list
├── expense_audit_logs: create, read, update, delete, list
└── expense_reports: create, read, update, delete, list

Finance Manager (Transaction Focus):
├── expense_transactions: create, read, update, delete, list
├── expense_transaction_items: create, read, update, delete, list
├── expense_attachments: read, list
├── expense_audit_logs: read, list
└── expense_reports: read, list

Department Head (Department-Scoped):
├── expense_transactions: create, read (own department)
├── expense_transaction_items: create, read (own department)
├── expense_attachments: create, read (own transactions)
└── expense_reports: read (department reports)

Staff (Request Only):
├── expense_transactions: create, read (own requests)
├── expense_transaction_items: create, read (own items)
└── expense_attachments: create, read (own documents)
```

---

## 📊 **TESTING & VERIFICATION**

### **System Testing Credentials**
```
Test Environment Access:
├── Tenant: test_tenant
├── Schema: test_tenant_schema
├── Username: admin
├── Password: testpass123
├── Header: cschema: test_tenant
├── User ID: 3f03c2f4-0aaa-4fe1-b254-3a3acc35ec6c
└── Role ID: 2fe97570-0740-44c5-911f-9826e0258a9b
```

### **Verification Commands**
```bash
# 1. Login and get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "cschema: test_tenant" \
  -d '{"username": "admin", "password": "testpass123"}'

# 2. Test expense categories access
curl -X GET "http://localhost:8000/api/v1/expense/categories/" \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant"

# 3. Test expense transaction creation
curl -X POST "http://localhost:8000/api/v1/expense/transactions/" \
  -H "Authorization: Bearer <token>" \
  -H "cschema: test_tenant" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100.00, "description": "Test expense"}'
```

---

## 🚀 **IMPLEMENTATION STATUS**

### **✅ Completed Components**
- **Database Schema**: All 8 expense tables created and synchronized
- **API Endpoints**: 8 resource endpoints with full CRUD operations
- **Permission System**: 40 permissions (8 resources × 5 actions) added to Admin role
- **Plan Integration**: Expense resources included in Enterprise plan
- **Authentication**: Multi-tenant login working with correct headers
- **Testing**: Complete system verification completed

### **🔧 Configuration Requirements**
- **Plan Assignment**: Tenant must have Enterprise plan for expense features
- **Role Permissions**: Admin role must have expense permissions configured
- **Database Sync**: Both main and test schemas must have expense tables
- **Headers**: Must use `cschema: <tenant>` for proper tenant routing

### **📈 Next Phase Recommendations**
- **UI Integration**: Frontend components for expense management
- **Workflow Automation**: Automated approval routing based on rules
- **Integration**: Connection with accounting systems and payment gateways
- **Advanced Reporting**: Custom report builder and scheduled reports
- **Mobile App**: Mobile expense submission and approval capabilities

---

**Status**: ✅ **FULLY OPERATIONAL**
**Last Verified**: September 15, 2025
**System Health**: 🚀 **PRODUCTION READY**