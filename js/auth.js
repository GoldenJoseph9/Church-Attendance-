// ============================================
// AUTHENTICATION - Fixed Email Verification + Roles
// ============================================

// SUPER ADMIN - Your UID (HARDCODED - ONLY YOU)
const SUPER_ADMIN_UID = 'Xdq2kxJK3Ob3AWF30y7t68jysXa2';
const SUPER_ADMINS = ['desupremelaundry@gmail.com'];
const REQUIRE_EMAIL_VERIFICATION = true;

// ============================================
// CHECK USER ROLE - Centralized
// ============================================

async function getUserRoleAndApproval(uid) {
    try {
        // ============================================================
        // First check if Super Admin (hardcoded UID)
        // ============================================================
        if (uid === SUPER_ADMIN_UID) {
            return { role: 'super_admin', approved: true };
        }
        
        // Then check admins path
        const adminCheck = await db.ref('admins/' + uid).once('value');
        if (adminCheck.val() === true) {
            return { role: 'super_admin', approved: true };
        }
        
        // For regular users, check /users/
        const userSnap = await db.ref('users/' + uid).once('value');
        const userData = userSnap.val();
        
        if (!userData) {
            return { role: 'pending', approved: false };
        }
        
        return {
            role: userData.role || 'pending',
            approved: userData.approved === true,
            fullName: userData.fullName || 'User'
        };
    } catch (error) {
        console.error('Error checking role:', error);
        return { role: 'pending', approved: false };
    }
}

// ============================================
// GET USER DATA - FIXED - NEVER CREATES SUPER ADMIN
// ============================================

async function getUserData(uid) {
    try {
        // ============================================================
        // CRITICAL: If Super Admin, return data WITHOUT checking /users/
        // This prevents the Super Admin from being created in /users/
        // ============================================================
        if (uid === SUPER_ADMIN_UID) {
            return {
                role: 'super_admin',
                approved: true,
                fullName: 'Super Admin'
            };
        }
        
        // Also check if in admins path
        const adminCheck = await db.ref('admins/' + uid).once('value');
        if (adminCheck.val() === true) {
            return {
                role: 'super_admin',
                approved: true,
                fullName: 'Super Admin'
            };
        }
        
        // For regular users, check /users/
        const snapshot = await db.ref('users/' + uid).once('value');
        return snapshot.val() || {};
    } catch (e) {
        return {};
    }
}

// ============================================
// SIGNUP - FIXED
// ============================================

