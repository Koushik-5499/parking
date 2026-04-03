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

// Fetch real-time parking data (excluding VIP slots)
async function fetchParkingData() {
    const locations = ['rathinam_main_gate', 'rathinam_gate1', 'rathinam_gate3'];

    for (const location of locations) {
        const slotsRef = collection(db, 'parking_locations', location, 'slots');
        const snapshot = await getDocs(slotsRef);

        let total = 0, available = 0, pending = 0, occupied = 0;

        snapshot.forEach((doc) => {
            const slot = doc.data();

            // Skip VIP slots - only count customer-visible slots (1-10)
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

// Data fetched on demand
// Chatbot logic
async function getBotResponse(userMessage) {
    const msg = userMessage.toLowerCase().trim();

    // Parking slots/availability queries
    if (msg.includes('parking slot') || msg.includes('parking available') ||
        msg.includes('available slot') || msg.includes('how many slot') ||
        msg.includes('slots available') || msg.includes('available parking')) {
        
        await fetchParkingData();

        // Check for specific location
        if (msg.includes('main gate')) {
            const data = parkingData.rathinam_main_gate;
            return `Rathinam Main Gate has ${data.available} available slots out of ${data.total} total slots.`;
        } else if (msg.includes('gate 1') || msg.includes('gate1')) {
            const data = parkingData.rathinam_gate1;
            return `Rathinam Gate 1 has ${data.available} available slots out of ${data.total} total slots.`;
        } else if (msg.includes('gate 3') || msg.includes('gate3')) {
            const data = parkingData.rathinam_gate3;
            return `Rathinam Gate 3 has ${data.available} available slots out of ${data.total} total slots.`;
        } else {
            // All locations
            const mainGate = parkingData.rathinam_main_gate;
            const gate1 = parkingData.rathinam_gate1;
            const gate3 = parkingData.rathinam_gate3;
            return `Available parking slots:\n\n` +
                `Rathinam Main Gate: ${mainGate.available}/${mainGate.total} available\n` +
                `Rathinam Gate 1: ${gate1.available}/${gate1.total} available\n` +
                `Rathinam Gate 3: ${gate3.available}/${gate3.total} available`;
        }
    }

    // Pricing queries
    if (msg.includes('price') || msg.includes('cost') || msg.includes('rate') ||
        msg.includes('charge') || msg.includes('fee') || msg.includes('how much')) {
        return `Our parking rates are ₹80 per hour for all locations. Payment can be made online or in cash at exit.`;
    }

    // Booking queries
    if (msg.includes('how to book') || msg.includes('book slot') || msg.includes('booking')) {
        return `To book a parking slot:\n1. Select your preferred location (Main Gate, Gate 1, or Gate 3)\n2. Choose an available slot\n3. Enter your vehicle details\n4. Confirm your booking\n5. Show the QR code at entry`;
    }

    // Payment queries
    if (msg.includes('payment') || msg.includes('pay')) {
        return `Payment options:\n• Pay Online: Use our online payment system\n• Cash: Pay at exit to the admin\n\nPayment is required when you exit the parking facility.`;
    }

    // Location/Direction queries
    if (msg.includes('direction') || msg.includes('location') || msg.includes('where') || msg.includes('address')) {
        return `You can get directions to any parking location by clicking the "📍 Direction" button on the location card. This will open Google Maps with the exact location.`;
    }

    // VIP queries
    if (msg.includes('vip') || msg.includes('special')) {
        return `VIP parking slots are available for special bookings. Please contact the admin or book through the admin dashboard for VIP slots.`;
    }

    // Hours/Timing queries
    if (msg.includes('hour') || msg.includes('time') || msg.includes('open') || msg.includes('close')) {
        return `Our parking facilities are open 24/7. You can book and park at any time!`;
    }

    // Contact/Help queries
    if (msg.includes('contact') || msg.includes('help') || msg.includes('support') || msg.includes('admin')) {
        return `For assistance, please contact our admin at 7200746814 or visit the admin desk at any parking location.`;
    }

    // Greeting
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
        return `Hello! 👋 I'm your parking assistant. I can help you with:\n• Available parking slots\n• Pricing information\n• Booking process\n• Payment options\n• Directions\n\nWhat would you like to know?`;
    }

    // Thank you
    if (msg.includes('thank') || msg.includes('thanks')) {
        return `You're welcome! Happy parking! 🚗`;
    }

    // Default response
    return `I can help you with:\n• Checking available parking slots\n• Pricing information (₹80/hour)\n• How to book a slot\n• Payment options\n• Getting directions\n\nPlease ask me anything about parking!`;
}

// Create chatbot UI
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
        </style>
        <div id="chatbot-container" style="position: fixed; bottom: 90px; right: 20px; z-index: 9999;">
            <div id="chatbot-button" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s ease;">
                <i class="fas fa-comments" style="font-size: 28px;"></i>
            </div>
            <div id="wake-word-hint" class="wake-word-hint">Say "Hey Dude" 🎙️</div>
            
            <div id="chatbot-window" style="display: none; position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: white; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); flex-direction: column; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">Parking Assistant</h3>
                        <p style="margin: 0; font-size: 12px; opacity: 0.9;">Ask me anything!</p>
                    </div>
                    <button id="close-chatbot" style="background: transparent; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 30px; height: 30px;">×</button>
                </div>
                
                <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 15px; background: #f9fafb;">
                    <div class="bot-message" style="margin-bottom: 15px;">
                        <div style="background: #e5e7eb; padding: 10px 15px; border-radius: 12px; border-bottom-left-radius: 4px; max-width: 80%; display: inline-block;">
                            <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">Hello! 👋 I'm your parking assistant. Ask me anything!</p>
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
                    <div style="font-weight: 600; font-size: 18px; color: #333; margin-bottom: 10px;">Listening...</div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // Event listeners
    const chatbotButton = document.getElementById('chatbot-button');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChatbot = document.getElementById('close-chatbot');
    const sendMessage = document.getElementById('send-message');
    const chatInput = document.getElementById('chat-input');

    chatbotButton.addEventListener('click', () => {
        chatbotWindow.style.display = 'flex';
        chatbotButton.style.display = 'none';
        document.getElementById('wake-word-hint').style.display = 'none';
        chatInput.focus();
    });

    closeChatbot.addEventListener('click', () => {
        window.speechSynthesis.cancel(); // Stop speaking when chatbot is closed
        chatbotWindow.style.display = 'none';
        chatbotButton.style.display = 'flex';
        document.getElementById('wake-word-hint').style.display = 'block';
    });


    // Text-to-Speech: AI speaks the response
    function speak(text) {
        window.speechSynthesis.cancel(); // stop any ongoing speech
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'en-IN';
        speech.rate = 1;
        speech.pitch = 1;
        window.speechSynthesis.speak(speech);
    }

    function sendUserMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        const chatMessages = document.getElementById('chat-messages');
        const userMessageHTML = `
            <div class="user-message" style="margin-bottom: 15px; text-align: right;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 10px 15px; border-radius: 12px; border-bottom-right-radius: 4px; max-width: 80%; display: inline-block; text-align: left;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.5;">${message}</p>
                </div>
            </div>
        `;
        chatMessages.insertAdjacentHTML('beforeend', userMessageHTML);
        chatInput.value = '';

        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Get bot response
        setTimeout(async () => {
            const botResponse = await getBotResponse(message);
            const botMessageHTML = `
                <div class="bot-message" style="margin-bottom: 15px;">
                    <div style="background: #e5e7eb; padding: 10px 15px; border-radius: 12px; border-bottom-left-radius: 4px; max-width: 80%; display: inline-block;">
                        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-line;">${botResponse}</p>
                    </div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            // Speak the bot response aloud
            speak(botResponse);
        }, 500);
    }

    // Auto-type effect for quick replies
    function autoTypeMessage(message) {
        const chatInput = document.getElementById('chat-input');
        chatInput.value = '';
        chatInput.focus();

        let index = 0;
        const typingInterval = setInterval(() => {
            if (index < message.length) {
                chatInput.value += message[index];
                index++;
            } else {
                clearInterval(typingInterval);
                // Auto-send after typing completes
                setTimeout(() => {
                    sendUserMessage();
                }, 300);
            }
        }, 50); // 50ms per character for typing effect
    }

    // Handle quick reply buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('quick-reply-btn')) {
            const message = e.target.getAttribute('data-message');
            autoTypeMessage(message);
        }
    });

    sendMessage.addEventListener('click', sendUserMessage);

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendUserMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        window.speechSynthesis.cancel(); // stop speaking when user starts typing
    });

    // Voice Recognition
    const voiceBtn = document.getElementById('voice-btn');
    voiceBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel(); // stop speaking when mic is clicked
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
        window._commandListening = true; // prevent wake word auto-restart

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();

        recognition.onstart = () => {
            console.log('Voice recognition started...');
            window.isListeningWave = true;
            document.getElementById('siri-container').style.display = 'flex';
            voiceBtn.classList.add('listening');
            voiceBtn.textContent = '🔴';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chat-input').value = transcript;
            window.isListeningWave = false;
            document.getElementById('siri-container').style.display = 'none';
            voiceBtn.classList.remove('listening');
            voiceBtn.textContent = '🎙️';
            // Auto-send the recognized speech
            callback();
        };

        recognition.onerror = (event) => {
            console.error('Voice recognition error:', event.error);
            window.isListeningWave = false;
            document.getElementById('siri-container').style.display = 'none';
            voiceBtn.classList.remove('listening');
            voiceBtn.textContent = '🎙️';
        };

        recognition.onend = () => {
            window.isListeningWave = false;
            document.getElementById('siri-container').style.display = 'none';
            voiceBtn.classList.remove('listening');
            voiceBtn.textContent = '🎙️';
            // Resume wake word listener
            window._commandListening = false;
            setTimeout(() => startWakeWord(), 500);
        };
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    createChatbotUI();
    startWakeWord();
});

// ─── Wake Word System ────────────────────────────────────────────────────────

let wakeRecognition;

function startWakeWord() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // browser doesn't support it

    wakeRecognition = new SpeechRecognition();
    wakeRecognition.lang = 'en-IN';
    wakeRecognition.continuous = true;
    wakeRecognition.interimResults = false;

    wakeRecognition.onresult = function (event) {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        console.log('Heard:', transcript);

        if (transcript.includes('hey dude')) {
            console.log('Wake word detected!');

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
        // Restart wake listener unless a command is being processed
        if (!window._commandListening) {
            setTimeout(() => startWakeWord(), 500);
        }
    };

    wakeRecognition.start();
}

function startCommandListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    window._commandListening = true;

    const commandRec = new SpeechRecognition();
    commandRec.lang = 'en-IN';
    commandRec.interimResults = false;
    commandRec.maxAlternatives = 1;

    // Show mic active state on voice button
    const voiceBtn = document.getElementById('voice-btn');
    if (voiceBtn) {
        voiceBtn.classList.add('listening');
        voiceBtn.textContent = '🔴';
    }

    commandRec.start();

    commandRec.onstart = function () {
        window.isListeningWave = true;
        const siriContainer = document.getElementById('siri-container');
        if (siriContainer) siriContainer.style.display = 'flex';
    };

    commandRec.onresult = function (event) {
        window.isListeningWave = false;
        const siriContainer = document.getElementById('siri-container');
        if (siriContainer) siriContainer.style.display = 'none';

        const command = event.results[0][0].transcript;
        console.log('Command:', command);

        // Put command into chat input and send it
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = command;
        }

        // Reuse the existing sendUserMessage flow via the send button
        const sendBtn = document.getElementById('send-message');
        if (sendBtn) sendBtn.click();
    };

    commandRec.onerror = function (e) {
        window.isListeningWave = false;
        const siriContainer = document.getElementById('siri-container');
        if (siriContainer) siriContainer.style.display = 'none';
        console.log('Command error:', e.error);
    };

    commandRec.onend = function () {
        window.isListeningWave = false;
        const siriContainer = document.getElementById('siri-container');
        if (siriContainer) siriContainer.style.display = 'none';

        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
            voiceBtn.textContent = '🎙️';
        }
        window._commandListening = false;
        // Resume wake word listening
        setTimeout(() => startWakeWord(), 500);
    };
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
