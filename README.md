# Smart Metro Parking System

A comprehensive and fully functional smart parking system built with HTML, JavaScript, CSS, and Firebase. This system provides a seamless experience for users to book parking slots, security guards to verify entry via QR codes, and administrators to manage slots and track revenue.

## 🚀 Features

### For Users
- **Authentication**: Secure login and registration using Email/Password or Google.
- **Location Selection**: Choose from multiple parking locations and view real-time availability.
- **Slot Booking**: View available slots in real-time, enter vehicle details, and select vehicle type (Car/Bike) with dynamic pricing.
- **QR Ticket Generation**: Receive a scannable QR ticket upon successful booking.
- **Auto-Expiry**: Bookings automatically expire after 5 minutes if the vehicle doesn't arrive.
- **Responsive Design**: Mobile-friendly interface, perfect for booking on the go.

### For Security Guards
- **QR Scanner**: Built-in camera-based QR code scanner (`html5-qrcode`) for quick verification.
- **Instant Approval**: Automatically verifies booking status, checks expiry, and updates slot to "Occupied".
- **Manual Entry**: Option to enter booking IDs manually if the QR code is unreadable.

### For Administrators
- **Comprehensive Dashboard**: Real-time overview of total, available, reserved, and occupied slots, plus daily revenue.
- **Booking Management**: View all bookings with filters for location and status.
- **Slot Control**: Manually mark slots as available, occupied, or mark vehicle exit.
- **Real-Time Synchronization**: All dashboard data syncs instantly across devices using Firebase.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend/Database**: Firebase (Firestore, Authentication)
- **Real-Time Data**: Firestore onSnapshot listeners
- **QR Code**: QRCode.js (Generation), html5-qrcode (Scanning)
- **Styling**: Custom CSS with a modern UI and responsive grid.

## 📁 Project Structure

```text
Parking/
├── index.html              # Login page
├── signup.html             # Signup page
├── location.html           # Location selection
├── dashboard.html          # View parking slots
├── booking.html            # Booking form
├── ticket.html             # QR ticket display
├── admin.html              # Admin dashboard
├── security.html           # QR scanner
├── parking-script.js       # Login logic
├── signup-script.js        # Registration logic
├── location-script.js      # Location selection logic
├── dashboard-script.js     # Dashboard logic
├── booking-script.js       # Booking logic
├── ticket-script.js        # Ticket logic
├── admin-script.js         # Admin dashboard logic
├── security-script.js      # QR scanner logic
└── parking-styles.css      # Shared styles
```

## 🔄 User Flow

1. **Login**: User logs in at `index.html`.
2. **Select Location**: User selects a parking location at `location.html`.
3. **View Slots**: User browses available slots on `dashboard.html`.
4. **Book Slot**: User fills out the booking form on `booking.html`.
5. **Get Ticket**: User receives a QR code on `ticket.html`.
6. **Arrival**: Security scans the QR code at `security.html` to approve entry.
7. **Management**: Admin manages slots and views statistics on `admin.html`.

## ⚙️ Setup Instructions

1. **Clone the repository.**
2. **Configure Firebase**:
   - Create a Firebase project.
   - Enable Authentication (Email/Password & Google).
   - Enable Firestore Database.
   - Update the Firebase config in the JavaScript files.
3. **Add Data**: Populate the `parking_slots` collection in Firestore with initial slots.
4. **Deploy**: Host the project on Firebase Hosting or any standard web server.

## 🔐 Security Features

- Mandatory authentication for user pages.
- Admin-only access controls for the dashboard.
- QR code payload format: `BOOKINGID_SLOT_LOCATION_VEHICLE`.
- 5-minute auto-expiry to prevent slot hoarding.
- Firestore security rules to protect user data.
