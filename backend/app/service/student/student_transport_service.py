import logging
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.masters.transport.route_stop_model import RouteStop
from app.models.masters.transport.transport_pricing_model import TransportPricing
from app.models.masters.transport.trip_model import Trip
from app.models.student.student_model import Student
from app.models.student.student_transport_model import StudentTransportAssignment
from app.schemas.student.student_transport_schema import (
    StudentTransportCreate,
    StudentTransportUpdate,
)
from app.tools.database_error_mapper import map_database_error
from app.tools.error_handler import (
    ErrorCategory,
    create_business_rule_error,
    create_database_error,
    create_error_response,
    create_not_found_error,
    create_validation_error,
)

logger = logging.getLogger(__name__)


async def add_student_transport(data: StudentTransportCreate, db: AsyncSession, request: Request | None = None):
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
        student_result = await db.execute(select(Student).where(Student.id == data.student_id))
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found", resource_type="student", resource_id=str(data.student_id), request=request
            )

        # Validate trip exists
        trip_result = await db.execute(select(Trip).where(Trip.id == data.trip_id))
        trip = trip_result.scalar_one_or_none()
        if not trip:
            raise create_not_found_error(
                message="Trip not found", resource_type="trip", resource_id=str(data.trip_id), request=request
            )

        # Validate route stop exists
        stop_result = await db.execute(select(RouteStop).where(RouteStop.id == data.stop_id))
        stop = stop_result.scalar_one_or_none()
        if not stop:
            raise create_not_found_error(
                message="Route stop not found",
                resource_type="route_stop",
                resource_id=str(data.stop_id),
                request=request,
            )

        # Check for duplicate transport assignment
        existing_assignment = await db.execute(
            select(StudentTransportAssignment).where(
                and_(
                    StudentTransportAssignment.student_id == data.student_id,
                    StudentTransportAssignment.trip_id == data.trip_id,
                )
            )
        )
        if existing_assignment.scalar_one_or_none():
            raise create_business_rule_error(
                message="Student already has transport assignment for this trip",
                rule="unique_student_trip_assignment",
                request=request,
            )

        # Validate pricing_id if provided, and use pricing amount as fee if fee_per_term not explicitly set
        if data.pricing_id:
            pricing_result = await db.execute(
                select(TransportPricing).where(
                    TransportPricing.id == data.pricing_id,
                    TransportPricing.is_active == True,  # noqa: E712
                )
            )
            pricing = pricing_result.scalar_one_or_none()
            if not pricing:
                raise create_not_found_error(
                    message="Transport pricing not found or inactive",
                    resource_type="transport_pricing",
                    resource_id=str(data.pricing_id),
                    request=request,
                )

        if stop.route_id != trip.route_id:
            raise create_validation_error(
                message="The selected stop does not belong to the route of the selected trip",
                field="stop_id",
                value=str(data.stop_id),
                request=request,
            )

        # Auto-fill fee_per_term from stop.fees if not provided
        resolved_fee = data.fee_per_term
        if resolved_fee is None:
            if stop.fees is None or stop.fees <= 0:
                raise create_validation_error(
                    message="This stop has no default fee — enter the amount manually",
                    field="fee_per_term",
                    value=None,
                    request=request,
                )
            resolved_fee = float(stop.fees)

        if resolved_fee <= 0:
            raise create_validation_error(
                message="Fee per term must be greater than 0",
                field="fee_per_term",
                value=resolved_fee,
                request=request,
            )

        # Create transport assignment
        assignment_data = data.dict()
        assignment_data["fee_per_term"] = resolved_fee
        new_assignment = StudentTransportAssignment(**assignment_data)
        db.add(new_assignment)

        # Use flush pattern to avoid schema context issues
        await db.flush()

        # Load with relationships before commit
        result = await db.execute(
            select(StudentTransportAssignment)
            .options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.route),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.vehicle),
                selectinload(StudentTransportAssignment.stop),
                selectinload(StudentTransportAssignment.pricing),
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
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to create transport assignment",
            status_code=500,
            request=request,
        )


async def get_transport_assignments(
    db: AsyncSession, request: Request | None = None
) -> list[StudentTransportAssignment]:
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
            select(StudentTransportAssignment).options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.route),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.vehicle),
                selectinload(StudentTransportAssignment.stop),
                selectinload(StudentTransportAssignment.pricing),
            )
        )
        return result.scalars().all()
    except Exception as e:
        logger.error(f"Error fetching transport assignments: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch transport assignments",
            status_code=500,
            request=request,
        )


