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
    getDoc,
    addDoc,
    setDoc
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

// Format date as dd-mm-yyyy HH:MM
function fmtDate(d) {
    if (!d) return 'N/A';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}
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
        loadEarnings();
        
        document.getElementById('toggleScannerBtn')?.addEventListener('click', window.toggleScanner);
        document.getElementById('manualCodeSubmit')?.addEventListener('click', async () => {
            const val = document.getElementById('manualCodeInput')?.value.trim();
            if (!val) return;
            document.getElementById('manualCodeInput').value = '';
            if (isScanning) return;
            isScanning = true;
            await window.stopScanner();
            await processQRCode(val);
        });

        document.getElementById('showReportBtn')?.addEventListener('click', filterData);
        document.getElementById('exportExcelBtn')?.addEventListener('click', exportExcel);
        document.getElementById('bookingSearchBtn')?.addEventListener('click', searchBookings);
        document.getElementById('bookingSearchInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchBookings();
        });
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
});

// Load earnings data from payment_transactions
function loadEarnings() {
    const paymentsRef = collection(db, 'payment_transactions');
    
    onSnapshot(paymentsRef, (snapshot) => {
        const now = new Date();
        
        // Today: start of today
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // This week: start of Monday
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
        
        // This month: start of month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let dailyTotal = 0;
        let weeklyTotal = 0;
        let monthlyTotal = 0;
        
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const amount = data.amount || 0;
            
            let paymentDate = null;
            if (data.paymentTime?.toDate) {
                paymentDate = data.paymentTime.toDate();
            } else if (data.exitTime?.toDate) {
                paymentDate = data.exitTime.toDate();
            }
            
            if (!paymentDate) return;
            
            if (paymentDate >= monthStart) {
                monthlyTotal += amount;
            }
            if (paymentDate >= weekStart) {
                weeklyTotal += amount;
            }
            if (paymentDate >= todayStart) {
                dailyTotal += amount;
            }
        });
        
        const dailyEl = document.getElementById('dailyEarnings');
        const weeklyEl = document.getElementById('weeklyEarnings');
        const monthlyEl = document.getElementById('monthlyEarnings');
        
        if (dailyEl) dailyEl.textContent = `₹${dailyTotal}`;
        if (weeklyEl) weeklyEl.textContent = `₹${weeklyTotal}`;
        if (monthlyEl) monthlyEl.textContent = `₹${monthlyTotal}`;
    });
}

