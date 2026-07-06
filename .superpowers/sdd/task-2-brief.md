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