async function signupUser() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const fullName = document.getElementById('signupFullName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const errorEl = document.getElementById('signupError');
    
    // Clear previous errors
    errorEl.className = 'login-error';
    errorEl.textContent = '';
    
    if (!email || !password || !fullName) {
        errorEl.textContent = 'Please fill in all required fields';
        errorEl.className = 'login-error visible';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters';
        errorEl.className = 'login-error visible';
        return;
    }
    
    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
        errorEl.textContent = 'Please enter a valid email address';
        errorEl.className = 'login-error visible';
        return;
    }
    
    try {
        const btn = document.querySelector('#signupForm .btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update profile
        await user.updateProfile({ displayName: fullName });
        
        // Send email verification
        if (REQUIRE_EMAIL_VERIFICATION) {
            await user.sendEmailVerification();
        }
        
        // Save user data - PENDING by default
        await db.ref('users/' + user.uid).set({
            email: email,
            fullName: fullName,
            phone: phone || '',
            role: 'pending',
            approved: false,
            emailVerified: false,
            requestedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Add to pending users list
        await db.ref('pendingUsers/' + user.uid).set({
            email: email,
            fullName: fullName,
            phone: phone || '',
            requestedAt: firebase.database.ServerValue.TIMESTAMP,
            uid: user.uid
        });
        
        // Sign out immediately - they need to verify email first
        await auth.signOut();
        
        // ============================================================
        // FIXED: Show verification success message properly
        // ============================================================
        const signupForm = document.getElementById('signupForm');
        const signupBox = document.querySelector('.login-box');
        
        // Hide signup form
        signupForm.style.display = 'none';
        
        // Remove any existing success messages
        const oldSuccess = document.getElementById('signupSuccess');
        if (oldSuccess) oldSuccess.remove();
        
        // Create success message
        const successDiv = document.createElement('div');
        successDiv.id = 'signupSuccess';
        successDiv.style.cssText = 'text-align:center; padding:20px;';
        successDiv.innerHTML = `
            <div style="font-size:48px; margin-bottom:12px;">📧</div>
            <h3 style="color: #1A7A42;">Verification Email Sent!</h3>
            <p style="color:var(--gray); margin-top:8px;">
                We've sent a verification link to<br>
                <strong style="font-size:16px; color:var(--dark);">${email}</strong>
            </p>
            <div style="background:#FFF3E0; padding:12px; border-radius:8px; margin:12px 0; text-align:left; font-size:13px; color:#E67E22; border-left:4px solid #F39C12;">
                <strong>⚠️ Important:</strong><br>
                • Check your <strong>Inbox</strong> and <strong>Spam/Junk</strong> folder<br>
                • Also check <strong>Promotions</strong> or <strong>Social</strong> tabs (Gmail users)<br>
                • If you don't see it, click <strong>"Resend Email"</strong> below
            </div>
            <div style="background:#D5F5E3; padding:12px; border-radius:8px; margin:12px 0; text-align:left; font-size:13px; color:#1A7A42;">
                <strong>✅ Next Steps:</strong><br>
                1. Click the verification link in your email<br>
                2. Wait for admin approval (you'll get access)<br>
                3. You'll be assigned: <strong>MVP</strong> (Timers) or <strong>Admin</strong> (Full)
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:12px;">
                <button class="btn btn-primary" onclick="resendSignupVerification('${email}')">
                    <i class="fas fa-envelope"></i> Resend Email
                </button>
                <button class="btn btn-outline" onclick="showLogin()">
                    <i class="fas fa-arrow-left"></i> Back to Login
                </button>
            </div>
        `;
        
        // Insert the success message after the signup form
        signupForm.parentNode.insertBefore(successDiv, signupForm.nextSibling);
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Request Access';
        }
        
        showNotification('📧 Verification email sent! Check your inbox.', 'success');
        
    } catch (error) {
        console.error('Signup error:', error);
        errorEl.textContent = error.message;
        errorEl.className = 'login-error visible';
        
        const btn = document.querySelector('#signupForm .btn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-user-plus"></i> Request Access';
        }
    }
}

// ============================================
// RESEND SIGNUP VERIFICATION EMAIL
// ============================================

async function resendSignupVerification(email) {
    if (!email) {
        showNotification('Email address not found', 'error');
        return;
    }
    
    try {
        const password = prompt('Enter your password to resend verification:');
        if (!password) return;
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            await user.sendEmailVerification();
            showNotification('📧 Verification email resent! Check your inbox and spam folder.', 'success');
            await db.ref('users/' + user.uid + '/requestedAt').set(firebase.database.ServerValue.TIMESTAMP);
        } else {
            showNotification('✅ Your email is already verified! Please wait for admin approval.', 'success');
        }
        
        await auth.signOut();
        
    } catch (error) {
        console.error('Resend error:', error);
        if (error.code === 'auth/user-not-found') {
            showNotification('❌ Account not found. Please sign up again.', 'error');
        } else if (error.code === 'auth/wrong-password') {
            showNotification('❌ Incorrect password. Please try again.', 'error');
        } else {
            showNotification('❌ Failed to resend: ' + error.message, 'error');
        }
    }
}

// ============================================
// RESEND VERIFICATION FROM LOGIN - FIXED
// ============================================

async function resendVerificationFromLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showNotification('Please enter your email and password first', 'error');
        return;
    }
    
    try {
        showNotification('📧 Resending verification email...', 'info');
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        if (!user.emailVerified) {
            await user.sendEmailVerification();
            showNotification('📧 Verification email resent! Check your inbox and spam folder.', 'success');
            
            // Show the resend verification message
            const resendDiv = document.getElementById('resendVerification');
            if (resendDiv) {
                resendDiv.style.display = 'block';
                document.getElementById('resendEmail').textContent = email;
                
                // Update the message
                resendDiv.innerHTML = `
                    <p style="font-size:13px; color:#E67E22; margin-bottom:8px;">
                        📧 Verification email resent to <strong>${email}</strong>
                    </p>
                    <p style="font-size:12px; color:#E67E22; margin-bottom:10px;">
                        ⚠️ Check your <strong>Inbox</strong>, <strong>Spam/Junk</strong>, and <strong>Promotions</strong> folders
                    </p>
                    <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn btn-sm btn-primary" onclick="resendVerificationFromLogin()">
                            <i class="fas fa-envelope"></i> Resend Again
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="showLogin()">
                            <i class="fas fa-sync"></i> Try Again
                        </button>
                    </div>
                `;
            }
        } else {
            showNotification('✅ Your email is already verified!', 'success');
        }
        
        await auth.signOut();
        
    } catch (error) {
        console.error('Resend error:', error);
        showNotification('❌ Failed to resend: ' + error.message, 'error');
    }
}