// Search bookings by ID, phone, or email
async function searchBookings() {
    const searchInput = document.getElementById('bookingSearchInput');
    const searchType = document.getElementById('bookingSearchType');
    const resultsDiv = document.getElementById('bookingSearchResults');
    const searchBtn = document.getElementById('bookingSearchBtn');
    
    const searchVal = searchInput.value.trim();
    if (!searchVal) {
        alert('Please enter a search value.');
        return;
    }
    
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
    searchBtn.disabled = true;
    
    try {
        const type = searchType.value;
        let results = [];
        
        // Search in payment_transactions
        const ptRef = collection(db, 'payment_transactions');
        const ptSnapshot = await getDocs(ptRef);
        
        ptSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            data._docId = docSnap.id;
            data._source = 'payment';
            let match = false;
            
            if (type === 'bookingId') {
                match = (data.bookingId && data.bookingId.includes(searchVal)) ||
                        (data.qrCode && data.qrCode.includes(searchVal));
            } else if (type === 'phone') {
                match = data.phone && data.phone.includes(searchVal);
            } else if (type === 'email') {
                match = data.userEmail && data.userEmail.toLowerCase().includes(searchVal.toLowerCase());
            }
            
            if (match) results.push(data);
        });
        
        // Also search in bookings collection
        const bRef = collection(db, 'bookings');
        const bSnapshot = await getDocs(bRef);
        
        bSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            data._docId = docSnap.id;
            data._source = 'booking';
            let match = false;
            
            if (type === 'bookingId') {
                match = docSnap.id.includes(searchVal) ||
                        (data.bookingId && data.bookingId.includes(searchVal));
            } else if (type === 'phone') {
                match = data.phone && data.phone.includes(searchVal);
            } else if (type === 'email') {
                match = data.userEmail && data.userEmail.toLowerCase().includes(searchVal.toLowerCase());
            }
            
            if (match) results.push(data);
        });
        
        // Render results
        if (results.length === 0) {
            resultsDiv.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: #f87171;">
                    <i class="fas fa-exclamation-circle" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p style="font-size: 16px;">No results found for "${searchVal}"</p>
                </div>
            `;
        } else {
            let html = `<p style="color: #a5b4fc; margin-bottom: 15px; font-weight: 600;"><i class="fas fa-check-circle"></i> Found ${results.length} result(s)</p>`;
            
            results.forEach(r => {
                const gatesMap = {
                    'rathinam_main_gate': 'Rathinam Main Gate',
                    'rathinam_gate1': 'Rathinam Gate 1',
                    'rathinam_gate3': 'Rathinam Gate 3'
                };
                const gate = r.locationId ? (gatesMap[r.locationId] || r.locationId) : 'N/A';
                const bId = r.bookingId || r.qrCode || r._docId || 'N/A';
                
                let entryStr = 'N/A';
                if (r.entryTime?.toDate) entryStr = fmtDate(r.entryTime.toDate());
                else if (r.bookedAt?.toDate) entryStr = fmtDate(r.bookedAt.toDate());
                
                let exitStr = 'N/A';
                if (r.exitTime?.toDate) exitStr = fmtDate(r.exitTime.toDate());
                
                let paymentStr = 'N/A';
                if (r.paymentTime?.toDate) paymentStr = fmtDate(r.paymentTime.toDate());
                
                const amount = r.amount || r.price || 0;
                const status = r.status || (r._source === 'payment' ? 'Completed' : 'Active');
                const statusColor = status === 'Completed' || status === 'completed' ? '#38ef7d' : 
                                   status === 'reserved' ? '#fbbf24' : '#60a5fa';
                
                html += `
                <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 20px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                        <div>
                            <span style="color: #a5b4fc; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Booking ID</span>
                            <p style="color: white; font-size: 16px; font-weight: 700; margin: 4px 0 0; font-family: 'Courier New', monospace;">${bId}</p>
                        </div>
                        <span style="background: ${statusColor}22; color: ${statusColor}; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">${status}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px;">
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Customer</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${r.bookedBy || r.name || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Email</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${r.userEmail || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Phone</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${r.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Vehicle</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${r.vehicleNumber || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Gate & Slot</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${gate}, Slot ${r.slotNumber || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Amount</span>
                            <p style="color: #38bdf8; margin: 2px 0 0; font-weight: 700; font-size: 18px;">₹${amount}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Entry</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${entryStr}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Exit</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${exitStr}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Payment Method</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${r.paymentMethod || 'N/A'}</p>
                        </div>
                        <div>
                            <span style="color: #9ca3af; font-size: 12px;">Payment Time</span>
                            <p style="color: #e0e7ff; margin: 2px 0 0; font-weight: 600;">${paymentStr}</p>
                        </div>
                    </div>
                </div>
                `;
            });
            
            resultsDiv.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #f87171;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                <p>Search failed: ${error.message}</p>
            </div>
        `;
    }
    
    searchBtn.innerHTML = '<i class="fas fa-search"></i> Search';
    searchBtn.disabled = false;
}

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

const VIP_CHECKED = {};

async function ensureVIPSlotsExist(location) {
    if (VIP_CHECKED[location]) return;
    VIP_CHECKED[location] = true;
    
    try {
        for (let i = 1; i <= 5; i++) {
            const vipId = `vip_slot_${i}`;
            const slotRef = doc(db, 'parking_locations', location, 'slots', vipId);
            const snap = await getDoc(slotRef);
            if (!snap.exists()) {
                await setDoc(slotRef, {
                    slotNumber: `VIP-${i}`,
                    status: 'available',
                    isVIP: true,
                    bookedBy: null,
                    phone: null,
                    vehicleType: null,
                    vehicleNumber: null,
                    bookingTime: null
                });
            }
        }
    } catch(err) {
        console.error("VIP slots init error:", err);
    }
}

function loadSlots(location) {
    ensureVIPSlotsExist(location);
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
            const isVipA = a.slotNumber?.toString().startsWith('VIP');
            const isVipB = b.slotNumber?.toString().startsWith('VIP');
            
            if (isVipA && !isVipB) return 1;
            if (!isVipA && isVipB) return -1;
            
            const numA = parseInt(a.slotNumber?.toString().replace('VIP-', '')) || 0;
            const numB = parseInt(b.slotNumber?.toString().replace('VIP-', '')) || 0;
            return numA - numB;
        });

        slots.forEach(slot => {
            const slotDiv = document.createElement('div');
            let status = slot.status || 'available';
            
            // Treat payment_pending as occupied (red)
            if (status === 'payment_pending') {
                status = 'occupied';
            }
            
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

let isScannerOpen = false;

window.stopScanner = async function() {
    if (html5QrCode && isScannerOpen) {
        try {
            await html5QrCode.stop();
        } catch (err) {
            console.error("Failed to stop scanner", err);
        }
    }
    const readerContainer = document.getElementById('reader-container');
    const toggleBtn = document.getElementById('toggleScannerBtn');
    
    if (readerContainer) readerContainer.style.display = 'none';
    if (toggleBtn) {
        toggleBtn.innerHTML = '<i class="fas fa-camera"></i> Open QR Code Scanner';
        toggleBtn.style.background = '#2563eb';
    }
    isScannerOpen = false;
};

window.toggleScanner = async function() {
    if (isScannerOpen) {
        await window.stopScanner();
    } else {
        const readerContainer = document.getElementById('reader-container');
        const toggleBtn = document.getElementById('toggleScannerBtn');
        
        readerContainer.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-times"></i> Close QR Code Scanner';
        toggleBtn.style.background = '#ef4444';

        if (!html5QrCode) {
            html5QrCode = new window.Html5Qrcode("reader");
        }
        
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanError
            );
            isScannerOpen = true;
        } catch (err) {
            console.error("Camera error:", err);
            readerContainer.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-camera"></i> Open QR Code Scanner';
            toggleBtn.style.background = '#2563eb';
            alert("Camera access failed or denied.");
            isScannerOpen = false;
        }
    }
};

function onScanError(errorMessage) {
    // Ignore
}

async function onScanSuccess(decodedText) {
    if (isScanning) return;
    isScanning = true;

    console.log("QR Scanned:", decodedText);
    await window.stopScanner();
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
    const borderColor = success ? '#38bdf8' : '#ef4444';
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
    const statusColor = slot.status === 'available' ? '#38bdf8' :
        slot.status === 'pending' ? '#f59e0b' : 
        slot.status === 'payment_pending' ? '#f59e0b' : '#ef4444';

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

    if (slot.status === 'pending' || slot.status === 'occupied' || slot.status === 'payment_pending') {
        detailsHTML += `
                <p style="margin-bottom: 10px;"><strong>Booked By:</strong> ${slot.bookedBy || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Phone:</strong> ${slot.phone || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Vehicle Type:</strong> ${slot.vehicleType || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Vehicle Number:</strong> ${slot.vehicleNumber || 'N/A'}</p>
                <p style="margin-bottom: 10px;"><strong>Price:</strong> ₹${slot.price || 0}</p>
                <p style="margin-bottom: 10px;"><strong>QR Code:</strong> ${slot.qrCode || 'N/A'}</p>
        `;
        if (slot.entryTime) {
            let entryDate = fmtDate(slot.entryTime.toDate ? slot.entryTime.toDate() : new Date(slot.entryTime));
            detailsHTML += `<p style="margin-bottom: 10px;"><strong>Entry Time:</strong> ${entryDate}</p>`;
        }
    } else if (slot.status === 'available' && slot.exitTime) {
        // Show historical info if needed
        let entryDate = slot.entryTime?.toDate ? fmtDate(slot.entryTime.toDate()) : "N/A";
        let exitDate = slot.exitTime?.toDate ? fmtDate(slot.exitTime.toDate()) : "N/A";
        detailsHTML += `
                <p style="margin-bottom: 10px;"><strong>Last Entry:</strong> ${entryDate}</p>
                <p style="margin-bottom: 10px;"><strong>Last Exit:</strong> ${exitDate}</p>
                <p style="margin-bottom: 10px;"><strong>Last Price:</strong> ₹${slot.price || 0}</p>
        `;
    }

    detailsHTML += `</div>`;

    if (slot.status === 'available' && slot.isVIP) {
        detailsHTML += `
            <button onclick="openAdminBookingModal('${locationId}', '${slot.id}', '${slot.slotNumber}')" 
                style="width: 100%; padding: 12px; background: #2563eb; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 10px;">
                <i class="fas fa-car-side"></i> Book Offline / VIP
            </button>
        `;
    }

    if (slot.status === 'pending') {
        detailsHTML += `
            <button onclick="cancelBooking('${locationId}', '${slot.id}')" 
                style="width: 100%; padding: 12px; background: #ef4444; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 10px;">
                <i class="fas fa-times-circle"></i> Cancel Booking
            </button>
        `;
    } else if (slot.status === 'payment_pending') {
        detailsHTML += `
            <button onclick="resetPaymentPendingSlot('${locationId}', '${slot.id}')" 
                style="width: 100%; padding: 12px; background: #f59e0b; color: white; 
                border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-bottom: 10px;">
                <i class="fas fa-undo"></i> Reset Slot (Clear Payment Pending)
            </button>
        `;
    } else if (slot.status === 'occupied') {
        detailsHTML += `
            <button onclick="processExit('${locationId}', '${slot.id}')" 
                style="width: 100%; padding: 12px; background: #38bdf8; color: white; 
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

window.openAdminBookingModal = function(locationId, slotId, slotNumber) {
    const existingModals = document.querySelectorAll('div[style*="z-index: 3000"]');
    existingModals.forEach(m => m.remove());

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 3500;
    `;
    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%; text-align: left;">
            <h2 style="color: #2563eb; margin-bottom: 20px;"><i class="fas fa-car"></i> VIP / Offline Booking</h2>
            <p style="margin-bottom: 15px; font-weight: bold; color: #374151;">Booking Slot: ${slotNumber}</p>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 600;">Customer Name</label>
                <input type="text" id="adminBookName" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 600;">Phone Number</label>
                <input type="tel" id="adminBookPhone" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 600;">Vehicle Number</label>
                <input type="text" id="adminBookVehicle" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;">
                <small style="display: block; color: #38bdf8; font-weight: bold; margin-top: 8px;">* Per Hour: ₹80</small>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="submitAdminBooking('${locationId}', '${slotId}')" style="flex: 1; padding: 12px; background: #38bdf8; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-check"></i> Book & Start Entry
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: #6b7280; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Cancel
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.submitAdminBooking = async function(locationId, slotId) {
    const name = document.getElementById('adminBookName').value.trim();
    const phone = document.getElementById('adminBookPhone').value.trim();
    const vehicle = document.getElementById('adminBookVehicle').value.trim();
    
    if(!name || !phone || !vehicle) {
        alert('Please fill all fields');
        return;
    }
    
    try {
        const slotRef = doc(db, 'parking_locations', locationId, 'slots', slotId);
        await updateDoc(slotRef, {
            status: 'occupied',
            entryTime: serverTimestamp(),
            occupiedSince: serverTimestamp(),
            bookedBy: name,
            phone: phone,
            vehicleType: 'Car',
            vehicleNumber: vehicle,
            userEmail: 'Admin (VIP)',
            price: 80
        });
        
        const modals = document.querySelectorAll('div[style*="z-index: 3500"]');
        modals.forEach(m => m.remove());
        
        alert('VIP Booking Successful! Entry timer started automatically.');
    } catch(err) {
        console.error(err);
        alert('Error: ' + err.message);
    }
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

        // DON'T update slot to available yet - keep it occupied until payment is done
        await updateDoc(slotRef, {
            exitTime: exitDate,
            price: finalPrice
        });

        // Add to reports collection
        try {
            await addDoc(collection(db, 'reports'), {
                locationId: locationId,
                slotId: slotId,
                slotNumber: slotData.slotNumber || '',
                bookedBy: slotData.bookedBy || 'N/A',
                userEmail: slotData.userEmail || 'N/A',
                phone: slotData.phone || 'N/A',
                vehicleNumber: slotData.vehicleNumber || 'N/A',
                vehicleType: slotData.vehicleType || 'N/A',
                bookingTime: slotData.bookingTime ? new Date(slotData.bookingTime) : null,
                bookingId: slotData.bookingId || slotData.qrCode || '',
                entryTime: entryDate,
                exitTime: exitDate,
                price: finalPrice
            });
        } catch (reportErr) {
            console.error('Error saving report:', reportErr);
        }

        // Close any open modals
        const modals = document.querySelectorAll('div[style*="position: fixed"]');
        modals.forEach(modal => modal.remove());

        // Show receipt with payment options
        const receiptModal = document.createElement('div');
        receiptModal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 4000;
        `;
        const userDisplay = slotData.userEmail && slotData.userEmail !== 'Guest' ? slotData.userEmail : (slotData.bookedBy || 'N/A');
        receiptModal.innerHTML = `
            <div class="modal-content" style="text-align: center; background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                <h2 style="color: #38bdf8; margin-bottom: 20px;"><i class="fas fa-check-circle"></i> Parking Completed</h2>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: left;">
                    <p style="margin-bottom: 5px;"><strong>User Email:</strong> ${userDisplay}</p>
                    <p style="margin-bottom: 5px;"><strong>Entry Time:</strong> ${fmtDate(entryDate)}</p>
                    <p style="margin-bottom: 5px;"><strong>Exit Time:</strong> ${fmtDate(exitDate)}</p>
                    <p style="margin-bottom: 5px;"><strong>Total Minutes:</strong> ${totalMinutes} Min(s)</p>
                    <p style="margin-bottom: 0;"><strong>Amount to Pay:</strong> <span style="font-size: 20px; color: #ef4444; font-weight: bold;">₹${finalPrice}</span></p>
                </div>
                <div id="paymentButtons" style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button id="payOnlineBtn" style="flex: 1; padding: 12px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-credit-card"></i> Pay Online
                    </button>
                    <button id="cashBtn" style="flex: 1; padding: 12px; background: #38bdf8; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-money-bill-wave"></i> Cash
                    </button>
                </div>
                <div id="onlinePaymentSection" style="display: none; background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; text-align: center;">
                    <h3 style="color: #38bdf8; margin-bottom: 20px; font-size: 18px; font-weight: 600;">Scan QR Code to Pay</h3>
                    <div id="paymentQRCode" style="display: flex; justify-content: center; margin-bottom: 20px;"></div>
                    <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Amount: <strong style="color: #ef4444; font-size: 20px;">₹${finalPrice}</strong></p>
                    <button id="payByCustomerBtn" style="width: 100%; padding: 14px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px; margin-bottom: 10px;">
                        <i class="fas fa-user"></i> Pay by Customer
                    </button>
                    <button id="onlinePaidBtn" style="width: 100%; padding: 14px; background: #38bdf8; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                        <i class="fas fa-check"></i> Paid
                    </button>
                </div>
                <div id="cashPaymentSection" style="display: none; background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 600;">Amount to Pay:</label>
                        <div style="font-size: 24px; color: #ef4444; font-weight: bold;">₹${finalPrice}</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; color: #374151; font-weight: 600;">Cash Given by Customer:</label>
                        <input type="number" id="cashGivenInput" placeholder="Enter amount" style="width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 16px; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 15px; padding: 10px; background: #dbeafe; border-radius: 6px;">
                        <label style="display: block; margin-bottom: 5px; color: #1e40af; font-weight: 600;">Remaining Amount to Return:</label>
                        <div id="remainingAmount" style="font-size: 22px; color: #1e40af; font-weight: bold;">₹0</div>
                    </div>
                    <button id="cashPaidBtn" style="width: 100%; padding: 12px; background: #38bdf8; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-check"></i> Paid
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(receiptModal);

        // Handle Pay Online button
        const payOnlineBtn = receiptModal.querySelector('#payOnlineBtn');
        const onlinePaymentSection = receiptModal.querySelector('#onlinePaymentSection');
        
        payOnlineBtn.addEventListener('click', () => {
            const paymentButtons = receiptModal.querySelector('#paymentButtons');
            paymentButtons.style.display = 'none';
            onlinePaymentSection.style.display = 'block';
            
            // Generate QR code for payment with UPI payment link format
            const upiPaymentString = `upi://pay?pa=koushik4680@oksbi&pn=SmartMetroParking&am=${finalPrice}&cu=INR&tn=Parking-${slotId}`;
            
            // Clear previous QR code if any
            const qrContainer = receiptModal.querySelector('#paymentQRCode');
            qrContainer.innerHTML = '';
            
            // Check if QRCode library is loaded
            if (typeof QRCode !== 'undefined') {
                // Generate QR code using QRCode.js
                new QRCode(qrContainer, {
                    text: upiPaymentString,
                    width: 250,
                    height: 250,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            } else {
                // Fallback: show payment data as text
                qrContainer.innerHTML = `<div style="padding: 20px; background: #fee2e2; border-radius: 8px; color: #991b1b;">
                    <p style="margin: 0; font-size: 14px;">QR Code library not loaded. Payment ID: ${slotId}</p>
                </div>`;
                console.error('QRCode library not loaded');
            }
        });
        
        // Handle Online Paid button
        const onlinePaidBtn = receiptModal.querySelector('#onlinePaidBtn');
        onlinePaidBtn.addEventListener('click', async () => {
            try {
                // Save transaction to reports with payment info
                await addDoc(collection(db, 'payment_transactions'), {
                    locationId: locationId,
                    slotId: slotId,
                    slotNumber: slotData.slotNumber || '',
                    bookedBy: slotData.bookedBy || 'N/A',
                    userEmail: slotData.userEmail || 'N/A',
                    phone: slotData.phone || 'N/A',
                    vehicleNumber: slotData.vehicleNumber || 'N/A',
                    amount: finalPrice,
                    bookingId: slotData.bookingId || slotData.qrCode || '',
                    paymentMethod: 'online',
                    paymentTime: serverTimestamp(),
                    exitTime: exitDate
                });

                // NOW clear the slot and make it available
                await updateDoc(slotRef, {
                    status: 'available',
                    bookedBy: null,
                    phone: null,
                    vehicleType: null,
                    vehicleNumber: null,
                    qrCode: null,
                    bookingId: null,
                    entryTime: null,
                    userEmail: null
                });

                receiptModal.remove();
                isScanning = false;
                alert('Payment completed successfully!');
            } catch (error) {
                console.error('Error saving payment:', error);
                alert('Failed to save payment: ' + error.message);
            }
        });
        
        // Handle Pay by Customer button
        const payByCustomerBtn = receiptModal.querySelector('#payByCustomerBtn');
        payByCustomerBtn.addEventListener('click', async () => {
            try {
                // Update slot status to payment_pending
                await updateDoc(slotRef, {
                    status: 'payment_pending',
                    paymentPending: true
                });
                
                // Create a payment request for the customer
                const paymentRequestRef = collection(db, 'payment_requests');
                const paymentRequestDoc = await addDoc(paymentRequestRef, {
                    locationId: locationId,
                    slotId: slotId,
                    slotNumber: slotData.slotNumber || '',
                    bookedBy: slotData.bookedBy || 'N/A',
                    userEmail: slotData.userEmail || 'N/A',
                    phone: slotData.phone || 'N/A',
                    vehicleNumber: slotData.vehicleNumber || 'N/A',
                    amount: finalPrice,
                    bookingId: slotData.bookingId || slotData.qrCode || '',
                    status: 'pending',
                    requestTime: serverTimestamp(),
                    exitTime: exitDate,
                    entryTime: entryDate
                });

                // Hide payment buttons and show waiting message
                paymentButtons.style.display = 'none';
                onlinePaymentSection.style.display = 'none';
                
                const waitingSection = document.createElement('div');
                waitingSection.id = 'waitingSection';
                waitingSection.style.cssText = 'background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;';
                waitingSection.innerHTML = `
                    <div style="margin-bottom: 15px;">
                        <i class="fas fa-clock" style="font-size: 48px; color: #f59e0b;"></i>
                    </div>
                    <h3 style="color: #92400e; margin-bottom: 10px;">Waiting for Customer Payment</h3>
                    <p style="color: #78350f; margin-bottom: 15px;">Payment request sent to ${userDisplay}</p>
                    <p style="color: #78350f; font-size: 14px;">This popup will close automatically when payment is completed.</p>
                `;
                
                receiptModal.querySelector('.modal-content').appendChild(waitingSection);
                
                // Listen for payment completion
                const unsubscribe = onSnapshot(doc(db, 'payment_requests', paymentRequestDoc.id), async (docSnap) => {
                    if (docSnap.exists() && docSnap.data().status === 'completed') {
                        unsubscribe();
                        
                        // Update slot to available
                        await updateDoc(slotRef, {
                            status: 'available',
                            paymentPending: false,
                            bookedBy: null,
                            phone: null,
                            vehicleType: null,
                            vehicleNumber: null,
                            qrCode: null,
                            bookingId: null,
                            entryTime: null
                        });
                        
                        receiptModal.remove();
                        isScanning = false;
                        alert('Payment completed by customer!');
                    }
                });
                
            } catch (error) {
                console.error('Error creating payment request:', error);
                alert('Failed to send payment request: ' + error.message);
            }
        });

        // Handle Cash button
        const cashBtn = receiptModal.querySelector('#cashBtn');
        const cashPaymentSection = receiptModal.querySelector('#cashPaymentSection');
        const paymentButtons = receiptModal.querySelector('#paymentButtons');
        
        cashBtn.addEventListener('click', () => {
            paymentButtons.style.display = 'none';
            cashPaymentSection.style.display = 'block';
        });

        // Handle cash input and calculate remaining amount
        const cashGivenInput = receiptModal.querySelector('#cashGivenInput');
        const remainingAmount = receiptModal.querySelector('#remainingAmount');
        
        cashGivenInput.addEventListener('input', () => {
            const cashGiven = parseFloat(cashGivenInput.value) || 0;
            const remaining = cashGiven - finalPrice;
            remainingAmount.textContent = `₹${remaining >= 0 ? remaining : 0}`;
            remainingAmount.style.color = remaining >= 0 ? '#1e40af' : '#ef4444';
        });

        // Handle Cash Paid button
        const cashPaidBtn = receiptModal.querySelector('#cashPaidBtn');
        cashPaidBtn.addEventListener('click', async () => {
            const cashGiven = parseFloat(cashGivenInput.value) || 0;
            
            if (cashGiven < finalPrice) {
                alert('Cash given is less than the amount to pay!');
                return;
            }

            try {
                // Save transaction to reports with payment info
                await addDoc(collection(db, 'payment_transactions'), {
                    locationId: locationId,
                    slotId: slotId,
                    slotNumber: slotData.slotNumber || '',
                    bookedBy: slotData.bookedBy || 'N/A',
                    userEmail: slotData.userEmail || 'N/A',
                    phone: slotData.phone || 'N/A',
                    vehicleNumber: slotData.vehicleNumber || 'N/A',
                    amount: finalPrice,
                    cashGiven: cashGiven,
                    changeReturned: cashGiven - finalPrice,
                    bookingId: slotData.bookingId || slotData.qrCode || '',
                    paymentMethod: 'cash',
                    paymentTime: serverTimestamp(),
                    exitTime: exitDate
                });

                // NOW clear the slot and make it available
                await updateDoc(slotRef, {
                    status: 'available',
                    bookedBy: null,
                    phone: null,
                    vehicleType: null,
                    vehicleNumber: null,
                    qrCode: null,
                    bookingId: null,
                    entryTime: null,
                    userEmail: null
                });

                receiptModal.remove();
                isScanning = false;
                alert('Payment completed successfully!');
            } catch (error) {
                console.error('Error saving payment:', error);
                alert('Failed to save payment: ' + error.message);
            }
        });

    } catch (error) {
        console.error("Exit error:", error);
        alert('Failed to process exit: ' + error.message);
        isScanning = false;
    }
};

async function filterData() {
    const reportTable = document.getElementById("reportTable");
    const btn = document.getElementById('showReportBtn');

    if (btn.innerText.trim().includes('Hide Report')) {
        reportTable.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-list"></i> Show Report';
        return;
    }

    const fromVal = document.getElementById('reportFrom').value;
    const toVal = document.getElementById('reportTo').value;

    if (!fromVal || !toVal) {
        alert('Please select both From and To dates and times.');
        return;
    }

    const fromDate = new Date(fromVal);
    const toDate = new Date(toVal);

    if (fromDate > toDate) {
        alert('From date cannot be after To date.');
        return;
    }

    try {
        const btn = document.getElementById('showReportBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        btn.disabled = true;

        // Fetch reports
        const reportsRef = collection(db, 'reports');
        const querySnapshot = await getDocs(reportsRef);
        
        // Fetch payment transactions
        const paymentsRef = collection(db, 'payment_transactions');
        const paymentsSnapshot = await getDocs(paymentsRef);
        
        // Create a map of slotId -> { paymentMethod, bookingId }
        const paymentMethodMap = {};
        paymentsSnapshot.forEach(doc => {
            const payment = doc.data();
            if (payment.slotId) {
                paymentMethodMap[payment.slotId] = {
                    method: payment.paymentMethod || 'N/A',
                    bookingId: payment.bookingId || payment.qrCode || ''
                };
            }
        });
        
        const reportTable = document.getElementById("reportTable");
        const tableBody = document.getElementById("tableBody");
        tableBody.innerHTML = '';
        
        let hasData = false;
        let reportData = [];

        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            // Check if exit time falls within range
            let reportDate = null;
            if (data.exitTime && data.exitTime.toDate) {
                reportDate = data.exitTime.toDate();
            } else if (data.exitTime) {
                reportDate = new Date(data.exitTime);
            }

            if (reportDate && reportDate >= fromDate && reportDate <= toDate) {
                hasData = true;
                let entryDateObj = data.entryTime?.toDate ? data.entryTime.toDate() : 
                                   (data.entryTime ? new Date(data.entryTime) : null);
                
                reportData.push({
                    data: data,
                    reportDate: reportDate,
                    entryDateObj: entryDateObj
                });
            }
        });

        // Sort ascending by entry time
        reportData.sort((a, b) => {
            if (!a.entryDateObj && !b.entryDateObj) return 0;
            if (!a.entryDateObj) return 1; // Put ones without entry time at the end
            if (!b.entryDateObj) return -1;
            return a.entryDateObj - b.entryDateObj;
        });

        reportData.forEach(item => {
            const data = item.data;
            const reportDate = item.reportDate;
            const entryDateObj = item.entryDateObj;

            const formatOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
            let entryDate = entryDateObj ? fmtDate(entryDateObj) : 'N/A';
            let exitD = fmtDate(reportDate);
            
            let locationName = 'N/A';
            if (data.locationId === 'rathinam_main_gate') locationName = 'Rathinam Main Gate';
            else if (data.locationId === 'rathinam_gate1') locationName = 'Gate 1';
            else if (data.locationId === 'rathinam_gate3') locationName = 'Gate 3';

            // Get payment info from map
            const paymentInfo = paymentMethodMap[data.slotId] || {};
            const paymentMethod = paymentInfo.method || 'N/A';
            const methodColor = paymentMethod === 'online' ? '#2563eb' : paymentMethod === 'cash' ? '#38bdf8' : '#6b7280';
            const methodText = paymentMethod === 'online' ? 'Online' : paymentMethod === 'cash' ? 'Cash' : 'N/A';

            // Get bookingId from report data first, then fallback to payment map
            const reportBookingId = data.bookingId || data.qrCode || paymentInfo.bookingId || 'N/A';

            let row = `
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; font-family: 'Courier New', monospace; font-size: 12px;">${reportBookingId}</td>
                <td style="padding: 12px;">${locationName}</td>
                <td style="padding: 12px;">${data.bookedBy || 'N/A'}</td>
                <td style="padding: 12px;">${data.userEmail || 'N/A'}</td>
                <td style="padding: 12px;">${data.phone || 'N/A'}</td>
                <td style="padding: 12px;">${data.vehicleNumber || 'N/A'}</td>
                <td style="padding: 12px;">${entryDate}</td>
                <td style="padding: 12px;">${exitD}</td>
                <td style="padding: 12px;">${data.slotNumber || 'N/A'}</td>
                <td style="padding: 12px; color: #38bdf8; font-weight: bold;">₹${data.price || 0}</td>
                <td style="padding: 12px; color: ${methodColor}; font-weight: bold;">${methodText}</td>
            </tr>
            `;

            tableBody.innerHTML += row;
        });

        if (!hasData) {
            alert('No records found for the selected date range.');
            reportTable.style.display = 'none';
            btn.innerHTML = '<i class="fas fa-list"></i> Show Report';
        } else {
            reportTable.style.display = 'table';
            btn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Report';
        }

        btn.disabled = false;

    } catch (error) {
        console.error('Error fetching data:', error);
        alert('Failed to load report: ' + error.message);
        const btn = document.getElementById('showReportBtn');
        btn.innerHTML = '<i class="fas fa-list"></i> Show Report';
        btn.disabled = false;
    }
}

function exportExcel() {
    let table = document.getElementById("reportTable");
    
    if (!table || table.style.display === 'none') {
        alert('Please generate the report first by clicking "Show Report".');
        return;
    }

    try {
        let workbook = window.XLSX.utils.table_to_book(table, {sheet: "Parking Report"});
        window.XLSX.writeFile(workbook, "Parking_Report.xlsx");
    } catch (error) {
        console.error('Error exporting to excel:', error);
        alert('Failed to export: ' + error.message);
    }
}

// Reset payment_pending slot to available
window.resetPaymentPendingSlot = async function(locationId, slotId) {
    if (!confirm('Are you sure you want to reset this slot? This will clear the payment pending status and make the slot available again.')) {
        return;
    }

    try {
        const slotRef = doc(db, 'parking_locations', locationId, 'slots', slotId);
        
        // Update slot to available and clear all booking data
        await updateDoc(slotRef, {
            status: 'available',
            paymentPending: false,
            bookedBy: null,
            phone: null,
            vehicleType: null,
            vehicleNumber: null,
            qrCode: null,
            bookingId: null,
            entryTime: null,
            userEmail: null,
            price: null
        });

        // Cancel any pending payment requests for this slot
        const paymentRequestsRef = collection(db, 'payment_requests');
        const q = query(paymentRequestsRef, 
            where('slotId', '==', slotId),
            where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (docSnap) => {
            await updateDoc(doc(db, 'payment_requests', docSnap.id), {
                status: 'cancelled'
            });
        });

        alert('Slot reset successfully! The slot is now available.');

        // Close modal
        const modals = document.querySelectorAll('div[style*="position: fixed"]');
        modals.forEach(modal => modal.remove());

    } catch (error) {
        console.error('Error resetting slot:', error);
        alert('Failed to reset slot: ' + error.message);
    }
};

// Global function to switch tabs in Admin Dashboard
window.switchAdminTab = function(tabId) {
    // Hide all dashboard sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all bottom nav items
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show the targeted section
    const targetSection = document.getElementById(`tab-${tabId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Highlight the targeted nav item
    const targetNav = document.getElementById(`nav-${tabId}`);
    if (targetNav) {
        targetNav.classList.add('active');
    }
};
