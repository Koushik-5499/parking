import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    serverTimestamp,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBMZz7gVpJjJ2WBaTlutAYC-UnDgXDRGuE",
    authDomain: "metropolitan-parking-system.firebaseapp.com",
    projectId: "metropolitan-parking-system",
    storageBucket: "metropolitan-parking-system.firebasestorage.app",
    messagingSenderId: "544641174438",
    appId: "1:544641174438:web:c9baa75180521bbe061d67"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let slotData = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get slot data from localStorage
    const slotDataStr = localStorage.getItem('bookingSlot');

    if (!slotDataStr) {
        alert('No slot selected');
        window.location.href = 'dashboard.html';
        return;
    }

    slotData = JSON.parse(slotDataStr);

    // Display slot info
    document.getElementById('slotNumber').textContent = `Slot ${slotData.slotNumber}`;
    document.getElementById('locationName').textContent = slotData.location;

    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        currentUser = user;
    });

    // Form submission
    document.getElementById('bookingForm').addEventListener('submit', handleBookingSubmit);
});

window.updatePrice = function () {
    // Legacy function, replaced with static 80/hour
};

async function handleBookingSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const vehicleNumber = document.getElementById('bookingVehicleNumber').value.trim().toUpperCase();
    const vehicleType = "Car"; // Hardcoded to only allow cars per user requirements

    if (!name || !phone || !vehicleNumber) {
        alert('Please fill all fields');
        return;
    }

    const price = 80;

    const confirmBtn = document.getElementById('confirmBtn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        // Add booking to Firestore
        const bookingRef = await addDoc(collection(db, 'bookings'), {
            slotNumber: slotData.slotNumber,
            location: slotData.location,
            name: name,
            phone: phone,
            vehicleNumber: vehicleNumber,
            vehicleType: vehicleType,
            price: price,
            bookedAt: serverTimestamp(),
            status: 'reserved',
            userId: currentUser.uid,
            userEmail: currentUser.email,
            expiryTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
        });

        // Update slot status to reserved
        const slotRef = doc(db, 'parking_locations', slotData.locationId, 'slots', slotData.id);
        await updateDoc(slotRef, {
            status: 'reserved',
            bookedBy: name,
            phone: phone,
            vehicleType: vehicleType,
            vehicleNumber: vehicleNumber,
            price: price,
            bookingId: bookingRef.id,
            userEmail: currentUser.email,
            bookingTime: serverTimestamp()
        });

        // Store booking data for ticket page
        localStorage.setItem('bookingData', JSON.stringify({
            bookingId: bookingRef.id,
            slotNumber: slotData.slotNumber,
            location: slotData.location,
            vehicleNumber: vehicleNumber,
            name: name,
            phone: phone,
            vehicleType: vehicleType,
            price: price
        }));

        // Schedule auto-expiry after 5 minutes
        scheduleBookingExpiry(bookingRef.id, slotData.id, slotData.locationId);

        // Redirect to ticket page
        window.location.href = 'ticket.html';

    } catch (error) {
        console.error('Booking error:', error);
        alert(`Booking failed: ${error.message}`);
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Booking';
    }
}


// Auto-cancel booking after 5 minutes if not checked in
function scheduleBookingExpiry(bookingId, slotId, locationId) {
    setTimeout(async () => {
        try {
            const bookingRef = doc(db, 'bookings', bookingId);
            const bookingSnap = await getDoc(bookingRef);

            if (bookingSnap.exists()) {
                const booking = bookingSnap.data();

                // Only cancel if still in reserved status
                if (booking.status === 'reserved') {
                    // Update booking to expired
                    await updateDoc(bookingRef, {
                        status: 'expired'
                    });

                    // Free up the slot
                    const slotRef = doc(db, 'parking_locations', locationId, 'slots', slotId);
                    await updateDoc(slotRef, {
                        status: 'available',
                        bookedBy: null,
                        phone: null,
                        vehicleType: null,
                        vehicleNumber: null,
                        price: null,
                        reservedAt: null
                    });

                    console.log('Booking expired and slot freed');
                }
            }
        } catch (error) {
            console.error('Error expiring booking:', error);
        }
    }, 5 * 60 * 1000); // 5 minutes
}
