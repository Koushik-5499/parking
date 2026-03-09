// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import {
    getAuth,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
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
const passwordInput = document.getElementById('signupPassword');

togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);

    this.classList.toggle('fa-eye');
    this.classList.toggle('fa-eye-slash');
});

// Sign Up Form Handler
const signupForm = document.querySelector('.signup-form');
const signupBtn = signupForm.querySelector('.login-btn');
const emailInput = document.getElementById('signupEmail');

signupForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validation
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    // Show loading state
    signupBtn.disabled = true;
    signupBtn.style.opacity = '0.7';
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User created:', userCredential.user);

        alert('Account created successfully!');

        // Redirect to login page
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Sign up error:', error);

        let errorMessage = error.message;

        // User-friendly error messages
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

        alert(errorMessage);

        // Reset button state
        signupBtn.textContent = 'Sign Up';
        signupBtn.disabled = false;
        signupBtn.style.opacity = '1';
    }
});

// Google Sign-In
const googleBtn = document.querySelector('.google-btn');
googleBtn.addEventListener('click', async function () {
    // Show loading state
    this.disabled = true;
    this.style.opacity = '0.7';
    const originalContent = this.innerHTML;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';

    try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('User signed up with Google:', result.user);

        alert('Google Login Successful');

        // Check if admin or customer
        if (result.user.email === 'koushik123@gmail.com') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'locations.html';
        }

    } catch (error) {
        console.error('Google sign-in error:', error);
        alert(error.message);

        // Reset button state
        this.innerHTML = originalContent;
        this.disabled = false;
        this.style.opacity = '1';
    }
});
