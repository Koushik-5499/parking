import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

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

let parkingData = {
    rathinam_main_gate: { total: 0, available: 0, pending: 0, occupied: 0 },
    rathinam_gate1: { total: 0, available: 0, pending: 0, occupied: 0 },
    rathinam_gate3: { total: 0, available: 0, pending: 0, occupied: 0 }
};

// ─── Fetch real-time parking data (excluding VIP slots) ─────────────────────
async function fetchParkingData() {
    const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];

    for (const location of locations) {
        const slotsRef = collection(db, 'parking_locations', location, 'slots');
        const snapshot = await getDocs(slotsRef);

        let total = 0, available = 0, pending = 0, occupied = 0;

        snapshot.forEach((doc) => {
            const slot = doc.data();
            if (slot.isVIP || slot.slotNumber?.toString().startsWith('VIP')) {
                return;
            }
            total++;
            if (slot.status === 'available') available++;
            else if (slot.status === 'pending') pending++;
            else if (slot.status === 'occupied') occupied++;
        });

        parkingData[location] = { total, available, pending, occupied };
    }
}

// ─── Language Detection (Tamil Unicode + Tanglish) ──────────────────────────
window.currentLang = 'en';

function detectLanguage(text) {
    // 1. Check for Tamil Unicode characters
    const tamilPattern = /[\u0B80-\u0BFF]/;
    if (tamilPattern.test(text)) {
        return 'ta';
    }

    // 2. Check for Tanglish words (Tamil written in English)
    const tanglishWords = [
        // Common Tamil question/verb words
        'enga', 'iruku', 'irukka', 'iruka', 'varuma', 'venum',
        'epdi', 'inga', 'pogum', 'evlo', 'enna', 'sollunga',
        'pannunga', 'vaanga', 'paarunga', 'theriyuma', 'illa',
        'undu', 'aagum', 'mudiyuma', 'vendum', 'kodunga',
        // Parking-specific Tanglish
        'parkingu', 'slotu', 'slottu', 'kaasu', 'panam',
        'vaandi', 'vandi', 'nikka', 'nikkanum', 'idam',
        'edathula', 'kidaikuma', 'kidaikkuma', 'ethana',
        // Common connectors / fillers
        'naan', 'nee', 'avan', 'enna', 'ango', 'ingu',
        'thaan', 'konjam', 'romba', 'seri', 'sari', 'ok da',
        // Greetings in Tanglish
        'vanakkam', 'nandri', 'thanks da', 'nanba'
    ];

    const lower = text.toLowerCase();
    for (const word of tanglishWords) {
        if (lower.includes(word)) {
            return 'ta';
        }
    }

    return 'en';
}

// ─── Smart Text Normalization (speech-error fixes ONLY, NO Tanglish translation) ──
function normalizeText(text) {
    let normalized = text.toLowerCase();

    // Only fix common speech-to-text misrecognitions
    // DO NOT translate Tanglish words to English — keep them as-is
    const replacements = [
        [/\bflats?\b/g, 'slot'],
        [/\bavailble\b/g, 'available'],
        [/\bavailabl\b/g, 'available'],
        [/\bavailabel\b/g, 'available'],
    ];

    for (const [pattern, replacement] of replacements) {
        normalized = normalized.replace(pattern, replacement);
    }

    return normalized.trim();
}

// ─── Noise Filter ───────────────────────────────────────────────────────────
function isNoise(text) {
    if (!text) return true;
    const cleaned = text.trim().toLowerCase();
    if (cleaned.length < 3) return true;
    const noiseWords = ['hmm', 'ah', 'uh', 'mmm', 'hm', 'um', 'uhh', 'ahh', 'hmm hmm', 'ha'];
    return noiseWords.includes(cleaned);
}

