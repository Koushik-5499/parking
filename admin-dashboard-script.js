import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    onSnapshot,
    updateDoc,
    query,
    where,
    getDocs,
    collectionGroup,
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

const ADMIN_EMAIL = "koushik123@gmail.com";
let currentLocation = 'rathinam_main_gate';
let html5QrCode;
let isScanning = false;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        if (user.email !== ADMIN_EMAIL) {
            alert('Access Denied: Admin only');
            window.location.href = 'locations.html';
            return;
        }

        loadAllStats();
        loadSlots(currentLocation);
        initializeScanner();
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
});

function loadAllStats() {
    const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];
    const statsStore = {
        'rathinam_main_gate': { total: 0, available: 0, pending: 0, occupied: 0 },
        'rathinam_gate1': { total: 0, available: 0, pending: 0, occupied: 0 },
        'rathinam_gate3': { total: 0, available: 0, pending: 0, occupied: 0 }
    };

    locations.forEach(location => {
        const slotsRef = collection(db, 'parking_locations', location, 'slots');

        onSnapshot(slotsRef, (snapshot) => {
            let totalSlots = 0;
            let availableSlots = 0;
            let pendingSlots = 0;
            let occupiedSlots = 0;

            snapshot.forEach((doc) => {
                const slot = doc.data();
                const status = slot.status || 'available';
                totalSlots++;

                if (status === 'available') availableSlots++;
                else if (status === 'pending') pendingSlots++;
                else if (status === 'occupied') occupiedSlots++;
            });

            // Store location's latest stats
            statsStore[location] = { total: totalSlots, available: availableSlots, pending: pendingSlots, occupied: occupiedSlots };

            // Compute global totals
            let globalTotal = 0, globalAvailable = 0, globalPending = 0, globalOccupied = 0;
            for (const loc in statsStore) {
                globalTotal += statsStore[loc].total;
                globalAvailable += statsStore[loc].available;
                globalPending += statsStore[loc].pending;
                globalOccupied += statsStore[loc].occupied;
            }

            document.getElementById('totalSlots').textContent = globalTotal;
            document.getElementById('availableSlots').textContent = globalAvailable;
            document.getElementById('bookedSlots').textContent = globalPending;
            document.getElementById('occupiedSlots').textContent = globalOccupied;
        });
    });
}

function loadSlots(location) {
    const slotsRef = collection(db, 'parking_locations', location, 'slots');

    onSnapshot(slotsRef, (snapshot) => {
        const slotsView = document.getElementById('slotsView');
        slotsView.innerHTML = '';

        if (snapshot.empty) {
            slotsView.innerHTML = '<p style="text-align: center; color: #9ca3af; grid-column: 1/-1;">No slots</p>';
            return;
        }

        const slots = [];
        snapshot.forEach((doc) => {
            slots.push({ id: doc.id, ...doc.data() });
        });

        slots.sort((a, b) => {
            const numA = parseInt(a.slotNumber) || 0;
            const numB = parseInt(b.slotNumber) || 0;
            return numA - numB;
        });

        slots.forEach(slot => {
            const slotDiv = document.createElement('div');
            const status = slot.status || 'available';
            slotDiv.className = `slot-mini ${status}`;
            slotDiv.style.cursor = 'pointer';
            slotDiv.textContent = slot.slotNumber;

            // Add click event to show details
            slotDiv.addEventListener('click', () => showSlotDetails(location, slot));

            slotsView.appendChild(slotDiv);
        });
    });
}

window.switchLocation = function (location) {
    currentLocation = location;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    loadSlots(location);
};

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
    });
}

function onScanError(errorMessage) {
    // Ignore
}

async function onScanSuccess(decodedText) {
    if (isScanning) return;
    isScanning = true;

    console.log("QR Scanned:", decodedText);
    await processQRCode(decodedText);
}

