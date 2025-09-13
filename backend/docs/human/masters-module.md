# Masters Data Management Module

## 📋 Module Overview
The Masters module forms the foundation of COS360, managing all core academic data structures. This module handles the organizational hierarchy of educational institutions, from academic years to individual class-subject assignments.

## 🎯 Business Purpose
- **Academic Structure**: Establish the fundamental academic framework
- **Data Foundation**: Provide reference data for all other system modules
- **Organizational Hierarchy**: Define relationships between academic entities
- **Planning Support**: Enable academic year planning and resource allocation

## 🔧 Core Features

### 1. Academic Year Management
**Business Value**: Segregates all academic activities by year, enabling year-over-year tracking and planning.

```mermaid
flowchart TD
    A[Start New Academic Year] --> B[Define Year Period]
    B --> C[Set Start & End Dates]
    C --> D[Mark as Active/Inactive]
    D --> E[Academic Year Created]
    E --> F[Link to Classes & Students]
    F --> G[Enable Fee Structure Setup]
    G --> H[Begin Academic Operations]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style H fill:#fff3e0
```

**Key Workflows**:
- Create academic year with date ranges
- Activate/deactivate years for data segregation
- Dropdown selection for year-based filtering

### 2. Class & Section Management
**Business Value**: Organizes students into manageable groups for instruction and administration.

```mermaid
flowchart LR
    A[Grade Structure] --> B[Create Classes]
    B --> C[Define Sections]
    C --> D[Set Capacity Limits]
    D --> E[Assign Students]
    E --> F[Link to Subjects]
    F --> G[Enable Timetabling]

    B --> B1[Grade 1]
    B --> B2[Grade 2]
    B --> B3[Grade N]

    C --> C1[Section A]
    C --> C2[Section B]
    C --> C3[Section N]

    style A fill:#e1f5fe
    style G fill:#fff3e0
```

**Key Workflows**:
- Create grade levels (classes)
- Subdivide into sections with capacity limits
- Retrieve sections by class for student assignment

### 3. Subject Management
**Business Value**: Defines curriculum structure and enables academic planning.

```mermaid
flowchart TD
    A[Curriculum Planning] --> B[Create Subject Categories]
    B --> C[Define Individual Subjects]
    C --> D[Set Subject Codes]
    D --> E[Assign to Classes]
    E --> F[Map to Academic Year]
    F --> G[Enable Class-Subject Assignment]
    G --> H[Support Timetable Creation]

    B --> B1[Science]
    B --> B2[Mathematics]
    B --> B3[Languages]
    B --> B4[Arts]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style H fill:#fff3e0
```

**Key Workflows**:
- Categorize subjects for organization
- Create subjects with unique codes
- Filter subjects by category for assignment

### 4. Class-Subject Mapping
**Business Value**: Defines which subjects are taught to which classes, supporting academic planning and timetabling.

```mermaid
flowchart LR
    A[Academic Planning] --> B[Select Class]
    B --> C[Choose Academic Year]
    C --> D[Bulk Assign Subjects]
    D --> E[Set Teaching Order]
    E --> F[Configure Mark Settings]
    F --> G[Enable Timetabling]
    G --> H[Support Teacher Assignment]

    D --> D1[Subject 1]
    D --> D2[Subject 2]
    D --> D3[Subject N]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style H fill:#fff3e0
```

**Key Workflows**:
- Map multiple subjects to a class at once
- Set subject order for display and scheduling
- Configure exam/marking preferences per subject

### 5. Staff & Designation Management
**Business Value**: Manages human resources and organizational roles within the institution.

```mermaid
flowchart TD
    A[HR Management] --> B[Create Designations]
    B --> C[Add Staff Members]
    C --> D[Assign Roles]
    D --> E[Set Hire Dates]
    E --> F[Configure Access Permissions]
    F --> G[Enable Subject Teaching]
    G --> H[Support Transport Assignment]

    B --> B1[Principal]
    B --> B2[Teacher]
    B --> B3[Admin Staff]
    B --> B4[Driver]

    style A fill:#e1f5fe
    style F fill:#c8e6c9
    style H fill:#fff3e0
```

**Key Workflows**:
- Define organizational roles and titles
- Onboard staff with complete profiles
- Link staff to system permissions and duties

### 6. Holiday Management
**Business Value**: Plans academic calendar and manages institutional holidays.

```mermaid
flowchart LR
    A[Calendar Planning] --> B[Define Holidays]
    B --> C[Set Holiday Dates]
    C --> D[Add Descriptions]
    D --> E[Update Academic Calendar]
    E --> F[Inform Attendance System]
    F --> G[Support Fee Calculations]

    B --> B1[National Holidays]
    B --> B2[Religious Festivals]
    B --> B3[School Events]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style G fill:#fff3e0
```