// ─── Chatbot Response Logic (Rule-based, Tamil + English) ───────────────────
async function getBotResponse(userMessage) {
    // Detect language from ORIGINAL text first (before normalization)
    window.currentLang = detectLanguage(userMessage);
    const lang = window.currentLang;

    // Normalize only for intent matching (not for display)
    const msg = normalizeText(userMessage);

    // ── Greeting ──
    if (msg.match(/\b(hi|hello|hey|vanakkam|nandri)\b/)) {
        if (lang === 'ta') {
            return `வணக்கம்! 👋 நான் உங்கள் parking assistant. Slots, pricing, booking பற்றி கேளுங்க!`;
        }
        return `Hello! 👋 I'm your parking assistant. Ask me about available slots, pricing, or how to book!`;
    }

    // ── Parking slots / availability queries ──
    // Match English + Tanglish keywords directly
    if (msg.includes('slot') || msg.includes('parking') || msg.includes('available') ||
        msg.includes('iruku') || msg.includes('irukka') || msg.includes('iruka') ||
        msg.includes('kidaikuma') || msg.includes('kidaikkuma') ||
        msg.includes('ethana') || msg.includes('எத்தனை') || msg.includes('parkingu') || msg.includes('slotu') || msg.includes('slottu')) {
        await fetchParkingData();

        if (msg.includes('main gate')) {
            const data = parkingData.rathinam_main_gate;
            if (lang === 'ta') return `Rathinam Main Gate ல ${data.available} slots available இருக்கு (Total: ${data.total}).`;
            return `Rathinam Main Gate has ${data.available} available slots out of ${data.total} total slots.`;
        } else if (msg.includes('gate 1') || msg.includes('gate1')) {
            const data = parkingData.rathinam_gate1;
            if (lang === 'ta') return `Rathinam Gate 1 ல ${data.available} slots available இருக்கு (Total: ${data.total}).`;
            return `Rathinam Gate 1 has ${data.available} available slots out of ${data.total} total slots.`;
        } else if (msg.includes('gate 3') || msg.includes('gate3')) {
            const data = parkingData.rathinam_gate3;
            if (lang === 'ta') return `Rathinam Gate 3 ல ${data.available} slots available இருக்கு (Total: ${data.total}).`;
            return `Rathinam Gate 3 has ${data.available} available slots out of ${data.total} total slots.`;
        } else {
            const mainGate = parkingData.rathinam_main_gate;
            const gate1 = parkingData.rathinam_gate1;
            const gate3 = parkingData.rathinam_gate3;

            if (lang === 'ta') {
                return `இப்போது parking slots available இருக்கு:\nMain Gate: ${mainGate.available}/${mainGate.total} slots\nGate 1: ${gate1.available}/${gate1.total} slots\nGate 3: ${gate3.available}/${gate3.total} slots`;
            }
            return `Available parking slots:\n\n` +
                `Rathinam Main Gate: ${mainGate.available}/${mainGate.total} available\n` +
                `Rathinam Gate 1: ${gate1.available}/${gate1.total} available\n` +
                `Rathinam Gate 3: ${gate3.available}/${gate3.total} available`;
        }
    }

    // ── Pricing queries (English + Tanglish) ──
    if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') ||
        msg.includes('charge') || msg.includes('fee') || msg.includes('how much') ||
        msg.includes('amount') || msg.includes('kaasu') || msg.includes('panam') ||
        msg.includes('evlo') || msg.includes('vilai')) {
        if (lang === 'ta') return `Parking charge ₹80 per hour. Online அல்லது cash ல pay பண்ணலாம்.`;
        return `Our parking rates are ₹80 per hour for all locations. Payment can be made online or in cash at exit.`;
    }

    // ── Booking queries ──
    if (msg.includes('how to book') || msg.includes('book slot') || msg.includes('booking') || msg.includes('book') ||
        msg.includes('book pannu') || msg.includes('book pannunga') || msg.includes('booking pannu')) {
        if (lang === 'ta') {
            return `Slot book பண்ண:\n1. Location select பண்ணுங்க\n2. Available slot choose பண்ணுங்க\n3. Vehicle details enter பண்ணுங்க\n4. Confirm பண்ணுங்க\n5. QR code show பண்ணுங்க`;
        }
        return `To book a parking slot:\n1. Select your preferred location\n2. Choose an available slot\n3. Enter your vehicle details\n4. Confirm your booking\n5. Show the QR code at entry`;
    }

    // ── Location / Direction queries ──
    if (msg.includes('direction') || msg.includes('location') || msg.includes('where') ||
        msg.includes('address') || msg.includes('map') || msg.includes('idam') ||
        msg.includes('enga iruku') || msg.includes('enga') || msg.includes('enga irukkurathu')) {
        if (lang === 'ta') return `Location details க்கு, location card ல இருக்கிற "📍 Direction" button ah click பண்ணுங்க. Google Maps open ஆகும்.`;
        return `You can get directions to any parking location by clicking the "📍 Direction" button on the location card. This will open Google Maps.`;
    }

    // ── Payment queries ──
    if (msg.includes('payment') || msg.includes('pay') || msg.includes('razorpay') || msg.includes('upi') || msg.includes('cash')) {
        if (lang === 'ta') return `Payment online (Razorpay/UPI) அல்லது exit ல cash ல pay பண்ணலாம். ₹80 per hour.`;
        return `You can pay online via Razorpay/UPI or pay in cash at the exit gate. Rate is ₹80 per hour.`;
    }

    // ── Time / duration queries ──
    if (msg.includes('time') || msg.includes('hour') || msg.includes('duration') || msg.includes('long')) {
        if (lang === 'ta') return `Parking எவ்வளவு நேரம் வேணும்னாலும் நிறுத்தலாம். Charge ₹80 per hour.`;
        return `You can park for as long as you need. Charges are ₹80 per hour, calculated at exit.`;
    }

    // ── Help query ──
    if (msg.includes('help') || msg.includes('what can you do') || msg.includes('enna pannuva')) {
        if (lang === 'ta') {
            return `நான் இதெல்லாம் help பண்ண முடியும்:\n• Available slots check\n• Pricing info (₹80/hour)\n• Slot book பண்ற வழி\n• Payment options\n• Direction / Location`;
        }
        return `I can help you with:\n• Checking available parking slots\n• Pricing information (₹80/hour)\n• How to book a slot\n• Payment options\n• Getting directions`;
    }

    // ── Thank you ──
    if (msg.match(/\b(thank|thanks|nandri)\b/)) {
        if (lang === 'ta') return `நன்றி! 🙏 வேறு ஏதாவது help வேணும்னா கேளுங்க.`;
        return `You're welcome! 😊 Feel free to ask if you need anything else.`;
    }

    // ── Default response ──
    if (lang === 'ta') {
        return `நான் parking பற்றிய தகவல் சொல்ல முடியும். (Available slots, pricing, booking இத பற்றி கேட்கவும்)`;
    }
    return `I can help you with:\n• Checking available parking slots\n• Pricing information (₹80/hour)\n• How to book a slot\n• Payment options\n• Getting directions\n\nPlease ask me anything about parking!`;
}

