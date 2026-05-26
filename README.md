# 🚗 Smart Parking System

A full-stack Smart Parking Web Application that allows users to book parking slots, generate QR codes for entry, and manage parking efficiently with real-time updates.

---

## 🌐 Live Demo

👉 https://fastpark.online

---

## 📌 Features

### 👤 User Features

* User Registration & Login (Firebase Authentication)
* View available parking slots in real-time
* Book parking slots with time-based pricing (₹80/hour)
* Automatic booking expiration (30 min reservation + 5 min cooldown)
* QR Code generation for entry/exit
* View booking history and receipts
* Email confirmation with QR code

---

### 🛠️ Admin Features

* View all bookings
* Filter bookings by location and status
* Monitor slot availability
* Revenue tracking (daily summary)

---

### 🔐 Security Features

* QR Code scanning system for entry validation
* Prevent duplicate or invalid entries
* Real-time slot status updates

---

## 🧠 Technologies Used

### Frontend

* HTML
* CSS
* JavaScript

### Backend & Services

* Firebase (Authentication + Firestore Database)
* Vercel (Hosting + Serverless Functions)
* Resend (Email Service)

### Tools

* GitHub (Version Control)
* Antigravity
* Vercel Analytics & Speed Insights
* Google Search Console

---

## 📁 Project Structure

```
Parking/
│
├── api/
│   └── send-email.js
│
├── index.html
├── signup.html
├── booking.html
├── locations.html
├── slots-dashboard.html
├── ticket.html
│
├── firebase-config.js
├── locations-script.js
├── booking-script.js
├── slots-dashboard-script.js
├── ticket-script.js
├── security-script.js
│
├── parking-styles.css
├── logo.jpg
│
├── vercel.json
├── package.json
├── package-lock.json
└── README.md
```

---

## ⚙️ How It Works

1. User logs in using Firebase Authentication
2. Selects parking location and views available slots
3. Books a slot → system generates a unique booking ID
4. QR Code is generated for entry
5. Security scans QR → verifies booking → allows entry
6. System updates slot status in real-time
7. Email receipt is sent to user

---

## 🚀 Deployment

This project is deployed using **Vercel**.

To deploy:

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

---

## 📊 Pricing Logic

* ₹80 per hour
* Automatic calculation based on entry & exit time

---

## 🔮 Future Improvements

* Mobile app integration
* Payment gateway (Razorpay / UPI auto verification)
* AI-based slot prediction
* License plate recognition

---

## 👨‍💻 Author

**Koushik**
CSE Student – Rathinam Technical Campus

---

## 📜 License

This project is for educational purposes.
