import { db } from './firebase-config.js';
import {
    collection,
    doc,
    onSnapshot,
    updateDoc,
    getDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let currentLocation = 'rathinam_main_gate';
let html5QrCode;
let isScanning = false;

document.addEventListener('DOMContentLoaded', () => {
    loadSlots(currentLocation);
    initializeScanner();
});

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
            slotDiv.textContent = slot.slotNumber;

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
    // Ignore scan errors
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
        let slotData = null;
        let userEmail = 'User';
        let vehicleNumber = null;
        let location = null;
        let slotId = null;

        // Try to parse as JSON first
        try {
            const bookingData = JSON.parse(qrString);
            slotId = bookingData.slotId;
            location = bookingData.location;
            vehicleNumber = bookingData.vehicleNumber;
            userEmail = bookingData.userEmail || bookingData.bookedBy || 'User';

            if (slotId && location) {
                const slotRef = doc(db, 'parking_locations', location, 'slots', slotId);
                const snap = await getDoc(slotRef);
                if (snap.exists()) {
                    foundSlotDoc = snap;
                }
            }
        } catch (parseError) {
            // Not JSON, fallback to string ID search
        }

        if (!foundSlotDoc) {
            const bookingId = qrString;
            const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];

            for (const loc of locations) {
                const slotsRef = collection(db, 'parking_locations', loc, 'slots');
                const q = query(slotsRef, where('qrCode', '==', bookingId));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    foundSlotDoc = querySnapshot.docs[0];
                    location = loc;
                    slotId = foundSlotDoc.id;
                    break;
                }
            }
        }

        if (!foundSlotDoc) {
            showScanResult(false, "Slot not found or invalid QR code");
            return;
        }

        slotData = foundSlotDoc.data();
        if (!slotData.slotNumber) {
            showScanResult(false, "Error: Invalid slot data");
            return;
        }

        // Override info from document if we searched by string ID
        if (!vehicleNumber) vehicleNumber = slotData.vehicleNumber;
        if (userEmail === 'User') userEmail = slotData.userEmail && slotData.userEmail !== 'Guest' ? slotData.userEmail : (slotData.bookedBy || 'User');

        const slotRef = foundSlotDoc.ref;

        // Show message: "userEmail has booked this slot"
        const bookingMessage = `${userEmail} has booked this slot`;

        if (slotData.status === 'pending') {

            await updateDoc(slotRef, {
                status: 'occupied',
                entryTime: serverTimestamp(),
                occupiedSince: serverTimestamp()
            });

            const modal = document.getElementById("slotModal");
            modal.className = "modal show";

            modal.innerHTML = `
            <div class="modal-content" style="text-align:center;">
                <h2 style="color:#10b981; margin-bottom:20px;">
                <i class="fas fa-check-circle"></i> Parking Entry Successful
                </h2>

                <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin-bottom:20px;text-align:left;">
                    <p><strong>User Email:</strong> ${userEmail}</p>
                    <p><strong>Vehicle Number:</strong> ${vehicleNumber || "N/A"}</p>
                    <p><strong>Slot Number:</strong> ${slotData.slotNumber}</p>
                    <p><strong>Status:</strong> Entry Approved</p>
                </div>

                <button onclick="closeSlotModal()" class="btn-close">
                Close
                </button>
            </div>
            `;
        } else if (slotData.status === 'occupied') {
            // Calculate parking price based on ₹80/hour
            const entryTime = slotData.entryTime?.toDate() || slotData.occupiedSince?.toDate();

            if (!entryTime) {
                showScanResult(false, "Error: Entry time not found");
                return;
            }

            const exitTime = new Date();
            const durationMs = exitTime - entryTime;
            const durationMinutes = durationMs / (1000 * 60); // Convert to minutes

            // Calculate price: ₹80/hour, 30 minutes = ₹40
            let price;
            if (durationMinutes <= 30) {
                price = 40; // 30 minutes = ₹40
            } else {
                const durationHours = durationMinutes / 60;
                price = Math.ceil(durationHours * 80); // ₹80 per hour, rounded up
            }

            // Show payment popup
            showPaymentPopup(location, slotId, slotData, price, durationMinutes, userEmail, entryTime, exitTime);

        } else if (slotData.status === 'available') {
            showScanResult(false, "Invalid Booking - Slot is Available");
        } else {
            showScanResult(false, "Invalid Booking Status");
        }

    } catch (error) {
        console.error("Error processing QR:", error);
        showScanResult(false, "System Error: " + error.message);
    }

    setTimeout(() => {
        isScanning = false;
    }, 3000);
}

function showPaymentPopup(location, slotId, slotData, price, durationMinutes, userEmail, entryTime, exitTime) {
    const modal = document.getElementById('slotModal');
    modal.className = 'modal show';

    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.round(durationMinutes % 60);
    const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    modal.innerHTML = `
        <div class="modal-content">
            <h2 style="color: #374151; margin-bottom: 20px;">
                <i class="fas fa-receipt"></i> Payment Required
            </h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin-bottom: 10px; font-size: 16px;">
                    <strong>User:</strong> ${userEmail}
                </p>
                <p style="margin-bottom: 10px; font-size: 16px;">
                    <strong>Slot:</strong> ${slotData.slotNumber}
                </p>
                <p style="margin-bottom: 10px; font-size: 16px;">
                    <strong>Vehicle:</strong> ${slotData.vehicleNumber || 'N/A'}
                </p>
                <p style="margin-bottom: 10px; font-size: 16px;">
                    <strong>Entry:</strong> ${entryTime.toLocaleString()}
                </p>
                <p style="margin-bottom: 10px; font-size: 16px;">
                    <strong>Exit:</strong> ${exitTime.toLocaleString()}
                </p>
                <p style="margin-bottom: 10px; font-size: 16px;">
                    <strong>Duration:</strong> ${durationText}
                </p>
                <p style="margin-bottom: 0; font-size: 24px; color: #10b981; font-weight: 700;">
                    <strong>Total:</strong> ₹${price}
                </p>
                <p style="margin-top: 5px; font-size: 12px; color: #6b7280;">
                    Rate: ₹80/hour (30 minutes = ₹40)
                </p>
            </div>
            <button onclick="processPaymentAndExit('${location}', '${slotId}', ${price})" 
                style="width: 100%; padding: 15px; background: #10b981; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer; 
                font-size: 16px; margin-bottom: 10px;">
                <i class="fas fa-check-circle"></i> Confirm Payment & Exit
            </button>
            <button onclick="closeSlotModal()" 
                style="width: 100%; padding: 12px; background: #6b7280; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Cancel
            </button>
        </div>
    `;
}

