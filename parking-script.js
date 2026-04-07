import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    sendEmailVerification,
    setPersistence,
    browserLocalPersistence,
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
        // Already logged in → go to dashboard
        if (user.email === 'koushik4680@gmail.com') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'locations.html';
        }
    }
});

function showAlert(message, type) {
    const existing = document.querySelector('.auth-alert');
    if (existing) existing.remove();

    const alertDiv = document.createElement('div');
    alertDiv.className = `auth-alert auth-alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    const form = document.querySelector('.login-form');
    const existingAlerts = form.querySelectorAll('.auth-alert, .error-message, .success-message');
    existingAlerts.forEach(el => el.remove());

    form.insertBefore(alertDiv, form.firstChild);

    if (type === 'success') {
        setTimeout(() => alertDiv.remove(), 6000);
    } else {
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.style.opacity = '0.7';
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.disabled = false;
        button.style.opacity = '1';
    }
}

const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const emailInput = document.querySelector('input[type="email"]');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

const loginForm = document.querySelector('.login-form');
const loginBtn = loginForm.querySelector('.login-btn');

loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAlert('Please enter both email and password', 'error');
        return;
    }

    setLoading(loginBtn, true);

    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await user.reload();

        if (user.emailVerified) {
            showAlert('Login successful! Redirecting...', 'success');

            if (user.email === 'koushik4680@gmail.com') {
                setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1500);
            } else {
                setTimeout(() => { window.location.href = 'locations.html'; }, 1500);
            }
        } else {
            showAlert('Please verify your email first. Check your inbox for the verification link.', 'warning');
            loginBtn.textContent = 'Login';
            loginBtn.disabled = false;
            loginBtn.style.opacity = '1';

            const resendBtn = document.getElementById('resendVerificationBtn');
            if (resendBtn) resendBtn.style.display = 'flex';
        }

    } catch (error) {
        let errorMessage = 'Login failed. Please try again.';

        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address format';
                break;
            case 'auth/user-disabled':
                errorMessage = 'This account has been disabled';
                break;
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Invalid email or password';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later';
                break;
        }

        showAlert(errorMessage, 'error');
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
        loginBtn.style.opacity = '1';
    }
});

const resendBtn = document.getElementById('resendVerificationBtn');
if (resendBtn) {
    resendBtn.addEventListener('click', async function () {
        const user = auth.currentUser;

        if (user) {
            try {
                await sendEmailVerification(user);
                showAlert('Check your email for verification. If not found, check Spam/Junk folder.', 'success');
            } catch (error) {
                if (error.code === 'auth/too-many-requests') {
                    showAlert('Too many requests. Please try again later.', 'error');
                } else {
                    showAlert(error.message, 'error');
                }
            }
        } else {
            showAlert('Please login first to resend verification email.', 'error');
        }
    });
}

const googleBtn = document.querySelector('.google-btn');
googleBtn.addEventListener('click', async function () {
    const originalContent = this.innerHTML;
    setLoading(this, true);

    try {
        const result = await signInWithPopup(auth, googleProvider);
        showAlert('Google sign-in successful! Redirecting...', 'success');

        if (result.user.email === 'koushik4680@gmail.com') {
            setTimeout(() => { window.location.href = 'admin-dashboard.html'; }, 1500);
        } else {
            setTimeout(() => { window.location.href = 'locations.html'; }, 1500);
        }

    } catch (error) {
        let errorMessage = 'Google sign-in failed';

        switch (error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = 'Sign-in cancelled';
                break;
            case 'auth/popup-blocked':
                errorMessage = 'Popup blocked. Please allow popups for this site';
                break;
            case 'auth/account-exists-with-different-credential':
                errorMessage = 'An account already exists with this email';
                break;
        }

        showAlert(errorMessage, 'error');
        this.innerHTML = originalContent;
        this.disabled = false;
        this.style.opacity = '1';
    }
});

const forgotPasswordLink = document.querySelector('.forgot-password');
forgotPasswordLink.addEventListener('click', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (!email) {
        showAlert('Please enter your email address first', 'error');
        emailInput.focus();
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showAlert('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
        let errorMessage = 'Failed to send reset email';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        }

        showAlert(errorMessage, 'error');
    }
});
