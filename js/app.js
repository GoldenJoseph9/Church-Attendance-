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
        select.value = 'Sunday 1st';
        document.getElementById('serviceStatus').textContent = '✓ Sunday';
    } else if (day === 3) {
        select.value = 'Wednesday';
        document.getElementById('serviceStatus').textContent = '✓ Wednesday';
    } else {
        select.value = 'Sunday 1st';
        document.getElementById('serviceStatus').textContent = '⚠️ No service';
    }
}

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

// ============================================
// UPDATE ROLE BADGE
// ============================================

function updateRoleBadge() {
    const badge = document.getElementById('roleBadge');
    if (!badge) return;
    
    const role = window.userRole || localStorage.getItem('userRole') || 'pending';
    const isSuperAdmin = window.isSuperAdmin || localStorage.getItem('isSuperAdmin') === 'true';
    
    if (isSuperAdmin || role === 'super_admin') {
        badge.textContent = '👑 Super Admin';
    } else if (role === 'admin') {
        badge.textContent = '🛡️ Admin';
    } else if (role === 'mvp') {
        badge.textContent = '⭐ MVP Team';
    } else {
        badge.textContent = '⏳ Pending';
        badge.style.background = 'rgba(255,255,255,0.2)';
    }
    badge.style.display = 'inline-block';
}

// ============================================
// LOAD ROLE-BASED UI - FIXED
// ============================================