// ─── Text-to-Speech: Speak in same language ─────────────────────────────────
function speak(text) {
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = (window.currentLang === 'ta') ? 'ta-IN' : 'en-IN';
    speech.rate = 1;
    speech.pitch = 1;
    window.speechSynthesis.speak(speech);
}

// ─── Create Chatbot UI ──────────────────────────────────────────────────────
function createChatbotUI() {
    const chatbotHTML = `
        <style>
            .quick-reply-btn:hover {
                background: #2563eb !important;
                color: white !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
            }
            #voice-btn {
                background: transparent;
                border: 2px solid #d1d5db;
                color: #6b7280;
                width: 42px;
                height: 42px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                flex-shrink: 0;
            }
            #voice-btn:hover {
                border-color: #2563eb;
                color: #2563eb;
                background: rgba(37, 99, 235, 0.05);
            }
            #voice-btn.listening {
                border-color: #ef4444;
                color: #ef4444;
                animation: pulse-mic 1s infinite;
            }
            @keyframes pulse-mic {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
            }

            /* Listening overlay with Siri-style animation */
            .siri-container {
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: #e6e6e6;
                z-index: 100;
                border-radius: 12px;
            }
            #siriCanvas {
                width: 250px;
                height: 250px;
                border-radius: 50%;
                background: radial-gradient(circle, #1a0033, #000);
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                margin-bottom: 20px;
            }
            .siri-listening-text {
                font-weight: 600;
                font-size: 18px;
                color: #333;
                margin-bottom: 6px;
            }
            .siri-lang-hint {
                font-size: 13px;
                color: #888;
                margin-bottom: 10px;
            }
            .siri-cancel-btn {
                margin-top: 10px;
                background: rgba(239, 68, 68, 0.1);
                border: 2px solid #ef4444;
                color: #ef4444;
                padding: 8px 24px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            .siri-cancel-btn:hover {
                background: #ef4444;
                color: white;
            }

            .wake-word-hint {
                position: absolute;
                bottom: 8px;
                right: 72px;
                background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
                color: white;
                padding: 8px 14px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
                animation: hintBounce 2s ease-in-out infinite;
                pointer-events: none;
            }
            .wake-word-hint::after {
                content: '';
                position: absolute;
                right: -6px;
                top: 50%;
                transform: translateY(-50%);
                width: 0; height: 0;
                border-top: 6px solid transparent;
                border-bottom: 6px solid transparent;
                border-left: 6px solid #1e40af;
            }
            @keyframes hintBounce {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(-5px); }
            }

            /* Interim text preview */
            .interim-preview {
                display: none;
                position: absolute;
                bottom: 70px;
                left: 15px;
                right: 15px;
                background: rgba(37, 99, 235, 0.08);
                border: 1px solid rgba(37, 99, 235, 0.2);
                border-radius: 10px;
                padding: 8px 14px;
                font-size: 13px;
                color: #4b5563;
                font-style: italic;
                transition: all 0.2s ease;
            }
            .interim-preview.active {
                display: block;
            }

            /* Typing indicator */
            .typing-indicator {
                display: flex;
                gap: 4px;
                padding: 10px 15px;
                align-items: center;
            }
            .typing-indicator span {
                width: 8px;
                height: 8px;
                background: #9ca3af;
                border-radius: 50%;
                animation: typingBounce 1.4s infinite ease-in-out;
            }
            .typing-indicator span:nth-child(1) { animation-delay: 0s; }
            .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
            .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes typingBounce {
                0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                40% { transform: scale(1); opacity: 1; }
            }

            /* Language badge */
            .lang-badge {
                display: inline-block;
                font-size: 10px;
                font-weight: 700;
                text-transform: uppercase;
                padding: 2px 8px;
                border-radius: 10px;
                margin-bottom: 4px;
            }
            .lang-badge.en {
                background: rgba(37, 99, 235, 0.1);
                color: #2563eb;
            }
            .lang-badge.ta {
                background: rgba(245, 158, 11, 0.1);
                color: #d97706;
            }
        </style>
        <div id="chatbot-container" style="position: fixed; bottom: 90px; right: 20px; z-index: 9999;">
            <div id="chatbot-button" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s ease;">
                <i class="fas fa-comments" style="font-size: 28px;"></i>
            </div>
            <div id="wake-word-hint" class="wake-word-hint">Say "Hey Dude" 🎙️</div>
            
            <div id="chatbot-window" style="display: none; position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); flex-direction: column; overflow: hidden;">
                <div id="chatbot-header" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: move;">
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">Parking Assistant</h3>
                        <p style="margin: 0; font-size: 12px; opacity: 0.9;">🎙️ Voice + Text • Tamil & English</p>
                    </div>
                    <button id="close-chatbot" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">×</button>
                </div>
                
                <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 15px; background: #f9fafb;">
                    <div class="bot-message" style="margin-bottom: 15px;">
                        <div style="background: #e5e7eb; padding: 10px 15px; border-radius: 12px; border-bottom-left-radius: 4px; max-width: 80%; display: inline-block;">
                            <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">Hello! 👋 I'm your parking assistant.<br><span style="font-size: 13px; color: #6b7280;">வணக்கம்! நான் உங்கள் parking உதவியாளர்.</span></p>
                        </div>
                        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;">
                            <button class="quick-reply-btn" data-message="available slots" style="background: white; border: 2px solid #2563eb; color: #2563eb; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                                📊 Available Slots
                            </button>
                            <button class="quick-reply-btn" data-message="pricing" style="background: white; border: 2px solid #2563eb; color: #2563eb; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                                💰 Pricing
                            </button>
                            <button class="quick-reply-btn" data-message="how to book" style="background: white; border: 2px solid #2563eb; color: #2563eb; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                                📝 How to Book
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- Interim voice preview -->
                <div id="interim-preview" class="interim-preview"></div>

                <div style="padding: 15px; background: white; border-top: 1px solid #e5e7eb;">
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="chat-input" placeholder="Type or speak..." style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none;">
                        <button id="voice-btn" title="Speak">🎙️</button>
                        <button id="send-message" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>

                <div id="siri-container" class="siri-container">
                    <canvas id="siriCanvas"></canvas>
                    <div class="siri-listening-text">Listening...</div>
                    <div class="siri-lang-hint">🌐 Speak in Tamil or English</div>
                    <button id="siri-cancel-btn" class="siri-cancel-btn">✕ Cancel</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // ─── Element references ─────────────────────────────────────────────────
    const chatbotContainer = document.getElementById('chatbot-container');
    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotWindow = document.getElementById('chatbot-window');
    const chatbotHeader = document.getElementById('chatbot-header');
    const closeChatbot = document.getElementById('close-chatbot');
    const sendMessageBtn = document.getElementById('send-message');
    const chatInput = document.getElementById('chat-input');
    const voiceBtn = document.getElementById('voice-btn');
    const interimPreview = document.getElementById('interim-preview');
    const siriCancelBtn = document.getElementById('siri-cancel-btn');

    // Track current voice recognition instance for cancellation
    let currentRecognition = null;

    // ─── Dragging logic ─────────────────────────────────────────────────────
    let isDragging = false;
    let dragStartX, dragStartY, containerInitialX, containerInitialY;

    function adjustWindowPosition() {
        const rect = chatbotContainer.getBoundingClientRect();
        if (rect.top < 520) {
            chatbotWindow.style.bottom = 'auto';
            chatbotWindow.style.top = '80px';
        } else {
            chatbotWindow.style.top = 'auto';
            chatbotWindow.style.bottom = '80px';
        }

        if (rect.left < 310) {
            chatbotWindow.style.right = 'auto';
            chatbotWindow.style.left = '0px';
        } else {
            chatbotWindow.style.left = 'auto';
            chatbotWindow.style.right = '0px';
        }
    }

    function dragStart(e) {
        if (e.target === closeChatbot || closeChatbot.contains(e.target)) return;

        if (e.type === "touchstart") {
            dragStartX = e.touches[0].clientX;
            dragStartY = e.touches[0].clientY;
        } else {
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            if (e.currentTarget === chatbotHeader) e.preventDefault();
        }

        const rect = chatbotContainer.getBoundingClientRect();
        containerInitialX = rect.left;
        containerInitialY = rect.top;
        isDragging = false;

        if (e.type === "mousedown") {
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragEnd);
        } else {
            document.addEventListener('touchmove', dragMove, { passive: false });
            document.addEventListener('touchend', dragEnd);
        }
    }

    function dragMove(e) {
        let currentX, currentY;
        if (e.type === "touchmove") {
            currentX = e.touches[0].clientX;
            currentY = e.touches[0].clientY;
        } else {
            currentX = e.clientX;
            currentY = e.clientY;
        }

        const dx = currentX - dragStartX;
        const dy = currentY - dragStartY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            isDragging = true;
            if (e.cancelable) e.preventDefault();
        }

        if (isDragging) {
            chatbotContainer.style.bottom = 'auto';
            chatbotContainer.style.right = 'auto';

            let finalLeft = containerInitialX + dx;
            let finalTop = containerInitialY + dy;

            const maxLeft = window.innerWidth - 60;
            const maxTop = window.innerHeight - 60;

            finalLeft = Math.max(0, Math.min(finalLeft, maxLeft));
            finalTop = Math.max(0, Math.min(finalTop, maxTop));

            chatbotContainer.style.left = finalLeft + 'px';
            chatbotContainer.style.top = finalTop + 'px';

            if (chatbotWindow.style.display !== 'none') {
                adjustWindowPosition();
            }
        }
    }

    function dragEnd() {
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', dragMove);
        document.removeEventListener('touchend', dragEnd);
    }

    chatbotButton.addEventListener('mousedown', dragStart);
    chatbotButton.addEventListener('touchstart', dragStart, { passive: false });
    chatbotHeader.addEventListener('mousedown', dragStart);
    chatbotHeader.addEventListener('touchstart', dragStart, { passive: false });

    // ─── Open / Close chatbot ───────────────────────────────────────────────
    chatbotButton.addEventListener('click', (e) => {
        if (isDragging) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        chatbotWindow.style.display = 'flex';
        chatbotButton.style.display = 'none';
        document.getElementById('wake-word-hint').style.display = 'none';
        chatInput.focus();
        adjustWindowPosition();
    });

    closeChatbot.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        // Stop any active recognition
        if (currentRecognition) {
            try { currentRecognition.abort(); } catch (e) { }
            currentRecognition = null;
        }
        resetVoiceUI();
        chatbotWindow.style.display = 'none';
        chatbotButton.style.display = 'flex';
        document.getElementById('wake-word-hint').style.display = 'block';
    });

    // ─── Cancel voice button inside Siri overlay ────────────────────────────
    siriCancelBtn.addEventListener('click', () => {
        if (currentRecognition) {
            try { currentRecognition.abort(); } catch (e) { }
            currentRecognition = null;
        }
        resetVoiceUI();
        chatInput.value = '';
    });

    // ─── Reset voice UI helper ──────────────────────────────────────────────
    function resetVoiceUI() {
        window.isListeningWave = false;
        document.getElementById('siri-container').style.display = 'none';
        voiceBtn.classList.remove('listening');
        voiceBtn.textContent = '🎙️';
        interimPreview.classList.remove('active');
        interimPreview.textContent = '';
    }

    // ─── Send user message ──────────────────────────────────────────────────
    function sendUserMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        const chatMessages = document.getElementById('chat-messages');

        // Detect language before sending
        const detectedLang = detectLanguage(message);
        window.currentLang = detectedLang;

        // User message bubble
        const userMessageHTML = `
            <div class="user-message" style="margin-bottom: 15px; text-align: right;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 10px 15px; border-radius: 12px; border-bottom-right-radius: 4px; max-width: 80%; display: inline-block; text-align: left;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5;">${message}</p>
                </div>
                <div style="font-size: 10px; color: #9ca3af; margin-top: 3px;">${detectedLang === 'ta' ? '🟡 Tamil' : '🔵 English'}</div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Show typing indicator
        const typingHTML = `
            <div id="typing-indicator" class="bot-message" style="margin-bottom: 15px;">
                <div style="background: #e5e7eb; padding: 10px 15px; border-radius: 12px; border-bottom-left-radius: 4px; display: inline-block;">
                    <div class="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', typingHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Get bot response
        setTimeout(async () => {
            const botResponse = await getBotResponse(message);

            // Remove typing indicator
            const typingEl = document.getElementById('typing-indicator');
            if (typingEl) typingEl.remove();

            const langLabel = window.currentLang === 'ta' ? '🟡 Tamil' : '🔵 English';

            const botMessageHTML = `
                <div class="bot-message" style="margin-bottom: 15px;">
                    <div style="background: #e5e7eb; padding: 10px 15px; border-radius: 12px; border-bottom-left-radius: 4px; max-width: 80%; display: inline-block;">
                        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-line;">${botResponse}</p>
                    </div>
                    <div style="font-size: 10px; color: #9ca3af; margin-top: 3px;">🤖 ${langLabel}</div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            // Speak the response in the detected language
            speak(botResponse);
        }, 600);
    }

    // ─── Auto-type effect for quick replies ─────────────────────────────────
    function autoTypeMessage(message) {
        chatInput.value = '';
        chatInput.focus();

        let index = 0;
        const typingInterval = setInterval(() => {
            if (index < message.length) {
                chatInput.value += message[index];
                index++;
            } else {
                clearInterval(typingInterval);
                setTimeout(() => sendUserMessage(), 300);
            }
        }, 50);
    }

    // Handle quick reply buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            const message = e.target.getAttribute('data-message');
            autoTypeMessage(message);
        }
    });

    sendMessageBtn.addEventListener('click', sendUserMessage);

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendUserMessage();
    });

    chatInput.addEventListener('input', () => {
        window.speechSynthesis.cancel();
    });

    // ─── Voice Recognition (Free Web Speech API) ────────────────────────────
    voiceBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        startVoice(sendUserMessage);
    });

    function startVoice(callback) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Sorry, your browser does not support voice recognition.');
            return;
        }

        // Stop wake word listener so the mic is free
        if (wakeRecognition) {
            try { wakeRecognition.abort(); } catch (e) { }
        }
        window._commandListening = true;

        // Track if we got a meaningful result in this attempt
        let gotResult = false;

        function attemptRecognition(lang, isRetry) {
            const recognition = new SpeechRecognition();
            recognition.lang = lang;
            recognition.interimResults = true;
            recognition.maxAlternatives = 5;
            recognition.continuous = false;

            currentRecognition = recognition;

            recognition.start();

            recognition.onstart = () => {
                console.log(`🎙️ Voice recognition started (${lang})...`);
                window.isListeningWave = true;
                document.getElementById('siri-container').style.display = 'flex';
                voiceBtn.classList.add('listening');
                voiceBtn.textContent = '🔴';

                // Show language hint during retry
                const listeningText = document.querySelector('.siri-listening-text');
                if (listeningText) {
                    listeningText.textContent = isRetry ? 'Listening (Tamil)...' : 'Listening...';
                }
            };

            recognition.onresult = (event) => {
                let interimText = '';
                let finalText = '';

                for (let i = 0; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        finalText = event.results[i][0].transcript;
                    } else {
                        interimText += event.results[i][0].transcript;
                    }
                }

                // Show interim text as live preview
                if (interimText) {
                    interimPreview.textContent = `🎤 "${interimText}"`;
                    interimPreview.classList.add('active');
                }

                if (finalText && !isNoise(finalText.trim())) {
                    gotResult = true;
                    // If ta-IN recognition, force Tamil language
                    if (lang === 'ta-IN') {
                        window.currentLang = 'ta';
                    } else {
                        window.currentLang = detectLanguage(finalText);
                    }

                    chatInput.value = finalText.trim();
                    interimPreview.classList.remove('active');
                    interimPreview.textContent = '';
                }
            };

            recognition.onerror = (event) => {
                console.error(`Voice recognition error (${lang}):`, event.error);
                // If English attempt had a "no-speech" error, try Tamil
                if (!isRetry && (event.error === 'no-speech' || event.error === 'audio-capture')) {
                    console.log('🔄 Retrying with Tamil (ta-IN)...');
                    attemptRecognition('ta-IN', true);
                    return;
                }
                resetVoiceUI();
                currentRecognition = null;
                window._commandListening = false;
                setTimeout(() => startWakeWord(), 500);
            };

            recognition.onend = () => {
                currentRecognition = null;

                // If first attempt (en-IN) got no result, auto-retry with Tamil
                if (!isRetry && !gotResult) {
                    console.log('🔄 No English result, retrying with Tamil (ta-IN)...');
                    attemptRecognition('ta-IN', true);
                    return;
                }

                // Done — reset UI
                resetVoiceUI();
                const listeningText = document.querySelector('.siri-listening-text');
                if (listeningText) listeningText.textContent = 'Listening...';

                window._commandListening = false;
                setTimeout(() => startWakeWord(), 500);

                const finalVal = chatInput.value;
                if (finalVal && !isNoise(finalVal)) {
                    callback();
                } else {
                    chatInput.value = '';
                }
            };
        }

        // Start with English first, auto-fallback to Tamil
        attemptRecognition('en-IN', false);
    }
}

