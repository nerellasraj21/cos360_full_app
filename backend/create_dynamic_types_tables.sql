-- Create Route Types and Trip Types Master Tables
-- Run this SQL script directly without using Alembic migrations

-- Create route_types table
CREATE TABLE IF NOT EXISTS route_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR NOT NULL UNIQUE,
    description VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on route_types
CREATE UNIQUE INDEX IF NOT EXISTS ix_route_types_id ON route_types(id);

-- Create trip_types table
CREATE TABLE IF NOT EXISTS trip_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR NOT NULL UNIQUE,
    description VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on trip_types
CREATE UNIQUE INDEX IF NOT EXISTS ix_trip_types_id ON trip_types(id);

-- Insert default route types (seeded data)
INSERT INTO route_types (type_name, description, is_active, created_at, updated_at)
VALUES
    ('Upward', 'Upward route direction', true, now(), now()),
    ('Downward', 'Downward route direction', true, now(), now())
ON CONFLICT (type_name) DO NOTHING;

-- Insert default trip types (seeded data)
INSERT INTO trip_types (type_name, description, is_active, created_at, updated_at)
VALUES
    ('First Trip', 'First trip of the day', true, now(), now()),
    ('Second Trip', 'Second trip of the day', true, now(), now())
ON CONFLICT (type_name) DO NOTHING;

-- Note: The routes table already has route_type and trip_type as string columns
-- No changes are needed to the routes table

-- Verification queries
SELECT 'Route Types Created:' as message;
SELECT * FROM route_types ORDER BY type_name;

SELECT 'Trip Types Created:' as message;
SELECT * FROM trip_types ORDER BY type_name;