// ============================================
// LOGIN - FIXED with proper verification handling
// ============================================

async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    // Clear previous errors
    errorEl.className = 'login-error';
    errorEl.textContent = '';
    document.getElementById('resendVerification').style.display = 'none';
    
    if (!email || !password) {
        errorEl.textContent = 'Please enter email and password';
        errorEl.className = 'login-error visible';
        return;
    }
    
    try {
        const btn = document.querySelector('#loginForm .btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
        }
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // STEP 1: Check email verification
        if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
            // ============================================================
            // FIXED: Show proper verification message
            // ============================================================
            errorEl.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:32px; margin-bottom:8px;">📧</div>
                    <strong style="font-size:16px;">Verify Your Email First</strong>
                    <p style="font-size:13px; margin-top:6px; color:#6B7280;">
                        Please verify your email before signing in.
                    </p>
                    <div style="background:#FFF3E0; padding:10px; border-radius:6px; margin-top:8px; font-size:12px; color:#E67E22; text-align:left;">
                        ⚠️ Check your <strong>Inbox</strong>, <strong>Spam/Junk</strong>, and <strong>Promotions</strong> folders
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="resendVerificationFromLogin()" style="margin-top:10px;">
                        <i class="fas fa-envelope"></i> Resend Verification
                    </button>
                </div>
            `;
            errorEl.className = 'login-error visible';
            
            // Show the resend verification section
            const resendDiv = document.getElementById('resendVerification');
            if (resendDiv) {
                resendDiv.style.display = 'block';
                document.getElementById('resendEmail').textContent = email;
            }
            
            await auth.signOut();
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
            return;
        }
        
        // ============================================================
        // STEP 2: CHECK SUPER ADMIN FIRST - DO NOT CHECK /users/
        // ============================================================
        const adminCheck = await db.ref('admins/' + user.uid).once('value');
        const isSuperAdmin = adminCheck.val() === true || 
                             SUPER_ADMINS.includes(email) || 
                             user.uid === SUPER_ADMIN_UID;
        
        if (isSuperAdmin) {
            // Make sure Super Admin is in admins path
            if (adminCheck.val() !== true) {
                await db.ref('admins/' + user.uid).set(true);
            }
            
            window.userRole = 'super_admin';
            window.isSuperAdmin = true;
            localStorage.setItem('userRole', 'super_admin');
            localStorage.setItem('isSuperAdmin', 'true');
            console.log('👑 Logged in as Super Admin');
            
            // Get name from auth or fallback
            const displayName = user.displayName || 'Super Admin';
            
            // Show app - SKIP /users/ check entirely
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('appContainer').classList.add('visible');
            document.getElementById('userName').textContent = displayName;
            document.getElementById('userBadge').style.display = 'flex';
            
            updateRoleBadge();
            loadRoleBasedUI();
            
            if (!appInitialized) {
                initializeApp();
            } else {
                updateStats();
                loadAllViews();
                updateStorageInfo();
                if (typeof populateLocationFilters === 'function') populateLocationFilters();
                if (typeof populateFilterDropdowns === 'function') populateFilterDropdowns();
            }
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
            
            // ============================================================
            // CRITICAL: RETURN HERE - Don't check /users/
            // ============================================================
            return;
        }
        
        // ============================================================
        // STEP 3: Check normal user from /users/ (ONLY for non-Super Admin)
        // ============================================================
        const userSnap = await db.ref('users/' + user.uid).once('value');
        const userData = userSnap.val();
        
        // 🛡️ SAFETY: Double-check this isn't Super Admin
        if (user.uid === SUPER_ADMIN_UID) {
            console.warn('⚠️ Super Admin detected in /users/ - cleaning up...');
            await db.ref('users/' + user.uid).remove();
            // Handle as Super Admin
            window.userRole = 'super_admin';
            window.isSuperAdmin = true;
            localStorage.setItem('userRole', 'super_admin');
            localStorage.setItem('isSuperAdmin', 'true');
            
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('appContainer').classList.add('visible');
            document.getElementById('userName').textContent = user.displayName || 'Super Admin';
            document.getElementById('userBadge').style.display = 'flex';
            
            updateRoleBadge();
            loadRoleBasedUI();
            if (!appInitialized) initializeApp();
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
            return;
        }
        
        if (!userData) {
            errorEl.innerHTML = `
                <div style="text-align:center; padding:10px;">
                    <div style="font-size:40px; margin-bottom:8px;">🔍</div>
                    <strong style="font-size:16px;">Account Not Found</strong>
                    <p style="font-size:13px; margin-top:6px; color:#6B7280;">
                        No account found with this email.<br>
                        Please sign up first.
                    </p>
                    <button class="btn btn-sm btn-primary" onclick="showSignup()" style="margin-top:10px;">
                        <i class="fas fa-user-plus"></i> Sign Up
                    </button>
                </div>
            `;
            errorEl.className = 'login-error visible';
            await auth.signOut();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
            return;
        }
        
        // STEP 4: Check if approved
        if (!userData.approved) {
            // ============================================================
            // FIXED: Show proper approval waiting message
            // ============================================================
            errorEl.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:40px; margin-bottom:8px;">⏳</div>
                    <strong style="font-size:16px;">Account Pending Approval</strong>
                    <p style="font-size:13px; margin-top:6px; color:#6B7280;">
                        ✅ Your email has been verified.<br>
                        Now waiting for an admin to approve your account.
                    </p>
                    <div style="background:#EDE9FE; padding:10px; border-radius:6px; margin-top:8px; font-size:12px; color:#5A2FC7; text-align:left;">
                        <strong>📋 What happens next:</strong><br>
                        • An admin will review your request<br>
                        • You'll be assigned a role: <strong>MVP</strong> (Timers) or <strong>Admin</strong> (Full)<br>
                        • You'll receive access once approved<br>
                        • You can close this page and check back later
                    </div>
                    <button class="btn btn-sm btn-primary" onclick="logoutUser()" style="margin-top:10px;">
                        <i class="fas fa-sign-out-alt"></i> Sign Out
                    </button>
                </div>
            `;
            errorEl.className = 'login-error visible';
            
            await auth.signOut();
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
            return;
        }
        
        // STEP 5: Check valid role (admin or mvp only - NO SUPER ADMIN)
        const validRoles = ['admin', 'mvp'];
        if (!validRoles.includes(userData.role)) {
            errorEl.textContent = '⚠️ Your role is not configured properly. Please contact admin.';
            errorEl.className = 'login-error visible';
            await auth.signOut();
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            }
            return;
        }
        
        // ✅ STEP 6: Success - regular user (Moved emailVerified update here)
        window.userRole = userData.role;
        window.isSuperAdmin = false;
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('isSuperAdmin', 'false');
        
        // ✅ Update email verification status (ONLY for regular users)
        await db.ref('users/' + user.uid + '/emailVerified').set(true);
        
        console.log('✅ Logged in as:', userData.role);
        
        // Show app
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appContainer').classList.add('visible');
        document.getElementById('userName').textContent = userData.fullName || user.email.split('@')[0];
        document.getElementById('userBadge').style.display = 'flex';
        
        updateRoleBadge();
        loadRoleBasedUI();
        
        if (!appInitialized) {
            initializeApp();
        } else {
            updateStats();
            loadAllViews();
            updateStorageInfo();
            populateLocationFilters();
            populateFilterDropdowns();
        }
        
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
        
    } catch (error) {
        console.error('Login error:', error);
        errorEl.textContent = error.message;
        errorEl.className = 'login-error visible';
        
        const btn = document.querySelector('#loginForm .btn');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
    }
}

