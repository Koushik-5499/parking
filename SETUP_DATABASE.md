# Database Setup Guide

## Firebase Firestore Structure

### Collection: `parking_locations`

Create three documents with these exact IDs:
1. `rathinam_main_gate`
2. `rathinam_gate1`
3. `rathinam_gate3`

### Subcollection: `slots`

Inside each location document, create a subcollection named `slots`.

For each slot, create documents with these fields:

```javascript
{
  slotNumber: 1,              // Number
  status: "available",        // String: "available", "booked", or "occupied"
  bookedBy: null,            // String (email) or null
  phone: null,               // String or null
  vehicleType: null,         // String or null
  vehicleNumber: null,       // String or null
  bookingId: null,           // String or null
  occupiedSince: null,       // Timestamp or null
  price: null                // Number or null
}
```

## Quick Setup Script

You can use Firebase Console or run this in your browser console after authentication:

```javascript
// Run this in browser console on your app page
const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];

for (const location of locations) {
  for (let i = 1; i <= 10; i++) {
    const slotRef = doc(db, 'parking_locations', location, 'slots', `slot${i}`);
    await setDoc(slotRef, {
      slotNumber: i,
      status: 'available',
      bookedBy: null,
      phone: null,
      vehicleType: null,
      vehicleNumber: null,
      bookingId: null,
      occupiedSince: null,
      price: null
    });
  }
}
```

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /parking_locations/{location}/slots/{slot} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Status Flow

1. **available** (Green) → User can book
2. **booked** (Yellow) → Waiting for QR scan at entrance
3. **occupied** (Red) → Vehicle has entered

## Admin Access

Only this email can access admin dashboard:
- `koushik123@gmail.com`

All other authenticated users are customers.
