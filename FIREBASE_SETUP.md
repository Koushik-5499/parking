# Firebase Setup Guide

## Step 1: Test Firebase Connection

Open `test-connection.html` in your browser to verify:
- ✅ Firebase initialization
- ✅ Authentication service
- ✅ Firestore database
- ✅ Database structure

## Step 2: Initialize Database

Open `setup-database.html` in your browser and click "Initialize Database"

This will create:
```
parking_locations/
├── rathinam_main_gate/
│   └── slots/
│       ├── slot1
│       ├── slot2
│       └── ... (10 slots by default)
├── rathinam_gate1/
│   └── slots/
│       └── ... (10 slots)
└── rathinam_gate3/
    └── slots/
        └── ... (10 slots)
```

## Step 3: Configure Firestore Security Rules

Go to Firebase Console → Firestore Database → Rules

Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write parking locations and slots
    match /parking_locations/{location}/slots/{slot} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Allow authenticated users to read location documents
    match /parking_locations/{location} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

Click "Publish" to save the rules.

## Step 4: Enable Authentication Methods

Go to Firebase Console → Authentication → Sign-in method

Enable:
1. **Email/Password** - Click Enable
2. **Google** - Click Enable and configure

## Step 5: Create Admin User

### Option A: Using Firebase Console
1. Go to Authentication → Users
2. Click "Add user"
3. Email: `koushik123@gmail.com`
4. Password: (your choice)
5. Click "Add user"

### Option B: Using Signup Page
1. Open `signup.html`
2. Sign up with email: `koushik123@gmail.com`
3. This user will have admin access

## Step 6: Test the System

### Test Customer Flow:
1. Open `index.html`
2. Login with any user (not admin email)
3. Should redirect to `locations.html`
4. Select a location
5. View slots in `slots-dashboard.html`
6. Book an available slot
7. Get QR code

### Test Admin Flow:
1. Open `index.html`
2. Login with `koushik123@gmail.com`
3. Should redirect to `admin-dashboard.html`
4. View live slot statistics
5. Test QR scanner (use phone camera or QR code image)

## Firestore Data Structure

### Each Slot Document Contains:
```javascript
{
  slotNumber: 1,              // Number
  status: "available",        // "available" | "booked" | "occupied"
  bookedBy: null,            // User email or null
  phone: null,               // Phone number or null
  vehicleType: null,         // "Car" | "Bike" | null
  vehicleNumber: null,       // Vehicle number or null
  bookingId: null,           // Unique booking ID or null
  occupiedSince: null,       // Timestamp or null
  price: null                // 80 (Car) | 40 (Bike) | null
}
```

## Status Flow

1. **available** (Green)
   - Initial state
   - User can book

2. **booked** (Yellow)
   - After user books slot
   - Waiting for QR scan at entrance
   - QR code generated

3. **occupied** (Red)
   - After admin scans QR code
   - Vehicle has entered parking
   - Slot is in use

## Troubleshooting

### "Permission Denied" Error
- Check Firestore security rules
- Make sure user is authenticated
- Verify rules allow read/write access

### "Collection Not Found"
- Run `setup-database.html` to initialize
- Check Firebase Console → Firestore Database
- Verify collections exist

### Admin Dashboard Not Loading
- Verify login email is exactly: `koushik123@gmail.com`
- Check browser console for errors
- Ensure user is authenticated

### QR Scanner Not Working
- Allow camera permissions in browser
- Use HTTPS or localhost
- Check browser compatibility (Chrome/Edge recommended)

### Slots Not Updating in Real-time
- Check internet connection
- Verify Firestore listeners are active
- Check browser console for errors

## Firebase Configuration

Current configuration in all script files:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBMZz7gVpJjJ2WBaTlutAYC-UnDgXDRGuE",
    authDomain: "metropolitan-parking-system.firebaseapp.com",
    projectId: "metropolitan-parking-system",
    storageBucket: "metropolitan-parking-system.firebasestorage.app",
    messagingSenderId: "544641174438",
    appId: "1:544641174438:web:c9baa75180521bbe061d67"
};
```

## Quick Start Commands

1. Test connection:
   ```
   Open: test-connection.html
   ```

2. Setup database:
   ```
   Open: setup-database.html
   Click: Initialize Database
   ```

3. Start using:
   ```
   Open: index.html
   Login and test!
   ```

## File Checklist

✅ `test-connection.html` - Test Firebase connection
✅ `setup-database.html` - Initialize database structure
✅ `index.html` - Login page
✅ `signup.html` - Signup page
✅ `locations.html` - Location selection (customers)
✅ `slots-dashboard.html` - Slots view (customers)
✅ `admin-dashboard.html` - Admin panel with QR scanner

## Support

If you encounter issues:
1. Check browser console (F12)
2. Verify Firebase configuration
3. Check Firestore security rules
4. Ensure authentication is enabled
5. Test with `test-connection.html`
