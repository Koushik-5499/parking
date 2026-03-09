import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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

const ADMIN_EMAIL = "koushik123@gmail.com";

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('userEmail').textContent = user.email;

        // Check if admin
        if (user.email === ADMIN_EMAIL) {
            window.location.href = 'admin-dashboard.html';
            return;
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
});

window.selectLocation = function(locationId, locationName) {
    localStorage.setItem('selectedLocation', locationId);
    localStorage.setItem('selectedLocationName', locationName);
    window.location.href = 'slots-dashboard.html';
};

// Direction functions
window.openMainGate = function() {
    window.open("https://maps.app.goo.gl/6yWRXfrPBx8Jo5vx8", "_blank");
};

window.openGate1 = function() {
    window.open("https://maps.app.goo.gl/KCVUfQeW38kZcfmm8", "_blank");
};

window.openGate3 = function() {
    window.open("https://maps.app.goo.gl/eWwEB45cqHszhrJB8", "_blank");
};
