# Task 2 Report: Service Layer & Coordinates Capturing (with RPC Fixes)

## Status
**DONE** (Fixes Applied & Verified)

## Implementation Details & Fixes

We have modified the booking verification codebase to implement security code generation and capture, as well as fixing database RPC function issues identified by the reviewer:

### 1. Database Migration Refinements (`src/supabase/migrations/20260705000000_booking_verification.sql`)
- **Timezone-Aware Scheduled Window Check**:
  - The scheduled start time check inside `verify_booking_code` was updated to handle timezones properly.
  - Converting the scheduled local time (from `service_date` + `service_time`) to `TIMESTAMP WITH TIME ZONE` using `AT TIME ZONE 'Asia/Kolkata'` ensures it aligns with the user's local timezone (IST, +05:30 offset).
  - Formula used:
    ```sql
    v_scheduled_start := (v_booking_record.service_date + v_booking_record.service_time) AT TIME ZONE 'Asia/Kolkata';
    ```
- **Conditional Distance Check on Coordinates Availability**:
  - The 100-meter proximity validation check is now skipped if either the booking coordinates (`latitude`/`longitude`) or the cleaner coordinates (`p_cleaner_lat`/`p_cleaner_lng`) are `NULL`.
  - When skipped, instead of failing, the function sets `v_distance := NULL` and logs a warning event in `activity_logs` with action `'gps_missing'` and metadata `gps_missing: true`.

### 2. Service Layer Updates (`src/services/bookings.js`)
- Added service function wrappers to interact with Supabase table and RPC endpoint:
  - `saveHashedCode(bookingId, hashedCode, codeType)`: Deletes pre-existing active codes of this type and stores a new OTP hash with a 10-minute expiry.
  - `getActiveCode(bookingId, codeType)`: Queries active, unexpired verification codes.
  - `deleteCode(bookingId, codeType)`: Deletes any active code records of the given type.
  - `verifyBookingCodeRPC(bookingId, enteredCode, lat, lng)`: Calls the `verify_booking_code` database RPC function to verify cleaner input.

### 3. Homeowner Booking Page Updates (`src/pages/homeowner/BookingScreen.jsx`)
- Enriched `handleSubmit` to extract current homeowner lat/lng coordinates and pass them to the booking payload so bookings are created with correct geographical anchors.

---

## Verification & Testing

### 1. Database RPC Verification Script (`.superpowers/sdd/test_query.sql`)
- Updated the SQL test suite:
  - Configured mock bookings to establish scheduled times in the `Asia/Kolkata` local timezone using `(NOW() AT TIME ZONE 'Asia/Kolkata')`.
  - Added **Test 3a** to specifically test missing coordinates. Validated that when cleaner coordinates are `NULL`, the distance limit check is skipped, the verification succeeds, the database check-in status updates to `'started'`, and a `'gps_missing'` log is entered with `gps_missing: true` metadata.
- Executed the SQL transaction script on Supabase project `pqxqqgccpzjjiclaxbmb`. **All tests passed successfully!**

### 2. Linter & Build Auditing
- Ran OXlint linter successfully with zero syntax/code-style errors.
- Built Vite application bundle successfully without any compilation errors.

---

## Commits
- **5d3721c**: `feat: add service layer functions and capture coordinates on booking creation`
- **[New Commit]**: `fix: update verify_booking_code timezone and coordinate checking, expand SQL tests`
