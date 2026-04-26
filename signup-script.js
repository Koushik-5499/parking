import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

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
const googleProvider = new GoogleAuthProvider();

// 🔥 AUTO REDIRECT (runs on page load)
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Check if user signed up with email/password and hasn't verified email
        const isEmailPasswordUser = user.providerData.some(p => p.providerId === 'password');
        if (isEmailPasswordUser && !user.emailVerified) {
            // Don't auto-redirect unverified email/password users
            return;
        }

        // Already logged in & verified → go to dashboard
        if (user.email === 'koushik4680@gmail.com') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'locations.html';
        }
    }
});

function showAlert(message, type, onDismiss) {
    const existing = document.querySelector('.auth-alert');
    if (existing) existing.remove();

    const alertDiv = document.createElement('div');
    alertDiv.className = `auth-alert auth-alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    const form = document.querySelector('.signup-form');
    form.insertBefore(alertDiv, form.firstChild);

    const duration = type === 'success' ? 8000 : 5000;
    setTimeout(() => {
        alertDiv.remove();
        if (onDismiss) onDismiss();
    }, duration);
}

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('signupPassword');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

const signupForm = document.querySelector('.signup-form');
const signupBtn = signupForm.querySelector('.login-btn');
const emailInput = document.getElementById('signupEmail');

signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAlert('Please enter both email and password', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters long', 'error');
        return;
    }

    signupBtn.disabled = true;
    signupBtn.style.opacity = '0.7';
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);

        // Sign out the user immediately so they can't bypass email verification
        await signOut(auth);

        showAlert('Account created! Check your email for verification. After verifying, you can login.', 'success', () => {
            window.location.href = 'index.html';
        });

        signupBtn.textContent = 'Sign Up';
        signupBtn.disabled = false;
        signupBtn.style.opacity = '1';

    } catch (error) {
        let errorMessage = error.message;

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already registered. Please login instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Please use a stronger password.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled. Please contact support.';
                break;
        }

        showAlert(errorMessage, 'error');
        signupBtn.textContent = 'Sign Up';
        signupBtn.disabled = false;
        signupBtn.style.opacity = '1';
    }
});

const googleBtn = document.querySelector('.google-btn');
googleBtn.addEventListener('click', async function () {
    this.disabled = true;
    this.style.opacity = '0.7';
    const originalContent = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    try {
        const result = await signInWithPopup(auth, googleProvider);

        showAlert('Google Login Successful! Redirecting...', 'success');

        if (result.user.email === 'koushik4680@gmail.com') {
            setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1500);
        } else {
            setTimeout(() => { window.location.href = 'locations.html'; }, 1500);
        }

    } catch (error) {
        showAlert(error.message, 'error');
        this.innerHTML = originalContent;
        this.disabled = false;
        this.style.opacity = '1';
    }
});
