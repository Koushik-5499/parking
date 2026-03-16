// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDoc,
    getDocs
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyBMZz7gVpJjJ2WBaTlutAYC-UnDgXDRGuE",
    authDomain: "metropolitan-parking-system.firebaseapp.com",
    projectId: "metropolitan-parking-system",
    storageBucket: "metropolitan-parking-system.firebasestorage.app",
    messagingSenderId: "544641174438",
    appId: "1:544641174438:web:c9baa75180521bbe061d67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Admin Configuration
const ADMIN_EMAIL = "koushik123@gmail.com";
let currentUser = null;
let isAdmin = false;
let currentBookingSlot = null;
let selectedLocation = localStorage.getItem('selectedLocation') || 'Rathinam Main Gate';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    console.log('Selected location:', selectedLocation);

    // Update location name in header
    const locationNameElement = document.getElementById('locationName');
    if (locationNameElement) {
        locationNameElement.textContent = selectedLocation;
    }

    // Get DOM elements
    const userEmailElement = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const slotsContainer = document.getElementById('slotsContainer');
    const totalSlotsElement = document.getElementById('totalSlots');
    const availableSlotsElement = document.getElementById('availableSlots');
    const occupiedSlotsElement = document.getElementById('occupiedSlots');

    // Verify DOM elements exist
    console.log('userEmailElement:', userEmailElement);
    console.log('logoutBtn:', logoutBtn);
    console.log('slotsContainer:', slotsContainer);
    console.log('Statistics elements:', { totalSlotsElement, availableSlotsElement, occupiedSlotsElement });

    if (!userEmailElement || !logoutBtn || !slotsContainer) {
        console.error('Critical DOM elements missing!');
        return;
    }

    // Authentication State Observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is logged in
            console.log('✅ User authenticated:', user.email);
            userEmailElement.textContent = user.email;

            // Store current user and check admin status
            currentUser = user;
            isAdmin = user.email === ADMIN_EMAIL;

            console.log('👤 Admin status:', isAdmin);

            if (isAdmin) {
                console.log('🔑 Admin access granted');
            } else {
                console.log('👁️ Regular user - view only mode');
            }

            // Load parking slots data
            console.log('📡 Attempting to load parking slots...');
            loadParkingSlots(slotsContainer, totalSlotsElement, availableSlotsElement, occupiedSlotsElement);
        } else {
            // No user is logged in - redirect to login page
            console.log('❌ No user authenticated, redirecting to login');
            window.location.href = 'index.html';
        }
    });

    // Logout Handler
    logoutBtn.addEventListener('click', async () => {
        try {
            // Disable button during logout
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';

            await signOut(auth);
            console.log('User signed out successfully');

            // Redirect to login page
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out: ' + error.message);

            // Re-enable button on error
            logoutBtn.disabled = false;
            logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
        }
    });
});

