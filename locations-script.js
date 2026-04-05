import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    limit
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

const ADMIN_EMAIL = "koushik4680@gmail.com";
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        document.getElementById('userEmail').textContent = user.email;

        // Check if admin
        if (user.email === ADMIN_EMAIL) {
            window.location.href = 'admin-dashboard.html';
            return;
        }

        // Initialize profile
        updateProfileUI();
        loadHistory();
        loadMyActiveBooking();
    });

    // Logout buttons
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });

    document.getElementById('profileLogoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
});

// ===== Location Selection =====
window.selectLocation = function (locationId, locationName) {
    localStorage.setItem('selectedLocation', locationId);
    localStorage.setItem('selectedLocationName', locationName);
    window.location.href = 'slots-dashboard.html';
};

// ===== Direction Functions =====
window.openMainGate = function () {
    window.open("https://maps.app.goo.gl/6yWRXfrPBx8Jo5vx8", "_blank");
};

window.openGate1 = function () {
    window.open("https://maps.app.goo.gl/KCVUfQeW38kZcfmm8", "_blank");
};

window.openGate3 = function () {
    window.open("https://maps.app.goo.gl/eWwEB45cqHszhrJB8", "_blank");
};

// ===== Tab Switching =====
window.switchTab = function (tabName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`${tabName}-section`).classList.add('active');

    // Set active nav item
    document.getElementById(`nav-${tabName}`).classList.add('active');

    // Refresh data when switching
    if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'booking') {
        loadMyActiveBooking();
    } else if (tabName === 'profile') {
        updateProfileUI();
        loadHistory(); // to update stats
    }
};

// ===== Reservation Timer =====
let bookingTimerInterval = null;

function clearBookingTimer() {
    if (bookingTimerInterval) {
        clearInterval(bookingTimerInterval);
        bookingTimerInterval = null;
    }
}

function startBookingTimer(bookingTime) {
    clearBookingTimer();
    const RESERVATION_DURATION = 1800000; // 30 minutes

    function updateTimer() {
        const now = Date.now();
        const elapsed = now - bookingTime;
        const remaining = RESERVATION_DURATION - elapsed;

        const digitsEl = document.getElementById('bookingTimerDigits');
        const progressEl = document.getElementById('bookingTimerProgress');
        if (!digitsEl || !progressEl) {
            clearBookingTimer();
            return;
        }

        if (remaining <= 0) {
            digitsEl.textContent = '00 : 00';
            digitsEl.classList.add('expired');
            progressEl.style.width = '0%';
            progressEl.classList.add('low');
            clearBookingTimer();
            // Refresh booking after expiry
            setTimeout(() => loadMyActiveBooking(), 2000);
            return;
        }

        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        const mStr = String(mins).padStart(2, '0');
        const sStr = String(secs).padStart(2, '0');
        digitsEl.textContent = `${mStr} : ${sStr}`;

        const pct = (remaining / RESERVATION_DURATION) * 100;
        progressEl.style.width = `${pct}%`;

        if (pct < 20) {
            digitsEl.classList.add('expired');
            progressEl.classList.add('low');
        } else {
            digitsEl.classList.remove('expired');
            progressEl.classList.remove('low');
        }
    }

    updateTimer();
    bookingTimerInterval = setInterval(updateTimer, 1000);
}

