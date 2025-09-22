from fastapi import HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_
from typing import List, Optional
from app.models.student.student_transport_model import StudentTransportAssignment
from app.models.student.student_model import Student
from app.models.masters.trip_model import Trip
from app.models.masters.route_stop_model import RouteStop
from app.schemas.student.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
)
from app.tools.error_handler import (
    create_error_response,
    create_validation_error,
    create_not_found_error,
    create_business_rule_error,
    create_database_error,
    handle_database_exception,
    ErrorCategory
)
from app.tools.database_error_mapper import map_database_error
import logging

logger = logging.getLogger(__name__)


async def add_student_transport(
    data: StudentTransportCreate,
    db: AsyncSession,
    request: Optional[Request] = None
):
    """
    Create a new student transport assignment with comprehensive error handling
    
    Args:
        data: Transport assignment data
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        Created transport assignment
        
    Raises:
        HTTPException: For validation, business rule, or database errors
    """
    try:
        # Validate student exists
        student_result = await db.execute(
            select(Student).where(Student.id == data.student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found",
                resource_type="student",
                resource_id=str(data.student_id),
                request=request
            )
        
        # Validate trip exists
        trip_result = await db.execute(
            select(Trip).where(Trip.id == data.trip_id)
        )
        trip = trip_result.scalar_one_or_none()
        if not trip:
            raise create_not_found_error(
                message="Trip not found",
                resource_type="trip",
                resource_id=str(data.trip_id),
                request=request
            )
        
        # Validate route stop exists
        stop_result = await db.execute(
            select(RouteStop).where(RouteStop.id == data.stop_id)
        )
        stop = stop_result.scalar_one_or_none()
        if not stop:
            raise create_not_found_error(
                message="Route stop not found",
                resource_type="route_stop",
                resource_id=str(data.stop_id),
                request=request
            )
        
        # Check for duplicate transport assignment
        existing_assignment = await db.execute(
            select(StudentTransportAssignment).where(
                and_(
                    StudentTransportAssignment.student_id == data.student_id,
                    StudentTransportAssignment.trip_id == data.trip_id
                )
            )
        )
        if existing_assignment.scalar_one_or_none():
            raise create_business_rule_error(
                message="Student already has transport assignment for this trip",
                rule="unique_student_trip_assignment",
                request=request
            )
        
        # Validate fee amount
        if data.fee_per_term < 0:
            raise create_validation_error(
                message="Fee per term cannot be negative",
                field="fee_per_term",
                value=data.fee_per_term,
                request=request
            )
        
        # Create transport assignment
        new_assignment = StudentTransportAssignment(**data.dict())
        db.add(new_assignment)
        
        # Use flush pattern to avoid schema context issues
        await db.flush()
        
        # Load with relationships before commit
        result = await db.execute(
            select(StudentTransportAssignment)
            .options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip),
                selectinload(StudentTransportAssignment.stop)
            )
            .where(StudentTransportAssignment.id == new_assignment.id)
        )
        assignment_with_relations = result.scalar_one()
        
        await db.commit()
        return assignment_with_relations
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating transport assignment: {str(e)}")
        
        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(
                message=message,
                constraint=details.get("constraint"),
                request=request
            )
        
        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to create transport assignment",
            status_code=500,
            request=request
        )

async def get_transport_assignments(
    db: AsyncSession,
    request: Optional[Request] = None
) -> List[StudentTransportAssignment]:
    """
    Get all transport assignments with error handling
    
    Args:
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        List of transport assignments
        
    Raises:
        HTTPException: For database errors
    """
    try:
        result = await db.execute(
            select(StudentTransportAssignment)
            .options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip),
                selectinload(StudentTransportAssignment.stop)
            )
        )
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error fetching transport assignments: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch transport assignments",
            status_code=500,
            request=request
        )

