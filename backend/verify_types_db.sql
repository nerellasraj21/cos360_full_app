-- SQL Verification Script for Dynamic Route and Trip Types
-- Run this in your PostgreSQL client to verify the implementation

-- 1. Check if route_types table exists and has data
SELECT 'Route Types Table' as check_name;
SELECT * FROM route_types ORDER BY type_name;
SELECT 'Total Route Types: ' || COUNT(*) FROM route_types;

-- 2. Check if trip_types table exists and has data
SELECT 'Trip Types Table' as check_name;
SELECT * FROM trip_types ORDER BY type_name;
SELECT 'Total Trip Types: ' || COUNT(*) FROM trip_types;

-- 3. Verify routes table structure
SELECT 'Routes Table Columns' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'routes'
  AND column_name IN ('route_type_id', 'trip_type_id', 'route_type', 'trip_type')
ORDER BY column_name;

-- 4. Check foreign key relationships
SELECT 'Foreign Key Constraints' as check_name;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'routes'
  AND kcu.column_name IN ('route_type_id', 'trip_type_id');

-- 5. Sample query showing routes with their types (nested join)
SELECT 'Sample Routes with Types' as check_name;
SELECT
    r.id,
    r.route_name,
    rt.type_name as route_type,
    tt.type_name as trip_type,
    r.start_time,
    r.end_time
FROM routes r
LEFT JOIN route_types rt ON r.route_type_id = rt.id
LEFT JOIN trip_types tt ON r.trip_type_id = tt.id
LIMIT 5;

-- 6. Count routes by type
SELECT 'Routes by Route Type' as check_name;
SELECT
    COALESCE(rt.type_name, 'Unassigned') as route_type,
    COUNT(*) as count
FROM routes r
LEFT JOIN route_types rt ON r.route_type_id = rt.id
GROUP BY rt.type_name
ORDER BY count DESC;

SELECT 'Routes by Trip Type' as check_name;
SELECT
    COALESCE(tt.type_name, 'Unassigned') as trip_type,
    COUNT(*) as count
FROM routes r
LEFT JOIN trip_types tt ON r.trip_type_id = tt.id
GROUP BY tt.type_name
ORDER BY count DESC;

-- 7. Verify no orphaned routes (routes with invalid foreign keys)
SELECT 'Orphaned Routes Check' as check_name;
SELECT
    COUNT(*) as routes_with_invalid_route_type
FROM routes r
WHERE r.route_type_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM route_types WHERE id = r.route_type_id);

SELECT
    COUNT(*) as routes_with_invalid_trip_type
FROM routes r
WHERE r.trip_type_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM trip_types WHERE id = r.trip_type_id);