function loadRoleBasedUI() {
    const role = window.userRole || localStorage.getItem('userRole') || 'pending';
    const isSuperAdmin = window.isSuperAdmin || localStorage.getItem('isSuperAdmin') === 'true';
    
    // Get all tabs and sections
    const allTabs = document.querySelectorAll('.tab');
    const allSections = document.querySelectorAll('.section');
    
    // ============================================
    // FIRST: Reset ALL tabs and sections to visible
    // This ensures when switching roles, everything is shown first
    // ============================================
    allTabs.forEach(tab => {
        tab.style.display = '';
        tab.style.visibility = '';
    });
    allSections.forEach(section => {
        section.style.display = '';
        section.style.visibility = '';
    });
    
    // Reset stats cards visibility
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        const cards = statsGrid.querySelectorAll('.stat-card');
        cards.forEach(card => {
            card.style.display = '';
            card.style.visibility = '';
        });
    }
    
    // Reset service selector visibility
    const serviceSelector = document.querySelector('.header-actions > div[style*="display:flex"]');
    if (serviceSelector) {
        serviceSelector.style.display = 'flex';
        serviceSelector.style.visibility = '';
    }
    
    // ============================================
    // SUPER ADMIN - Full Access
    // ============================================
    if (isSuperAdmin || role === 'super_admin') {
        console.log('👑 Loading Super Admin UI');
        // Everything is already shown from reset
        
        // Ensure user name is set (Super Admin might not be in /users/)
        const user = auth.currentUser;
        if (user) {
            const displayName = user.displayName || 'Super Admin';
            const userNameEl = document.getElementById('userName');
            if (userNameEl) {
                userNameEl.textContent = displayName;
            }
        }
        
        setTimeout(function() {
            if (typeof loadAdminPanel === 'function') {
                loadAdminPanel();
            }
        }, 500);
        
        showTab('mark');
        return;
    }
    
    // ============================================
    // ADMIN - Full Access
    // ============================================
    if (role === 'admin') {
        console.log('🛡️ Loading Admin UI');
        // Everything is already shown from reset
        
        // Load admin panel for admins too
        setTimeout(function() {
            if (typeof loadAdminPanel === 'function') {
                loadAdminPanel();
            }
        }, 500);
        
        showTab('mark');
        return;
    }
    
    // ============================================
    // MVP - Limited Access (HIDE certain tabs/sections)
    // ============================================
    if (role === 'mvp') {
        console.log('⭐ Loading MVP UI');
        
        // Show ONLY MVP sections - hide everything else
        const mvpSections = ['section-mark', 'section-today', 'section-firstTimers', 'section-secondTimers'];
        allSections.forEach(section => {
            const sectionId = section.id;
            if (mvpSections.includes(sectionId)) {
                section.style.display = '';
            } else {
                section.style.display = 'none';
            }
        });
        
        // Show ONLY MVP tabs - hide everything else
        const mvpTabs = ['mark', 'today', 'firstTimers', 'secondTimers'];
        allTabs.forEach(tab => {
            const tabName = tab.getAttribute('data-tab');
            if (mvpTabs.includes(tabName)) {
                tab.style.display = '';
            } else {
                tab.style.display = 'none';
            }
        });
        
        // Hide stats cards for Members and At Risk
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid) {
            const cards = statsGrid.querySelectorAll('.stat-card');
            cards.forEach(card => {
                const onclick = card.getAttribute('onclick') || '';
                if (onclick.includes('members') || onclick.includes('absentees')) {
                    card.style.display = 'none';
                } else {
                    card.style.display = '';
                }
            });
        }
        
        // Hide service selector
        const serviceSelector = document.querySelector('.header-actions > div[style*="display:flex"]');
        if (serviceSelector) {
            serviceSelector.style.display = 'none';
        }
        
        const adminPanel = document.getElementById('adminApprovalPanel');
        if (adminPanel) adminPanel.remove();
        
        showTab('mark');
        return;
    }
    
    // ============================================
    // PENDING - Show nothing (hide everything)
    // ============================================
    console.log('⏳ Pending role:', role);
    
    // Hide everything for pending users
    allTabs.forEach(tab => tab.style.display = 'none');
    allSections.forEach(section => section.style.display = 'none');
    
    const appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.classList.remove('visible');
        const loginPage = document.getElementById('loginPage');
        if (loginPage) {
            loginPage.classList.remove('hidden');
            const errorEl = document.getElementById('loginError');
            if (errorEl) {
                errorEl.className = 'login-error visible';
                errorEl.innerHTML = `
                    <div style="text-align:center; padding:10px;">
                        <div style="font-size:40px; margin-bottom:8px;">⏳</div>
                        <strong>Your account is pending approval</strong>
                        <p style="font-size:13px; margin-top:4px; color:#6B7280;">
                            Please wait for an admin to approve your account.<br>
                            You'll receive access once approved.
                        </p>
                        <button class="btn btn-primary" onclick="logoutUser()" style="margin-top:10px;">
                            <i class="fas fa-sign-out-alt"></i> Sign Out
                        </button>
                    </div>
                `;
            }
        }
    }
}

// ============================================
// INITIALIZE APP
// ============================================

