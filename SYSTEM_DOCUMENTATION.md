# Smart Metro Parking System - Complete Documentation

## System Overview
A complete real-time parking management system with QR code-based entry, admin dashboard, and security scanner.

## File Structure

```
Parking/
├── index.html                  # Login page
├── signup.html                 # User registration
├── location.html               # Location selection (NEW)
├── dashboard.html              # Parking slots view
├── booking.html                # Booking form (NEW)
├── ticket.html                 # QR ticket display (NEW)
├── admin.html                  # Admin dashboard
├── security.html               # QR scanner for security
├── parking-script.js           # Login logic
├── signup-script.js            # Registration logic
├── location-script.js          # Location selection logic (NEW)
├── dashboard-script.js         # Dashboard logic
├── booking-script.js           # Booking logic (NEW)
├── ticket-script.js            # Ticket display logic (NEW)
├── admin-script.js             # Admin dashboard logic
├── security-script.js          # QR scanner logic
└── parking-styles.css          # Shared styles
```

## Complete User Flow

### 1. User Registration/Login
**Files:** `index.html`, `signup.html`, `parking-script.js`, `signup-script.js`

- User opens `index.html`
- Can login with email/password or Google
- New users click "Sign Up" → `signup.html`
- After successful login → Redirect to `location.html`

### 2. Location Selection
**Files:** `location.html`, `location-script.js`

- User sees 3 parking locations:
  - Rathinam Main Gate
  - Rathinam Gate 1
  - Rathinam Gate 3
- Each location shows:
  - Total slots
  - Available slots (real-time)
- User selects location → Stored in localStorage
- Redirect to `dashboard.html`

### 3. View Parking Slots
**Files:** `dashboard.html`, `dashboard-script.js`

- Shows slots filtered by selected location
- Real-time status updates:
  - Green = Available
  - Yellow = Reserved
  - Red = Occupied
- User clicks available slot → Redirect to `booking.html`
- "Change Location" button → Back to `location.html`

### 4. Book Parking Slot
**Files:** `booking.html`, `booking-script.js`

- Form fields:
  - Full Name
  - Phone Number (10 digits)
  - Vehicle Number (e.g., TN01AB1234)
  - Vehicle Type (Car ₹80 / Bike ₹40)
- On submit:
  - Creates booking in Firestore (status: "reserved")
  - Updates slot status to "reserved"
  - Sets 5-minute expiry timer
  - Stores booking data in localStorage
  - Redirect to `ticket.html`

### 5. View Ticket with QR Code
**Files:** `ticket.html`, `ticket-script.js`

- Displays booking confirmation
- Shows QR code containing:
  - Format: `BOOKINGID_SLOTNUMBER_LOCATION_VEHICLENUMBER`
- Shows all booking details
- Important notes about 5-minute expiry
- Options: Print ticket or Back to Home

### 6. Security Scanner (Entry Gate)
**Files:** `security.html`, `security-script.js`

- Uses device camera to scan QR codes
- On scan:
  - Extracts booking ID from QR
  - Fetches booking from Firestore
  - Checks status and expiry
  
**Approval Logic:**
- If status = "reserved" AND not expired:
  - ✅ ACCESS APPROVED
  - Update booking status → "occupied"
  - Update slot status → "occupied"
  - Display booking details
  
- If status = "occupied":
  - ❌ ALREADY CHECKED IN
  
- If status = "expired" OR past expiry time:
  - ❌ BOOKING EXPIRED
  
- If booking not found:
  - ❌ BOOKING NOT FOUND

- Manual entry option available for backup

### 7. Admin Dashboard
**Files:** `admin.html`, `admin-script.js`

**Access:** Only `koushik123@gmail.com`

**Features:**

1. **Dashboard Overview**
   - Total Slots
   - Available Slots
   - Reserved Slots
   - Occupied Slots
   - Total Bookings Today
   - Total Revenue Today

2. **Bookings Management**
   - Table with all bookings
   - Filters:
     - Location (All / Main Gate / Gate 1 / Gate 3)
     - Status (All / Reserved / Occupied / Completed)
   - Columns: Booking ID, Location, Slot, Name, Phone, Vehicle, Entry Time, Price, Status

3. **Slot Management**
   - Grouped by location
   - Shows slot number and status
   - Admin actions:
     - Mark Occupied
     - Mark Available
     - Mark Exit (for occupied slots)

4. **Revenue Tracking**
   - Daily bookings count
   - Daily revenue total

## Firebase Collections

