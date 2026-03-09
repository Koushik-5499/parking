# Smart Metro Parking System - Flow Diagrams

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     SMART METRO PARKING SYSTEM                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│  START HERE  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│   index.html     │  ◄── Login Page
│   (Login)        │      • Email/Password
└──────┬───────────┘      • Google Sign-in
       │
       ├─── New User? ──► signup.html (Register)
       │                  └─► Back to Login
       │
       ▼ Authenticated
┌──────────────────┐
│ location.html    │  ◄── Select Location
│ (Choose Location)│      • Rathinam Main Gate
└──────┬───────────┘      • Rathinam Gate 1
       │                  • Rathinam Gate 3
       │                  • Real-time stats
       │
       ▼ Location Selected
┌──────────────────┐
│ dashboard.html   │  ◄── View Slots
│ (Parking Slots)  │      • Filtered by location
└──────┬───────────┘      • Green = Available
       │                  • Yellow = Reserved
       │                  • Red = Occupied
       │
       ├─── Change Location ──► Back to location.html
       │
       ▼ Click Available Slot
┌──────────────────┐
│  booking.html    │  ◄── Fill Form
│  (Book Slot)     │      • Name
└──────┬───────────┘      • Phone
       │                  • Vehicle Number
       │                  • Vehicle Type
       │                  • Price (₹80/₹40)
       │
       ▼ Submit Booking
┌──────────────────┐
│   ticket.html    │  ◄── Get QR Ticket
│   (QR Ticket)    │      • QR Code
└──────┬───────────┘      • Booking Details
       │                  • 5-min Expiry Warning
       │                  • Print Option
       │
       ├─── Print ──► Printer
       ├─── Home ──► location.html
       │
       ▼ Go 