function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;
    
    const role = window.userRole || localStorage.getItem('userRole') || 'pending';
    const isSuperAdmin = window.isSuperAdmin || localStorage.getItem('isSuperAdmin') === 'true';
    
    console.log('🚀 Initializing app for user:', currentUser ? currentUser.email : 'None');
    console.log('👤 Role:', role);
    
    // ============================================
    // SET USER NAME - Handles Super Admin without /users/
    // ============================================
    const user = auth.currentUser;
    const userNameEl = document.getElementById('userName');
    
    if (isSuperAdmin || role === 'super_admin') {
        // Super Admin - get name from auth or fallback
        if (user) {
            userNameEl.textContent = user.displayName || 'Super Admin';
        } else {
            userNameEl.textContent = 'Super Admin';
        }
        console.log('👑 Super Admin name set to:', userNameEl.textContent);
    } else if (user) {
        // Regular user - try to get from DB or fallback
        const dbName = user.displayName || user.email.split('@')[0] || 'User';
        userNameEl.textContent = dbName;
    }
    
    updateRoleBadge();
    loadRoleBasedUI();
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('markDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric'
    });
    document.getElementById('todayDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });
    
    // ============================================
    // LOAD DATA - SAME for ALL roles
    // ============================================
    console.log('📥 Loading data from Firebase...');
    
    DB.loadFromFirebase()
        .then((loaded) => {
            console.log('📊 Data loaded:', loaded);
            console.log('📋 Members in DB:', DB.getMembers().length);
            console.log('📋 Attendance in DB:', DB.getAttendance().length);
            
            // Set up real-time listener
            DB.listenForUpdates(function(members, attendance) {
                console.log('🔄 Real-time update - refreshing UI...');
                
                const role = window.userRole || localStorage.getItem('userRole') || 'pending';
                
                if (role === 'mvp') {
                    updateMVPStats();
                    loadTodayAttendance();
                    loadFirstTimers();
                    loadSecondTimers();
                } else {
                    updateStats();
                    loadAllViews();
                    updateStorageInfo();
                    populateLocationFilters();
                    populateFilterDropdowns();
                }
                
                showNotification('🔄 Data updated from cloud', 'info');
            });
            
            if (role === 'mvp') {
                // MVP - only update timer stats and views
                updateMVPStats();
                loadTodayAttendance();
                loadFirstTimers();
                loadSecondTimers();
            } else {
                // Admin/Super Admin - load ALL views
                updateStats();
                loadAllViews();
                updateStorageInfo();
                populateLocationFilters();
                populateFilterDropdowns();
            }
            
            if (loaded) {
                showNotification('✅ Data loaded from cloud!', 'success');
            } else {
                showNotification('📭 No data found. Add members to get started.', 'info');
            }
            
            setTimeout(() => {
                const searchInput = document.getElementById('memberSearch');
                if (searchInput) searchInput.focus();
            }, 300);
        })
        .catch((error) => {
            console.error('❌ Error loading data:', error);
            showNotification('❌ Error loading data: ' + error.message, 'error');
        });
    
    // Connection check
    setTimeout(() => {
        if (typeof tryFirebaseConnection === 'function') {
            tryFirebaseConnection();
        }
    }, 2000);
    
    console.log('✅ App initialized');
}

// ============================================
// MVP UPDATE STATS
// ============================================

function updateMVPStats() {
    const stats = DB.getStats();
    const todayCount = document.getElementById('todayCount');
    const firstTimerCount = document.getElementById('firstTimerCount');
    const secondTimerCount = document.getElementById('secondTimerCount');
    
    if (todayCount) todayCount.textContent = stats.todayAttendance;
    if (firstTimerCount) firstTimerCount.textContent = stats.firstTimers;
    if (secondTimerCount) secondTimerCount.textContent = stats.secondTimers;
}

// ============================================
// AUTH STATE LISTENER - FIXED: Super Admin returns early
// ============================================

