import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    onSnapshot,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
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
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
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

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        loadSlots();
    });

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
            const slotCard = createSlotCard(slot);
            slotsGrid.appendChild(slotCard);
        });
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
        delete myBookings[myBookingKey];
        localStorage.setItem('myBookings', JSON.stringify(myBookings));
        myBooking = null;
    } else if (myBooking && status === 'available') {
        delete myBookings[myBookingKey];
        localStorage.setItem('myBookings', JSON.stringify(myBookings));
        myBooking = null;
    }

    let isMyBooking = false;
    let bData = null;

    if (currentUser && currentUser.email && currentUser.email !== 'Guest' && slot.userEmail === currentUser.email) {
        isMyBooking = true;
        bData = {
            qrCode: slot.qrCode,
            name: slot.bookedBy || currentUser.email,
            vehicleNumber: slot.vehicleNumber || ''
        };
    } else if (myBooking) {
        isMyBooking = true;
        bData = myBooking;
    }

    if (status === 'available') {
        const bookBtn = document.createElement('button');
        bookBtn.className = 'btn-primary';
        bookBtn.style.cssText = 'width: 100%; font-size: 14px; padding: 8px; margin-top: auto; border: none; border-radius: 8px; cursor: pointer; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; font-weight: bold;';
        bookBtn.textContent = 'Book';
        bookBtn.onclick = (e) => { e.stopPropagation(); openBookingModal(slot); };
        card.appendChild(bookBtn);

        card.addEventListener('click', () => openBookingModal(slot));
    } else if (status === 'pending' && isMyBooking) {
        const btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'margin-top: auto; display: flex; flex-direction: column; gap: 5px;';

        if (slot.bookingTime) {
            const timerDiv = document.createElement('div');
            timerDiv.className = 'pending-timer';
            timerDiv.setAttribute('data-booking-time', slot.bookingTime);
            timerDiv.style.cssText = 'color: #ef4444; font-size: 13px; font-weight: bold; text-align: center;';
            btnContainer.appendChild(timerDiv);
        }

        const viewBtn = document.createElement('button');
        viewBtn.style.cssText = 'font-size: 12px; padding: 6px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;';
        viewBtn.textContent = 'View QR';
        viewBtn.onclick = (e) => { e.stopPropagation(); generateQR(bData.qrCode, slot.slotNumber, selectedLocationName, bData.name, bData.vehicleNumber); };

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
        viewBtn.onclick = (e) => { e.stopPropagation(); generateQR(bData.qrCode, slot.slotNumber, selectedLocationName, bData.name, bData.vehicleNumber); };
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

    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const vehicleType = "Car";
    const vehicleNumber = document.getElementById('bookingVehicleNumber').value.trim();

    if (!name || !phone || !vehicleNumber) {
        alert('Please fill all fields');
        return;
    }

    try {
        const userEmail = currentUser ? currentUser.email : 'Guest';
        if (userEmail !== 'Guest') {
            let hasExistingBooking = false;
            let existingSlotNumber = '';
            let existingLocation = '';
            const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];
            for (const loc of locations) {
                const checkRef = collection(db, 'parking_locations', loc, 'slots');
                const qCheck = query(checkRef, where('userEmail', '==', userEmail));
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

                alert(`You already have an active booking (Slot ${existingSlotNumber} at ${locName}). You can only book one slot at a time.`);
                return;
            }
        }

        // Get slot reference
        const slotRef = doc(db, 'parking_locations', selectedLocation, 'slots', selectedSlot.id);

        // Verify slot exists
        const slotSnap = await getDoc(slotRef);
        if (!slotSnap.exists()) {
            alert('Slot not found');
            return;
        }

        // Check if still available
        if (slotSnap.data().status !== 'available') {
            alert('Slot is no longer available');
            closeModal();
            return;
        }

        // Generate booking ID (QR code data)
        const bookingId = Date.now().toString();

        // Update slot with booking data
        await updateDoc(slotRef, {
            status: 'pending',
            bookingTime: Date.now(),
            bookedBy: name,
            phone: phone,
            vehicleType: vehicleType,
            vehicleNumber: vehicleNumber,
            userEmail: currentUser ? currentUser.email : 'Guest',
            qrCode: bookingId,
            bookingId: bookingId,
            price: 80
        });

        const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
        const myBookingKey = selectedLocation + '_' + selectedSlot.id;
        myBookings[myBookingKey] = {
            qrCode: bookingId,
            name: name,
            vehicleNumber: vehicleNumber
        };
        localStorage.setItem('myBookings', JSON.stringify(myBookings));

        generateQR(bookingId, selectedSlot.slotNumber, selectedLocationName, name, vehicleNumber);
        closeModal();

    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed: ' + error.message);
    }
}

function generateQR(bookingId, slotNumber, location, name, vehicleNumber) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 450px;">
            <h2 style="color: #10b981; margin-bottom: 15px;">
                <i class="fas fa-check-circle"></i> Booking Confirmed!
            </h2>
            <p style="color: #6b7280; margin-bottom: 20px;">Show this QR code at the parking entrance</p>
            <div id="qrcode" style="display: flex; justify-content: center; margin: 20px 0;"></div>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;"><strong>Booking ID:</strong> ${bookingId}</p>
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;"><strong>Name:</strong> ${name}</p>
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;"><strong>Slot:</strong> ${slotNumber}</p>
                <p style="font-size: 14px; color: #374151; margin-bottom: 5px;"><strong>Location:</strong> ${location}</p>
                <p style="font-size: 14px; color: #374151;"><strong>Vehicle:</strong> ${vehicleNumber}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); 
                color: white; border: none; padding: 12px 30px; border-radius: 8px; 
                font-weight: 600; cursor: pointer; width: 100%;">
                Close
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    // Generate QR code with booking ID
    new QRCode(document.getElementById("qrcode"), {
        text: bookingId,
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

window.viewMyQR = function (slotId, slotNumber) {
    const myBookings = JSON.parse(localStorage.getItem('myBookings') || '{}');
    const myBookingKey = selectedLocation + '_' + slotId;
    const b = myBookings[myBookingKey];
    if (b && b.qrCode) {
        generateQR(b.qrCode, slotNumber, selectedLocationName, b.name, b.vehicleNumber);
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

                if (diff > 600000) { // 10 minutes = 600000 ms
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
        if (!bookingTime) return;

        const now = Date.now();
        const diff = 600000 - (now - bookingTime);
        if (diff <= 0) {
            el.textContent = "Expired";
        } else {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            el.textContent = `Expires in: ${mins}m ${secs}s`;
        }
    });
}, 1000);
