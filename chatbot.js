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

// Initialize data fetch
fetchParkingData();
setInterval(fetchParkingData, 30000); // Update every 30 seconds

// Chatbot logic
function getBotResponse(userMessage) {
    const msg = userMessage.toLowerCase().trim();
    
    // Parking slots/availability queries
    if (msg.includes('parking slot') || msg.includes('parking available') || 
        msg.includes('available slot') || msg.includes('how many slot') ||
        msg.includes('slots available') || msg.includes('available parking')) {
        
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
                   `📍 Main Gate: ${mainGate.available}/${mainGate.total} available\n` +
                   `📍 Gate 1: ${gate1.available}/${gate1.total} available\n` +
                   `📍 Gate 3: ${gate3.available}/${gate3.total} available`;
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
        return `For assistance, please contact our admin at koushik123@gmail.com or visit the admin desk at any parking location.`;
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
        </style>
        <div id="chatbot-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
            <div id="chatbot-button" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.3s ease;">
                <i class="fas fa-comments" style="font-size: 28px;"></i>
            </div>
            
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
                        <input type="text" id="chat-input" placeholder="Type your question..." style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none;">
                        <button id="send-message" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
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
        chatInput.focus();
    });
    
    closeChatbot.addEventListener('click', () => {
        chatbotWindow.style.display = 'none';
        chatbotButton.style.display = 'flex';
    });

    
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
        setTimeout(() => {
            const botResponse = getBotResponse(message);
            const botMessageHTML = `
                <div class="bot-message" style="margin-bottom: 15px;">
                    <div style="background: #e5e7eb; padding: 10px 15px; border-radius: 12px; border-bottom-left-radius: 4px; max-width: 80%; display: inline-block;">
                        <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5; white-space: pre-line;">${botResponse}</p>
                    </div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', botMessageHTML);
            chatMessages.scrollTop = chatMessages.scrollHeight;
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
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    createChatbotUI();
});