// Load Parking Slots from Firestore with Real-time Updates
function loadParkingSlots(container, totalElement, availableElement, occupiedElement) {
    console.log('🔄 loadParkingSlots() called');
    console.log('Container element:', container);
    console.log('Filtering by location:', selectedLocation);

    if (!container) {
        console.error('❌ Container element is null!');
        return;
    }

    try {
        console.log('🔥 Firestore instance:', db);
        const parkingSlotsRef = collection(db, 'parking_slots');
        const locationQuery = query(parkingSlotsRef, where('location', '==', selectedLocation));
        console.log('📚 Query created for location:', selectedLocation);

        // Real-time listener
        const unsubscribe = onSnapshot(
            locationQuery,
            (snapshot) => {
                console.log('📸 Snapshot received!');
                console.log('   - Empty:', snapshot.empty);
                console.log('   - Size:', snapshot.size);
                console.log('   - Docs:', snapshot.docs.length);

                // Clear existing slots
                container.innerHTML = '';

                if (snapshot.empty) {
                    console.warn('⚠️ No documents found in parking_slots collection');
                    container.innerHTML = `
                        <div style="text-align: center; color: #6b7280; grid-column: 1/-1; padding: 20px;">
                            <i class="fas fa-info-circle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                            <p style="font-weight: 600; margin-bottom: 8px;">No parking slots found</p>
                            <p style="font-size: 14px;">Please add documents to the "parking_slots" collection in Firestore.</p>
                            <p style="font-size: 12px; margin-top: 10px; color: #9ca3af;">Collection: parking_slots</p>
                        </div>
                    `;

                    // Update statistics to 0
                    if (totalElement) totalElement.textContent = '0';
                    if (availableElement) availableElement.textContent = '0';
                    if (occupiedElement) occupiedElement.textContent = '0';

                    return;
                }

                // Create array to sort slots by slotNumber
                const slots = [];
                let availableCount = 0;
                let occupiedCount = 0;

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    console.log(`   📄 Doc ID: ${doc.id}`, data);
                    slots.push({ id: doc.id, ...data });

                    // Count status
                    const status = (data.status || '').toLowerCase();
                    if (status === 'available') {
                        availableCount++;
                    } else if (status === 'occupied') {
                        occupiedCount++;
                    }
                });

                const totalCount = snapshot.size;

                console.log('📊 Statistics:');
                console.log('   - Total:', totalCount);
                console.log('   - Available:', availableCount);
                console.log('   - Occupied:', occupiedCount);

                // Update statistics counters with animation
                if (totalElement) {
                    animateCounter(totalElement, totalCount);
                }
                if (availableElement) {
                    animateCounter(availableElement, availableCount);
                }
                if (occupiedElement) {
                    animateCounter(occupiedElement, occupiedCount);
                }

                // Sort by slotNumber
                slots.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

                // Create slot cards
                slots.forEach((slot, index) => {
                    console.log(`   🎴 Creating card ${index + 1}:`, slot);
                    const slotCard = createSlotCard(slot);
                    container.appendChild(slotCard);
                });

                console.log('✅ Parking slots rendered successfully!');
            },
            (error) => {
                console.error('❌ Firestore onSnapshot error:', error);
                console.error('   - Code:', error.code);
                console.error('   - Message:', error.message);
                console.error('   - Full error:', error);

                let errorMsg = 'Error loading parking slots';
                let helpText = '';

                if (error.code === 'permission-denied') {
                    errorMsg = '🔒 Permission Denied';
                    helpText = 'Firestore security rules are blocking access. Update rules to allow authenticated users to read.';
                } else if (error.code === 'unavailable') {
                    errorMsg = '🌐 Firestore Unavailable';
                    helpText = 'Check your internet connection or Firebase project status.';
                } else if (error.code === 'not-found') {
                    errorMsg = '❓ Collection Not Found';
                    helpText = 'The "parking_slots" collection may not exist yet.';
                }

                container.innerHTML = `
                    <div style="text-align: center; color: #ef4444; grid-column: 1/-1; padding: 20px; background: #fee; border-radius: 8px; border: 1px solid #fcc;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                        <p style="font-weight: 600; margin-bottom: 8px;">${errorMsg}</p>
                        <p style="font-size: 14px; margin-bottom: 10px;">${helpText}</p>
                        <p style="font-size: 12px; color: #dc2626; font-family: monospace;">${error.message}</p>
                    </div>
                `;

                // Reset statistics on error
                if (totalElement) totalElement.textContent = '0';
                if (availableElement) availableElement.textContent = '0';
                if (occupiedElement) occupiedElement.textContent = '0';
            }
        );

        console.log('👂 Firestore listener attached');

    } catch (error) {
        console.error('❌ Error initializing Firestore listener:', error);
        container.innerHTML = `
            <div style="text-align: center; color: #ef4444; grid-column: 1/-1; padding: 20px;">
                <p style="font-weight: 600;">Failed to initialize Firestore</p>
                <p style="font-size: 14px; margin-top: 8px;">${error.message}</p>
            </div>
        `;
    }
}

// Animate counter with smooth transition
function animateCounter(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;

    if (currentValue === targetValue) return;

    const duration = 500; // milliseconds
    const steps = 20;
    const increment = (targetValue - currentValue) / steps;
    const stepDuration = duration / steps;

    let current = currentValue;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current += increment;

        if (step >= steps) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, stepDuration);
}

