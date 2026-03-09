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
    onSnapshot
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

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        document.getElementById('userEmail').textContent = user.email;
        loadLocationStats();
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });
});

function loadLocationStats() {
    const locations = ['Rathinam Main Gate', 'Rathinam Gate 1', 'Rathinam Gate 3'];
    
    locations.forEach(location => {
        const slotsQuery = query(
            collection(db, 'parking_slots'),
            where('location', '==', location)
        );

        onSnapshot(slotsQuery, (snapshot) => {
            let total = 0;
            let available = 0;

            snapshot.forEach((doc) => {
                total++;
                const status = (doc.data().status || '').toLowerCase();
                if (status === 'available') available++;
            });

            const locationKey = location.replace(/\s+/g, '').replace('Rathinam', '');
            const totalId = locationKey.charAt(0).toLowerCase() + locationKey.slice(1) + 'Total';
            const availableId = locationKey.charAt(0).toLowerCase() + locationKey.slice(1) + 'Available';

            const totalElement = document.getElementById(totalId);
            const availableElement = document.getElementById(availableId);

            if (totalElement) totalElement.textContent = total;
            if (availableElement) availableElement.textContent = available;
        });
    });
}

window.selectLocation = function(location) {
    localStorage.setItem('selectedLocation', location);
    window.location.href = 'dashboard.html';
};
