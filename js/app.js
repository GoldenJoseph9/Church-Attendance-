// ============================================
// APP.JS - Main Initialization (Loads LAST)
// ============================================

// ============================================
// AUTO-DETECT SERVICE TYPE
// ============================================

function setDefaultService() {
    const select = document.getElementById('activeService');
    if (!select) return;
    
    const day = new Date().getDay(); // 0=Sunday, 3=Wednesday
    
    if (day === 0) {
        // Sunday - default to 1st service
        select.value = 'Sunday 1st';
        document.getElementById('serviceStatus').textContent = '✓ Sunday';
    } else if (day === 3) {
        select.value = 'Wednesday';
        document.getElementById('serviceStatus').textContent = '✓ Wednesday';
    } else {
        // Not a service day - default to Sunday 1st
        select.value = 'Sunday 1st';
        document.getElementById('serviceStatus').textContent = '⚠️ No service';
    }
}

// Update service status when user manually changes
document.addEventListener('DOMContentLoaded', function() {
    const select = document.getElementById('activeService');
    if (select) {
        select.addEventListener('change', function() {
            document.getElementById('serviceStatus').textContent = '✓ Manual';
        });
    }
});

function loadAllViews() {
    loadTodayAttendance();
    loadMembers();
    loadFirstTimers();
    loadSecondTimers();
    loadAbsentees();
    loadAnalytics();
}

function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;
    
    console.log('🚀 Initializing app for user:', currentUser ? currentUser.email : 'None');
    
    // Set default service
    setDefaultService();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('markDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
    });
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
    
    updateStats();
    loadAllViews();
    updateStorageInfo();
    populateAddressFilters();
    
    setTimeout(() => {
        DB.loadFromFirebase().then((loaded) => {
            if (loaded) {
                updateStats();
                loadAllViews();
                updateStorageInfo();
                populateAddressFilters();
                showNotification('Data synced from cloud!', 'success');
            }
        });
    }, 1000);
    
    setTimeout(() => {
        if (typeof tryFirebaseConnection === 'function') {
            tryFirebaseConnection();
        }
    }, 2000);
    
    setTimeout(() => {
        document.getElementById('memberSearch').focus();
    }, 300);
    
    console.log('✅ App initialized');
}

// ============================================
// AUTH STATE LISTENER - FIXED (no duplicates)
// ============================================

// Remove any existing listeners to avoid duplicates
if (window._authListenerAdded) {
    console.log('Auth listener already added, skipping');
} else {
    window._authListenerAdded = true;
    
    auth.onAuthStateChanged(user => {
        console.log('🔐 Auth state changed:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
            currentUser = user;
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('appContainer').classList.add('visible');
            document.getElementById('userName').textContent = user.email ? user.email.split('@')[0] : 'User';
            document.getElementById('userBadge').style.display = 'flex';
            
            console.log('👤 User logged in:', user.email);
            
            initializeApp();
        } else {
            currentUser = null;
            document.getElementById('loginPage').classList.remove('hidden');
            document.getElementById('appContainer').classList.remove('visible');
            document.getElementById('loginError').className = 'login-error';
            document.getElementById('loginError').textContent = '';
            console.log('👤 User logged out');
        }
    });
}

// ============================================
// AUTO REFRESH
// ============================================

setInterval(() => {
    updateStats();
    if (document.getElementById('section-today').classList.contains('active')) {
        loadTodayAttendance();
    }
}, 30000);

console.log('⛪ Usher Tracker v10 - Cleaned & Optimized');
console.log('👥 Members:', DB.getMembers().length);
console.log('📋 Attendance:', DB.getAttendance().length);
console.log('🔥 Firebase:', isFirebaseConnected ? 'Connected' : 'Disconnected');
console.log('👤 User:', currentUser ? currentUser.email : 'Not logged in');