// Format time to HH:MM AM/PM
function formatTime(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
}

// Open Booking Modal - Redirect to booking page
function openBookingModal(slot) {
    console.log('📝 Redirecting to booking page for slot:', slot.slotNumber);
    
    // Store slot data in localStorage
    localStorage.setItem('bookingSlot', JSON.stringify({
        id: slot.id,
        slotNumber: slot.slotNumber,
        location: slot.location || selectedLocation
    }));
    
    // Redirect to booking page
    window.location.href = 'booking.html';
}

// Close Booking Modal
function closeBookingModal() {
    document.getElementById('bookingModal').classList.remove('show');
    currentBookingSlot = null;
}

// Handle Booking Submission
async function handleBookingSubmit() {
    if (!currentBookingSlot) {
        alert('No slot selected');
        return;
    }

    const name = document.getElementById('bookingName').value.trim();
    const phone = document.getElementById('bookingPhone').value.trim();
    const vehicleNumber = document.getElementById('bookingVehicleNumber')?.value.trim() || 'N/A';
    const vehicleType = 'Car';

    if (!name || !phone) {
        alert('Please fill all required fields');
        return;
    }

    const price = 80;
    const location = currentBookingSlot.location || 'Rathinam Main Gate';

    const confirmBtn = document.querySelector('.confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        console.log('💾 Saving booking to Firestore...');

        // Add booking to bookings collection
        const bookingRef = await addDoc(collection(db, 'bookings'), {
            slotNumber: currentBookingSlot.slotNumber,
            location: location,
            name: name,
            phone: phone,
            vehicleNumber: vehicleNumber,
            vehicleType: vehicleType,
            price: price,
            bookedAt: serverTimestamp(),
            status: 'reserved',
            userId: currentUser.uid,
            userEmail: currentUser.email
        });

        // Generate QR code data
        const qrData = `${bookingRef.id}_${currentBookingSlot.slotNumber}_${location}_${vehicleNumber}`;
        
        // Update parking_slots collection
        const slotRef = doc(db, 'parking_slots', currentBookingSlot.id);
        await updateDoc(slotRef, {
            status: 'reserved',
            occupiedSince: serverTimestamp(),
            bookedBy: name,
            phone: phone,
            vehicleType: vehicleType,
            vehicleNumber: vehicleNumber,
            price: price
        });

        console.log('✅ Booking successful!');

        // Close modal
        closeBookingModal();

        // Show QR code
        showQRCode(qrData, bookingRef.id);

    } catch (error) {
        console.error('❌ Booking error:', error);
        alert(`Booking failed: ${error.message}`);

        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirm Booking';
    }
}