async def get_transport_by_student_id(
    student_id: UUID, 
    db: AsyncSession,
    request: Optional[Request] = None
) -> List[StudentTransportAssignment]:
    """
    Get transport assignments for a specific student with error handling
    
    Args:
        student_id: Student ID
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        List of transport assignments for the student
        
    Raises:
        HTTPException: For not found or database errors
    """
    try:
        # Validate student exists
        student_result = await db.execute(
            select(Student).where(Student.id == student_id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found",
                resource_type="student",
                resource_id=str(student_id),
                request=request
            )
        
        result = await db.execute(
            select(StudentTransportAssignment)
            .options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip),
                selectinload(StudentTransportAssignment.stop)
            )
            .where(StudentTransportAssignment.student_id == student_id)
        )
        records = result.scalars().all()
        
        if not records:
            raise create_not_found_error(
                message="No transport assignments found for this student",
                resource_type="transport_assignment",
                resource_id=str(student_id),
                request=request
            )
        
        return records
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transport assignments for student {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch transport assignments for student",
            status_code=500,
            request=request
        )

async def update_partial_details_transport_assignment(
    transport_id: UUID,
    updates: StudentTransportUpdate,
    db: AsyncSession,
    request: Optional[Request] = None
) -> StudentTransportAssignment:
    """
    Update transport assignment with comprehensive error handling
    
    Args:
        transport_id: Transport assignment ID
        updates: Update data
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        Updated transport assignment
        
    Raises:
        HTTPException: For not found, validation, or database errors
    """
    try:
        # Find transport assignment
        result = await db.execute(
            select(StudentTransportAssignment).where(StudentTransportAssignment.id == transport_id)
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise create_not_found_error(
                message="Transport assignment not found",
                resource_type="transport_assignment",
                resource_id=str(transport_id),
                request=request
            )

        # Validate updates
        update_data = updates.dict(exclude_unset=True)
        
        # Validate fee amount if being updated
        if "fee_per_term" in update_data and update_data["fee_per_term"] < 0:
            raise create_validation_error(
                message="Fee per term cannot be negative",
                field="fee_per_term",
                value=update_data["fee_per_term"],
                request=request
            )
        
        # Validate trip exists if being updated
        if "trip_id" in update_data:
            trip_result = await db.execute(
                select(Trip).where(Trip.id == update_data["trip_id"])
            )
            if not trip_result.scalar_one_or_none():
                raise create_not_found_error(
                    message="Trip not found",
                    resource_type="trip",
                    resource_id=str(update_data["trip_id"]),
                    request=request
                )
        
        # Validate stop exists if being updated
        if "stop_id" in update_data:
            stop_result = await db.execute(
                select(RouteStop).where(RouteStop.id == update_data["stop_id"])
            )
            if not stop_result.scalar_one_or_none():
                raise create_not_found_error(
                    message="Route stop not found",
                    resource_type="route_stop",
                    resource_id=str(update_data["stop_id"]),
                    request=request
                )

        # Apply updates
        for field, value in update_data.items():
            setattr(assignment, field, value)

        # Use flush pattern to avoid schema context issues
        await db.flush()
        
        # Load with relationships before commit
        result = await db.execute(
            select(StudentTransportAssignment)
            .options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip),
                selectinload(StudentTransportAssignment.stop)
            )
            .where(StudentTransportAssignment.id == transport_id)
        )
        updated_assignment = result.scalar_one()

        await db.commit()
        return updated_assignment
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating transport assignment {transport_id}: {str(e)}")
        
        # Handle database-specific errors
        if "constraint" in str(e).lower() or "duplicate" in str(e).lower():
            error_code, message, details = map_database_error(e)
            raise create_database_error(
                message=message,
                constraint=details.get("constraint"),
                request=request
            )
        
        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update transport assignment",
            status_code=500,
            request=request
        )

async def unassign_transport(
    transport_id: UUID, 
    db: AsyncSession,
    request: Optional[Request] = None
) -> bool:
    """
    Remove transport assignment with comprehensive error handling
    
    Args:
        transport_id: Transport assignment ID
        db: Database session
        request: FastAPI request object for context
        
    Returns:
        True if successfully deleted
        
    Raises:
        HTTPException: For not found or database errors
    """
    try:
        result = await db.execute(
            select(StudentTransportAssignment).where(StudentTransportAssignment.id == transport_id)
        )
        assignment = result.scalar_one_or_none()

        if not assignment:
            raise create_not_found_error(
                message="Transport assignment not found",
                resource_type="transport_assignment",
                resource_id=str(transport_id),
                request=request
            )

        await db.delete(assignment)
        await db.commit()
        
        logger.info(f"Successfully deleted transport assignment {transport_id}")
        return True
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting transport assignment {transport_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to delete transport assignment",
            status_code=500,
            request=request
        )
