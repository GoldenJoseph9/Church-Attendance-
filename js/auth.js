// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginError').className = 'login-error';
    document.getElementById('loginError').textContent = '';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('signupError').className = 'login-error';
    document.getElementById('signupError').textContent = '';
}

async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        errorEl.className = 'login-error visible';
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.className = 'login-error visible';
    }
}

async function signupUser() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorEl = document.getElementById('signupError');
    
    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        errorEl.className = 'login-error visible';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.className = 'login-error visible';
        return;
    }
    
    try {
        await auth.createUserWithEmailAndPassword(email, password);
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.className = 'login-error visible';
    }
}

async function logoutUser() {
    await auth.signOut();
}

function updateCloudStatus(connected, message) {
    const dot = document.getElementById('cloudDot');
    const text = document.getElementById('cloudText');
    if (connected) {
        dot.className = 'status-dot connected';
        text.textContent = message || 'Connected';
        isFirebaseConnected = true;
    } else {
        dot.className = 'status-dot disconnected';
        text.textContent = message || 'Offline';
        isFirebaseConnected = false;
    }
}

// ============================================
// FIREBASE CONNECTION CHECK - Realtime DB
// ============================================

function tryFirebaseConnection() {
    if (!currentUser) {
        console.log('No user logged in, skipping connection check');
        return;
    }
    
    console.log('🔄 Checking Firebase Realtime DB connection...');
    
    db.ref('_test/ping').set({
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        uid: currentUser.uid
    }).then(() => {
        updateCloudStatus(true, 'Connected ✓');
        console.log('✅ Firebase Realtime DB connected');
    }).catch((error) => {
        console.warn('⚠️ Firebase connection failed:', error.message);
        updateCloudStatus(false, 'Offline');
        setTimeout(tryFirebaseConnection, 30000);
    });
}

console.log('🔥 Auth module loaded');