// ============================================
// LOGOUT - FIXED
// ============================================

async function logoutUser() {
    try {
        // Clear all local storage items
        localStorage.removeItem('userRole');
        localStorage.removeItem('isSuperAdmin');
        
        // Clear global variables
        window.userRole = null;
        window.isSuperAdmin = false;
        currentUser = null;
        appInitialized = false;
        
        // Sign out from Firebase
        await auth.signOut();
        
        // Hide app, show login
        document.getElementById('appContainer').classList.remove('visible');
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('loginError').className = 'login-error';
        document.getElementById('loginError').textContent = '';
        
        // Reset login form
        const loginBtn = document.querySelector('#loginForm .btn');
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }
        
        // Show login form
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('signupForm').style.display = 'none';
        document.getElementById('signupWaiting').style.display = 'none';
        document.getElementById('signupVerification').style.display = 'none';
        document.getElementById('resendVerification').style.display = 'none';
        
        // Remove success message if it exists
        const successDiv = document.getElementById('signupSuccess');
        if (successDiv) successDiv.remove();
        
        console.log('👤 User logged out successfully');
        showNotification('Logged out successfully', 'info');
        
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out: ' + error.message, 'error');
    }
}

// ============================================
// UI HELPERS - FIXED showLogin to preserve state
// ============================================

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('signupWaiting').style.display = 'none';
    document.getElementById('signupVerification').style.display = 'none';
    document.getElementById('resendVerification').style.display = 'none';
    document.getElementById('loginError').className = 'login-error';
    document.getElementById('loginError').textContent = '';
    document.getElementById('signupError').className = 'login-error';
    document.getElementById('signupError').textContent = '';
    
    // ============================================================
    // FIXED: Don't remove success message when going back to login
    // The user should see the success message until they click "Back to Login"
    // ============================================================
    // Only remove success if we're explicitly showing login form
    // But keep it if user clicks "Back to Login" from success page
    const successDiv = document.getElementById('signupSuccess');
    if (successDiv) {
        // Check if user is coming from signup or just switching tabs
        // If success message exists, keep it and just show login form below it
        // OR remove it and show login form
        const isFromSignup = document.querySelector('#signupSuccess + #loginForm') === null;
        if (isFromSignup) {
            // We're showing login from signup, keep success message visible
            // But we need to show login form below it
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.style.display = 'block';
                // The success message is above, login form below
            }
            return;
        }
        successDiv.remove();
    }
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('signupWaiting').style.display = 'none';
    document.getElementById('signupVerification').style.display = 'none';
    document.getElementById('resendVerification').style.display = 'none';
    document.getElementById('loginError').className = 'login-error';
    document.getElementById('loginError').textContent = '';
    document.getElementById('signupError').className = 'login-error';
    document.getElementById('signupError').textContent = '';
    
    // Remove success message if it exists
    const successDiv = document.getElementById('signupSuccess');
    if (successDiv) successDiv.remove();
}

