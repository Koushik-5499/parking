import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    serverTimestamp
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
const db = getFirestore(app);

let html5QrCode;
let isScanning = false;

document.addEventListener('DOMContentLoaded', () => {
    initializeScanner();
});

function initializeScanner() {
    html5QrCode = new Html5Qrcode("reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 }
    };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error("Camera error:", err);
        alert("Unable to access camera. Please check permissions.");
    });
}

async function onScanSuccess(decodedText, decodedResult) {
    if (isScanning) return;
    isScanning = true;

    console.log("QR Code scanned:", decodedText);
    await processQRCode(decodedText);
}

function onScanError(errorMessage) {
    // Ignore scan errors (they happen frequently during scanning)
}

async function processQRCode(qrData) {
    try {
        const parts = qrData.split('_');
        
        if (parts.length < 4) {
            showResult(false, "Invalid QR Code Format", {});
            return;
        }

        const bookingId = parts[0];
        const slotNumber = parts[1];
        const location = parts[2];
        const vehicleNumber = parts[3];

        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingSnap = await getDoc(bookingRef);

        if (!bookingSnap.exists()) {
            showResult(false, "BOOKING NOT FOUND", {
                message: "This booking does not exist in the system"
            });
            return;
        }

        const booking = bookingSnap.data();
        const status = (booking.status || '').toLowerCase();

        // Check if booking is expired
        if (booking.expiryTime) {
            const expiryDate = booking.expiryTime.toDate ? booking.expiryTime.toDate() : new Date(booking.expiryTime);
            if (new Date() > expiryDate && status === 'reserved') {
                showResult(false, "BOOKING EXPIRED", {
                    message: "This booking has expired (5 minute limit exceeded)"
                });
                return;
            }
        }

        if (status === 'reserved') {
            await approveEntry(bookingId, slotNumber, booking);
            showResult(true, "ACCESS APPROVED", {
                slotNumber: slotNumber,
                location: location,
                vehicleNumber: vehicleNumber,
                name: booking.name,
                phone: booking.phone,
                vehicleType: booking.vehicleType,
                price: booking.price
            });
        } else if (status === 'occupied') {
            showResult(false, "ALREADY CHECKED IN", {
                message: "This vehicle has already entered",
                slotNumber: slotNumber,
                location: location
            });
        } else if (status === 'completed') {
            showResult(false, "BOOKING EXPIRED", {
                message: "This booking has been completed"
            });
        } else {
            showResult(false, "INVALID BOOKING STATUS", {
                message: `Status: ${status}`
            });
        }

    } catch (error) {
        console.error("Error processing QR code:", error);
        showResult(false, "SYSTEM ERROR", {
            message: error.message
        });
    }
}

async function approveEntry(bookingId, slotNumber, booking) {
    try {
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
            status: 'occupied',
            entryTime: serverTimestamp()
        });

        const slotsQuery = query(
            collection(db, 'parking_slots'),
            where('slotNumber', '==', parseInt(slotNumber))
        );
        const slotsSnap = await getDocs(slotsQuery);

        if (!slotsSnap.empty) {
            const slotDoc = slotsSnap.docs[0];
            const slotRef = doc(db, 'parking_slots', slotDoc.id);
            await updateDoc(slotRef, {
                status: 'occupied',
                occupiedSince: serverTimestamp(),
                bookedBy: booking.name,
                phone: booking.phone,
                vehicleType: booking.vehicleType,
                vehicleNumber: booking.vehicleNumber || 'N/A',
                price: booking.price
            });
        }

        console.log("Entry approved successfully");
    } catch (error) {
        console.error("Error approving entry:", error);
        throw error;
    }
}

function showResult(success, title, details) {
    const resultDiv = document.getElementById('scanResult');
    const icon = resultDiv.querySelector('.result-icon i');
    const titleDiv = resultDiv.querySelector('.result-title');
    const detailsDiv = document.getElementById('bookingDetails');

    resultDiv.className = `scan-result ${success ? 'success' : 'error'}`;
    icon.className = success ? 'fas fa-check-circle' : 'fas fa-times-circle';
    icon.parentElement.className = `result-icon ${success ? 'success' : 'error'}`;
    titleDiv.textContent = title;
    titleDiv.className = `result-title ${success ? 'success' : 'error'}`;

    let detailsHTML = '';
    if (details.slotNumber) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Slot Number:</span>
                <span class="detail-value">${details.slotNumber}</span>
            </div>
        `;
    }
    if (details.location) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${details.location}</span>
            </div>
        `;
    }
    if (details.name) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span class="detail-value">${details.name}</span>
            </div>
        `;
    }
    if (details.vehicleNumber) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Vehicle:</span>
                <span class="detail-value">${details.vehicleNumber}</span>
            </div>
        `;
    }
    if (details.vehicleType) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Type:</span>
                <span class="detail-value">${details.vehicleType}</span>
            </div>
        `;
    }
    if (details.price) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Price:</span>
                <span class="detail-value">₹${details.price}</span>
            </div>
        `;
    }
    if (details.message) {
        detailsHTML += `
            <div class="detail-row">
                <span class="detail-label">Message:</span>
                <span class="detail-value">${details.message}</span>
            </div>
        `;
    }

    detailsDiv.innerHTML = detailsHTML;
}

window.resetScanner = function() {
    document.getElementById('scanResult').className = 'scan-result';
    isScanning = false;
};

window.verifyManualEntry = async function() {
    const bookingId = document.getElementById('manualBookingId').value.trim();
    
    if (!bookingId) {
        alert('Please enter a booking ID');
        return;
    }

    isScanning = true;
    await processQRCode(`${bookingId}_MANUAL_MANUAL_MANUAL`);
};