// Create Slot Card Element
function createSlotCard(slot) {
    console.log('   🎨 Creating card for slot:', slot);

    const card = document.createElement('div');
    let status = (slot.status || 'unknown').toLowerCase();
    
    // Check if this slot has payment pending for current user
    const isPaymentPending = status === 'payment_pending' && 
                             currentUser && 
                             (slot.userEmail === currentUser.email || slot.bookedBy === currentUser.email);

    // Create wrapper for card + timing
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center;';

    const slotBox = document.createElement('div');
    
    // If payment pending, show as occupied (red) for display
    const displayStatus = status === 'payment_pending' ? 'occupied' : status;
    slotBox.className = `slot-card ${displayStatus}`;

    // Add data attributes for identification
    slotBox.setAttribute('data-slot-id', slot.id);
    slotBox.setAttribute('data-slot-number', slot.slotNumber || '?');
    slotBox.setAttribute('data-status', status);

    // Format occupied since time
    let occupiedTimeText = '';
    if ((status === 'occupied' || status === 'payment_pending') && slot.occupiedSince) {
        const date = slot.occupiedSince.toDate ? slot.occupiedSince.toDate() : new Date(slot.occupiedSince);
        occupiedTimeText = formatTime(date);
    }

    // Build card HTML - matching the image design
    let cardHTML = `
        <div class="slot-header">
            <div class="slot-number">${slot.slotNumber || '?'}</div>
            <div class="slot-status">${isPaymentPending ? 'payment pending' : status}</div>
        </div>
    `;

    if (status === 'occupied' || status === 'payment_pending') {
        cardHTML += `<div class="slot-details">`;

        // Show username with icon
        if (slot.bookedBy) {
            cardHTML += `
                <div class="detail-row">
                    <i class="fas fa-user"></i>
                    <span>${slot.bookedBy}</span>
                </div>
            `;
        }
        
        // Show Pay button if payment pending for this user
        if (isPaymentPending) {
            cardHTML += `
                <button onclick="payForSlot('${slot.id}')" style="width: 100%; margin-top: 10px; padding: 10px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; transition: all 0.3s ease;">
                    <i class="fas fa-credit-card"></i> Pay Now
                </button>
            `;
        }

        cardHTML += `</div>`;
    }

    slotBox.innerHTML = cardHTML;

    // Add timing below the box (outside)
    if ((status === 'occupied' || status === 'payment_pending') && occupiedTimeText) {
        const timeDisplay = document.createElement('div');
        timeDisplay.style.cssText = `
            margin-top: 10px;
            font-size: 14px;
            color: #6b7280;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        `;
        timeDisplay.innerHTML = `
            <i class="fas fa-clock" style="color: #9ca3af;"></i>
            <span>${occupiedTimeText}</span>
        `;
        wrapper.appendChild(slotBox);
        wrapper.appendChild(timeDisplay);
    } else {
        wrapper.appendChild(slotBox);
    }

    // Make clickable for booking (available slots) or admin toggle
    if (isAdmin) {
        // Admin can toggle ANY slot (available or occupied)
        slotBox.addEventListener('click', () => handleSlotClick(slot.id, status, slotBox));
        slotBox.style.cursor = 'pointer';
        slotBox.title = 'Admin: Click to toggle status';
    } else if (status === 'available') {
        // Regular users can only book available slots
        slotBox.addEventListener('click', () => openBookingModal(slot));
        slotBox.style.cursor = 'pointer';
        slotBox.title = 'Click to book this slot';
    } else if (isPaymentPending) {
        // Payment pending - clickable to pay
        slotBox.style.cursor = 'pointer';
        slotBox.title = 'Click to pay for this slot';
    } else {
        // Occupied slots - view only for regular users
        slotBox.style.cursor = 'default';
        slotBox.title = 'Occupied - Not available';
    }

    console.log('   ✅ Card created with class:', slotBox.className);
    console.log('   📊 Payment pending:', isPaymentPending, 'Status:', status);

    return wrapper;
}

// Handle Slot Click - Toggle Status (Admin Only)
async function handleSlotClick(slotId, currentStatus, cardElement) {
    console.log('🖱️ Slot clicked:', slotId, 'Current status:', currentStatus);

    // Double-check admin status
    if (!isAdmin) {
        alert('Only admin can change slot status');
        console.log('❌ Unauthorized: User is not admin');
        return;
    }

    // Determine new status
    const newStatus = currentStatus === 'available' ? 'occupied' : 'available';

    // Show confirmation dialog
    const confirmMessage = `Change slot status from "${currentStatus.toUpperCase()}" to "${newStatus.toUpperCase()}"?`;

    if (!confirm(confirmMessage)) {
        console.log('❌ User cancelled status change');
        return;
    }

    // Disable card during update
    cardElement.style.opacity = '0.6';
    cardElement.style.pointerEvents = 'none';

    try {
        console.log('🔄 Updating Firestore...');

        // Get document reference
        const slotRef = doc(db, 'parking_slots', slotId);

        // Prepare update data
        let updateData = {
            status: newStatus
        };

        // If changing to occupied, add timestamp
        if (newStatus === 'occupied') {
            updateData.occupiedSince = serverTimestamp();
        }

        // If changing to available, clear booking data
        if (newStatus === 'available') {
            updateData.occupiedSince = null;
            updateData.bookedBy = null;
            updateData.phone = null;
            updateData.vehicleType = null;
            updateData.price = null;
        }

        // Update Firestore
        await updateDoc(slotRef, updateData);

        console.log('✅ Firestore updated successfully');

        // Show success feedback
        showToast(`Slot status changed to ${newStatus.toUpperCase()}`, 'success');

        // Re-enable card (real-time listener will update UI)
        cardElement.style.opacity = '1';
        cardElement.style.pointerEvents = 'auto';

    } catch (error) {
        console.error('❌ Error updating slot:', error);

        // Re-enable card
        cardElement.style.opacity = '1';
        cardElement.style.pointerEvents = 'auto';

        // Show error message
        let errorMessage = 'Failed to update slot status';

        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Check Firestore rules.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Slot not found in database.';
        }

        alert(`Error: ${errorMessage}\n${error.message}`);
        showToast(errorMessage, 'error');
    }
}

