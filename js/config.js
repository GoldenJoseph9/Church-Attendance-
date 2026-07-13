// ============================================
// FIREBASE CONFIGURATION - Realtime Database
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCuCuB3ut7VtgXT8wjCbkoa6d-mCUtn0v8",
    authDomain: "intelbot-pro.firebaseapp.com",
    databaseURL: "https://intelbot-pro-default-rtdb.firebaseio.com",
    projectId: "intelbot-pro",
    storageBucket: "intelbot-pro.firebasestorage.app",
    messagingSenderId: "965416048215",
    appId: "1:965416048215:web:e6f4672239bdcb314db512",
    measurementId: "G-F00FKNVMRT"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

const auth = firebase.auth();
const db = firebase.database();

// ============================================
// FIX: Declare isFirebaseConnected BEFORE using it
// ============================================
let isFirebaseConnected = false;
let currentUser = null;
let appInitialized = false;
let analyticsChart = null;
let modalMemberId = null;

// Listen to connection status
db.ref('.info/connected').on('value', (snap) => {
    const connected = snap.val();
    console.log('📡 Firebase connection:', connected ? 'Connected ✅' : 'Disconnected ❌');
    isFirebaseConnected = connected;
    if (typeof updateCloudStatus === 'function') {
        updateCloudStatus(connected, connected ? 'Connected ✓' : 'Offline');
    }
});

console.log('✅ Config loaded');