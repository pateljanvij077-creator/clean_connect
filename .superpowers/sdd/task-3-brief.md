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
