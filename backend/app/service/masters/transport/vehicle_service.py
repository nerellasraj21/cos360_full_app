from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.masters.transport import Vehicle
from app.schemas.masters.transport import VehicleCreate, VehicleUpdate


async def add_vehicle(data: VehicleCreate, db: AsyncSession):
    if data.registration_number:
        existing = await db.execute(
            select(Vehicle).where(Vehicle.registration_number == data.registration_number)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(400, f"Vehicle '{data.registration_number}' already registered")
    vehicle = Vehicle(**data.dict())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_vehicles(db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.is_active))
    return result.scalars().all()


async def get_individual_vehicle_by_id(vehicle_id: UUID, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    return vehicle


async def update_all_details_vehicle(vehicle_id: UUID, data: VehicleCreate, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    if data.registration_number and data.registration_number != vehicle.registration_number:
        dup = await db.execute(
            select(Vehicle).where(Vehicle.registration_number == data.registration_number)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(400, f"Vehicle '{data.registration_number}' already registered")
    for key, value in data.dict().items():
        setattr(vehicle, key, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def update_partial_details_vehicle(vehicle_id: UUID, data: VehicleUpdate, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    if data.registration_number and data.registration_number != vehicle.registration_number:
        dup = await db.execute(
            select(Vehicle).where(Vehicle.registration_number == data.registration_number)
        )
        if dup.scalar_one_or_none():
            raise HTTPException(400, f"Vehicle '{data.registration_number}' already registered")
    for key, value in data.dict(exclude_unset=True).items():
        setattr(vehicle, key, value)
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def deactivate_vehicle(vehicle_id: UUID, db: AsyncSession):
    result = await db.execute(select(Vehicle).where(Vehicle.id == vehicle_id))
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, detail="Vehicle not found")
    vehicle.is_active = False
    await db.commit()
    await db.refresh(vehicle)
    return vehicle


async def get_vehicles_dropdown(db: AsyncSession, active_only: bool = True):
    try:
        query = select(Vehicle.id, Vehicle.name)
        if active_only:
            query = query.where(Vehicle.is_active)
        result = await db.execute(query)
        return [{"id": vehicle.id, "name": vehicle.name} for vehicle in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving vehicles dropdown: {str(e)}")


async def get_vehicle_routes(db: AsyncSession, vehicle_id: UUID):
    try:
        from app.models.masters.transport.route_model import Route
        from app.models.masters.transport.trip_model import Trip

        query = (
            select(Route.id, Route.route_name)
            .distinct()
            .join(Trip, Trip.route_id == Route.id)
            .where(Trip.vehicle_id == vehicle_id)
            .where(Route.is_active)
            .order_by(Route.route_name)
        )

        result = await db.execute(query)
        return [{"id": route.id, "route_name": route.route_name} for route in result]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving vehicle routes: {str(e)}")


async def get_vehicle_route_stops(db: AsyncSession, vehicle_id: UUID, route_id: UUID):
    """Get stops for a specific vehicle-route combination"""
    try:
        from app.models.masters.transport.route_stop_model import RouteStop
        from app.models.masters.transport.trip_model import Trip

        # First verify that this vehicle is assigned to this route
        trip_query = select(Trip.id).where(Trip.vehicle_id == vehicle_id, Trip.route_id == route_id)
        trip_result = await db.execute(trip_query)
        if not trip_result.scalars().first():
            raise HTTPException(status_code=404, detail="Vehicle is not assigned to this route")

        # Get all stops for this route
        stops_query = (
            select(RouteStop.id, RouteStop.name, RouteStop.number, RouteStop.reaching_time, RouteStop.pickup_time, RouteStop.drop_time, RouteStop.fees)
            .where(RouteStop.route_id == route_id, RouteStop.is_active)
            .order_by(RouteStop.number)
        )

        result = await db.execute(stops_query)
        return [
            {
                "id": stop.id,
                "name": stop.name,
                "number": stop.number,
                "reaching_time": stop.reaching_time,
                "pickup_time": stop.pickup_time,
                "drop_time": stop.drop_time,
                "fees": stop.fees,
            }
            for stop in result
        ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving route stops: {str(e)}")
