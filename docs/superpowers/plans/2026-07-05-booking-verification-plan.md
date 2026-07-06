# Secure Two-Step Booking Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a secure two-step verification system for every cleaning booking using hashed one-time security codes.

**Architecture:** A PostgreSQL migration adds tracking columns to `bookings` and creates a `booking_verification_codes` table to temporarily store SHA-256 hashes of codes. Realtime status triggers homeowner-side code generation and display, while an atomic Postgres RPC function `verify_booking_code` validates input, checks time windows, and calculates cleaner distance <= 100 meters.

**Tech Stack:** Supabase (JS client, Realtime, SQL, RLS), React, Lucide-react, React Router DOM, React Hot Toast.

## Global Constraints
* The plain 6-digit verification code must never be stored in the database or written to any logs.
* Hashed verification code records must be deleted immediately after successful verification or upon expiration (10 minutes).
* Cleaners must be within 100 meters of the booking coordinates to start/finish cleaning.
* Start code verification is restricted to the scheduled time window (1 hour early to 2 hours late allowed).

---

### Task 1: Database Schema & Verification Functions

**Files:**
- Create: `src/supabase/migrations/20260705000000_booking_verification.sql`

**Interfaces:**
- Produces: Table `booking_verification_codes`, columns on `bookings`, and PostgreSQL function `verify_booking_code`

- [ ] **Step 1: Write the database migration SQL**
  Create the migration file `src/supabase/migrations/20260705000000_booking_verification.sql` containing:
  ```sql
  -- Alter bookings table to add tracking columns
  ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_in_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_out_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS work_duration INTEGER;

  -- Create temporary verification codes table
  CREATE TABLE IF NOT EXISTS public.booking_verification_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      hashed_code TEXT NOT NULL,
      expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
      code_type TEXT NOT NULL CHECK (code_type IN ('start', 'finish')),
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Enable RLS
  ALTER TABLE public.booking_verification_codes ENABLE ROW LEVEL SECURITY;

  -- RLS Policy for managing codes
  CREATE POLICY "Homeowners manage own verification codes" ON public.booking_verification_codes
      FOR ALL
      USING (
          EXISTS (
              SELECT 1 FROM bookings b
              JOIN homeowners h ON b.homeowner_id = h.id
              WHERE b.id = booking_verification_codes.booking_id 
              AND h.user_id = auth.uid()
          )
      );

  -- Helper function to calculate distance using Haversine formula
  CREATE OR REPLACE FUNCTION calculate_distance(
      lat1 double precision,
      lon1 double precision,
      lat2 double precision,
      lon2 double precision
  ) RETURNS double precision AS $$
  DECLARE
      r double precision := 6371000; -- Earth radius in meters
      dlat double precision;
      dlon double precision;
      a double precision;
      c double precision;
  BEGIN
      IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
          RETURN 99999999;
      END IF;
      
      dlat := radians(lat2 - lat1);
      dlon := radians(lon2 - lon1);
      
      a := sin(dlat/2) * sin(dlat/2) +
           cos(radians(lat1)) * cos(radians(lat2)) *
           sin(dlon/2) * sin(dlon/2);
           
      c := 2 * atan2(sqrt(a), sqrt(1-a));
      
      RETURN r * c;
  END;
  $$ LANGUAGE plpgsql IMMUTABLE;

  -- Main verification function
  CREATE OR REPLACE FUNCTION verify_booking_code(
      p_booking_id UUID,
      p_entered_code TEXT,
      p_cleaner_lat DOUBLE PRECISION,
      p_cleaner_lng DOUBLE PRECISION
  ) RETURNS JSONB AS $$
  DECLARE
      v_code_record RECORD;
      v_booking_record RECORD;
      v_distance DOUBLE PRECISION;
      v_entered_hash TEXT;
      v_now TIMESTAMP WITH TIME ZONE := NOW();
      v_duration INTEGER;
  BEGIN
      -- Compute the SHA-256 hash of the entered code
      v_entered_hash := encode(digest(p_entered_code, 'sha256'), 'hex');

      -- Find active code
      SELECT * INTO v_code_record 
      FROM booking_verification_codes
      WHERE booking_id = p_booking_id
        AND hashed_code = v_entered_hash
        AND used = false;

      IF v_code_record IS NULL THEN
          INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
          VALUES (
              auth.uid(), 
              'verification_failed', 
              'booking', 
              p_booking_id, 
              jsonb_build_object(
                  'error', 'Invalid security code',
                  'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng)
              )
          );
          RETURN jsonb_build_object('success', false, 'message', 'Invalid security code.');
      END IF;

      -- Check expiration
      IF v_code_record.expiry_time < v_now THEN
          DELETE FROM booking_verification_codes WHERE id = v_code_record.id;
          
          INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
          VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
              jsonb_build_object('error', 'Code expired', 'type', v_code_record.code_type));
              
          RETURN jsonb_build_object('success', false, 'message', 'The code has expired.');
      END IF;

      -- Get booking details
      SELECT * INTO v_booking_record FROM bookings WHERE id = p_booking_id;

      -- Distance check (100 meters limit)
      v_distance := calculate_distance(
          v_booking_record.latitude, v_booking_record.longitude,
          p_cleaner_lat, p_cleaner_lng
      );

      IF v_distance > 100 THEN
          INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
          VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
              jsonb_build_object(
                  'error', 'Distance limit exceeded',
                  'distance_meters', v_distance,
                  'type', v_code_record.code_type,
                  'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng)
              )
          );
          RETURN jsonb_build_object('success', false, 'message', 'You must be within 100 meters of the booking location.');
      END IF;

      -- Code type specific checks and updates
      IF v_code_record.code_type = 'start' THEN
          -- Verify scheduled window (1 hour early to 2 hours late allowed)
          IF v_now < (v_booking_record.service_date + v_booking_record.service_time) - INTERVAL '1 hour' OR
             v_now > (v_booking_record.service_date + v_booking_record.service_time) + (v_booking_record.hours * INTERVAL '1 hour') + INTERVAL '2 hours' THEN
              
              INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
              VALUES (auth.uid(), 'verification_failed', 'booking', p_booking_id, 
                  jsonb_build_object('error', 'Outside scheduled window', 'type', 'start'));
                  
              RETURN jsonb_build_object('success', false, 'message', 'You can only start within the scheduled booking window.');
          END IF;

          UPDATE bookings 
          SET status = 'started',
              check_in_time = v_now,
              check_in_lat = p_cleaner_lat,
              check_in_lng = p_cleaner_lng,
              updated_at = v_now
          WHERE id = p_booking_id;

      ELSIF v_code_record.code_type = 'finish' THEN
          v_duration := EXTRACT(EPOCH FROM (v_now - v_booking_record.check_in_time))::INTEGER;

          UPDATE bookings 
          SET status = 'completed',
              check_out_time = v_now,
              check_out_lat = p_cleaner_lat,
              check_out_lng = p_cleaner_lng,
              work_duration = v_duration,
              updated_at = v_now
          WHERE id = p_booking_id;
      END IF;

      -- Delete verified code
      DELETE FROM booking_verification_codes WHERE id = v_code_record.id;

      -- Write successful audit log (metadata only, no code)
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
      VALUES (
          auth.uid(), 
          'verification_success', 
          'booking', 
          p_booking_id, 
          jsonb_build_object(
              'type', v_code_record.code_type,
              'gps', jsonb_build_object('lat', p_cleaner_lat, 'lng', p_cleaner_lng),
              'duration_seconds', v_duration
          )
      );

      RETURN jsonb_build_object('success', true, 'message', 'Verification successful.');
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  ```

