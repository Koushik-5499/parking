import { db } from './firebase-config.js';
import {
    collection,
    doc,
    onSnapshot,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

let selectedLocation = null;
let selectedLocationName = null;
let selectedSlot = null;

document.addEventListener('DOMContentLoaded', () => {
    selectedLocation = localStorage.getItem('selectedLocation');
    selectedLocationName = localStorage.getItem('selectedLocationName');

    if (!selectedLocation) {
        window.location.href = 'locations.html';
        return;
    }

    document.getElementById('locationTitle').textContent = selectedLocationName;
    loadSlots();

    document.getElementById('bookingForm').addEventListener('submit', handleBooking);
});

function loadSlots() {
    const slotsRef = collection(db, 'parking_locations', selectedLocation, 'slots');

    onSnapshot(slotsRef, (snapshot) => {
        const slotsGrid = document.getElementById('slotsGrid');
        slotsGrid.innerHTML = '';

        if (snapshot.empty) {
            slotsGrid.innerHTML = '<p style="text-align: center; color: #9ca3af; grid-column: 1/-1;">No slots available</p>';
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
            if (slot.isVIP || (slot.slotNumber && slot.slotNumber.toString().startsWith('VIP'))) return;
            const slotCard = createSlotCard(slot);
            slotsGrid.appendChild(slotCard);
        });
    }, (error) => {
        console.error('Error loading slots:', error);
        document.getElementById('slotsGrid').innerHTML =
            '<p style="text-align: center; color: #ef4444; grid-column: 1/-1;">Error loading slots</p>';
    });
}

function createSlotCard(slot) {
    const card = document.createElement('div');
    const status = slot.status || 'available';
    card.className = `slot-card ${status}`;

    card.innerHTML = `
        <div class="slot-number">Slot ${slot.slotNumber}</div>
        <div class="slot-status" style="margin-bottom: 10px;">${status}</div>
    `;

    const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
    const myBookingKey = selectedLocation + '_' + slot.id;
    let myBooking = myBookings[myBookingKey];

    // Clean up stale local storage if slot has a different QR or is available
    if (myBooking && slot.qrCode && slot.qrCode !== myBooking.qrCode) {
        if (myBooking.bookingTime) {
            const penaltyEnd = myBooking.bookingTime + 1800000 + 300000;
            if (Date.now() < penaltyEnd && (Date.now() - myBooking.bookingTime > 1790000)) { 
                localStorage.setItem('bookingCooldownUntil', penaltyEnd);
            }
        }
        delete myBookings[myBookingKey];
        localStorage.setItem('myBookings', JSON.stringify(myBookings));
        myBooking = null;
    } else if (myBooking && status === 'available') {
        if (myBooking.bookingTime) {
            const penaltyEnd = myBooking.bookingTime + 1800000 + 300000;
            if (Date.now() < penaltyEnd && (Date.now() - myBooking.bookingTime > 1790000)) { 
                localStorage.setItem('bookingCooldownUntil', penaltyEnd);
            }
        }
        delete myBookings[myBookingKey];
        localStorage.setItem('myBookings', JSON.stringify(myBookings));
        myBooking = null;
    }

    let isMyBooking = (myBooking !== null && myBooking !== undefined);
    let bData = myBooking;

    if (status === 'available') {
        const bookBtn = document.createElement('button');
        bookBtn.className = 'btn-primary';
        bookBtn.style.cssText = 'width: 100%; font-size: 14px; padding: 8px; margin-top: auto; border: none; border-radius: 8px; cursor: pointer; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; font-weight: bold;';
        bookBtn.textContent = 'Book';
        bookBtn.onclick = (e) => { e.stopPropagation(); openBookingModal(slot); };
        card.appendChild(bookBtn);

        card.addEventListener('click', () => openBookingModal(slot));
    } else if (status === 'pending' && isMyBooking) {
        if (slot.bookingTime) {
            const diff = 1800000 - (Date.now() - slot.bookingTime);
            if (diff <= 0) {
                const timerDiv = document.createElement('div');
                timerDiv.style.cssText = 'color: #ef4444; font-size: 13px; font-weight: bold; text-align: center; margin-top: auto;';
                timerDiv.textContent = 'Auto-cancelling...';
                card.appendChild(timerDiv);
                setTimeout(() => { if (window.autoCancelMyBooking) window.autoCancelMyBooking(slot.id); }, 100);
                return card;
            }
        }

        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'margin-top: auto; display: flex; flex-direction: column; gap: 5px;';

        if (slot.bookingTime) {
            const timerDiv = document.createElement('div');
            timerDiv.className = 'pending-timer';
            timerDiv.setAttribute('data-booking-time', slot.bookingTime);
            timerDiv.setAttribute('data-slot-id', slot.id);
            timerDiv.style.cssText = 'color: #ef4444; font-size: 13px; font-weight: bold; text-align: center;';
            btnContainer.appendChild(timerDiv);
        }

        const viewBtn = document.createElement('button');
        viewBtn.style.cssText = 'font-size: 12px; padding: 6px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;';
        viewBtn.textContent = 'View QR';
        viewBtn.onclick = (e) => { e.stopPropagation(); generateQRCode(bData.qrCode, slot.slotNumber, selectedLocationName, bData.name, bData.vehicleNumber); };

        const cancelBtn = document.createElement('button');
        cancelBtn.style.cssText = 'font-size: 12px; padding: 6px; background: #ef4444; border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;';
        cancelBtn.textContent = 'Cancel Booking';
        cancelBtn.onclick = (e) => { e.stopPropagation(); window.cancelMyBooking(slot.id); };

        btnContainer.appendChild(viewBtn);
        btnContainer.appendChild(cancelBtn);
        card.appendChild(btnContainer);
    } else if (status === 'occupied' && isMyBooking) {
        const viewBtn = document.createElement('button');
        viewBtn.style.cssText = 'width: 100%; font-size: 12px; padding: 6px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold; margin-top: auto;';
        viewBtn.textContent = 'View QR';
        viewBtn.onclick = (e) => { e.stopPropagation(); generateQRCode(bData.qrCode, slot.slotNumber, selectedLocationName, bData.name, bData.vehicleNumber); };
        card.appendChild(viewBtn);
    }

    return card;
}