// ─── Initialize chatbot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    createChatbotUI();
    startWakeWord();
});

// ─── Wake Word System ("Hey Dude") ──────────────────────────────────────────
let wakeRecognition;

function startWakeWord() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    wakeRecognition = new SpeechRecognition();
    wakeRecognition.lang = 'en-IN';
    wakeRecognition.continuous = true;
    wakeRecognition.interimResults = false;

    wakeRecognition.onresult = function (event) {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Heard:', transcript);

        if (transcript.includes('hey dude')) {
            console.log('🎉 Wake word detected!');

            // Open chatbot window if not already open
            const chatbotWindow = document.getElementById('chatbot-window');
            const chatbotButton = document.getElementById('chatbot-button');
            if (chatbotWindow && chatbotWindow.style.display !== 'flex') {
                chatbotWindow.style.display = 'flex';
                if (chatbotButton) chatbotButton.style.display = 'none';
                const hint = document.getElementById('wake-word-hint');
                if (hint) hint.style.display = 'none';
            }

            // Stop wake listener while processing command
            wakeRecognition.stop();

            // Respond and listen for command
            window.speechSynthesis.cancel();
            const ack = new SpeechSynthesisUtterance('Yes, tell me');
            ack.lang = 'en-IN';
            ack.onend = () => startCommandListening();
            window.speechSynthesis.speak(ack);
        }
    };

    wakeRecognition.onerror = function (e) {
        console.log('Wake word error:', e.error);
    };

    wakeRecognition.onend = function () {
        if (!window._commandListening) {
            setTimeout(() => startWakeWord(), 500);
        }
    };

    wakeRecognition.start();
}

