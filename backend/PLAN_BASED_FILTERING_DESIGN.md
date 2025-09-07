# Plan-Based Menu Filtering - Architecture Design

## Current System Analysis

### Existing Infrastructure
```
PUBLIC SCHEMA:
├── plans (id: int, name, description, is_active) - EMPTY
├── plan_menu_access (id: int, plan_id: int, menu_id: int, is_active) - EMPTY
├── menus (id: int, name, url, level, parent_id) - EMPTY
├── menu_actions (id: int, menu_id: int, action_name, resource_name, description, is_active) - EMPTY
└── tenants (id: int, client_name, schema_name, is_active) - NO PLAN_ID

TENANT SCHEMA (cos360_main):
├── menus (id: uuid, name, url, level, parent_id, display_order) - EMPTY
├── role_menu_permissions (id: uuid, role_id: uuid, menu_id: uuid, can_view, can_edit)
└── resource_permissions (id: uuid, role_id: uuid, resource, action, is_granted)
```

### Identified Challenges
1. **ID Type Mismatch**: Public schema uses `int`, tenant schema uses `uuid`
2. **Missing Plan Assignment**: Tenants have no plan_id column
3. **Empty Tables**: All plan-related tables are unpopulated
4. **Resource-Menu Gap**: Current permissions use resources, but plans use menus

## Proposed Architecture

### 1. Database Schema Enhancements

#### A. Add plan_id to tenants table
```sql
ALTER TABLE public.tenants ADD COLUMN plan_id INTEGER REFERENCES public.plans(id);
```

#### B. Create resource-based plan access table
```sql
CREATE TABLE public.plan_resource_access (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES public.plans(id),
    resource_name VARCHAR(50) NOT NULL,
    actions TEXT[] NOT NULL, -- Array of allowed actions: ['create', 'read', 'update', 'delete', 'list']
    is_active BOOLEAN DEFAULT true,
    UNIQUE(plan_id, resource_name)
);
```

### 2. Plan System Integration Strategy

#### Option A: Resource-Based Plans (RECOMMENDED)
- Use existing resource permission system
- Plans define which resources/actions are available
- Integrate with current role permissions
- Simpler implementation, leverages existing 347 permissions

#### Option B: Menu-Based Plans
- Use public menu system
- Plans define which menu items are accessible
- Requires populating menu tables
- More complex integration with role permissions

**RECOMMENDATION: Option A** - Resource-Based Plans for easier integration.

### 3. Multi-Layer Permission Architecture

```
REQUEST -> JWT Auth -> Role Permission Check -> Plan Permission Check -> ALLOW/DENY
```

#### Layer 1: Role-Based Permissions (EXISTING)
- Admin: Full CRUD on all resources
- Staff: Administrative operations
- Teacher: Academic management
- Student: Read-only access
- Parent: Child-focused access

#### Layer 2: Plan-Based Limitations (NEW)
- Basic Plan: Limited resources (academic years, basic fee info)
- Standard Plan: Standard resources (fee management, transport)
- Premium Plan: All resources (full system access)
- Enterprise Plan: All resources + system management

### 4. Implementation Approach

#### Phase 1: Database Setup
1. Add plan_id to tenants table
2. Create plan_resource_access table
3. Populate basic plan data
4. Assign default plan to existing tenants

#### Phase 2: Service Layer
1. Create PlanService for plan operations
2. Enhance PermissionService with plan checking
3. Create hybrid permission checking function
4. Update tenant session management

#### Phase 3: Endpoint Integration
1. Update permission checking in all endpoints
2. Add plan validation to existing role checks
3. Implement plan-specific error messages
4. Test multi-layer permissions

### 5. Plan-Permission Integration Logic

```python
async def check_role_plan_permission(db: AsyncSession, client_name: str, role: str, resource: str, action: str) -> bool:
    """
    Multi-layer permission checking:
    1. Check role has permission for resource:action
    2. Check tenant's plan allows access to resource:action
    3. Return True only if both layers allow access
    """
    # Layer 1: Role permission check (existing)
    role_has_permission = await check_role_permission(db, role, resource, action)
    if not role_has_permission:
        return False
    
    # Layer 2: Plan permission check (new)
    plan_allows_access = await check_plan_permission(client_name, resource, action)
    if not plan_allows_access:
        return False
    
    return True
```

### 6. Plan Definitions

#### Basic Plan (Free/Trial)
- Resources: academic_years, classes, subjects (read-only)
- Target: Small schools, trial users
- Limitations: 50 students max, basic reporting

#### Standard Plan
- Resources: All academic + fee management + basic transport
- Target: Medium schools
- Limitations: 500 students max, standard reporting

#### Premium Plan
- Resources: All features except system management
- Target: Large schools
- Limitations: 2000 students max, advanced reporting

#### Enterprise Plan
- Resources: All features including system management
- Target: School districts, enterprises
- Limitations: Unlimited, full customization

### 7. Error Handling & User Experience

#### Plan Limitation Messages
```python
# Instead of generic 403 Forbidden
raise HTTPException(
    status_code=status.HTTP_402_PAYMENT_REQUIRED,
    detail={
        "error": "plan_limitation",
        "message": "This feature requires a Premium plan upgrade",
        "current_plan": "Basic",
        "required_plan": "Premium",
        "resource": "fee_management",
        "action": "create"
    }
)
```

#### Graceful Degradation
- Show available features based on plan
- Provide upgrade prompts for restricted features
- Maintain existing functionality for allowed resources

### 8. Migration Strategy

#### Backward Compatibility
1. Default all existing tenants to "Enterprise" plan initially
2. Gradually implement plan restrictions as needed
3. Fallback to role-only permissions if plan check fails
4. No breaking changes to existing API contracts

#### Rollout Plan
1. **Week 1**: Database schema updates, basic plan service
2. **Week 2**: Integration with existing permission system
3. **Week 3**: Endpoint updates and testing
4. **Week 4**: Documentation and plan management UI

## Implementation Priority

### High Priority (Phase 1)
- [ ] Database schema enhancements
- [ ] Basic plan service implementation
- [ ] Integration with existing permission system

### Medium Priority (Phase 2)
- [ ] Comprehensive plan definitions
- [ ] Enhanced error handling and UX
- [ ] Plan management endpoints

### Low Priority (Phase 3)
- [ ] Menu-based filtering (if needed)
- [ ] Advanced plan features (quotas, limits)
- [ ] Plan analytics and reporting

## Success Metrics

1. **Security**: Multi-layer permission system working correctly
2. **Performance**: No significant impact on existing endpoint response times
3. **Flexibility**: Easy to add new plans and modify permissions
4. **User Experience**: Clear error messages and graceful degradation
5. **Business Value**: Foundation for subscription-based access control