function openBookingModal(slot) {
    selectedSlot = slot;
    document.getElementById('modalSlotNumber').value = `Slot ${slot.slotNumber}`;
    document.getElementById('bookingForm').reset();
    document.getElementById('modalSlotNumber').value = `Slot ${slot.slotNumber}`;
    document.getElementById('bookingModal').classList.add('show');
}

window.closeModal = function () {
    document.getElementById('bookingModal').classList.remove('show');
    selectedSlot = null;
};

async function handleBooking(e) {
    e.preventDefault();

    if (!selectedSlot) return;

    const cooldown = localStorage.getItem('bookingCooldownUntil');
    if (cooldown && Date.now() < parseInt(cooldown)) {
        const remainingStr = Math.ceil((parseInt(cooldown) - Date.now()) / 60000);
        alert(`You recently let a booking expire. You cannot book any other slots for another ${remainingStr} minute(s).`);
        closeModal();
        return;
    }

    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const vehicleType = "Car";
    const vehicleNumber = document.getElementById('bookingVehicleNumber').value.trim();

    if (!name || !phone || !vehicleNumber) {
        alert('Please fill all fields');
        return;
    }

    try {
        let hasExistingBooking = false;
        let existingSlotNumber = '';
        let existingLocation = '';
        const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];
        for (const loc of locations) {
            const checkRef = collection(db, 'parking_locations', loc, 'slots');
            const qCheck = query(checkRef, where('phone', '==', phone));
            const qs = await getDocs(qCheck);
            qs.forEach(d => {
                const data = d.data();
                if (data.status === 'pending' || data.status === 'occupied') {
                    hasExistingBooking = true;
                    existingSlotNumber = data.slotNumber;
                    existingLocation = loc;
                }
            });
            if (hasExistingBooking) break;
        }
        if (hasExistingBooking) {
            let locName = existingLocation;
            if (locName === 'rathinam_main_gate') locName = 'Main Gate';
            else if (locName === 'rathinam_gate1') locName = 'Gate 1';
            else if (locName === 'rathinam_gate3') locName = 'Gate 3';

            alert(`A booking with this phone number already exists (Slot ${existingSlotNumber} at ${locName}). You can only book one slot at a time.`);
            return;
        }

        // Get slot reference
        const slotRef = doc(db, 'parking_locations', selectedLocation, 'slots', selectedSlot.id);

        // Read slot from Firestore
        const slotSnap = await getDoc(slotRef);

        // Error handling: Check if document exists
        if (!slotSnap.exists()) {
            alert('Slot not found');
            return;
        }

        const slotData = slotSnap.data();

        // Check if still available
        if (slotData.status !== 'available') {
            alert('Slot already booked');
            closeModal();
            return;
        }

        const bookingId = Date.now().toString();

        // Update Firestore
        await updateDoc(slotRef, {
            status: 'pending',
            bookingTime: Date.now(),
            bookedBy: name,
            phone: phone,
            vehicleType: vehicleType,
            vehicleNumber: vehicleNumber,
            userEmail: 'Guest',
            qrCode: bookingId,
            bookingId: bookingId,
            price: 80
        });

        const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
        const myBookingKey = selectedLocation + '_' + selectedSlot.id;
        myBookings[myBookingKey] = {
            qrCode: bookingId,
            name: name,
            vehicleNumber: vehicleNumber,
            bookingTime: Date.now()
        };
        localStorage.setItem('myBookings', JSON.stringify(myBookings));

        // Generate QR Code
        generateQRCode(bookingId, selectedSlot.slotNumber, selectedLocationName, name, vehicleNumber);

        closeModal();

        alert('Booking successful! Show QR to security.');

    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed: ' + error.message);
    }
}