// ─── Command Listening (after wake word) ────────────────────────────────────
function startCommandListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    window._commandListening = true;

    const voiceBtn = document.getElementById('voice-btn');
    const interimPreview = document.getElementById('interim-preview');
    let gotResult = false;

    function attemptCommand(lang, isRetry) {
        const commandRec = new SpeechRecognition();
        commandRec.lang = lang;
        commandRec.interimResults = true;
        commandRec.maxAlternatives = 5;

        if (voiceBtn) {
            voiceBtn.classList.add('listening');
            voiceBtn.textContent = '🔴';
        }

        commandRec.start();

        commandRec.onstart = function () {
            window.isListeningWave = true;
            const siriContainer = document.getElementById('siri-container');
            if (siriContainer) siriContainer.style.display = 'flex';

            const listeningText = document.querySelector('.siri-listening-text');
            if (listeningText) {
                listeningText.textContent = isRetry ? 'Listening (Tamil)...' : 'Listening...';
            }
        };

        commandRec.onresult = function (event) {
            let interimText = '';
            let finalText = '';

            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalText = event.results[i][0].transcript;
                } else {
                    interimText += event.results[i][0].transcript;
                }
            }

            if (interimText && interimPreview) {
                interimPreview.textContent = `🎤 "${interimText}"`;
                interimPreview.classList.add('active');
            }

            if (finalText && !isNoise(finalText.trim())) {
                gotResult = true;

                if (lang === 'ta-IN') {
                    window.currentLang = 'ta';
                } else {
                    window.currentLang = detectLanguage(finalText);
                }

                const chatInput = document.getElementById('chat-input');
                if (chatInput) chatInput.value = finalText.trim();

                if (interimPreview) {
                    interimPreview.classList.remove('active');
                    interimPreview.textContent = '';
                }
            }
        };

        commandRec.onerror = function (e) {
            console.log(`Command error (${lang}):`, e.error);
            if (!isRetry && (e.error === 'no-speech' || e.error === 'audio-capture')) {
                console.log('🔄 Retrying command with Tamil (ta-IN)...');
                attemptCommand('ta-IN', true);
                return;
            }
            window.isListeningWave = false;
            const siriContainer = document.getElementById('siri-container');
            if (siriContainer) siriContainer.style.display = 'none';
        };

        commandRec.onend = function () {
            // If first attempt got no result, retry with Tamil
            if (!isRetry && !gotResult) {
                console.log('🔄 No English result from command, retrying Tamil...');
                attemptCommand('ta-IN', true);
                return;
            }

            window.isListeningWave = false;
            const siriContainer = document.getElementById('siri-container');
            if (siriContainer) siriContainer.style.display = 'none';

            const listeningText = document.querySelector('.siri-listening-text');
            if (listeningText) listeningText.textContent = 'Listening...';

            if (voiceBtn) {
                voiceBtn.classList.remove('listening');
                voiceBtn.textContent = '🎙️';
            }

            if (interimPreview) {
                interimPreview.classList.remove('active');
                interimPreview.textContent = '';
            }

            window._commandListening = false;

            // Auto-send if not noise
            const chatInput = document.getElementById('chat-input');
            if (chatInput && chatInput.value && !isNoise(chatInput.value)) {
                const sendBtn = document.getElementById('send-message');
                if (sendBtn) sendBtn.click();
            }

            // Resume wake word listening
            setTimeout(() => startWakeWord(), 500);
        };
    }

    // Start with English, auto-fallback to Tamil
    attemptCommand('en-IN', false);
}

// ─── Siri Wave Animation System ─────────────────────────────────────────────
window.isListeningWave = false;
let waveT = 0;

function drawWave(ctx, canvas, color, amplitude, frequency, speed) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;

    for (let x = 0; x < canvas.width; x++) {
        const y = (canvas.height / 2) + Math.sin((x * frequency) + waveT) * amplitude;
        ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function animateWave() {
    const canvas = document.getElementById("siriCanvas");
    if (!canvas) {
        requestAnimationFrame(animateWave);
        return;
    }
    const ctx = canvas.getContext("2d");

    if (canvas.width !== 250) canvas.width = 250;
    if (canvas.height !== 250) canvas.height = 250;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (window.isListeningWave) {
        drawWave(ctx, canvas, "#00f2ff", 20, 0.02, 0.05);
        drawWave(ctx, canvas, "#ff00cc", 15, 0.03, 0.04);
        drawWave(ctx, canvas, "#00ff99", 10, 0.04, 0.03);
        waveT += 0.05;
    }

    requestAnimationFrame(animateWave);
}

// Start wave animation loop
animateWave();
