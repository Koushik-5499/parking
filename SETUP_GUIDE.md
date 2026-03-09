# Smart Metro Parking System - Setup Guide

## Prerequisites

1. Firebase account
2. Web browser with camera support (for QR scanning)
3. HTTPS hosting (required for camera access)

## Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project"
3. Enter project name: "Metropolitan Parking System"
4. Follow setup wizard

### Step 2: Enable Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get Started"
3. Enable sign-in methods:
   - Email/Password
   - Google

### Step 3: Create Firestore Database

1. Go to "Firestore Database"
2. Click "Create Database"
3. Start in "Test Mode" (or configure rules below)
4. Choose location (closest to your users)

### Step 4: Configure Firestore Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read parking slots
    match /parking_slots/{slotId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.email == 'koushik123@gmail.com';
    }
    
    // Allow authenticated users to create bookings
    match /bookings/{bookingId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.token.email == 'koushik123@gmail.com';
    }
  }
}
```

### Step 5: Add Sample Data

#### Create Collection: `parking_slots`

Add documents with this structure:

**Rathinam Main Gate Slots (1-10):**
```javascript
{
  slotNumber: 1,
  location: "Rathinam Main Gate",
  status: "available",
  bookedBy: null,
  phone: null,
  vehicleType: null,
  vehicleNumber: null,
  price: null,
  reservedAt: null,
  occupiedSince: null
}
```

**Rathinam Gate 1 Slots (11-20):**
```javascript
{
  slotNumber: 11,
  location: "Rathinam Gate 1",
  status: "available",
  bookedBy: null,
  phone: null,
  vehicleType: null,
  vehicleNumber: null,
  price: null,
  reservedAt: null,
  occupiedSince: null
}
```

**Rathinam Gate 3 Slots (21-30):**
```javascript
{
  slotNumber: 21,
  location: "Rathinam Gate 3",
  status: "available",
  bookedBy: null,
  phone: null,
  vehicleType: null,
  vehicleNumber: null,
  price: null,
  reservedAt: null,
  occupiedSince: null
}
```

**Quick Script to Add Slots:**
```javascript
// Run this in Firebase Console > Firestore > Add Document
const locations = [
  { name: "Rathinam Main Gate", start: 1, end: 10 },
  { name: "Rathinam Gate 1", start: 11, end: 20 },
  { name: "Rathinam Gate 3", start: 21, end: 30 }
];

locations.forEach(loc => {
  for (let i = loc.start; i <= loc.end; i++) {
    db.collection('parking_slots').add({
      slotNumber: i,
      location: loc.name,
      status: "available",
      bookedBy: null,
      phone: null,
      vehicleType: null,
      vehicleNumber: null,
      price: null,
      reservedAt: null,
      occupiedSince: null
    });
  }
});
```

### Step 6: Update Firebase Config

In all JavaScript files, update the Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Files to update:
- `parking-script.js`
- `signup-script.js`
- `location-script.js`
- `dashboard-script.js`
- `booking-script.js`
- `admin-script.js`
- `security-script.js`

### Step 7: Update Admin Email

In these files, change the admin email to your email:

```javascript
const ADMIN_EMAIL = "your-admin-email@gmail.com";
```

Files to update:
- `dashboard-script.js`
- `admin-script.js`

## Deployment

### Option 1: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init

# Select:
# - Hosting
# - Use existing project
# - Public directory: Parking
# - Single-page app: No
# - GitHub deploys: No

# Deploy
firebase deploy
```

### Option 2: Any Web Host

1. Upload all files in the `Parking` folder to your web host
2. Ensure HTTPS is enabled (required for camera access)
3. Set `index.html` as the default page

### Option 3: Local Testing

```bash
# Using Python
cd Parking
python -m http.server 8000

# Using Node.js
npx http-server Parking -p 8000

# Access at: http://localhost:8000
```

**Note:** Camera access requires HTTPS. For local testing, use:
- `localhost` (allowed without HTTPS)
- Or use ngrok: `ngrok http 8000`