### parking_slots
```javascript
{
  slotNumber: Number,
  location: String, // "Rathinam Main Gate" | "Rathinam Gate 1" | "Rathinam Gate 3"
  status: String, // "available" | "reserved" | "occupied"
  bookedBy: String | null,
  phone: String | null,
  vehicleType: String | null, // "Car" | "Bike"
  vehicleNumber: String | null,
  price: Number | null,
  reservedAt: Timestamp | null,
  occupiedSince: Timestamp | null
}
```

### bookings
```javascript
{
  slotNumber: Number,
  location: String,
  name: String,
  phone: String,
  vehicleNumber: String,
  vehicleType: String, // "Car" | "Bike"
  price: Number, // 80 for Car, 40 for Bike
  bookedAt: Timestamp,
  entryTime: Timestamp | null,
  exitTime: Timestamp | null,
  expiryTime: Date, // 5 minutes from booking
  status: String, // "reserved" | "occupied" | "completed" | "expired"
  userId: String,
  userEmail: String
}
```

## Status Flow

### Slot Status
1. **available** → User can book
2. **reserved** → Booking created, waiting for arrival (5 min)
3. **occupied** → Vehicle entered (QR scanned)
4. **available** → Vehicle exited (admin marks exit)

### Booking Status
1. **reserved** → Just booked, QR generated
2. **occupied** → QR scanned at entrance
3. **completed** → Vehicle exited
4. **expired** → 5 minutes passed without check-in

## Auto-Expiry System

**Trigger:** 5 minutes after booking creation

**Process:**
1. Check if booking status is still "reserved"
2. If yes:
   - Update booking status → "expired"
   - Update slot status → "available"
   - Clear slot booking data
3. If no (already occupied):
   - Do nothing

**Implementation:** JavaScript setTimeout in `booking-script.js`

## Real-Time Sync

All pages use Firestore `onSnapshot` listeners:
- Location stats update live
- Dashboard slots update live
- Admin dashboard updates live
- Changes sync across all open tabs/devices

## Color Coding

- **Green (#10b981):** Available
- **Yellow (#f59e0b):** Reserved
- **Red (#ef4444):** Occupied
- **Blue (#2563eb):** Primary actions
- **Gray (#6b7280):** Secondary actions

## Security Features

1. **Authentication Required:** All pages check auth state
2. **Admin-Only Access:** Admin dashboard checks email
3. **QR Code Validation:** Verifies booking exists and is valid
4. **Expiry Enforcement:** Prevents late arrivals
5. **Status Verification:** Prevents duplicate check-ins

## Mobile Responsive

All pages are fully responsive:
- Flexible grids
- Touch-friendly buttons
- Camera access for QR scanning
- Print-friendly ticket

## Error Handling

- Firebase connection errors
- Camera permission denied
- Invalid QR codes
- Expired bookings
- Network failures
- Form validation

## Testing Checklist

### User Flow
- [ ] Register new account
- [ ] Login with email/password
- [ ] Login with Google
- [ ] Select location
- [ ] View available slots
- [ ] Book a slot
- [ ] View QR ticket
- [ ] Print ticket

### Security Flow
- [ ] Open security scanner
- [ ] Grant camera permission
- [ ] Scan valid QR code
- [ ] Verify approval message
- [ ] Try scanning same QR again (should show "already checked in")
- [ ] Try scanning expired booking

### Admin Flow
- [ ] Login as admin
- [ ] View dashboard statistics
- [ ] Filter bookings by location
- [ ] Filter bookings by status
- [ ] View slot management
- [ ] Mark slot as occupied
- [ ] Mark slot as available
- [ ] Mark vehicle exit

### Real-Time Sync
- [ ] Open dashboard in two browsers
- [ ] Book slot in one browser
- [ ] Verify slot updates in other browser
- [ ] Scan QR code
- [ ] Verify status updates everywhere

### Expiry System
- [ ] Book a slot
- [ ] Wait 5 minutes
- [ ] Verify slot becomes available
- [ ] Verify booking status changes to expired

## Common Issues & Solutions

### Issue: Slots not loading
**Solution:** Check Firestore rules, ensure `location` field exists on all slots

### Issue: QR scanner not working
**Solution:** Check camera permissions, use HTTPS (required for camera access)

### Issue: Booking expiry not working
**Solution:** Keep browser tab open for 5 minutes (setTimeout runs in browser)

### Issue: Admin dashboard shows "Access Denied"
**Solution:** Verify email matches `ADMIN_EMAIL` constant in scripts

### Issue: Real-time updates not working
**Solution:** Check Firebase connection, verify onSnapshot listeners are active

## Future Enhancements

1. Push notifications for booking expiry
2. Payment gateway integration
3. Booking history for users
4. Analytics dashboard
5. Multiple admin roles
6. SMS notifications
7. Cloud Functions for server-side expiry
8. Parking duration tracking
9. Dynamic pricing
10. Reservation system (book in advance)