window.processPaymentAndExit = async function (location, slotId, price) {
    try {
        const slotRef = doc(db, 'parking_locations', location, 'slots', slotId);

        // After exit, reset slot status to available
        await updateDoc(slotRef, {
            status: 'available',
            bookedBy: null,
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            bookingTime: null,
            entryTime: null,
            occupiedSince: null,
            qrCode: null,
            bookingId: null,
            exitTime: serverTimestamp(),
            lastPrice: price
        });

        closeSlotModal();

        // Show success message
        showScanResult(true, `Payment of ₹${price} received<br>Slot reset to available<br>Thank you!`);

    } catch (error) {
        console.error('Error processing exit:', error);
        alert('Failed to process exit: ' + error.message);
    }
};

function showScanResult(success, message) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.className = `scan-result ${success ? 'success' : 'error'}`;
    resultDiv.innerHTML = `
        <div class="result-title ${success ? 'success' : 'error'}">
            <i class="fas fa-${success ? 'check-circle' : 'times-circle'}"></i> ${message}
        </div>
    `;

    setTimeout(() => {
        resultDiv.className = 'scan-result';
        resultDiv.innerHTML = '';
    }, 5000);
}

function showSlotDetails(locationId, slot) {
    const statusColor = slot.status === 'available' ? '#10b981' :
        slot.status === 'pending' ? '#f59e0b' : '#ef4444';

    const modal = document.getElementById('slotModal');
    modal.className = 'modal show';

    let detailsHTML = `
        <div class="modal-content">
            <h2 style="color: #374151; margin-bottom: 20px;">Slot ${slot.slotNumber} Details</h2>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin-bottom: 10px;"><strong>Status:</strong> 
                    <span style="color: ${statusColor}; text-transform: uppercase;">${slot.status}</span>
                </p>
    `;

    if (slot.status === 'pending' || slot.status === 'occupied') {
        detailsHTML += `
                <p style="margin-bottom: 10px;"><strong>Price:</strong> ₹${slot.price || 0}</p>
                <p><strong>QR Code:</strong> ${slot.qrCode || 'N/A'}</p>
        `;

        if (slot.entryTime) {
            let entryDate = slot.entryTime.toDate ? slot.entryTime.toDate().toLocaleString() : new Date(slot.entryTime).toLocaleString();
            detailsHTML += `<p style="margin-bottom: 10px;"><strong>Entry Time:</strong> ${entryDate}</p>`;
        }
    } else if (slot.status === 'available' && slot.exitTime) {
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
            <button onclick="cancelBooking('${locationId}', '${slot.id}')" class="btn-cancel">
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
            <button onclick="closeSlotModal()" class="btn-close">
                Close
            </button>
        </div>
    `;

    modal.innerHTML = detailsHTML;
}

window.closeSlotModal = function () {
    document.getElementById('slotModal').className = 'modal';
    document.getElementById('slotModal').innerHTML = '';
};

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
        closeSlotModal();

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

        // Close any modals
        if (document.getElementById('slotModal')) {
            document.getElementById('slotModal').className = 'modal';
            document.getElementById('slotModal').innerHTML = '';
        }

        // Show receipt in the modal container for admin.html
        const receiptModal = document.getElementById('slotModal') || document.createElement('div');
        if (!document.getElementById('slotModal')) {
            receiptModal.id = 'slotModal';
            document.body.appendChild(receiptModal);
        }

        receiptModal.className = 'modal show';
        const userDisplay = slotData.userEmail && slotData.userEmail !== 'Guest' ? slotData.userEmail : (slotData.bookedBy || 'N/A');
        receiptModal.innerHTML = `
            <div class="modal-content" style="text-align: center;">
                <h2 style="color: #10b981; margin-bottom: 20px;"><i class="fas fa-check-circle"></i> Parking Completed</h2>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                    <p style="margin-bottom: 5px;"><strong>User Email:</strong> ${userDisplay}</p>
                    <p style="margin-bottom: 5px;"><strong>Entry Time:</strong> ${entryDate.toLocaleString()}</p>
                    <p style="margin-bottom: 5px;"><strong>Exit Time:</strong> ${exitDate.toLocaleString()}</p>
                    <p style="margin-bottom: 5px;"><strong>Total Minutes:</strong> ${totalMinutes} Min(s)</p>
                    <p style="margin-bottom: 0;"><strong>Amount to Pay:</strong> <span style="font-size: 20px; color: #ef4444; font-weight: bold;">₹${finalPrice}</span></p>
                </div>
                <button onclick="closeSlotModal(); this.parentElement.parentElement.remove();" class="btn-close">
                    Close
                </button>
            </div>
        `;

    } catch (error) {
        console.error("Exit error:", error);
        alert('Failed to process exit: ' + error.message);
    }
};
