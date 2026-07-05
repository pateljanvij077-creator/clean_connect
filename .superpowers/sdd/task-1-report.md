# Task 1 Report: Database Schema & Verification Functions

## Status
**DONE**

## Executed Migration
Created/Updated the migration file: [20260705000000_booking_verification.sql](file:///c:/Users/Shyam/Desktop/cleanconnect/src/supabase/migrations/20260705000000_booking_verification.sql)

This migration adds and configures:
1. **Columns on `bookings` Table**:
   - `check_in_time` (TIMESTAMP WITH TIME ZONE)
   - `check_out_time` (TIMESTAMP WITH TIME ZONE)
   - `check_in_lat` (DOUBLE PRECISION)
   - `check_in_lng` (DOUBLE PRECISION)
   - `check_out_lat` (DOUBLE PRECISION)
   - `check_out_lng` (DOUBLE PRECISION)
   - `work_duration` (INTEGER)
2. **Booking Status Check Constraint**:
   - Re-created `bookings_status_check` to allow the new transition statuses `arrived` and `finishing` alongside default statuses: `CHECK (status = ANY (ARRAY['pending', 'accepted', 'rejected', 'arrived', 'started', 'finishing', 'completed', 'cancelled']))`
3. **Table `booking_verification_codes`**:
   - Holds SHA-256 hashed 6-digit OTP codes, their expiration, and code type (`start` or `finish`).
   - Default value of `id` column updated to `extensions.uuid_generate_v4()`.
4. **Row Level Security (RLS)**:
   - Configured policy `"Homeowners and Workers manage verification codes"` to allow both homeowners and assigned workers to manage codes securely, mapping both direct user ID matching and profile ID queries.
5. **Distance Helper (`calculate_distance`)**:
   - Computes distance in meters between cleaner and booking coordinates using the Haversine formula.
6. **Main Verification Function (`verify_booking_code`)**:
   - Runs with `SECURITY DEFINER` and `SET search_path = public, extensions`.
   - Cleans up expired codes for the booking at the very beginning of execution.
   - Restricts verification to the assigned worker only (`auth.uid()` checks).
   - Validates that the cleaner is within 100 meters of the booking coordinates.
   - Enforces correct booking status transitions:
     - For `start` code: status must be `arrived`. Validates start window is between scheduled start time - 1 hour and scheduled start time + 2 hours.
     - For `finish` code: status must be `finishing`. Calculates work duration in seconds and completes booking.

## Verification & Testing
The migration was successfully applied to the database. We verified the schema changes and ran a comprehensive transaction-wrapped test block `test_query.sql` containing 10 integration test cases:
1. **Distance computation**: Verified Haversine distance accuracy.
2. **Invalid code submission**: Verified returns success=false and creates an activity log with `Invalid security code`.
3. **Proximity validation**: Verified distance limit checks and logs `Distance limit exceeded`.
4. **Code Expiration**: Verified that expired codes are immediately cleaned up at function start, returns success=false, and logs `Code expired`.
5. **Scheduled window verification**: Verified start code validation checks window limits and logs `Outside scheduled window`.
6. **Booking status check (Start)**: Verified start code verification fails when booking is not in `arrived` status.
7. **Cleaner authorization check**: Verified code verification fails when unauthorized user calls it.
8. **Successful Check-In**: Verified updates booking status to `started`, saves GPS details and timestamp, and logs `verification_success`.
9. **Booking status check (Finish)**: Verified finish code verification fails when booking is not in `finishing` status.
10. **Successful Check-Out**: Verified updates booking status to `completed`, saves GPS details, calculates correct work duration, and logs `verification_success`.

All tests passed successfully!

## Commits Created
- **c67a4a5**: `migration: add booking verification schema and verify_booking_code function`
- **7e96436**: `fix(database): apply reviewer feedback for Task 1, update RLS, schema search path, status checks, window, and delete-expired flow`

## Concerns
- None. Timezone parsing and cryptographic functions are fully supported by PostgreSQL.
