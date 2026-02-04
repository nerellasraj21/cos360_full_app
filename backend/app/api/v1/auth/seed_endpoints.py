from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from app.db.session import get_public_db
from app.db.tenant_session import get_tenant_db
from app.models.public import RoleTemplate, PermissionTemplate, MenuAction, Menu, Plan, PlanMenuAccess
from app.models.masters.caste_model import Caste, SubCaste
from app.models.masters.location.state_model import State
from app.models.masters.location.district_model import District
from app.models.masters.location.mandal_model import Mandal
from app.tools.simple_permissions import get_current_user_token, check_role_plan_permission_with_error
import logging
from uuid import uuid4
from datetime import datetime

logger = logging.getLogger("seed_endpoints")
router = APIRouter(prefix="/auth/seed", tags=["Auth/Seed Data"])

@router.post("/permission-data", status_code=status.HTTP_201_CREATED)
async def seed_permission_data():
    """
    Seed default permission data for the multi-tenant system
    This should only be run once during initial setup
    """
    try:
        async with get_public_db() as public_db:
            # 1. Seed Role Templates
            role_templates_data = [
                {"name": "Admin", "description": "System administrator with full access", "category": "system", "is_system_role": True},
                {"name": "Teacher", "description": "Teaching staff with academic management access", "category": "academic", "is_system_role": True},
                {"name": "Student", "description": "Student with limited read access to own data", "category": "academic", "is_system_role": True},
                {"name": "Parent", "description": "Parent with access to child's academic information", "category": "academic", "is_system_role": True},
                {"name": "Staff", "description": "Administrative staff with operational access", "category": "administrative", "is_system_role": True}
            ]
            
            role_templates_created = []
            for role_data in role_templates_data:
                # Check if exists
                query = select(RoleTemplate).where(RoleTemplate.name == role_data["name"])
                result = await public_db.execute(query)
                existing = result.scalar_one_or_none()
                
                if not existing:
                    role_template = RoleTemplate(**role_data)
                    public_db.add(role_template)
                    role_templates_created.append(role_data["name"])
            
            await public_db.commit()
            
            # 2. Create or get Academic Years menu
            menu_query = select(Menu).where(Menu.name.ilike("%academic%"))
            result = await public_db.execute(menu_query)
            academic_menu = result.scalar_one_or_none()
            
            if not academic_menu:
                # Create basic Academic Years menu
                academic_menu = Menu(
                    id=999,  # Temporary ID for seeding
                    name="Academic Years",
                    url="/academic-years",
                    level="L1",
                    parent_id=None
                )
                public_db.add(academic_menu)
                await public_db.flush()
            
            # 3. Seed Menu Actions for Academic Years
            actions_data = [
                {"resource_name": "academic_years", "action_name": "create", "description": "Create new academic years"},
                {"resource_name": "academic_years", "action_name": "read", "description": "View academic year details"},
                {"resource_name": "academic_years", "action_name": "update", "description": "Update academic year information"},
                {"resource_name": "academic_years", "action_name": "delete", "description": "Delete academic years"},
                {"resource_name": "academic_years", "action_name": "list", "description": "List all academic years"},
            ]
            
            actions_created = []
            for action_data in actions_data:
                # Check if exists
                action_query = select(MenuAction).where(
                    MenuAction.menu_id == academic_menu.id,
                    MenuAction.resource_name == action_data["resource_name"],
                    MenuAction.action_name == action_data["action_name"]
                )
                result = await public_db.execute(action_query)
                existing = result.scalar_one_or_none()
                
                if not existing:
                    menu_action = MenuAction(
                        menu_id=academic_menu.id,
                        **action_data
                    )
                    public_db.add(menu_action)
                    actions_created.append(f"{action_data['resource_name']}:{action_data['action_name']}")
            
            # 4. Seed Permission Templates
            # Get all role templates
            roles_query = select(RoleTemplate)
            result = await public_db.execute(roles_query)
            role_templates = result.scalars().all()
            
            permissions_created = []
            for role_template in role_templates:
                # Check if permission template exists
                perm_query = select(PermissionTemplate).where(
                    PermissionTemplate.role_template_id == role_template.id,
                    PermissionTemplate.menu_id == academic_menu.id
                )
                result = await public_db.execute(perm_query)
                existing = result.scalar_one_or_none()
                
                if not existing:
                    # Admin gets full access, others get read-only
                    can_view = True
                    can_edit = True if role_template.name == "Admin" else False
                    
                    permission_template = PermissionTemplate(
                        role_template_id=role_template.id,
                        menu_id=academic_menu.id,
                        can_view=can_view,
                        can_edit=can_edit
                    )
                    public_db.add(permission_template)
                    permissions_created.append(f"{role_template.name}->AcademicYears(view:{can_view},edit:{can_edit})")
            
            # 5. Seed Plan-Menu Access
            plans_query = select(Plan).where(Plan.is_active == True)
            result = await public_db.execute(plans_query)
            plans = result.scalars().all()
            
            plan_access_created = []
            for plan in plans:
                # Check if access exists
                access_query = select(PlanMenuAccess).where(
                    PlanMenuAccess.plan_id == plan.id,
                    PlanMenuAccess.menu_id == academic_menu.id
                )
                result = await public_db.execute(access_query)
                existing = result.scalar_one_or_none()
                
                if not existing:
                    plan_access = PlanMenuAccess(
                        plan_id=plan.id,
                        menu_id=academic_menu.id,
                        is_active=True
                    )
                    public_db.add(plan_access)
                    plan_access_created.append(f"{plan.name}->AcademicYears")
            
            await public_db.commit()
            
            return {
                "message": "Permission data seeded successfully",
                "details": {
                    "role_templates_created": role_templates_created,
                    "menu_actions_created": actions_created,
                    "permission_templates_created": permissions_created,
                    "plan_access_created": plan_access_created,
                    "academic_menu_id": academic_menu.id
                }
            }
            
    except Exception as e:
        logger.error(f"Error seeding permission data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed permission data: {str(e)}"
        )