// Show Toast Notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    if (type === 'success') {
        toast.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    } else {
        toast.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        toast.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    }

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add CSS animation for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
    
    .slot-card {
        transition: all 0.3s ease;
    }
    
    .slot-card:active {
        transform: scale(0.95);
    }
`;
document.head.appendChild(style);


// Load Payment Requests for current user
function loadPaymentRequests() {
    if (!currentUser) return;
    
    const paymentRequestsSection = document.getElementById('paymentRequestsSection');
    const paymentRequestsContainer = document.getElementById('paymentRequestsContainer');
    
    if (!paymentRequestsSection || !paymentRequestsContainer) return;
    
    const paymentRequestsRef = collection(db, 'payment_requests');
    const userQuery = query(paymentRequestsRef, 
        where('userEmail', '==', currentUser.email),
        where('status', '==', 'pending')
    );
    
    onSnapshot(userQuery, (snapshot) => {
        if (snapshot.empty) {
            paymentRequestsSection.style.display = 'none';
            return;
        }
        
        paymentRequestsSection.style.display = 'block';
        paymentRequestsContainer.innerHTML = '';
        
        snapshot.forEach((docSnap) => {
            const request = docSnap.data();
            const requestId = docSnap.id;
            
            const requestCard = document.createElement('div');
            requestCard.style.cssText = `
                background: #fef3c7;
                border: 2px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 15px;
            `;
            
            const entryTime = request.entryTime?.toDate ? request.entryTime.toDate().toLocaleString() : 'N/A';
            const exitTime = request.exitTime?.toDate ? request.exitTime.toDate().toLocaleString() : 'N/A';
            
            requestCard.innerHTML = `
                <div style="flex: 1; min-width: 200px;">
                    <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px;">
                        <i class="fas fa-parking"></i> Slot ${request.slotNumber || 'N/A'}
                    </h4>
                    <p style="margin: 5px 0; color: #78350f; font-size: 14px;">
                        <strong>Location:</strong> ${request.locationId === 'rathinam_main_gate' ? 'Main Gate' : request.locationId === 'rathinam_gate1' ? 'Gate 1' : 'Gate 3'}
                    </p>
                    <p style="margin: 5px 0; color: #78350f; font-size: 14px;">
                        <strong>Vehicle:</strong> ${request.vehicleNumber || 'N/A'}
                    </p>
                    <p style="margin: 5px 0; color: #78350f; font-size: 14px;">
                        <strong>Entry:</strong> ${entryTime}
                    </p>
                    <p style="margin: 5px 0; color: #78350f; font-size: 14px;">
                        <strong>Exit:</strong> ${exitTime}
                    </p>
                </div>
                <div style="text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">Amount to Pay</p>
                    <p style="margin: 0 0 15px 0; color: #ef4444; font-size: 28px; font-weight: 700;">₹${request.amount || 0}</p>
                    <button onclick="payNow('${requestId}', ${request.amount})" style="background: #10b981; color: white; border: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                        <i class="fas fa-credit-card"></i> Pay Now
                    </button>
                </div>
            `;
            
            paymentRequestsContainer.appendChild(requestCard);
        });
    });
}

// Pay Now function for payment requests
window.payNow = async function(requestId, amount) {
    if (!confirm(`Proceed to pay ₹${amount}?`)) return;
    
    try {
        const requestRef = doc(db, 'payment_requests', requestId);
        const requestSnap = await getDoc(requestRef);
        
        if (!requestSnap.exists()) {
            alert('Payment request not found!');
            return;
        }
        
        const requestData = requestSnap.data();
        
        // Save payment transaction
        await addDoc(collection(db, 'payment_transactions'), {
            locationId: requestData.locationId,
            slotId: requestData.slotId,
            slotNumber: requestData.slotNumber || '',
            bookedBy: requestData.bookedBy || 'N/A',
            userEmail: requestData.userEmail || 'N/A',
            phone: requestData.phone || 'N/A',
            vehicleNumber: requestData.vehicleNumber || 'N/A',
            amount: amount,
            paymentMethod: 'online',
            paymentTime: serverTimestamp(),
            exitTime: requestData.exitTime
        });
        
        // Update request status to completed
        await updateDoc(requestRef, {
            status: 'completed',
            paidTime: serverTimestamp()
        });
        
        alert('Payment successful! Thank you.');
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
    }
};

// Pay for slot directly (when payment_pending)
window.payForSlot = async function(slotId) {
    try {
        // Find the payment request for this slot
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
        const amount = requestData.amount;
        
        // UPI Payment Details
        const upiID = "koushik4680@oksbi";
        const payeeName = "Smart Metro Parking";
        const transactionNote = `Parking-Slot${requestData.slotNumber}-${requestData.locationId}`;
        
        // Create UPI payment URL
        const upiURL = `upi://pay?pa=${upiID}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
        
        // Show confirmation dialog
        if (!confirm(`You will be redirected to your UPI app to pay ₹${amount}.\n\nAfter completing payment, please return here and click "Payment Done" to confirm.`)) {
            return;
        }
        
        // Open UPI payment app
        window.location.href = upiURL;
        
        // Show payment confirmation dialog after a delay (user will return after payment)
        setTimeout(() => {
            showPaymentConfirmation(requestDoc.id, requestData);
        }, 3000);
        
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed: ' + error.message);
    }
};