// ============================================
// ROLE HELPERS
// ============================================

function isSuperAdmin() {
    return window.isSuperAdmin === true || localStorage.getItem('isSuperAdmin') === 'true';
}

function isAdmin() {
    const role = window.userRole || localStorage.getItem('userRole');
    return role === 'admin' || role === 'super_admin' || isSuperAdmin();
}

function isMVP() {
    const role = window.userRole || localStorage.getItem('userRole');
    return role === 'mvp';
}

function hasFullAccess() {
    return isAdmin() || isSuperAdmin();
}

async function getUserRole(uid) {
    try {
        // Check if Super Admin first
        if (uid === SUPER_ADMIN_UID) {
            return 'super_admin';
        }
        
        const adminCheck = await db.ref('admins/' + uid).once('value');
        if (adminCheck.val() === true) {
            return 'super_admin';
        }
        
        const snapshot = await db.ref('users/' + uid + '/role').once('value');
        return snapshot.val() || 'pending';
    } catch (e) {
        return 'pending';
    }
}

async function isUserApproved(uid) {
    try {
        // Super Admins are always approved
        if (uid === SUPER_ADMIN_UID) {
            return true;
        }
        
        const adminCheck = await db.ref('admins/' + uid).once('value');
        if (adminCheck.val() === true) {
            return true;
        }
        
        const snapshot = await db.ref('users/' + uid + '/approved').once('value');
        return snapshot.val() === true;
    } catch (e) {
        return false;
    }
}

// ============================================
// CLOUD STATUS - FIXED
// ============================================