@router.get("/verify-permission-data")
async def verify_permission_data():
    """
    Verify that permission data has been seeded correctly
    """
    try:
        async with get_public_db() as public_db:
            # Check role templates
            roles_query = select(RoleTemplate)
            result = await public_db.execute(roles_query)
            role_templates = result.scalars().all()
            
            # Check academic menu
            menu_query = select(Menu).where(Menu.name.ilike("%academic%"))
            result = await public_db.execute(menu_query)
            academic_menu = result.scalar_one_or_none()
            
            # Check menu actions
            actions_query = select(MenuAction).where(MenuAction.resource_name == "academic_years")
            result = await public_db.execute(actions_query)
            menu_actions = result.scalars().all()
            
            # Check permission templates
            if academic_menu:
                perms_query = select(PermissionTemplate, RoleTemplate).join(RoleTemplate).where(
                    PermissionTemplate.menu_id == academic_menu.id
                )
                result = await public_db.execute(perms_query)
                permission_templates = result.all()
            else:
                permission_templates = []
            
            # Check plan access
            if academic_menu:
                plans_query = select(PlanMenuAccess, Plan).join(Plan).where(
                    PlanMenuAccess.menu_id == academic_menu.id
                )
                result = await public_db.execute(plans_query)
                plan_access = result.all()
            else:
                plan_access = []
            
            return {
                "role_templates": [{"id": rt.id, "name": rt.name, "category": rt.category} for rt in role_templates],
                "academic_menu": {"id": academic_menu.id, "name": academic_menu.name} if academic_menu else None,
                "menu_actions": [{"resource": ma.resource_name, "action": ma.action_name} for ma in menu_actions],
                "permission_templates": [{"role": rt.name, "can_view": pt.can_view, "can_edit": pt.can_edit} for pt, rt in permission_templates],
                "plan_access": [{"plan": p.name, "is_active": pma.is_active} for pma, p in plan_access]
            }
            
    except Exception as e:
        logger.error(f"Error verifying permission data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify permission data: {str(e)}"
        )