**Key Workflows**:
- Plan yearly holiday calendar
- Filter holidays by month/year for planning
- Integrate with attendance and fee systems

### 7. Parent Management
**Business Value**: Maintains parent/guardian information for student relationships and communication.

```mermaid
flowchart TD
    A[Student Admission] --> B[Capture Parent Details]
    B --> C[Record Contact Information]
    C --> D[Set Occupation Details]
    D --> E[Link to Students]
    E --> F[Enable Communication]
    F --> G[Support Fee Notifications]
    G --> H[Emergency Contact Access]

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style H fill:#fff3e0
```

**Key Workflows**:
- Register parents during student admission
- Maintain updated contact information
- Link parents to multiple children if applicable

### 8. Timetable Management
**Business Value**: Schedules academic activities and optimizes resource utilization.

```mermaid
flowchart LR
    A[Academic Scheduling] --> B[Create Timetable]
    B --> C[Select Class & Year]
    C --> D[Set Effective Dates]
    D --> E[Schedule Subjects]
    E --> F[Assign Time Slots]
    F --> G[Allocate Teachers]
    G --> H[Publish Schedule]

    style A fill:#e1f5fe
    style G fill:#c8e6c9
    style H fill:#fff3e0
```

**Key Workflows**:
- Create term-based timetables for classes
- Set validity periods for schedule changes
- Link to class-subject mappings for consistency

## 🔄 Integrated Business Workflows

### Complete Academic Setup Process
```mermaid
flowchart TD
    A[New School Year Setup] --> B[Create Academic Year]
    B --> C[Setup Class Structure]
    C --> D[Define Subjects & Categories]
    D --> E[Map Subjects to Classes]
    E --> F[Onboard Staff]
    F --> G[Create Timetables]
    G --> H[Configure Holidays]
    H --> I[System Ready for Students]

    style A fill:#ffebee
    style I fill:#e8f5e8
```

### Daily Operational Flow
```mermaid
flowchart LR
    A[Daily Operations] --> B[Check Holiday Calendar]
    B --> C[Follow Timetable Schedule]
    C --> D[Staff Assignment Reference]
    D --> E[Class-Subject Delivery]
    E --> F[Student-Parent Communication]

    style A fill:#e3f2fd
    style F fill:#fff3e0
```

## 📊 Data Relationships

### Master Data Hierarchy
```mermaid
erDiagram
    ACADEMIC_YEAR ||--o{ CLASSES : "contains"
    CLASSES ||--o{ SECTIONS : "divided into"
    SUBJECT_CATEGORIES ||--o{ SUBJECTS : "groups"
    CLASSES ||--o{ CLASS_SUBJECT_MAPPINGS : "teaches"
    SUBJECTS ||--o{ CLASS_SUBJECT_MAPPINGS : "taught in"
    ACADEMIC_YEAR ||--o{ CLASS_SUBJECT_MAPPINGS : "valid for"
    DESIGNATIONS ||--o{ STAFF : "holds"
    PARENTS ||--o{ STUDENTS : "guardian of"
    ACADEMIC_YEAR ||--o{ TIMETABLES : "scheduled for"
    CLASSES ||--o{ TIMETABLES : "has schedule"
```

## 💼 Business Benefits

### For School Administrators
- **Structured Data**: Clear academic hierarchy and organization
- **Planning Support**: Tools for academic year and curriculum planning
- **Resource Management**: Staff and facility allocation support
- **Compliance**: Holiday planning and calendar management

### For Academic Staff
- **Clear Structure**: Well-defined class and subject organization
- **Schedule Management**: Integrated timetable and holiday systems
- **Student Context**: Parent and guardian information access

### For System Operations
- **Data Foundation**: Reliable reference data for all other modules
- **Relationship Integrity**: Consistent data relationships across the system
- **Flexibility**: Support for various academic structures and requirements

## 🚀 Getting Started

### Initial Setup Checklist
1. **Create Academic Year** - Define the current academic period
2. **Setup Class Structure** - Create grades and sections
3. **Configure Subjects** - Define curriculum and subject categories
4. **Onboard Staff** - Add teachers and administrative staff
5. **Plan Calendar** - Configure holidays and important dates
6. **Create Mappings** - Link subjects to appropriate classes
7. **Generate Timetables** - Schedule academic activities

### Best Practices
- Start with academic year setup before any other configuration
- Maintain consistent naming conventions for classes and subjects
- Regularly update staff and parent contact information
- Plan holiday calendar at the beginning of each academic year
- Use bulk operations for efficient class-subject mapping

---

**Next Module**: [Fee Collection System →](./fee-module.md)

**Back to**: [Main Documentation](./README.md)