function updateCloudStatus(connected, message) {
    const dot = document.getElementById('cloudDot');
    const text = document.getElementById('cloudText');
    if (!dot || !text) return;
    
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
// FIREBASE CONNECTION CHECK
// ============================================

function tryFirebaseConnection() {
    if (!currentUser) {
        console.log('No user logged in, skipping connection check');
        return;
    }
    
    console.log('🔄 Checking Firebase Realtime DB connection...');
    
    // Check connection
    db.ref('.info/connected').once('value')
        .then(snap => {
            const connected = snap.val();
            console.log('📡 Connection status:', connected);
            updateCloudStatus(connected, connected ? 'Connected ✓' : 'Offline');
            
            if (connected) {
                // Test write
                return db.ref('_test/ping').set({
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    uid: currentUser.uid
                });
            }
            return null;
        })
        .then(() => {
            if (db.ref('_test/ping')) {
                console.log('✅ Firebase write successful');
                updateCloudStatus(true, 'Connected ✓');
            }
        })
        .catch((error) => {
            console.warn('⚠️ Firebase connection failed:', error.message);
            updateCloudStatus(false, 'Offline');
            setTimeout(tryFirebaseConnection, 30000);
        });
}

// ============================================
// AUTH STATE LISTENER - FIXED
// ============================================

if (window._authListenerAdded) {
    console.log('Auth listener already added, skipping');
} else {
    window._authListenerAdded = true;
    
    auth.onAuthStateChanged(async user => {
        console.log('🔐 Auth state changed:', user ? 'Logged in' : 'Logged out');
        
        if (user) {
            currentUser = user;
            
            // ============================================================
            // CHECK SUPER ADMIN FIRST - DO NOT CHECK /users/
            // ============================================================
            const adminCheck = await db.ref('admins/' + user.uid).once('value');
            const isSuperAdmin = adminCheck.val() === true || 
                                 SUPER_ADMINS.includes(user.email) || 
                                 user.uid === SUPER_ADMIN_UID;
            
            if (isSuperAdmin) {
                // Make sure Super Admin is in admins path
                if (adminCheck.val() !== true) {
                    await db.ref('admins/' + user.uid).set(true);
                }
                
                window.userRole = 'super_admin';
                window.isSuperAdmin = true;
                localStorage.setItem('userRole', 'super_admin');
                localStorage.setItem('isSuperAdmin', 'true');
                console.log('👑 Logged in as Super Admin');
                
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
                // CRITICAL: RETURN HERE - DON'T CHECK /users/
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
                        // Check if email is verified
                        const isEmailVerified = user.emailVerified;
                        
                        if (isEmailVerified) {
                            errorEl.className = 'login-error visible';
                            errorEl.innerHTML = `
                                <div style="text-align:center; padding:10px;">
                                    <div style="font-size:40px; margin-bottom:8px;">⏳</div>
                                    <strong style="font-size:16px;">Account Pending Approval</strong>
                                    <p style="font-size:13px; margin-top:6px; color:#6B7280;">
                                        ✅ Your email has been verified.<br>
                                        Waiting for an admin to approve your account.
                                    </p>
                                    <div style="background:#EDE9FE; padding:10px; border-radius:6px; margin-top:8px; font-size:12px; color:#5A2FC7; text-align:left;">
                                        <strong>📋 What happens next:</strong><br>
                                        • An admin will review your request<br>
                                        • You'll be assigned a role<br>
                                        • You'll receive access once approved
                                    </div>
                                    <button class="btn btn-primary" onclick="logoutUser()" style="margin-top:10px;">
                                        <i class="fas fa-sign-out-alt"></i> Sign Out
                                    </button>
                                </div>
                            `;
                        } else {
                            errorEl.className = 'login-error visible';
                            errorEl.innerHTML = `
                                <div style="text-align:center; padding:10px;">
                                    <div style="font-size:40px; margin-bottom:8px;">📧</div>
                                    <strong style="font-size:16px;">Verify Your Email</strong>
                                    <p style="font-size:13px; margin-top:6px; color:#6B7280;">
                                        Please verify your email address first.
                                    </p>
                                    <div style="background:#FFF3E0; padding:10px; border-radius:6px; margin-top:8px; font-size:12px; color:#E67E22; text-align:left;">
                                        ⚠️ Check your <strong>Inbox</strong>, <strong>Spam/Junk</strong>, and <strong>Promotions</strong> folders
                                    </div>
                                    <div style="margin-top:10px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                                        <button class="btn btn-sm btn-primary" onclick="resendVerificationFromLogin()">
                                            <i class="fas fa-envelope"></i> Resend Email
                                        </button>
                                        <button class="btn btn-sm btn-outline" onclick="logoutUser()">
                                            <i class="fas fa-sign-out-alt"></i> Sign Out
                                        </button>
                                    </div>
                                </div>
                            `;
                        }
                    }
                    return;
                }
                
                const validRoles = ['admin', 'mvp']; // NO SUPER ADMIN in users path
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

console.log('🔥 Auth module loaded');