@router.post("/caste-data", status_code=status.HTTP_201_CREATED)
async def seed_caste_data(
    request: Request,
    db: AsyncSession = Depends(get_tenant_db)
):
    """
    Seed default caste and sub-caste data.
    This should only be run once during initial setup.

    **Required Permission**: Admin only
    """
    current_user = await get_current_user_token(request)
    role = current_user.get('role')

    # Only admin can seed data
    if role != 'Admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can seed data"
        )

    try:
        # Common Indian castes with sub-castes
        castes_data = {
            "General": ["General"],
            "OBC": ["OBC-A", "OBC-B", "OBC-C", "OBC-D"],
            "SC": ["Adi Andhra", "Adi Dravida", "Mala", "Madiga", "Chamar", "Pasi"],
            "ST": ["Chenchu", "Konda Reddy", "Koya", "Gond", "Bhil", "Santhal"],
            "EWS": ["EWS"]
        }

        castes_created = []
        sub_castes_created = []

        for caste_name, sub_caste_list in castes_data.items():
            # Check if caste exists
            query = select(Caste).where(Caste.name == caste_name)
            result = await db.execute(query)
            existing_caste = result.scalar_one_or_none()

            if not existing_caste:
                caste = Caste(
                    id=uuid4(),
                    name=caste_name,
                    code=caste_name[:3].upper(),
                    is_active=True
                )
                db.add(caste)
                await db.flush()  # Flush to get the ID
                castes_created.append(caste_name)
            else:
                caste = existing_caste

            # Add sub-castes
            for sub_caste_name in sub_caste_list:
                # Check if sub-caste exists
                sub_query = select(SubCaste).where(
                    SubCaste.caste_id == caste.id,
                    SubCaste.name == sub_caste_name
                )
                result = await db.execute(sub_query)
                existing_sub_caste = result.scalar_one_or_none()

                if not existing_sub_caste:
                    sub_caste = SubCaste(
                        id=uuid4(),
                        caste_id=caste.id,
                        name=sub_caste_name,
                        code=sub_caste_name[:3].upper() if len(sub_caste_name) >= 3 else sub_caste_name.upper(),
                        is_active=True
                    )
                    db.add(sub_caste)
                    sub_castes_created.append(f"{caste_name} -> {sub_caste_name}")

        await db.commit()

        return {
            "message": "Caste data seeded successfully",
            "details": {
                "castes_created": castes_created,
                "sub_castes_created": sub_castes_created,
                "total_castes": len(castes_created),
                "total_sub_castes": len(sub_castes_created)
            }
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error seeding caste data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed caste data: {str(e)}"
        )