- [ ] **Step 2: Apply the migration to Supabase DB**
  Execute the migration using the Supabase MCP `execute_sql` tool.
  Verify that the tables are modified and the function `verify_booking_code` is created.

- [ ] **Step 3: Commit migration**
  ```bash
  git add src/supabase/migrations/20260705000000_booking_verification.sql
  git commit -m "migration: add booking verification schema and verify_booking_code function"
  ```

---

### Task 2: Service Layer & Coordinates Capturing

**Files:**
- Modify: `src/services/bookings.js`
- Modify: `src/pages/homeowner/BookingScreen.jsx`

**Interfaces:**
- Consumes: Supabase client
- Produces: JS functions `saveHashedCode`, `getActiveCode`, `deleteCode`, and `verifyBookingCode`

- [ ] **Step 1: Update `src/services/bookings.js`**
  Add service functions to interact with code verification:
  ```javascript
  export async function saveHashedCode(bookingId, hashedCode, codeType) {
    // Delete any existing active codes of this type first to prevent duplicates
    await supabase
      .from('booking_verification_codes')
      .delete()
      .eq('booking_id', bookingId)
      .eq('code_type', codeType)

    const expiryTime = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    const { data, error } = await supabase
      .from('booking_verification_codes')
      .insert([{
        booking_id: bookingId,
        hashed_code: hashedCode,
        expiry_time: expiryTime,
        code_type: codeType,
        used: false
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  export async function getActiveCode(bookingId, codeType) {
    const { data, error } = await supabase
      .from('booking_verification_codes')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('code_type', codeType)
      .eq('used', false)
      .gt('expiry_time', new Date().toISOString())
      .maybeSingle()

    if (error) throw error
    return data
  }

  export async function deleteCode(bookingId, codeType) {
    const { error } = await supabase
      .from('booking_verification_codes')
      .delete()
      .eq('booking_id', bookingId)
      .eq('code_type', codeType)

    if (error) throw error
  }

  export async function verifyBookingCodeRPC(bookingId, enteredCode, lat, lng) {
    const { data, error } = await supabase
      .rpc('verify_booking_code', {
        p_booking_id: bookingId,
        p_entered_code: enteredCode,
        p_cleaner_lat: lat,
        p_cleaner_lng: lng
      })

    if (error) throw error
    return data
  }
  ```