// Only add listener if not already added (prevent duplicates)
if (window._authListenerAdded) {
    console.log('Auth listener already added, skipping');
} else {
    window._authListenerAdded = true;
    
    auth.onAuthStateChanged(async user => {
        console.log('🔐 Auth state changed:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
            currentUser = user;
            
            // ============================================================
            // CHECK SUPER ADMIN FIRST - RETURN EARLY, DON'T CHECK /users/
            // ============================================================
            const adminCheck = await db.ref('admins/' + user.uid).once('value');
            const isSuperAdmin = adminCheck.val() === true || 
                                 SUPER_ADMINS.includes(user.email) || 
                                 user.uid === SUPER_ADMIN_UID;
            
            if (isSuperAdmin) {
                window.userRole = 'super_admin';
                window.isSuperAdmin = true;
                localStorage.setItem('userRole', 'super_admin');
                localStorage.setItem('isSuperAdmin', 'true');
                console.log('👑 Logged in as Super Admin (via admins path)');
                
                // Set name from auth or fallback
                const displayName = user.displayName || 'Super Admin';
                document.getElementById('userName').textContent = displayName;
                document.getElementById('userBadge').style.display = 'flex';
                
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('appContainer').classList.add('visible');
                
                updateRoleBadge();
                loadRoleBasedUI();
                
                if (!appInitialized) initializeApp();
                
                // ============================================================
                // CRITICAL: RETURN HERE - DON'T CHECK /users/ FOR SUPER ADMIN
                // ============================================================
                return;
            }
            
            // ============================================================
            // CHECK NORMAL USER FROM /users/ (ONLY for non-Super Admin)
            // ============================================================
            try {
                const userData = await getUserData(user.uid);
                const role = userData.role || 'pending';
                const approved = userData.approved === true;
                
                if (!approved) {
                    window.userRole = 'pending';
                    window.isSuperAdmin = false;
                    localStorage.setItem('userRole', 'pending');
                    localStorage.setItem('isSuperAdmin', 'false');
                    console.log('⏳ Account pending approval');
                    
                    document.getElementById('loginPage').classList.remove('hidden');
                    document.getElementById('appContainer').classList.remove('visible');
                    
                    const errorEl = document.getElementById('loginError');
                    if (errorEl) {
                        errorEl.className = 'login-error visible';
                        errorEl.innerHTML = `
                            <div style="text-align:center; padding:10px;">
                                <div style="font-size:40px; margin-bottom:8px;">⏳</div>
                                <strong>Your account is pending approval</strong>
                                <p style="font-size:13px; margin-top:4px; color:#6B7280;">
                                    Please wait for an admin to approve your account.
                                </p>
                                <button class="btn btn-primary" onclick="logoutUser()" style="margin-top:10px;">
                                    <i class="fas fa-sign-out-alt"></i> Sign Out
                                </button>
                            </div>
                        `;
                    }
                    return;
                }
                
                const validRoles = ['admin', 'mvp', 'super_admin'];
                if (!validRoles.includes(role)) {
                    console.log('⚠️ Invalid role:', role);
                    window.userRole = 'pending';
                    window.isSuperAdmin = false;
                    localStorage.setItem('userRole', 'pending');
                    localStorage.setItem('isSuperAdmin', 'false');
                    await auth.signOut();
                    return;
                }
                
                window.userRole = role;
                window.isSuperAdmin = false;
                localStorage.setItem('userRole', role);
                localStorage.setItem('isSuperAdmin', 'false');
                console.log('✅ Logged in as:', role);
                
                document.getElementById('loginPage').classList.add('hidden');
                document.getElementById('appContainer').classList.add('visible');
                document.getElementById('userName').textContent = userData.fullName || user.email.split('@')[0];
                document.getElementById('userBadge').style.display = 'flex';
                
                updateRoleBadge();
                loadRoleBasedUI();
                
                if (!appInitialized) initializeApp();
                
            } catch (e) {
                console.warn('Error checking user status:', e);
                window.userRole = 'pending';
                window.isSuperAdmin = false;
                localStorage.setItem('userRole', 'pending');
                localStorage.setItem('isSuperAdmin', 'false');
                document.getElementById('loginPage').classList.remove('hidden');
                document.getElementById('appContainer').classList.remove('visible');
            }
            
        } else {
            currentUser = null;
            window.userRole = null;
            window.isSuperAdmin = false;
            localStorage.removeItem('userRole');
            localStorage.removeItem('isSuperAdmin');
            appInitialized = false;
            
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
    const role = window.userRole || localStorage.getItem('userRole') || 'pending';
    if (role === 'mvp') {
        updateMVPStats();
    } else {
        updateStats();
    }
    if (document.getElementById('section-today')?.classList.contains('active')) {
        loadTodayAttendance();
    }
}, 30000);

console.log('⛪ Usher Tracker v11 - Fixed');
console.log('👥 Members:', DB.getMembers().length);
console.log('📋 Attendance:', DB.getAttendance().length);
console.log('🔥 Firebase:', isFirebaseConnected ? 'Connected' : 'Disconnected');
console.log('👤 User:', currentUser ? currentUser.email : 'Not logged in');