@router.post("/location-data", status_code=status.HTTP_201_CREATED)
async def seed_location_data():
    """
    Seed default location data (States, Districts, Mandals) to PUBLIC schema.
    This should only be run once during initial setup.

    Note: This endpoint does not require authentication as it seeds PUBLIC schema data.
    """
    try:
        async with get_public_db() as public_db:
            # Major Indian states with districts and mandals
            # For brevity, including Andhra Pradesh and Telangana as primary states
            location_data = {
                "Andhra Pradesh": {
                    "code": "AP",
                    "districts": {
                        "Visakhapatnam": ["Visakhapatnam Urban", "Visakhapatnam Rural", "Bheemunipatnam", "Anakapalli"],
                        "Vijayawada": ["Vijayawada Urban", "Vijayawada Rural", "Gannavaram", "Kankipadu"],
                        "Guntur": ["Guntur Urban", "Guntur Rural", "Tenali", "Mangalagiri"],
                        "Nellore": ["Nellore Urban", "Nellore Rural", "Kavali", "Gudur"],
                        "Kurnool": ["Kurnool Urban", "Kurnool Rural", "Nandyal", "Adoni"]
                    }
                },
                "Telangana": {
                    "code": "TS",
                    "districts": {
                        "Hyderabad": ["Hyderabad Urban", "Secunderabad", "Kukatpally", "LB Nagar"],
                        "Rangareddy": ["Shamshabad", "Rajendranagar", "Serilingampally", "Chevella"],
                        "Warangal": ["Warangal Urban", "Warangal Rural", "Hanamkonda", "Parkal"],
                        "Nizamabad": ["Nizamabad Urban", "Nizamabad Rural", "Bodhan", "Armoor"],
                        "Karimnagar": ["Karimnagar Urban", "Karimnagar Rural", "Jagitial", "Peddapalli"]
                    }
                },
                "Karnataka": {
                    "code": "KA",
                    "districts": {
                        "Bangalore": ["Bangalore North", "Bangalore South", "Bangalore East", "Anekal"],
                        "Mysore": ["Mysore Urban", "Mysore Rural", "K.R. Nagar", "Hunsur"]
                    }
                },
                "Tamil Nadu": {
                    "code": "TN",
                    "districts": {
                        "Chennai": ["Chennai North", "Chennai South", "Chennai Central", "Ambattur"],
                        "Coimbatore": ["Coimbatore North", "Coimbatore South", "Pollachi", "Sulur"]
                    }
                },
                "Maharashtra": {
                    "code": "MH",
                    "districts": {
                        "Mumbai": ["Mumbai City", "Mumbai Suburban", "Kurla", "Andheri"],
                        "Pune": ["Pune City", "Pune Rural", "Haveli", "Bhor"]
                    }
                }
            }

            states_created = []
            districts_created = []
            mandals_created = []

            for state_name, state_info in location_data.items():
                # Check if state exists
                query = select(State).where(State.name == state_name)
                result = await public_db.execute(query)
                existing_state = result.scalar_one_or_none()

                if not existing_state:
                    state = State(
                        id=uuid4(),
                        name=state_name,
                        code=state_info["code"],
                        is_active=True,
                        created_at=datetime.now(),
                        updated_at=datetime.now()
                    )
                    public_db.add(state)
                    await public_db.flush()
                    states_created.append(state_name)
                else:
                    state = existing_state

                # Add districts
                for district_name, mandal_list in state_info["districts"].items():
                    # Check if district exists
                    dist_query = select(District).where(
                        District.state_id == state.id,
                        District.name == district_name
                    )
                    result = await public_db.execute(dist_query)
                    existing_district = result.scalar_one_or_none()

                    if not existing_district:
                        district = District(
                            id=uuid4(),
                            state_id=state.id,
                            name=district_name,
                            code=district_name[:3].upper(),
                            is_active=True,
                            created_at=datetime.now(),
                            updated_at=datetime.now()
                        )
                        public_db.add(district)
                        await public_db.flush()
                        districts_created.append(f"{state_name} -> {district_name}")
                    else:
                        district = existing_district

                    # Add mandals
                    for mandal_name in mandal_list:
                        # Check if mandal exists
                        mandal_query = select(Mandal).where(
                            Mandal.district_id == district.id,
                            Mandal.name == mandal_name
                        )
                        result = await public_db.execute(mandal_query)
                        existing_mandal = result.scalar_one_or_none()

                        if not existing_mandal:
                            mandal = Mandal(
                                id=uuid4(),
                                district_id=district.id,
                                name=mandal_name,
                                is_active=True,
                                created_at=datetime.now(),
                                updated_at=datetime.now()
                            )
                            public_db.add(mandal)
                            mandals_created.append(f"{state_name} -> {district_name} -> {mandal_name}")

            await public_db.commit()

            return {
                "message": "Location data seeded successfully",
                "details": {
                    "states_created": states_created,
                    "districts_created": districts_created,
                    "mandals_created": mandals_created,
                    "total_states": len(states_created),
                    "total_districts": len(districts_created),
                    "total_mandals": len(mandals_created)
                }
            }

    except Exception as e:
        logger.error(f"Error seeding location data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed location data: {str(e)}"
        )