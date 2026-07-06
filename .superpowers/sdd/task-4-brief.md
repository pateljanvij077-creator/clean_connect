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