// Show payment confirmation dialog
function showPaymentConfirmation(requestId, requestData) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: center;">
            <div style="margin-bottom: 20px;">
                <i class="fas fa-credit-card" style="font-size: 48px; color: #2563eb;"></i>
            </div>
            <h2 style="color: #374151; margin-bottom: 15px;">Payment Status</h2>
            <p style="color: #6b7280; margin-bottom: 20px;">Have you completed the payment of ₹${requestData.amount}?</p>
            <div style="display: flex; gap: 10px;">
                <button id="paymentDoneBtn" style="flex: 1; padding: 14px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                    <i class="fas fa-check"></i> Payment Done
                </button>
                <button id="paymentCancelBtn" style="flex: 1; padding: 14px; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle Payment Done button
    document.getElementById('paymentDoneBtn').addEventListener('click', async () => {
        try {
            // Save payment transaction
            await addDoc(collection(db, 'payment_transactions'), {
                locationId: requestData.locationId,
                slotId: requestData.slotId,
                slotNumber: requestData.slotNumber || '',
                bookedBy: requestData.bookedBy || 'N/A',
                userEmail: requestData.userEmail || 'N/A',
                phone: requestData.phone || 'N/A',
                vehicleNumber: requestData.vehicleNumber || 'N/A',
                amount: requestData.amount,
                paymentMethod: 'online',
                paymentTime: serverTimestamp(),
                exitTime: requestData.exitTime
            });
            
            // Update request status to completed
            await updateDoc(doc(db, 'payment_requests', requestId), {
                status: 'completed',
                paidTime: serverTimestamp()
            });
            
            modal.remove();
            alert('✅ Payment confirmed! Thank you.');
        } catch (error) {
            console.error('Error confirming payment:', error);
            alert('Failed to confirm payment: ' + error.message);
        }
    });
    
    // Handle Cancel button
    document.getElementById('paymentCancelBtn').addEventListener('click', () => {
        modal.remove();
    });
}


// Call loadPaymentRequests when user is authenticated
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadPaymentRequests();
    }
});