function generateQRCode(bookingId, slotNumber, location, name, vehicleNumber) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.style.zIndex = '2000';

    // Create QR data with userEmail included
    const qrData = JSON.stringify({
        slotId: selectedSlot.id,
        location: selectedLocation,
        vehicleNumber: vehicleNumber,
        userEmail: name // Using name as userEmail
    });

    modal.innerHTML = `
        <div class="modal-content">
            <h2 style="color: #10b981; margin-bottom: 15px; text-align: center;">
                <i class="fas fa-check-circle"></i> Booking Confirmed!
            </h2>
            <p style="color: #6b7280; margin-bottom: 20px; text-align: center;">
                Show this QR code at the parking entrance
            </p>
            <div id="qrcode"></div>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;">
                    <strong>Name:</strong> ${name}
                </p>
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;">
                    <strong>Slot:</strong> ${slotNumber}
                </p>
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;">
                    <strong>Location:</strong> ${location}
                </p>
                <p style="font-size: 14px; color: #374151;">
                    <strong>Vehicle:</strong> ${vehicleNumber}
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="btn-primary">
                Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Generate QR code with JSON data
    new QRCode(document.getElementById("qrcode"), {
        text: qrData,
        width: 250,
        height: 250,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

window.cancelMyBooking = async function (slotId) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    try {
        const slotRef = doc(db, 'parking_locations', selectedLocation, 'slots', slotId);

        await updateDoc(slotRef, {
            status: 'available',
            bookedBy: null,
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            qrCode: null,
            bookingId: null,
            price: null
        });

        const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
        const myBookingKey = selectedLocation + '_' + slotId;
        delete myBookings[myBookingKey];
        localStorage.setItem('myBookings', JSON.stringify(myBookings));

    } catch (error) {
        alert('Failed to cancel booking: ' + error.message);
    }
};

window.autoCancelMyBooking = async function (slotId) {
    try {
        const slotRef = doc(db, 'parking_locations', selectedLocation, 'slots', slotId);

        await updateDoc(slotRef, {
            status: 'available',
            bookedBy: null,
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            qrCode: null,
            bookingId: null,
            bookingTime: null,
            userEmail: null,
            price: null
        });

        const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
        const myBookingKey = selectedLocation + '_' + slotId;
        const b = myBookings[myBookingKey];
        if (b && b.bookingTime) {
            const penaltyEnd = b.bookingTime + 1800000 + 300000;
            if (Date.now() < penaltyEnd) {
                localStorage.setItem('bookingCooldownUntil', penaltyEnd);
            }
        }
        delete myBookings[myBookingKey];
        localStorage.setItem('myBookings', JSON.stringify(myBookings));

    } catch (error) {
        console.error('Auto-cancel failed:', error);
    }
};

window.viewMyQR = function (slotId, slotNumber) {
    const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
    const myBookingKey = selectedLocation + '_' + slotId;
    const b = myBookings[myBookingKey];
    if (b && b.qrCode) {
        generateQRCode(b.qrCode, slotNumber, selectedLocationName, b.name, b.vehicleNumber);
    }
};

// AUTO-CANCEL LOGIC
setInterval(checkPendingTimeout, 60000);

async function checkPendingTimeout() {
    if (!selectedLocation) return;

    try {
        const slotsRef = collection(db, 'parking_locations', selectedLocation, 'slots');
        const q = query(slotsRef, where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach(async (docSnap) => {
            const data = docSnap.data();
            if (data.status === 'pending' && data.bookingTime) {
                const now = Date.now();
                const diff = now - data.bookingTime;

                if (diff > 1800000) { // 30 minutes = 1800000 ms
                    await updateDoc(docSnap.ref, {
                        status: 'available',
                        bookingTime: null,
                        bookedBy: null,
                        phone: null,
                        vehicleType: null,
                        vehicleNumber: null,
                        qrCode: null,
                        bookingId: null,
                        userEmail: null,
                        price: null
                    });
                }
            }
        });
    } catch (err) {
        console.error("Auto cancel error:", err);
    }
}

// UI TIMER LOGIC
setInterval(() => {
    document.querySelectorAll('.pending-timer').forEach(el => {
        const bookingTime = parseInt(el.getAttribute('data-booking-time'));
        const slotId = el.getAttribute('data-slot-id');
        if (!bookingTime) return;

        const now = Date.now();
        const diff = 1800000 - (now - bookingTime); // 30 minutes
        if (diff <= 0) {
            el.textContent = "Cancelling...";
            if (el.dataset.triggered !== 'true' && slotId) {
                el.dataset.triggered = 'true';
                if (window.autoCancelMyBooking) window.autoCancelMyBooking(slotId);
            }
        } else {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            el.textContent = `Expires in: ${mins}m ${secs}s`;
        }
    });
}, 1000);
