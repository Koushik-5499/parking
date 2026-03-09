// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    sendPasswordResetEmail 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';

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
const googleProvider = new GoogleAuthProvider();

// Toggle password visibility
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const emailInput = document.querySelector('input[type="email"]');

togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Show loading state
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

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'background: #fee; color: #c33; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; border: 1px solid #fcc;';
    
    const form = document.querySelector('.login-form');
    const existingError = form.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    form.insertBefore(errorDiv, form.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = 'background: #efe; color: #3a3; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-size: 14px; border: 1px solid #cfc;';
    
    const form = document.querySelector('.login-form');
    const existingSuccess = form.querySelector('.success-message');
    if (existingSuccess) existingSuccess.remove();
    
    form.insertBefore(successDiv, form.firstChild);
}

// Email/Password Login
const loginForm = document.querySelector('.login-form');
const loginBtn = loginForm.querySelector('.login-btn');

loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }
    
    setLoading(loginBtn, true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        showSuccess('Login successful! Redirecting...');
        console.log('User logged in:', userCredential.user);
        
        // Check if admin or customer
        if (userCredential.user.email === 'koushik123@gmail.com') {
            // Admin - redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
        } else {
            // Customer - redirect to location selection
            setTimeout(() => {
                window.location.href = 'locations.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Login error:', error);
        
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
        
        showError(errorMessage);
        loginBtn.textContent = 'Login';
        loginBtn.disabled = false;
        loginBtn.style.opacity = '1';
    }
});

// Google Sign-In
const googleBtn = document.querySelector('.google-btn');
googleBtn.addEventListener('click', async function() {
    const originalContent = this.innerHTML;
    setLoading(this, true);
    
    try {
        const result = await signInWithPopup(auth, googleProvider);
        showSuccess('Google sign-in successful! Redirecting...');
        console.log('User logged in with Google:', result.user);
        
        // Check if admin or customer
        if (result.user.email === 'koushik123@gmail.com') {
            // Admin - redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1500);
        } else {
            // Customer - redirect to location selection
            setTimeout(() => {
                window.location.href = 'locations.html';
            }, 1500);
        }
        
    } catch (error) {
        console.error('Google sign-in error:', error);
        
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
        
        showError(errorMessage);
        this.innerHTML = originalContent;
        this.disabled = false;
        this.style.opacity = '1';
    }
});

// Forgot Password
const forgotPasswordLink = document.querySelector('.forgot-password');
forgotPasswordLink.addEventListener('click', async function(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    
    if (!email) {
        showError('Please enter your email address first');
        emailInput.focus();
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset email sent! Check your inbox.');
    } catch (error) {
        console.error('Password reset error:', error);
        
        let errorMessage = 'Failed to send reset email';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
        }
        
        showError(errorMessage);
    }
});