async function processQRCode(qrData) {
    try {
        const qrString = qrData.trim();
        let foundSlotDoc = null;

        // Try to parse as JSON first (from slots-script.js format)
        try {
            const data = JSON.parse(qrString);
            if (data.location && data.slotId) {
                const slotRef = doc(db, 'parking_locations', data.location, 'slots', data.slotId);
                const snap = await getDoc(slotRef);
                if (snap.exists()) {
                    foundSlotDoc = snap;
                }
            }
        } catch (e) {
            // Not JSON, ignore and fallback to string ID search
        }

        // Search by booking ID text (from slots-dashboard-script.js format)
        if (!foundSlotDoc) {
            const bookingId = qrString;
            const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];

            for (const loc of locations) {
                const slotsRef = collection(db, 'parking_locations', loc, 'slots');
                const q = query(slotsRef, where('qrCode', '==', bookingId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    foundSlotDoc = querySnapshot.docs[0];
                    break;
                }
            }
        }

        if (!foundSlotDoc) {
            showScanResult(false, "Invalid Booking or Slot Not Found");
            return;
        }

        const slotData = foundSlotDoc.data();

        if (slotData.status === 'pending') {
            // Approve entry - change status to occupied and save entryTime
            await updateDoc(foundSlotDoc.ref, {
                status: 'occupied',
                entryTime: serverTimestamp()
            });

            const userDisplay = slotData.userEmail && slotData.userEmail !== 'Guest' ? slotData.userEmail : (slotData.bookedBy || 'User');
            showScanResult(true, `Entry Approved<br><br>${userDisplay} has booked this slot.<br>Slot: ${slotData.slotNumber || 'N/A'}<br>Vehicle: ${slotData.vehicleNumber || 'N/A'}`);
        } else if (slotData.status === 'occupied') {
            // Scan out
            const slotPathSegments = foundSlotDoc.ref.path.split('/');
            // The location ID is the segment after "parking_locations"
            const locationId = slotPathSegments[1];
            await window.processExit(locationId, foundSlotDoc.id);
        } else if (slotData.status === 'available') {
            showScanResult(false, "Invalid Booking or Slot Not Found");
        } else {
            showScanResult(false, "Invalid Booking or Slot Not Found");
        }

    } catch (error) {
        console.error("Error processing QR:", error);
        showScanResult(false, "System Error: " + error.message);
    }
}

