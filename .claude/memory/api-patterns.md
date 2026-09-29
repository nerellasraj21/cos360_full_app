# API Patterns and Standards for COS360

## Database Refresh Pattern (Critical)

### The COS360 Standard Pattern

All service functions that return objects must use this pattern to avoid multi-tenant issues:

```python
async def create_entity(db: AsyncSession, data: EntityCreate):
    try:
        db_entity = Entity(**data.dict())
        db.add(db_entity)
        await db.flush()

        # Load with relationships before commit (CRITICAL)
        result = await db.execute(
            select(Entity)
            .options(selectinload(Entity.relationships))
            .where(Entity.id == db_entity.id)
        )
        created_entity = result.scalar_one()

        await db.commit()
        return created_entity
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

### Anti-Pattern (Never Use)

```python
# WRONG - Causes multi-tenant schema issues
await db.commit()
await db.refresh(db_entity)  # This breaks tenant isolation
return db_entity
```

## Permission Pattern (Required for All Business Endpoints)

### Standard Protection Pattern

```python
@router.post("/", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
async def create_entity(
    entity_data: EntityCreate,
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    # Get current user from JWT token
    current_user = await get_current_user_token(request)

    # Dual-layer permission check (Plan + Role)
    await check_role_plan_permission_with_error(
        db, request, current_user.get('role'), 'resource_name', 'create'
    )

    return await entity_service.create_entity(db, entity_data)
```

## Multi-Tenant Patterns

### Tenant Detection

- Uses `cschema` header for tenant identification
- Falls back to subdomain extraction from Host header
- Middleware automatically sets tenant context

### Database Session Pattern

```python
# Always use tenant-specific database sessions
db: AsyncSession = Depends(get_tenant_db)

# Never use direct session without tenant context
```

## Endpoint Structure Patterns

### Standard CRUD Endpoints

```python
# Create
POST   /api/v1/module/resource/           # Create new record
# Read
GET    /api/v1/module/resource/           # List all with pagination
GET    /api/v1/module/resource/dropdown   # Dropdown data (id + name)
GET    /api/v1/module/resource/{id}       # Get single record
# Update
PUT    /api/v1/module/resource/{id}       # Update record
# Delete
DELETE /api/v1/module/resource/{id}       # Delete record
```

### Response Model Patterns

```python
# Always specify response models
@router.post("/", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
@router.get("/", response_model=List[EntityOut])
@router.get("/{entity_id}", response_model=EntityOut)
@router.put("/{entity_id}", response_model=EntityOut)
```

## SQLAlchemy Model Patterns

### Standard Model Structure

```python
class Entity(BaseOrg):  # Use BaseOrg for tenant models
    __tablename__ = "entities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)

    # Foreign keys with proper relationships
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    category = relationship("Category", back_populates="entities")

    # Always include timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### Relationship Loading Pattern

```python
# Always use selectinload for relationships
result = await db.execute(
    select(Entity)
    .options(selectinload(Entity.category))
    .options(selectinload(Entity.related_items))
    .where(Entity.id == entity_id)
)
```

## Pydantic Schema Patterns

### Standard Schema Structure

```python
class EntityCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: UUID

class EntityUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category_id: Optional[UUID] = None

class EntityOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    category_id: UUID
    category: Optional[CategoryOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EntityDropdown(BaseModel):
    id: UUID
    name: str
```

## Error Handling Patterns

### Standard Error Response

```python
try:
    # Database operation
    await db.commit()
    return result
except Exception as e:
    await db.rollback()
    raise HTTPException(status_code=500, detail=str(e))
```

### Validation Error Pattern

```python
# Check if entity exists
existing = await db.execute(select(Entity).where(Entity.id == entity_id))
if not existing.scalar_one_or_none():
    raise HTTPException(status_code=404, detail="Entity not found")
```

## Authentication Patterns

### JWT Token Structure

```python
# Tenant User Token
{
    "sub": "user_id",
    "username": "username",
    "user_type": "tenant_user",
    "role": "Admin",
    "client_name": "tenant_name",
    "schema_name": "tenant_schema",
    "exp": timestamp
}

# Super Admin Token
{
    "sub": "super_admin_id",
    "username": "superadmin",
    "user_type": "super_admin",
    "permissions": ["system_admin", "tenant_management"],
    "exp": timestamp
}
```

## Service Layer Patterns

### Standard Service Function

```python
async def get_entity_by_id(db: AsyncSession, entity_id: UUID):
    result = await db.execute(
        select(Entity)
        .options(selectinload(Entity.relationships))
        .where(Entity.id == entity_id)
    )
    entity = result.scalar_one_or_none()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return entity

async def delete_entity(db: AsyncSession, entity_id: UUID):
    try:
        # Check dependencies first
        dependencies = await check_entity_dependencies(db, entity_id)
        if dependencies:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete entity. It is referenced by: {', '.join(dependencies)}"
            )

        result = await db.execute(select(Entity).where(Entity.id == entity_id))
        entity = result.scalar_one_or_none()
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")

        await db.delete(entity)
        await db.commit()
        return {"message": "Entity deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
```

## Testing Patterns

### Multi-Tenant Test Pattern

```python
@pytest.mark.asyncio
async def test_tenant_isolation():
    # Create data in tenant A
    async with get_test_db("tenant_a") as db:
        entity_a = await create_test_entity(db, "Entity A")

    # Verify data not accessible from tenant B
    async with get_test_db("tenant_b") as db:
        result = await db.execute(select(Entity))
        entities_b = result.scalars().all()
        assert entity_a not in entities_b
```

## Key Remember Points

1. **Always use the database refresh pattern** - flush() → select() → commit()
2. **All business endpoints must have permission checks** - Super Admin can bypass
3. **Use tenant-specific database sessions** - get_tenant_db() dependency
4. **Include proper relationships with selectinload** - Avoid N+1 queries
5. **Use UUID primary keys consistently** - With proper defaults
6. **Include timestamps in all models** - created_at/updated_at
7. **Proper error handling with rollback** - Never leave transactions hanging
8. **Use Pydantic for all request/response validation** - Consistent schema patterns