- [ ] **Step 2: Capture Coordinates in `BookingScreen.jsx`**
  Modify the `handleSubmit` function in `src/pages/homeowner/BookingScreen.jsx` to include `latitude` and `longitude` during booking creation:
  ```javascript
        latitude: homeowner.latitude || null,
        longitude: homeowner.longitude || null,
  ```
  Ensure these fields are added to the parameters of `createBooking`.

- [ ] **Step 3: Commit Service and Location updates**
  ```bash
  git add src/services/bookings.js src/pages/homeowner/BookingScreen.jsx
  git commit -m "feat: add service layer functions and capture coordinates on booking creation"
  ```

---

### Task 3: Homeowner Code Generation, Display, and Regeneration

**Files:**
- Modify: `src/pages/homeowner/BookingHistory.jsx`

- [ ] **Step 1: Set up Realtime and Code Handling in `BookingHistory.jsx`**
  Modify `src/pages/homeowner/BookingHistory.jsx` to handle real-time sync, secure code generation, SHA-256 hashing, countdown timers, and manual code regeneration.
  
  Add hashing and random code generators:
  ```javascript
  const generateSecureCode = () => {
    const array = new Uint32Array(1)
    window.crypto.getRandomValues(array)
    return String(array[0] % 1000000).padStart(6, '0')
  }

  const hashSHA256 = async (text) => {
    const msgBuffer = new TextEncoder().encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
  ```

  Integrate the code generation logic:
  ```javascript
  // Store generated codes in local state mapped by booking ID
  const [activeCodes, setActiveCodes] = useState({}) // { bookingId: { code, type, expiry } }

  // Function to generate and save code
  const handleGenerateCode = async (bookingId, codeType) => {
    try {
      const code = generateSecureCode()
      const hashed = await hashSHA256(code)
      await saveHashedCode(bookingId, hashed, codeType)
      
      const expiry = Date.now() + 10 * 60 * 1000 // 10 minutes
      setActiveCodes(prev => ({
        ...prev,
        [bookingId]: { code, type: codeType, expiry }
      }))
      toast.success(`${codeType === 'start' ? 'Start' : 'Finish'} Code generated!`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate security code')
    }
  }
  ```

- [ ] **Step 2: Add Realtime Subscription & UI Cards**
  Ensure the bookings feed subscribes to realtime changes:
  ```javascript
  useEffect(() => {
    if (!homeowner) return

    // Subscribe to changes on public:bookings
    const channel = supabase
      .channel('bookings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `homeowner_id=eq.${homeowner.id}` },
        (payload) => {
          // Re-fetch or update bookings in state
          fetchBookings()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [homeowner])
  ```
  Add a countdown timer and UI container next to the booking details to display the code if the booking is in `arrived` or `finishing` status. Show the 6-digit code and a "Regenerate Code" button, along with the countdown timer.

- [ ] **Step 3: Commit Homeowner UI updates**
  ```bash
  git add src/pages/homeowner/BookingHistory.jsx
  git commit -m "feat: implement homeowner code generation, SHA-256 hashing, countdown timers, and manual regeneration"
  ```

---

### Task 4: Cleaner Verification UI & Proximity Validation

**Files:**
- Modify: `src/pages/worker/UpcomingJobs.jsx`

- [ ] **Step 1: Add state transitions and code verification modal to `UpcomingJobs.jsx`**
  Modify `UpcomingJobs.jsx` to:
  1. Change the "Start Cleaning" button action to "Arrived". When clicked, get cleaner's GPS coords and update booking status to `arrived`.
  2. Change the "Complete Job" button action to "Finish Cleaning". When clicked, update status to `finishing`.
  3. Show a modal asking for the 6-digit verification code if the booking status is `arrived` (for start verification) or `finishing` (for finish verification).
  4. Submit entered code + GPS coords to `verifyBookingCodeRPC`.
  5. Close modal, refresh state, and start/stop timer on success.
  6. Provide a "Request New Code" button inside the modal that deletes the current code in the DB and resets the booking status to trigger code regeneration.

  Modal verification code submission:
  ```javascript
  const handleVerifyCode = async (bookingId, code, type) => {
    try {
      setVerifying(true)
      // Get current location
      const coords = await getCurrentPosition()
      
      const response = await verifyBookingCodeRPC(bookingId, code, coords.lat, coords.lng)
      if (response.success) {
        toast.success(response.message)
        // Refresh local bookings list
        fetchJobs()
        setShowModal(null)
      } else {
        toast.error(response.message)
      }
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Verification failed. Make sure GPS is enabled and coordinates match.')
    } finally {
      setVerifying(false)
    }
  }
  ```

- [ ] **Step 2: Commit Cleaner UI updates**
  ```bash
  git add src/pages/worker/UpcomingJobs.jsx
  git commit -m "feat: implement worker code-entry modal, GPS capture, RPC verification, and request regeneration"
  ```