async def get_transport_by_student_id(
    student_id: UUID, db: AsyncSession, request: Request | None = None
) -> list[StudentTransportAssignment]:
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
        student_result = await db.execute(select(Student).where(Student.id == student_id))
        student = student_result.scalar_one_or_none()
        if not student:
            raise create_not_found_error(
                message="Student not found", resource_type="student", resource_id=str(student_id), request=request
            )

        result = await db.execute(
            select(StudentTransportAssignment)
            .options(
                selectinload(StudentTransportAssignment.student),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.route),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.vehicle),
                selectinload(StudentTransportAssignment.stop),
                selectinload(StudentTransportAssignment.pricing),
            )
            .where(StudentTransportAssignment.student_id == student_id)
        )
        records = result.scalars().all()

        return records
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching transport assignments for student {student_id}: {str(e)}")
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to fetch transport assignments for student",
            status_code=500,
            request=request,
        )


async def update_partial_details_transport_assignment(
    transport_id: UUID, updates: StudentTransportUpdate, db: AsyncSession, request: Request | None = None
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
                request=request,
            )

        # Validate updates
        update_data = updates.dict(exclude_unset=True)

        if "fee_per_term" in update_data and (update_data["fee_per_term"] is None or update_data["fee_per_term"] <= 0):
            raise create_validation_error(
                message="Fee per term must be greater than 0",
                field="fee_per_term",
                value=update_data["fee_per_term"],
                request=request,
            )

        new_trip = None
        if "trip_id" in update_data:
            trip_result = await db.execute(select(Trip).where(Trip.id == update_data["trip_id"]))
            new_trip = trip_result.scalar_one_or_none()
            if not new_trip:
                raise create_not_found_error(
                    message="Trip not found",
                    resource_type="trip",
                    resource_id=str(update_data["trip_id"]),
                    request=request,
                )

        # Validate pricing_id if being updated
        if "pricing_id" in update_data and update_data["pricing_id"]:
            pricing_result = await db.execute(
                select(TransportPricing).where(
                    TransportPricing.id == update_data["pricing_id"],
                    TransportPricing.is_active == True,  # noqa: E712
                )
            )
            if not pricing_result.scalar_one_or_none():
                raise create_not_found_error(
                    message="Transport pricing not found or inactive",
                    resource_type="transport_pricing",
                    resource_id=str(update_data["pricing_id"]),
                    request=request,
                )

        new_stop = None
        if "stop_id" in update_data:
            stop_result = await db.execute(select(RouteStop).where(RouteStop.id == update_data["stop_id"]))
            new_stop = stop_result.scalar_one_or_none()
            if not new_stop:
                raise create_not_found_error(
                    message="Route stop not found",
                    resource_type="route_stop",
                    resource_id=str(update_data["stop_id"]),
                    request=request,
                )

        if new_trip is not None or new_stop is not None:
            trip_for_check = new_trip
            if trip_for_check is None:
                trip_for_check = (
                    await db.execute(select(Trip).where(Trip.id == assignment.trip_id))
                ).scalar_one_or_none()
            stop_for_check = new_stop
            if stop_for_check is None:
                stop_for_check = (
                    await db.execute(select(RouteStop).where(RouteStop.id == assignment.stop_id))
                ).scalar_one_or_none()
            if trip_for_check and stop_for_check and stop_for_check.route_id != trip_for_check.route_id:
                raise create_validation_error(
                    message="The selected stop does not belong to the route of the selected trip",
                    field="stop_id",
                    value=str(stop_for_check.id),
                    request=request,
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
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.route),
                selectinload(StudentTransportAssignment.trip).selectinload(Trip.vehicle),
                selectinload(StudentTransportAssignment.stop),
                selectinload(StudentTransportAssignment.pricing),
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
            raise create_database_error(message=message, constraint=details.get("constraint"), request=request)

        # Generic system error
        raise create_error_response(
            error_code=ErrorCategory.SYSTEM_ERROR,
            message="Failed to update transport assignment",
            status_code=500,
            request=request,
        )


async def unassign_transport(transport_id: UUID, db: AsyncSession, request: Request | None = None) -> bool:
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
                request=request,
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
            request=request,
        )