function showScanResult(success, message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 5000;
    `;

    const bgColor = success ? '#d1fae5' : '#fee2e2';
    const textColor = success ? '#065f46' : '#991b1b';
    const borderColor = success ? '#10b981' : '#ef4444';
    const icon = success ? 'check-circle' : 'times-circle';

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center;">
            <div style="background: ${bgColor}; padding: 20px; border-radius: 8px; margin-bottom: 20px; color: ${textColor}; border: 1px solid ${borderColor}; text-align: left;">
                <h3 style="margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-size: 18px; margin-top: 0;">
                    <i class="fas fa-${icon}"></i> 
                    ${success ? 'Success' : 'Error'}
                </h3>
                <div style="font-size: 15px; line-height: 1.5;">
                    ${message}
                </div>
            </div>
            <button style="width: 100%; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('button');
    closeBtn.addEventListener('click', () => {
        modal.remove();
        isScanning = false;
    });
}

function showSlotDetails(locationId, slot) {
    const statusColor = slot.status === 'available' ? '#10b981' :
        slot.status === 'pending' ? '#f59e0b' : '#ef4444';

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 3000;
    `;

    let detailsHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
            <h2 style="color: #374151; margin-bottom: 20px;">Slot ${slot.slotNumber} Details</h2>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin-bottom: 10px;"><strong>Status:</strong> <span style="color: ${statusColor}; text-transform: uppercase;">${slot.status}</span></p>
    `;

    if (slot.status === 'pending' || slot.status === 'occupied') {
        detailsHTML += `
                <p style="margin-bottom: 10px;"><strong>Booked By:</strong> ${slot.bookedBy || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Phone:</strong> ${slot.phone || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Vehicle Type:</strong> ${slot.vehicleType || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Vehicle Number:</strong> ${slot.vehicleNumber || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Price:</strong> ₹${slot.price || 0}</p>
                <p style="margin-bottom: 10px;"><strong>QR Code:</strong> ${slot.qrCode || 'N/A'}</p>
        `;
        if (slot.entryTime) {
            let entryDate = slot.entryTime.toDate ? slot.entryTime.toDate().toLocaleString() : new Date(slot.entryTime).toLocaleString();
            detailsHTML += `<p style="margin-bottom: 10px;"><strong>Entry Time:</strong> ${entryDate}</p>`;
        }
    } else if (slot.status === 'available' && slot.exitTime) {
        // Show historical info if needed
        let entryDate = slot.entryTime?.toDate ? slot.entryTime.toDate().toLocaleString() : "N/A";
        let exitDate = slot.exitTime?.toDate ? slot.exitTime.toDate().toLocaleString() : "N/A";
        detailsHTML += `
                <p style="margin-bottom: 10px;"><strong>Last Entry:</strong> ${entryDate}</p>
                <p style="margin-bottom: 10px;"><strong>Last Exit:</strong> ${exitDate}</p>
                <p style="margin-bottom: 10px;"><strong>Last Price:</strong> ₹${slot.price || 0}</p>
        `;
    }

    detailsHTML += `</div>`;

    if (slot.status === 'pending') {
        detailsHTML += `
            <button onclick="cancelBooking('${locationId}', '${slot.id}')" 
                style="width: 100%; padding: 12px; background: #ef4444; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 10px;">
                <i class="fas fa-times-circle"></i> Cancel Booking
            </button>
        `;
    } else if (slot.status === 'occupied') {
        detailsHTML += `
            <button onclick="processExit('${locationId}', '${slot.id}')" 
                style="width: 100%; padding: 12px; background: #10b981; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 10px;">
                <i class="fas fa-sign-out-alt"></i> Exit Vehicle
            </button>
        `;
    }

    detailsHTML += `
            <button onclick="this.parentElement.parentElement.remove()" 
                style="width: 100%; padding: 12px; background: #6b7280; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Close
            </button>
        </div>
    `;

    modal.innerHTML = detailsHTML;
    document.body.appendChild(modal);
}

window.cancelBooking = async function (locationId, slotId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    try {
        const slotRef = doc(db, 'parking_locations', locationId, 'slots', slotId);
        await updateDoc(slotRef, {
            status: 'available',
            bookedBy: null,
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            qrCode: null,
            bookingId: null,
            entryTime: null,
            price: null
        });

        alert('Booking cancelled successfully');

        // Close modal
        const modals = document.querySelectorAll('div[style*="position: fixed"]');
        modals.forEach(modal => modal.remove());

    } catch (error) {
        console.error('Error cancelling booking:', error);
        alert('Failed to cancel booking: ' + error.message);
    }
};

window.processExit = async function (locationId, slotId) {
    try {
        const slotRef = doc(db, 'parking_locations', locationId, 'slots', slotId);
        const slotSnap = await getDoc(slotRef);
        const slotData = slotSnap.data();

        let entryDate;
        if (slotData.entryTime && slotData.entryTime.toDate) {
            entryDate = slotData.entryTime.toDate();
        } else if (slotData.occupiedSince && slotData.occupiedSince.toDate) {
            entryDate = slotData.occupiedSince.toDate();
        } else {
            entryDate = new Date();
        }

        const exitDate = new Date();
        const diffMs = exitDate - entryDate;
        let totalMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
        const finalPrice = Math.round(totalMinutes * (80 / 60));

        await updateDoc(slotRef, {
            status: 'available',
            exitTime: exitDate,
            price: finalPrice,
            bookedBy: null,
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            qrCode: null,
            bookingId: null,
            entryTime: null
        });

        // Close any open modals
        const modals = document.querySelectorAll('div[style*="position: fixed"]');
        modals.forEach(modal => modal.remove());

        // Show receipt
        const receiptModal = document.createElement('div');
        receiptModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 4000;
        `;
        const userDisplay = slotData.userEmail && slotData.userEmail !== 'Guest' ? slotData.userEmail : (slotData.bookedBy || 'N/A');
        receiptModal.innerHTML = `
            <div class="modal-content" style="text-align: center; background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <h2 style="color: #10b981; margin-bottom: 20px;"><i class="fas fa-check-circle"></i> Parking Completed</h2>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                    <p style="margin-bottom: 5px;"><strong>User Email:</strong> ${userDisplay}</p>
                    <p style="margin-bottom: 5px;"><strong>Entry Time:</strong> ${entryDate.toLocaleString()}</p>
                    <p style="margin-bottom: 5px;"><strong>Exit Time:</strong> ${exitDate.toLocaleString()}</p>
                    <p style="margin-bottom: 5px;"><strong>Total Minutes:</strong> ${totalMinutes} Min(s)</p>
                    <p style="margin-bottom: 0;"><strong>Amount to Pay:</strong> <span style="font-size: 20px; color: #ef4444; font-weight: bold;">₹${finalPrice}</span></p>
                </div>
                <button style="width: 100%; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Close
                </button>
            </div>
        `;
        document.body.appendChild(receiptModal);

        const closeBtn = receiptModal.querySelector('button');
        closeBtn.addEventListener('click', () => {
            receiptModal.remove();
            isScanning = false;
        });

    } catch (error) {
        console.error("Exit error:", error);
        alert('Failed to process exit: ' + error.message);
        isScanning = false;
    }
};
