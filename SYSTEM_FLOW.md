# Smart Metro Parking System - Complete Flow

## System Architecture

### Database Structure
```
parking_locations (Collection)
├── rathinam_main_gate (Document)
│   └── slots (Subcollection)
│       ├── slot1 (Document)
│       ├── slot2 (Document)
│       └── ...
├── rathinam_gate1 (Document)
│   └── slots (Subcollection)
│       └── ...
└── rathinam_gate3 (Document)
    └── slots (Subcollection)
        └── ...
```

## User Roles

### Customer (All users except admin)
- Login → Select Location → View Slots → Book Available Slot → Get QR Code

### Admin (koushik123@gmail.com)
- Login → Admin Dashboard → View All Slots → Scan QR Codes → Approve Entry

## Customer Flow

### 1. Login
- File: `index.html`, `parking-script.js`
- User logs in with email/password or Google
- Authentication via Firebase Auth

### 2. Location Selection
- File: `locations.html`, `locations-script.js`
- User selects one of three locations:
  - Rathinam Main Gate
  - Rathinam Gate 1
  - Rathinam Gate 3
- Location stored in localStorage

### 3. Slots Dashboard
- File: `slots-dashboard.html`, `slots-dashboard-script.js`
- Real-time display of all slots with color coding:
  - **Green** = Available (can book)
  - **Yellow** = Booked (waiting for entry)
  - **Red** = Occupied (vehicle inside)

### 4. Booking Process
- User clicks available (green) slot
- Booking form appears with fields:
  - Name
  - Phone Number
  - Vehicle Type (Car/Bike)
  - Vehicle Number
- On submit:
  - Generate unique `bookingId`
  - Update Firestore slot:
    ```javascript
    {
      status: 'booked',
      bookedBy: userEmail,
      phone: phoneNumber,
      vehicleType: vehicleType,
      vehicleNumber: vehicleNumber,
      bookingId: bookingId,
      price: vehicleType === 'Car' ? 80 : 40
    }
    ```
  - Slot color changes to **YELLOW**
  - Generate QR code

### 5. QR Code Generation
- QR data format: `bookingId|userEmail|slotNumber|locationName`
- Example: `BK1234567890ABC|user@email.com|5|Rathinam Main Gate`
- User must show this QR at parking entrance

## Admin Flow

### 1. Admin Login
- Same login page as customers
- System detects admin email: `koushik123@gmail.com`
- Redirects to admin dashboard

### 2. Admin Dashboard
- File: `admin-dashboard.html`, `admin-dashboard-script.js`
- Features:
  - **Statistics**: Total, Available, Booked, Occupied slots
  - **Live Slot View**: Real-time slot status for all locations
  - **QR Scanner**: Camera-based scanner for entry approval

### 3. QR Scanning Process
- Admin opens QR scanner
- Scans customer's QR code
- System extracts `bookingId` from QR data
- Searches Firestore for slot with matching `bookingId`
- Verification:
  - If `status === 'booked'`:
    - Update slot: `status = 'occupied'`
    - Set `occupiedSince = current timestamp`
    - Slot color changes to **RED**
    - Display: "Parking Approved"
  - If `status === 'occupied'`:
    - Display: "Already Checked In"
  - If booking not found:
    - Display: "Booking Not Found"

## Real-Time Updates

### Firestore Listeners
All pages use `onSnapshot()` for real-time updates:

```javascript
onSnapshot(slotsRef, (snapshot) => {
  // Update UI immediately when data changes
});
```

### Benefits
- Customer sees slot color change instantly after booking
- Admin sees all slot updates in real-time
- Multiple admins can work simultaneously
- No page refresh needed

## Color Logic

| Status | Color | Meaning | Action |
|--------|-------|---------|--------|
| available | Green | Slot is free | Customer can book |
| booked | Yellow | Waiting for entry | Admin must scan QR |
| occupied | Red | Vehicle inside | No action available |

## Security

### Authentication
- All pages require Firebase Authentication
- Unauthenticated users redirected to login

### Role-Based Access
- Admin email check: `user.email === 'koushik123@gmail.com'`
- Customers: Cannot access admin dashboard
- Admin: Redirected directly to admin dashboard

### Firestore Rules
```javascript
match /parking_locations/{location}/slots/{slot} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

## File Structure

```
Parking/
├── index.html                    # Login page
├── parking-script.js             # Login logic
├── signup.html                   # Signup page
├── signup-script.js              # Signup logic
├── locations.html                # Location selection (customers)
├── locations-script.js           # Location logic
├── slots-dashboard.html          # Slots view (customers)
├── slots-dashboard-script.js     # Slots logic
├── admin-dashboard.html          # Admin panel
├── admin-dashboard-script.js     # Admin logic
└── parking-styles.css            # Shared styles
```

## Key Features

1. **Real-time synchronization** across all users
2. **QR code-based entry** approval system
3. **Role-based access** control
4. **Mobile responsive** design
5. **Color-coded status** indicators
6. **Automatic booking ID** generation
7. **Live statistics** for admin
8. **Multi-location support**

## Booking ID Format

Generated using:
```javascript
'BK' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase()
```

Example: `BK1709876543210XYZ123ABC`

## Price Structure

- Car: ₹80
- Bike: ₹40

Stored in slot document when booking is made.