## Testing the System

### 1. Create Test Account

1. Open `signup.html`
2. Register with email: `test@example.com`
3. Password: `test123`

### 2. Test User Flow

1. Login → Should redirect to `location.html`
2. Select "Rathinam Main Gate"
3. Click any available (green) slot
4. Fill booking form:
   - Name: Test User
   - Phone: 1234567890
   - Vehicle: TN01AB1234
   - Type: Car
5. Submit → Should show QR ticket

### 3. Test Security Scanner

1. Open `security.html` in another tab/device
2. Allow camera access
3. Scan the QR code from ticket
4. Should show "ACCESS APPROVED"
5. Try scanning again → Should show "ALREADY CHECKED IN"

### 4. Test Admin Dashboard

1. Login with admin email
2. Open `admin.html`
3. Verify statistics are showing
4. Check bookings table
5. Try filtering by location/status
6. Find the occupied slot
7. Click "Mark Exit"
8. Verify slot becomes available

### 5. Test Expiry System

1. Book a slot
2. Wait 5 minutes (keep browser tab open)
3. Check dashboard → Slot should become available
4. Try scanning QR → Should show "BOOKING EXPIRED"

## Troubleshooting

### Camera Not Working

**Problem:** "Camera access denied" or black screen

**Solutions:**
1. Check browser permissions (Settings > Privacy > Camera)
2. Ensure using HTTPS (not HTTP)
3. Try different browser (Chrome recommended)
4. Check if camera is being used by another app

### Slots Not Loading

**Problem:** "No parking slots found" or loading forever

**Solutions:**
1. Check Firebase console → Firestore → Verify `parking_slots` collection exists
2. Verify all slots have `location` field
3. Check browser console for errors
4. Verify Firestore rules allow read access

### Login Not Working

**Problem:** "Invalid credentials" or "Permission denied"

**Solutions:**
1. Check Firebase console → Authentication → Verify Email/Password is enabled
2. Check if user exists in Authentication tab
3. Verify Firebase config is correct
4. Check browser console for errors

### Admin Access Denied

**Problem:** "Access Denied: Admin only"

**Solutions:**
1. Verify logged-in email matches `ADMIN_EMAIL` in scripts
2. Check spelling and case sensitivity
3. Try logging out and back in

### QR Code Not Generating

**Problem:** Ticket page shows but no QR code

**Solutions:**
1. Check if QRCode.js library is loading
2. Open browser console for errors
3. Verify booking data is in localStorage
4. Check internet connection

## Production Checklist

- [ ] Update Firebase config in all files
- [ ] Update admin email
- [ ] Configure Firestore security rules
- [ ] Add all parking slots to Firestore
- [ ] Test on HTTPS domain
- [ ] Test camera access on mobile
- [ ] Test all user flows
- [ ] Test admin dashboard
- [ ] Test QR scanner
- [ ] Test expiry system
- [ ] Set up Firebase billing (if needed)
- [ ] Configure Firebase hosting domain
- [ ] Add error monitoring (optional)
- [ ] Set up backups (optional)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify Firebase configuration
3. Check Firestore rules
4. Review SYSTEM_DOCUMENTATION.md
5. Test with different browsers/devices

## Security Notes

1. **Never commit Firebase config with real credentials to public repos**
2. **Use environment variables for sensitive data**
3. **Configure proper Firestore security rules**
4. **Regularly review Firebase usage and billing**
5. **Enable Firebase App Check for production**
6. **Use HTTPS only in production**
7. **Implement rate limiting for API calls**
8. **Regular security audits**

## Performance Tips

1. **Enable Firestore indexes** for complex queries
2. **Use pagination** for large booking lists
3. **Implement caching** for frequently accessed data
4. **Optimize images** and assets
5. **Use CDN** for static files
6. **Enable compression** on web server
7. **Lazy load** non-critical resources
8. **Monitor Firebase usage** to avoid quota limits
