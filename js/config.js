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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // Realtime Database

// PDF.js Configuration
const pdfjsLib = window.pdfjsLib;
if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Global Variables
let currentUser = null;
let isFirebaseConnected = false;
let importDataCache = null;
let appInitialized = false;
let analyticsChart = null;
let modalMemberId = null;

console.log('✅ Config loaded (Realtime Database)');