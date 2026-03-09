# Smart Metro Parking System - Quick Reference

## 🚀 Quick Start

1. **Setup Firebase** → Update config in all `.js` files
2. **Add Slots** → Create 30 slots in Firestore (see SETUP_GUIDE.md)
3. **Deploy** → Upload to HTTPS hosting
4. **Test** → Open index.html and follow user flow

## 📱 Page URLs

| Page | URL | Purpose |
|------|-----|---------|
| Login | `index.html` | User login |
| Signup | `signup.html` | User registration |
| Locations | `location.html` | Select parking location |
| Dashboard | `dashboard.html` | View available slots |
| Booking | `booking.html` | Fill booking form |
| Ticket | `ticket.html` | View QR ticket |
| Admin | `admin.html` | Admin dashboard |
| Security | `security.html` | QR scanner |

## 🔑 Default Credentials

**Admin Email:** `koushik123@gmail.com`  
**Test User:** Create via signup page

## 🎨 Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Available | Green | #10b981 |
| Reserved | Yellow | #f59e0b |
| Occupied | Red | #ef4444 |

## 💰 Pricing

- **Car:** ₹80
- **Bike:** ₹40

## ⏱️ Timing

- **Booking Expiry:** 5 minutes
- **Real-time Sync:** < 1 second

## 📍 Locations

1. Rathinam Main Gate (Slots 1-10)
2. Rathinam Gate 1 (Slots 11-20)
3. Rathinam Gate 3 (Slots 21-30)

## 🔄 Status Flow

```
Slot: available → reserved → occupied → available
Booking: reserved → occupied → completed
```

## 📊 Firebase Collections

### parking_slots
```javascript
{
  slotNumber: 1,
  location: "Rathinam Main Gate",
  status: "available"
}
```

### bookings
```javascript
{
  slotNumber: 1,
  location: "Rathinam Main Gate",
  name: "John Doe",
  phone: "1234567890",
  vehicleNumber: "TN01AB1234",
  vehicleType: "Car",
  price: 80,
  status: "reserved"
}
```

## 🔐 Admin Functions

| Function | Location | Action |
|----------|----------|--------|
| View Stats | admin.html | Dashboard overview |
| View Bookings | admin.html | Bookings table |
| Filter Bookings | admin.html | By location/status |
| Manage Slots | admin.html | Mark occupied/available |
| Mark Exit | admin.html | Complete booking |

## 📱 QR Code Format

```
BOOKINGID_SLOTNUMBER_LOCATION_VEHICLENUMBER
```

Example:
```
abc123xyz_5_Rathinam Main Gate_TN01AB1234
```

## 🛠️ Common Commands

### Firebase Deploy
```bash
firebase deploy
```

### Local Server
```bash
python -m http.server 8000
# or
npx http-server Parking -p 8000
```

### HTTPS Tunnel (for camera testing)
```bash
ngrok http 8000
```

## 🐛 Quick Fixes

### Slots Not Loading
1. Check Firestore rules
2. Verify `location` field exists
3. Check browser console

### Camera Not Working
1. Use HTTPS or localhost
2. Check browser permissions
3. Try Chrome browser

### Admin Access Denied
1. Verify email matches `ADMIN_EMAIL`
2. Check spelling
3. Re-login

### QR Not Scanning
1. Ensure good lighting
2. Hold steady
3. Try manual entry

## 📞 Support Files

- **Full Documentation:** `SYSTEM_DOCUMENTATION.md`
- **Setup Instructions:** `SETUP_GUIDE.md`
- **Project Summary:** `PROJECT_SUMMARY.md`
- **This Guide:** `QUICK_REFERENCE.md`

## ✅ Pre-Launch Checklist

- [ ] Firebase config updated
- [ ] Admin email updated
- [ ] 30 slots added to Firestore
- [ ] Firestore rules configured
- [ ] Deployed to HTTPS
- [ ] Camera tested
- [ ] All flows tested
- [ ] Mobile tested

## 🎯 Key Features

✅ Real-time slot updates  
✅ QR code booking  
✅ Auto entry approval  
✅ 5-minute expiry  
✅ Admin dashboard  
✅ Mobile responsive  
✅ Multi-location support  

## 📈 Monitoring

Check Firebase Console for:
- Active users
- Database reads/writes
- Authentication events
- Error logs
- Usage quotas

## 🔄 Update Process

1. Make changes to files
2. Test locally
3. Run diagnostics
4. Deploy to Firebase
5. Test on production
6. Monitor for errors

## 💡 Tips

- Keep browser console open during testing
- Test on multiple devices
- Use Chrome DevTools for mobile simulation
- Monitor Firebase usage to avoid quota limits
- Regular backups of Firestore data
- Test camera in different lighting conditions

---

**Quick Help:** Check browser console (F12) for detailed error messages