// ===== Load My Active Booking =====
async function loadMyActiveBooking() {
    const container = document.getElementById('myBookingContent');
    if (!currentUser) return;

    clearBookingTimer();

    try {
        let activeBooking = null;
        const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];

        for (const loc of locations) {
            const slotsRef = collection(db, 'parking_locations', loc, 'slots');
            const q = query(slotsRef, where('userEmail', '==', currentUser.email), limit(1));
            const querySnapshot = await getDocs(q);

            querySnapshot.forEach(docSnap => {
                const data = docSnap.data();
                if (data.status === 'pending' || data.status === 'occupied') {
                    activeBooking = { id: docSnap.id, locationId: loc, ...data };
                }
            });
            if (activeBooking) break;
        }

        if (activeBooking) {
            let locName = activeBooking.locationId;
            if (locName === 'rathinam_main_gate') locName = 'Rathinam Main Gate';
            else if (locName === 'rathinam_gate1') locName = 'Rathinam Gate 1';
            else if (locName === 'rathinam_gate3') locName = 'Rathinam Gate 3';

            const qrCodeId = activeBooking.qrCode || activeBooking.bookingId || '';

            // Build reservation timer HTML (only for pending status with bookingTime)
            let timerHTML = '';
            if (activeBooking.status === 'pending' && activeBooking.bookingTime) {
                timerHTML = `
                    <div class="reservation-timer-section">
                        <div class="reservation-timer-label">RESERVATION TIMER</div>
                        <div class="reservation-timer-card">
                            <div class="timer-digits" id="bookingTimerDigits">-- : --</div>
                            <div class="timer-progress-container">
                                <div class="timer-progress-bar" id="bookingTimerProgress" style="width: 100%;"></div>
                            </div>
                            <div class="timer-hint">Slot auto-releases at expiry<span>·</span>5-min cooldown follows</div>
                        </div>
                    </div>
                `;
            }

            // Build status badge
            let statusBadge = '';
            if (activeBooking.status === 'pending') {
                statusBadge = `<span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;"><i class="fas fa-hourglass-half"></i> RESERVED</span>`;
            } else if (activeBooking.status === 'occupied') {
                statusBadge = `<span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); color: #22c55e; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;"><i class="fas fa-car"></i> CHECKED IN</span>`;
            }

            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 30px 25px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; text-align: left;">
                        <div>
                            <h2 style="color: #1e1b4b; margin-bottom: 4px; font-size: 22px; font-weight: 800; font-family: 'Courier New', monospace;">Slot ${activeBooking.slotNumber}</h2>
                            <p style="color: #6b7280; font-size: 13px;">${locName}</p>
                        </div>
                        ${statusBadge}
                    </div>

                    ${timerHTML}

                    <div style="background: linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%); border: 1px solid rgba(124,58,237,0.08); padding: 25px 20px; border-radius: 14px; margin-bottom: 20px;">
                        <p style="font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #7c3aed; margin-bottom: 15px;">QR ENTRY / EXIT PASS</p>
                        <div id="bookingQrCode" style="display: flex; justify-content: center; margin: 0 auto 15px;"></div>
                        <p style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">Show to admin at gate<span style="margin: 0 4px;">·</span>Billing starts on entry scan</p>
                        <p style="font-size: 12px; color: #d1d5db; font-family: monospace; word-break: break-all;">${qrCodeId.substring(0, 16)}${qrCodeId.length > 16 ? '...' : ''}</p>
                    </div>

                    <div style="background: linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%); padding: 20px; border-radius: 12px; border: 1px solid rgba(124,58,237,0.08); text-align: left;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                            <div>
                                <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Name</p>
                                <p style="font-size: 14px; color: #1e1b4b; font-weight: 600;">${activeBooking.bookedBy || 'N/A'}</p>
                            </div>
                            <div>
                                <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Vehicle</p>
                                <p style="font-size: 14px; color: #1e1b4b; font-weight: 600;">${activeBooking.vehicleNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Location</p>
                                <p style="font-size: 14px; color: #1e1b4b; font-weight: 600;">${locName}</p>
                            </div>
                            <div>
                                <p style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Slot</p>
                                <p style="font-size: 14px; color: #1e1b4b; font-weight: 600;">${activeBooking.slotNumber}</p>
                            </div>
                        </div>
                    </div>

                    <button onclick="window.selectLocation('${activeBooking.locationId}', '${locName}')" class="btn-primary-action" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-eye"></i> View Slot Dashboard
                    </button>

                    <div id="payBtnContainer"></div>
                </div>
            `;

            // Generate QR code
            setTimeout(() => {
                const qrContainer = document.getElementById('bookingQrCode');
                if (qrContainer && qrCodeId) {
                    qrContainer.innerHTML = '';
                    new QRCode(qrContainer, {
                        text: qrCodeId,
                        width: 200,
                        height: 200,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            }, 100);

            if (activeBooking.status === 'pending' && activeBooking.bookingTime) {
                setTimeout(() => startBookingTimer(activeBooking.bookingTime), 150);
            }

            if (activeBooking.bookingId) {
                checkPaymentEnabled(activeBooking.bookingId);
            }
        } else {
            container.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; color: #e8eaeeff;">
                    <i class="fas fa-car" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p>You don't have any active bookings.</p>
                    <button class="btn-primary-action" style="margin-top: 20px;" onclick="switchTab('slots')">Book Now</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading active booking:', error);
    }
}

// ===== Load Booking History =====
let historyLastFetched = 0;
async function loadHistory(force = false) {
    const historyList = document.getElementById('historyList');
    if (!currentUser) return;

    // Cache for 60 seconds
    if (!force && Date.now() - historyLastFetched < 60000) return;
    historyLastFetched = Date.now();

    try {
        const historyRef = collection(db, 'payment_transactions');
        const q = query(historyRef, where('userEmail', '==', currentUser.email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            historyList.innerHTML = `
                <div style="text-align: center; padding: 50px 20px; color: #ffffffff;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                    <p>No history found.</p>
                </div>
            `;
            return;
        }

        let html = '';
        let totalSpent = 0;
        let sessionCount = 0;

        const transactions = [];
        querySnapshot.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            transactions.push(data);
            totalSpent += (data.amount || 0);
            sessionCount++;
        });

        // Sort by time (newest first)
        transactions.sort((a, b) => {
            const timeA = a.paymentTime?.toMillis ? a.paymentTime.toMillis() : 0;
            const timeB = b.paymentTime?.toMillis ? b.paymentTime.toMillis() : 0;
            return timeB - timeA;
        });

        transactions.forEach((data, index) => {
            let date = 'N/A';
            if (data.paymentTime?.toDate) {
                const d = data.paymentTime.toDate();
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yy = String(d.getFullYear()).slice(-2);
                date = `${dd}/${mm}/${yy}`;
            }
            const price = data.amount || 0;
            const slot = data.slotNumber || 'N/A';

            html += `
                <div class="card history-item">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 40px; height: 40px; background: #eff6ff; color: #3b82f6; border-radius: 8px; display: flex; justify-content: center; align-items: center; font-weight: bold;">
                            P
                        </div>
                        <div style="text-align: left;">
                            <h4 style="margin: 0; font-size: 16px; color: #1e1b4b;">Slot ${slot}</h4>
                            <p style="margin: 0; color: #6b7280; font-size: 12px;">${date}</p>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <span style="font-weight: 700; color: #f59e0b; font-size: 16px;">₹${price}</span>
                        <button class="view-receipt-btn" data-index="${index}" style="background: rgba(124, 58, 237, 0.1); color: #7c3aed; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s;">
                            View Receipt
                        </button>
                    </div>
                </div>
            `;
        });

        historyList.innerHTML = html;

        // Add click listeners to View Receipt buttons
        const viewBtns = historyList.querySelectorAll('.view-receipt-btn');
        viewBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = btn.getAttribute('data-index');
                window.showReceipt(transactions[idx]);
            });
        });

        // Update profile stats
        const totalSessionsEl = document.getElementById('totalSessions');
        const totalSpentEl = document.getElementById('totalSpent');
        if (totalSessionsEl) totalSessionsEl.textContent = sessionCount;
        if (totalSpentEl) totalSpentEl.textContent = `₹${totalSpent}`;

    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// ===== Display Receipt Modal =====
window.showReceipt = function (data) {
    if (!data) return;

    const pDateObj = data.paymentTime?.toDate ? data.paymentTime.toDate() : new Date();
    let eDateObj = data.entryTime?.toDate ? data.entryTime.toDate() : null;
    let exDateObj = data.exitTime?.toDate ? data.exitTime.toDate() : pDateObj;

    if (!eDateObj) {
        let mins = data.amount ? Math.round((data.amount / 80) * 60) : 60;
        eDateObj = new Date(exDateObj.getTime() - mins * 60000);
    }

    const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fmtDate = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
    };

    const entryStr = fmtTime(eDateObj);
    const exitStr = fmtTime(exDateObj);
    const durationMins = Math.max(1, Math.round((exDateObj - eDateObj) / 60000));
    const fallbackId = eDateObj ? eDateObj.getTime().toString() : pDateObj.getTime().toString();
    const bId = data.bookingId || data.qrCode || fallbackId;

    const gatesMap = {
        'rathinam_main_gate': 'Rathinam Main Gate',
        'rathinam_gate1': 'Rathinam Gate 1',
        'rathinam_gate3': 'Rathinam Gate 3'
    };
    const gateName = data.locationId ? (gatesMap[data.locationId] || data.locationId) : 'N/A';

    const modal = document.createElement('div');
    modal.className = 'receipt-modal-wrapper';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.75); display: flex; justify-content: center; align-items: center; z-index: 5000;
        backdrop-filter: blur(4px); padding: 20px;
    `;

    modal.innerHTML = `
        <div class="card" style="width: 100%; max-width: 380px; background: white; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); position: relative; overflow: hidden; margin: 0; padding: 0;">
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 35px 25px 25px; text-align: center; border-bottom: 2px dashed #bfdbfe;">
                <div style="width: 50px; height: 50px; background: #3b82f6; color: white; border-radius: 12px; display: flex; justify-content: center; align-items: center; font-size: 24px; font-weight: bold; margin: 0 auto 15px; box-shadow: 0 4px 15px rgba(59,130,246,0.3);">
                    P
                </div>
                <h2 style="margin: 0 0 5px; color: #1e3a8a; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">FastPark Receipt</h2>
                <p style="margin: 0; color: #60a5fa; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Smart Metro Parking</p>
            </div>
            <div style="padding: 25px 30px 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Booking ID</span>
                    <span style="color: #111827; font-size: 12px; font-weight: 600; font-family: 'Courier New', monospace;">${bId}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Date</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 600;">${fmtDate(eDateObj)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Location</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${gateName}, Slot ${data.slotNumber || 'N/A'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Entry</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 600;">${entryStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Exit</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 600;">${exitStr}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f3f4f6;">
                    <span style="color: #6b7280; font-size: 14px;">Duration</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 600;">${durationMins} min</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #e5e7eb;">
                    <span style="color: #6b7280; font-size: 14px;">Rate</span>
                    <span style="color: #111827; font-size: 14px; font-weight: 600;">&#8377;80/hr</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="color: #f59e0b; font-size: 16px; font-weight: 800; letter-spacing: 1px;">TOTAL PAID</span>
                    <span style="color: #f59e0b; font-size: 28px; font-weight: 900;">&#8377;${data.amount || 0}</span>
                </div>
            </div>
            <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0 0 15px; color: #94a3b8; font-size: 12px; line-height: 1.6;">
                    ${fmtDate(pDateObj)}, ${fmtTime(pDateObj)} · Thank you for using FastPark!<br>
                    <a href="https://fastpark.online" target="_blank" style="color: #3b82f6; font-weight: 700; text-decoration: none; font-size: 13px;">&#127760; fastpark.online</a>
                </p>
                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                    <button id="saveReceiptBtn" style="flex: 2; padding: 14px; background: #f59e0b; color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
                        &#8595; Save Receipt
                    </button>
                    <button id="closeReceiptBtn" style="flex: 1; padding: 14px; background: white; color: #1e293b; border: 1px solid #cbd5e1; border-radius: 10px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s;">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    modal.querySelector('#closeReceiptBtn').addEventListener('click', () => {
        modal.remove();
    });

    modal.querySelector('#saveReceiptBtn').addEventListener('click', () => {
        const btn = modal.querySelector('#saveReceiptBtn');
        const closeBtn = modal.querySelector('#closeReceiptBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = "Saving...";
        closeBtn.style.display = 'none';

        setTimeout(() => {
            window.print();
            btn.innerHTML = originalText;
            closeBtn.style.display = 'block';
        }, 500);
    });

};

// ===== Update Profile UI =====
function updateProfileUI() {
    if (!currentUser) return;

    const email = currentUser.email;
    const namePart = email.split('@')[0];
    const displayName = namePart.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const initials = displayName.substring(0, 2).toUpperCase();

    document.getElementById('profileName').textContent = displayName;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('profileAvatar').textContent = initials;

    if (currentUser.metadata && currentUser.metadata.creationTime) {
        const creationDate = new Date(currentUser.metadata.creationTime);
        const dd = String(creationDate.getDate()).padStart(2, '0');
        const mm = String(creationDate.getMonth() + 1).padStart(2, '0');
        const yy = String(creationDate.getFullYear()).slice(-2);
        document.getElementById('memberSince').textContent = `${dd}/${mm}/${yy}`;
    }
}

// ===== Send Receipt to Email =====
async function sendReceiptToEmail(receiptData, modal) {
    if (!currentUser || !currentUser.email) {
        alert('Please log in to send email receipt.');
        return;
    }

    const emailBtn = modal ? modal.querySelector('#emailReceiptBtn') : null;
    if (emailBtn) {
        emailBtn.disabled = true;
        emailBtn.innerHTML = '<span style="margin-right: 6px;">&#9203;</span> Sending...';
        emailBtn.style.opacity = '0.7';
    }

    try {
        let qrImageBase64 = null;

        const bookingQrContainer = document.getElementById('bookingQrCode');
        if (bookingQrContainer) {
            const canvas = bookingQrContainer.querySelector('canvas');
            if (canvas) {
                qrImageBase64 = canvas.toDataURL('image/png');
            } else {
                const img = bookingQrContainer.querySelector('img');
                if (img && img.src) {
                    qrImageBase64 = img.src;
                }
            }
        }

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
                to: currentUser.email,
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
            if (emailBtn) {
                emailBtn.innerHTML = '<span style="margin-right: 6px;">&#9989;</span> Email Sent!';
                emailBtn.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                emailBtn.style.opacity = '1';
                setTimeout(() => {
                    emailBtn.innerHTML = '<span style="margin-right: 6px;">&#128231;</span> Email Receipt';
                    emailBtn.style.background = 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)';
                    emailBtn.disabled = false;
                }, 3000);
            }
        } else {
            throw new Error(result.error || 'Failed to send email');
        }

    } catch (error) {
        console.error('Email send error:', error);
        if (emailBtn) {
            emailBtn.innerHTML = '<span style="margin-right: 6px;">&#10060;</span> Failed - Retry';
            emailBtn.style.background = '#ef4444';
            emailBtn.style.opacity = '1';
            emailBtn.disabled = false;
            setTimeout(() => {
                emailBtn.innerHTML = '<span style="margin-right: 6px;">&#128231;</span> Email Receipt';
                emailBtn.style.background = 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)';
            }, 3000);
        }
        alert('Failed to send receipt email. Please try again later.');
    }
}

async function checkPaymentEnabled(bookingId) {
    try {
        const bookingRef = doc(db, 'bookings', bookingId)
        const bookingSnap = await getDoc(bookingRef)

        if (!bookingSnap.exists()) return

        const booking = bookingSnap.data()
        const container = document.getElementById('payBtnContainer')
        if (!container) return

        if (booking.status === 'paid') {
            container.innerHTML = '<div class="payment-success-badge" style="width: 100%; justify-content: center; margin-top: 20px; padding: 12px;"><i class="fas fa-check-circle"></i> PAYMENT COMPLETED</div>'
            return
        }

        if (booking.paymentEnabled === true && currentUser) {
            const amount = booking.amount || booking.price || 80
            container.innerHTML = '<button class="pay-now-btn" id="payNowBtn"><i class="fas fa-credit-card"></i> Pay Now <span class="pay-amount">' + '\u20B9' + amount + '</span></button>'

            document.getElementById('payNowBtn').addEventListener('click', function (e) {
                e.preventDefault()
                openPayment({ id: bookingId, amount: amount })
            })
        }
    } catch (error) {
    }
}

async function openPayment(booking) {
    const res = await fetch("/api/createOrder", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            amount: booking.amount * 100
        })
    })

    const order = await res.json()

    if (!order.id) {
        alert("Order failed")
        return
    }

    const options = {
        key: "rzp_test_SZquwUDpz1IWQq",
        amount: order.amount,
        currency: "INR",
        order_id: order.id,
        name: "FASTPARK",
        handler: async function (response) {
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
            })

            const data = await verifyRes.json()

            if (data.success) {
                try {
                    await updateDoc(doc(db, 'bookings', booking.id), {
                        status: "paid",
                        paymentId: response.razorpay_payment_id,
                        userId: currentUser.uid
                    })

                    const container = document.getElementById('payBtnContainer')
                    if (container) {
                        container.innerHTML = '<div class="payment-success-badge" style="width: 100%; justify-content: center; margin-top: 20px; padding: 12px;"><i class="fas fa-check-circle"></i> PAYMENT COMPLETED</div>'
                    }
                } catch (error) {
                    console.error("Booking update failed:", error)
                }

                alert("Payment Verified ✅")
            } else {
                alert("Payment verification failed ❌")
            }
        }
    }

    const rzp = new Razorpay(options)
    rzp.open()
}
