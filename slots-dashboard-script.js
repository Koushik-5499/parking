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
    serverTimestamp,
    addDoc,
    limit,
    writeBatch
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

        // Block unverified email/password users
        const isEmailPasswordUser = user.providerData.some(p => p.providerId === 'password');
        if (isEmailPasswordUser && !user.emailVerified) {
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
            if (slot.isVIP || (slot.slotNumber && slot.slotNumber.toString().startsWith('VIP'))) return;
            const slotCard = createSlotCard(slot);
            slotsGrid.appendChild(slotCard);
            
            const activeModal = document.getElementById('qr-modal-overlay');
            if (activeModal && (activeModal.dataset.bookingId === slot.bookingId || activeModal.dataset.bookingId === slot.qrCode)) {
                const initStatus = activeModal.dataset.initStatus;
                if (initStatus && initStatus !== slot.status) {
                    activeModal.remove(); // Auto-close QR code Modal
                } else if (initStatus === 'occupied' && slot.exitTime) {
                    activeModal.remove(); // Auto-close when admin scans exit
                }
            }
        });
    });
}

function createSlotCard(slot) {
    const card = document.createElement('div');
    let status = slot.status || 'available';
    
    // Check if payment pending for current user
    const isPaymentPending = status === 'payment_pending' && 
                             currentUser && 
                             (slot.userEmail === currentUser.email || slot.bookedBy === currentUser.email);
    
    // Display payment_pending as occupied (red)
    const displayStatus = status === 'payment_pending' ? 'occupied' : status;
    card.className = `slot-card ${displayStatus}`;

    card.innerHTML = `
        <div class="slot-number">Slot ${slot.slotNumber}</div>
        <div class="slot-status" style="margin-bottom: 10px;">${isPaymentPending ? 'PAYMENT PENDING' : status.toUpperCase()}</div>
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
    
    // Handle payment_pending slots
    if (isPaymentPending) {
        const payBtn = document.createElement('button');
        payBtn.style.cssText = 'width: 100%; font-size: 14px; padding: 10px; margin-top: auto; border: none; border-radius: 8px; cursor: pointer; background: #ef4444; color: white; font-weight: bold; transition: all 0.3s ease;';
        payBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Now';
        payBtn.onclick = (e) => { e.stopPropagation(); window.payForSlot(slot.id); };
        card.appendChild(payBtn);
        return card;
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
        viewBtn.onclick = (e) => { e.stopPropagation(); generateQR(bData.qrCode, slot.slotNumber, selectedLocationName, bData.name, bData.vehicleNumber, status); };

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
        viewBtn.onclick = (e) => { e.stopPropagation(); generateQR(bData.qrCode, slot.slotNumber, selectedLocationName, bData.name, bData.vehicleNumber, status); };
        card.appendChild(viewBtn);
    }

    return card;
}

async function openBookingModal(slot) {
    // Check if user has any payment pending slots
    try {
        const paymentRequestsRef = collection(db, 'payment_requests');
        const q = query(paymentRequestsRef, 
            where('userEmail', '==', currentUser.email),
            where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            alert('⚠️ You have a pending payment! Please complete your payment before booking another slot.');
            return;
        }
    } catch (error) {
        console.error('Error checking payment requests:', error);
    }
    
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

    if (!/^[A-Za-z\s]+$/.test(name)) {
        alert('Please enter a valid name (letters and spaces only, no numbers or symbols).');
        return;
    }

    if (!/^\d{10}$/.test(phone)) {
        alert('Please enter exactly a 10-digit phone number.');
        return;
    }

    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(vehicleNumber)) {
        alert('Please enter a valid vehicle number.');
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
                const qCheck = query(checkRef, where('userEmail', '==', userEmail), limit(1));
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
            vehicleNumber: vehicleNumber,
            bookingTime: Date.now()
        };
        localStorage.setItem('myBookings', JSON.stringify(myBookings));

        generateQR(bookingId, selectedSlot.slotNumber, selectedLocationName, name, vehicleNumber, 'pending');
        closeModal();

    } catch (error) {
        console.error('Booking error:', error);
        alert('Booking failed: ' + error.message);
    }
}

function generateQR(bookingId, slotNumber, location, name, vehicleNumber, initStatus = '') {
    const existing = document.getElementById('qr-modal-overlay');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'qr-modal-overlay';
    modal.dataset.bookingId = bookingId;
    modal.dataset.initStatus = initStatus;
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
            <h2 style="color: #38bdf8; margin-bottom: 15px;">
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
        // we might not know current status here, default ''
        generateQR(b.qrCode, slotNumber, selectedLocationName, b.name, b.vehicleNumber, '');
    }
};

// AUTO-CANCEL LOGIC REMOVED TO REDUCE READS/WRITES

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
            
            if (mins === 10 && secs === 0 && el.dataset.alert10mTriggered !== 'true') {
                el.dataset.alert10mTriggered = 'true';
                alert(`Reminder: Your booking for Slot ${slotId} will expire in 10 minutes! Please scan your QR code at the gate.`);
            }
        }
    });
}, 1000);


window.payForSlot = async function(slotId) {
    try {
        const paymentRequestsRef = collection(db, 'payment_requests');
        const q = query(paymentRequestsRef, 
            where('slotId', '==', slotId),
            where('userEmail', '==', currentUser.email),
            where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            alert('Payment request not found!');
            return;
        }
        
        const requestDoc = querySnapshot.docs[0];
        const requestData = requestDoc.data();
        const amount = requestData.amount || 80;
        const bookingId = requestData.bookingId || slotId;
        
        openPayment(bookingId, amount, requestDoc.id, requestData);
    } catch (error) {
        alert('Payment failed: ' + error.message);
    }
};

async function openPayment(bookingId, amount, requestId, requestData) {
    try {
        const orderRes = await fetch("/api/createOrder", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                amount: amount * 100
            })
        });
        
        const order = await orderRes.json();

        var options = {
            key: "rzp_test_SZquwUDpz1IWQq",
            amount: amount * 100,
            currency: "INR",
            order_id: order.id,
            name: "Smart Parking",
            description: "Parking Booking",
            handler: async function (response) {
                try {
                    const verifyRes = await fetch("/api/verifyPayment", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        try {
                            await updateDoc(doc(db, "bookings", bookingId), {
                                status: "paid",
                                paymentId: response.razorpay_payment_id
                            });
                        } catch(e) {}
                        
                        try {
                            await updateDoc(doc(db, 'payment_requests', requestId), {
                                status: 'completed',
                                paidTime: serverTimestamp()
                            });
                            await addDoc(collection(db, 'payment_transactions'), {
                                locationId: requestData.locationId,
                                slotId: requestData.slotId,
                                slotNumber: requestData.slotNumber || '',
                                bookedBy: requestData.bookedBy || 'N/A',
                                userEmail: requestData.userEmail || 'N/A',
                                phone: requestData.phone || 'N/A',
                                vehicleNumber: requestData.vehicleNumber || 'N/A',
                                amount: requestData.amount,
                                bookingId: requestData.bookingId || '',
                                paymentMethod: 'online',
                                paymentTime: serverTimestamp(),
                                exitTime: requestData.exitTime
                            });
                        } catch(e) {}
                        
                        alert("Payment Successful");
                    } else {
                        alert("Payment verification failed");
                    }
                } catch(error) {
                    console.error("Verification error:", error);
                    alert("Payment received but verification failed. Contact support.");
                }
            }
        };
        var rzp = new Razorpay(options);
        rzp.open();
    } catch(err) {
        console.error("Order creation failed", err);
        alert("Failed to initialize payment.");
    }
}

// ===== Send Receipt Email =====
async function sendReceiptEmail(receiptData) {
    try {
        // Extract the existing QR code from the page
        let qrImageBase64 = null;

        // Look for any QR code canvas on the page (from the booking QR display)
        const allCanvases = document.querySelectorAll('canvas');
        for (const canvas of allCanvases) {
            // QR code canvases are typically square and 200x200+
            if (canvas.width >= 100 && canvas.height >= 100 && canvas.width === canvas.height) {
                qrImageBase64 = canvas.toDataURL('image/png');
                break;
            }
        }

        // If no QR canvas found, generate one temporarily using the bookingId
        if (!qrImageBase64 && receiptData.qrCode && typeof QRCode !== 'undefined') {
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position: absolute; left: -9999px; top: -9999px;';
            document.body.appendChild(tempDiv);

            new QRCode(tempDiv, {
                text: receiptData.qrCode,
                width: 200,
                height: 200,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });

            // Wait for QR to render
            await new Promise(resolve => setTimeout(resolve, 300));

            const tempCanvas = tempDiv.querySelector('canvas');
            if (tempCanvas) {
                qrImageBase64 = tempCanvas.toDataURL('image/png');
            }
            document.body.removeChild(tempDiv);
        }

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: receiptData.to,
                bookingId: receiptData.bookingId,
                date: receiptData.date,
                location: receiptData.location,
                entry: receiptData.entry,
                exit: receiptData.exit,
                duration: receiptData.duration,
                rate: receiptData.rate,
                amount: receiptData.amount,
                qrImage: qrImageBase64
            })
        });

        const result = await response.json();
        if (result.success) {
            console.log('📧 Receipt email sent successfully to', receiptData.to);
        } else {
            console.error('Email send failed:', result.error);
        }
    } catch (error) {
        console.error('Email send error:', error);
    }
}
