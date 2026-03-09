# Smart Metro Parking System - Extended Features

## New Features Added

### 1. Admin Dashboard (admin.html)
Access: Admin users only (koushik123@gmail.com)

**Features:**
- Dashboard Overview with real-time statistics:
  - Total Parking Slots
  - Available Slots
  - Reserved Slots
  - Occupied Slots
  - Total Bookings Today
  - Total Revenue Today

- Bookings Management:
  - View all bookings in a table
  - Filter by Location (Rathinam Main Gate, Gate 1, Gate 3)
  - Filter by Status (Reserved, Occupied, Completed)
  - Displays: Booking ID, Location, Slot, Name, Phone, Vehicle, Entry Time, Price, Status

- Slot Management:
  - View all slots grouped by location
  - Real-time slot status updates
  - Admin actions: Mark Occupied, Mark Available, Mark Exit

- Revenue Tracking:
  - Daily revenue summary
  - Calculated from booking prices

### 2. Security QR Scanner (security.html)
For security guards at parking entrance

**Features:**
- Camera-based QR code scanning using html5-qrcode library
- Automatic vehicle entry approval
- Manual booking ID entry option

**QR Code Entry Process:**
1. User books a slot → System generates QR code with format: `BOOKINGID_SLOTNUMBER_LOCATION_VEHICLENUMBER`
2. Security scans QR code at entrance
3. System verifies booking status
4. If status = "Reserved" → Automatically approves entry
5. Updates booking status → "Occupied"
6. Updates slot status → "Occupied"
7. Displays: ACCESS APPROVED with booking details

**Invalid Cases:**
- Booking not found → "BOOKING NOT FOUND"
- Already checked in → "ALREADY CHECKED IN"
- Booking expired → "BOOKING EXPIRED"

### 3. Enhanced Booking System
- Added vehicle number field to booking form
- QR code generation after successful booking
- Booking status: Reserved → Occupied → Completed
- Location tracking for each booking

## File Structure

```
Parking/
├── index.html              # Login page
├── signup.html             # Signup page
├── dashboard.html          # User dashboard (booking slots)
├── admin.html              # Admin dashboard (NEW)
├── security.html           # QR scanner (NEW)
├── parking-script.js       # Login/signup logic
├── signup-script.js        # Signup logic
├── dashboard-script.js     # User dashboard logic (updated)
├── admin-script.js         # Admin dashboard logic (NEW)
├── security-script.js      # QR scanner logic (NEW)
└── parking-styles.css      # Shared styles
```

## Firebase Collections

### parking_slots
- slotNumber
- status (available/reserved/occupied)
- location
- bookedBy
- phone
- vehicleType
- vehicleNumber
- price
- occupiedSince

### bookings
- slotNumber
- location
- name
- phone
- vehicleNumber
- vehicleType
- price
- bookedAt
- entryTime
- exitTime
- status (reserved/occupied/completed)
- userId
- userEmail

## Usage

1. **User Flow:**
   - Login → Dashboard → Select available slot → Enter details → Get QR code
   - Show QR code at entrance → Security scans → Entry approved

2. **Security Flow:**
   - Open security.html → Scan QR code → Verify booking → Approve/Deny entry

3. **Admin Flow:**
   - Login with admin credentials → Access admin.html
   - View statistics, manage bookings, control slots, track revenue

## Real-time Sync
All updates sync instantly using Firebase Firestore listeners. When a slot changes status, all dashboards update automatically.
