// ============================================
// UI-ADMIN.JS - Admin & Filter Functions
// ============================================

// ============================================
// SUPER ADMIN UID - Use window.SUPER_ADMIN_UID (loaded by auth.js)
// ============================================
function getSuperAdminUID() {
    return window.SUPER_ADMIN_UID || null;
}

// ============================================================
// HELPER: Check if a user is the Super Admin (RELIABLE)
// ============================================================
function isSuperAdminUser(uid, data) {
    // Get the Super Admin UID from window
    const superUID = window.SUPER_ADMIN_UID || null;
    
    // Check 1: UID matches Super Admin
    if (uid === superUID) return true;
    
    // Check 2: If current user is Super Admin, they shouldn't be shown
    if (currentUser) {
        if (uid === currentUser.uid && window.isSuperAdmin) return true;
        if (uid === currentUser.uid && localStorage.getItem('isSuperAdmin') === 'true') return true;
    }
    
    // Check 3: If data exists, check for Super Admin patterns
    if (data) {
        // Check if name is "Unknown" AND email is "No email" (Super Admin pattern)
        if ((data.fullName === 'Unknown' || data.name === 'Unknown') && 
            (data.email === 'No email' || !data.email || data.email === '')) {
            return true;
        }
    }
    
    return false;
}

// ============================================
// FILTERS - Advanced Filtering System
// ============================================

let currentFilters = {
    location: 'all',
    gender: 'all',
    marital: 'all',
    worker: 'all',
    birthdayMonth: 'all',
    birthdayDay: 'all'
};

// ============================================
// populateFilterDropdowns - uses locations
// ============================================
function populateFilterDropdowns() {
    const locations = DB.getUniqueLocations();
    const locationSelect = document.getElementById('filterLocation');
    if (locationSelect) {
        const current = locationSelect.value;
        locationSelect.innerHTML = '<option value="all">All Locations</option>';
        locations.forEach(loc => {
            const opt = document.createElement('option');
            opt.value = loc;
            opt.textContent = loc;
            if (loc === current) opt.selected = true;
            locationSelect.appendChild(opt);
        });
    }
    
    const monthSelect = document.getElementById('filterBirthdayMonth');
    if (monthSelect) {
        const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        monthSelect.innerHTML = '<option value="all">All Months</option>';
        months.forEach((m, i) => {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = monthNames[i];
            monthSelect.appendChild(opt);
        });
    }
    
    const daySelect = document.getElementById('filterBirthdayDay');
    if (daySelect) {
        daySelect.innerHTML = '<option value="all">All Days</option>';
        for (let d = 1; d <= 31; d++) {
            const opt = document.createElement('option');
            opt.value = String(d).padStart(2, '0');
            opt.textContent = d;
            daySelect.appendChild(opt);
        }
    }
}

// ============================================
// getFilteredMembers - uses location
// ============================================
function getFilteredMembers(filters) {
    let members = DB.getMembers();
    
    if (filters.location !== 'all') {
        members = members.filter(m => m.location === filters.location);
    }
    if (filters.gender !== 'all') {
        members = members.filter(m => m.gender === filters.gender);
    }
    if (filters.marital !== 'all') {
        members = members.filter(m => m.maritalStatus === filters.marital);
    }
    if (filters.worker !== 'all') {
        members = members.filter(m => m.worker === filters.worker);
    }
    if (filters.birthdayMonth !== 'all') {
        members = members.filter(m => {
            if (!m.dob) return false;
            return m.dob.split('/')[0] === filters.birthdayMonth;
        });
    }
    if (filters.birthdayDay !== 'all' && filters.birthdayMonth !== 'all') {
        members = members.filter(m => {
            if (!m.dob) return false;
            const parts = m.dob.split('/');
            return parts[0] === filters.birthdayMonth && parts[1] === filters.birthdayDay;
        });
    }
    
    return members;
}

function applyFilters() {
    const filters = {
        location: document.getElementById('filterLocation')?.value || 'all',
        gender: document.getElementById('filterGender')?.value || 'all',
        marital: document.getElementById('filterMarital')?.value || 'all',
        worker: document.getElementById('filterWorker')?.value || 'all',
        birthdayMonth: document.getElementById('filterBirthdayMonth')?.value || 'all',
        birthdayDay: document.getElementById('filterBirthdayDay')?.value || 'all'
    };
    
    currentFilters = filters;
    const members = getFilteredMembers(filters);
    renderFilteredMembers(members);
    loadFilteredAnalytics();
}

function clearAllFilters() {
    document.querySelectorAll('.filter-select').forEach(select => {
        if (select) select.value = 'all';
    });
    currentFilters = {
        location: 'all',
        gender: 'all',
        marital: 'all',
        worker: 'all',
        birthdayMonth: 'all',
        birthdayDay: 'all'
    };
    const members = DB.getMembers();
    renderFilteredMembers(members);
    loadFilteredAnalytics();
}

// ============================================
// renderFilteredMembers - includes location
// ============================================
function renderFilteredMembers(members) {
    const container = document.getElementById('filteredResults');
    if (!container) return;
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🔍</span>
                <h3>No members match your filters</h3>
                <p>Try adjusting your filter criteria</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="background:#EDE9FE; padding:10px 14px; border-radius:8px; margin-bottom:12px;">
            <strong>${members.length} members found</strong>
            <span style="font-size:12px; color:var(--gray); margin-left:8px;">Filtered results</span>
            <button class="btn btn-sm btn-outline" style="float:right;" onclick="clearAllFilters()">
                <i class="fas fa-times"></i> Clear Filters
            </button>
        </div>
        <div class="table-container">
            <table>
                <thead><tr>
                    <th>Name</th><th>Phone</th><th>Gender</th>
                    <th>Address</th><th>Location</th><th>Status</th><th>Worker</th>
                </tr></thead>
                <tbody>
                    ${members.slice(0, 50).map(m => {
                        const count = DB.getMemberVisitCount(m.id);
                        const status = count === 0 ? '❌ Never' : 
                                      count === 1 ? '⭐ First' : 
                                      count === 2 ? '🌟 Second' : '✅ Regular';
                        return `
                            <tr>
                                <td><strong>${m.name}</strong></td>
                                <td>${m.phone || '-'}</td>
                                <td>${m.gender || '-'}</td>
                                <td>${m.address || '-'}</td>
                                <td>${m.location || '-'}</td>
                                <td><span class="badge ${count === 0 ? 'badge-danger' : count === 1 ? 'badge-warning' : count === 2 ? 'badge-info' : 'badge-success'}">${status}</span></td>
                                <td>${m.worker === 'Yes' ? '✅' : '❌'}</td>
                            </tr>
                        `;
                    }).join('')}
                    ${members.length > 50 ? `<tr><td colspan="7" style="text-align:center; color:var(--gray);">... and ${members.length - 50} more</td></tr>` : ''}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// exportFilteredData - includes location
// ============================================
function exportFilteredData() {
    let members = getFilteredMembers(currentFilters);
    
    const monthFilter = document.getElementById('filterBirthdayMonth')?.value || 'all';
    const dayFilter = document.getElementById('filterBirthdayDay')?.value || 'all';
    let filterLabel = 'Filtered';
    let fileNamePrefix = 'Filtered';
    
    if (monthFilter !== 'all') {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        filterLabel = `Birthday: ${monthNames[parseInt(monthFilter) - 1]}`;
        fileNamePrefix = `Birthday_${monthNames[parseInt(monthFilter) - 1]}`;
        if (dayFilter !== 'all') {
            filterLabel += ` ${parseInt(dayFilter)}`;
            fileNamePrefix += `_${parseInt(dayFilter)}`;
        }
    } else if (currentFilters.location !== 'all') {
        filterLabel = `Location: ${currentFilters.location}`;
        fileNamePrefix = `Location_${currentFilters.location}`;
    } else if (currentFilters.gender !== 'all') {
        filterLabel = `Gender: ${currentFilters.gender}`;
        fileNamePrefix = `Gender_${currentFilters.gender}`;
    } else if (currentFilters.worker !== 'all') {
        filterLabel = `Worker: ${currentFilters.worker}`;
        fileNamePrefix = `Worker_${currentFilters.worker}`;
    } else if (currentFilters.marital !== 'all') {
        filterLabel = `Marital: ${currentFilters.marital}`;
        fileNamePrefix = `Marital_${currentFilters.marital}`;
    }
    
    if (members.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    
    const data = members.map((m, i) => {
        let birthdayDisplay = m.dob || '';
        let birthdayText = '';
        
        if (m.dob) {
            const parts = m.dob.split('/');
            if (parts.length === 2) {
                const monthNum = parseInt(parts[0]);
                const dayNum = parseInt(parts[1]);
                if (!isNaN(monthNum) && !isNaN(dayNum) && monthNum >= 1 && monthNum <= 12) {
                    birthdayText = `${monthNames[monthNum - 1]} ${dayNum}`;
                }
            }
        }
        
        return {
            'S/N': i + 1,
            'Name': m.name,
            'Phone': m.phone || '',
            'Gender': m.gender || '',
            'Address': m.address || '',
            'Location': m.location || '',
            'Birthday': birthdayDisplay,
            'Birthday (Text)': birthdayText,
            'Marital Status': m.maritalStatus || '',
            'Worker': m.worker || 'No',
            'Visits': DB.getMemberVisitCount(m.id),
            'Days Since Last Visit': DB.getDaysSinceLastVisit(m.id)
        };
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, filterLabel);
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${fileNamePrefix}_${dateStr}.xlsx`);
    
    showNotification(`${data.length} members exported! (${filterLabel})`, 'success');
}

// ============================================
// ADMIN APPROVAL PANEL
// ============================================

async function loadAdminPanel() {
    console.log('🔧 Loading admin panel...');
    
    if (!currentUser) {
        console.log('No user logged in');
        return;
    }
    
    try {
        const isSuperAdmin = window.isSuperAdmin || localStorage.getItem('isSuperAdmin') === 'true';
        const role = window.userRole || localStorage.getItem('userRole');
        
        console.log('👑 Admin check - isSuperAdmin:', isSuperAdmin, 'role:', role);
        
        if (!isSuperAdmin && role !== 'super_admin' && role !== 'admin') {
            console.log('Not admin or super admin, skipping admin panel');
            return;
        }
        
        const settingsSection = document.getElementById('section-settings');
        if (!settingsSection) {
            console.error('Settings section not found');
            return;
        }
        
        const existingPanel = document.getElementById('adminApprovalPanel');
        if (existingPanel) existingPanel.remove();
        
        const panel = document.createElement('div');
        panel.id = 'adminApprovalPanel';
        panel.style.cssText = `
            background: linear-gradient(135deg, #6C3CE1, #8B6BF0);
            color: white;
            padding: 16px 20px;
            border-radius: 10px;
            margin-bottom: 16px;
        `;
        panel.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <div>
                    <strong style="font-size:16px;">👑 Admin Panel</strong>
                    <span style="font-size:12px; opacity:0.8; display:block;">Approve users and assign roles</span>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm" style="background:white; color:#6C3CE1;" onclick="refreshPendingUsers()">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                    <button class="btn btn-sm" style="background:rgba(255,255,255,0.2); color:white;" onclick="viewAllUsers()">
                        <i class="fas fa-users"></i> All Users
                    </button>
                    <button class="btn btn-sm" style="background:rgba(255,255,255,0.15); color:white;" onclick="fixUnapprovedUsers()">
                        <i class="fas fa-tools"></i> Fix Users
                    </button>
                </div>
            </div>
            <div style="margin-top:8px; font-size:12px; opacity:0.7;">
                <span>⚡ Roles: <strong>MVP</strong> (Timers only) | <strong>Admin</strong> (Full access)</span>
            </div>
            <div id="pendingUsersList" style="margin-top:12px; max-height:400px; overflow-y:auto;">
                <div class="loading"><div class="spinner"></div>Loading pending requests...</div>
            </div>
        `;
        
        settingsSection.insertBefore(panel, settingsSection.firstChild);
        refreshPendingUsers();
        
    } catch (error) {
        console.error('❌ Error loading admin panel:', error);
        showNotification('Error loading admin panel: ' + error.message, 'error');
    }
}

// ============================================
// refreshPendingUsers - Load pending users (SKIPS SUPER ADMIN)
// ============================================

function refreshPendingUsers() {
    const list = document.getElementById('pendingUsersList');
    if (!list) {
        console.error('pendingUsersList not found');
        return;
    }
    
    console.log('🔄 Refreshing pending users...');
    list.innerHTML = '<div class="loading"><div class="spinner"></div>Loading pending requests...</div>';
    
    let allPending = {};
    
    db.ref('pendingUsers').once('value')
        .then(snapshot => {
            const pending = snapshot.val();
            console.log('📋 pendingUsers path:', pending);
            
            if (pending) {
                Object.keys(pending).forEach(key => {
                    const data = pending[key];
                    
                    // ============================================================
                    // SECURITY: Skip Super Admin using reliable function
                    // ============================================================
                    if (isSuperAdminUser(key, data)) return;
                    
                    allPending[key] = data;
                });
            }
            
            return db.ref('users').once('value');
        })
        .then(snapshot => {
            const users = snapshot.val();
            console.log('📋 users path:', users);
            
            if (users) {
                Object.keys(users).forEach(uid => {
                    const user = users[uid];
                    
                    // ============================================================
                    // SECURITY: Skip Super Admin using reliable function
                    // ============================================================
                    if (isSuperAdminUser(uid, user)) return;
                    
                    if ((user.approved === false || user.approved === undefined) && !allPending[uid]) {
                        allPending[uid] = {
                            ...user,
                            uid: uid,
                            _fromUsers: true
                        };
                        console.log('📋 Found unapproved user in users path:', uid, user.fullName);
                    }
                });
            }
            
            renderPendingUsers(allPending);
        })
        .catch(error => {
            console.error('❌ Error loading pending users:', error);
            list.innerHTML = `<div style="text-align:center; padding:12px; color:#E74C3C;">❌ Error loading: ${error.message}</div>`;
        });
}

// ============================================
// renderPendingUsers - Render pending users list (SKIPS SUPER ADMIN)
// ============================================

function renderPendingUsers(pending) {
    const list = document.getElementById('pendingUsersList');
    if (!list) return;
    
    const pendingKeys = Object.keys(pending);
    console.log('📋 Rendering pending users:', pendingKeys.length);
    
    if (pendingKeys.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:12px; opacity:0.7;">🎉 No pending requests</div>';
        return;
    }
    
    let html = '<div style="display:grid; gap:8px;">';
    let count = 0;
    
    pendingKeys.forEach(uid => {
        const data = pending[uid];
        if (!data) return;
        
        // ============================================================
        // SECURITY: Skip Super Admin using reliable function
        // ============================================================
        if (isSuperAdminUser(uid, data)) return;
        
        count++;
        
        const name = data.fullName || data.name || 'Unknown';
        const email = data.email || 'No email';
        const requestedAt = data.requestedAt ? new Date(data.requestedAt).toLocaleString() : 'Unknown';
        const isFromUsers = data._fromUsers === true;
        const currentRole = data.role || 'pending';
        
        const isCurrentUser = currentUser && uid === currentUser.uid;
        
        html += `
            <div style="background:rgba(255,255,255,0.1); padding:12px 14px; border-radius:8px; ${isCurrentUser ? 'border-left:3px solid #3498DB;' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong>${name}</strong>
                        ${isCurrentUser ? ' 👈 You' : ''}
                        <span style="font-size:12px; opacity:0.7; display:block;">${email}</span>
                        <span style="font-size:10px; opacity:0.5;">${isFromUsers ? '📋 From users list' : 'Requested: ' + requestedAt}</span>
                        <span style="font-size:10px; opacity:0.5; margin-left:8px;">Current role: ${currentRole}</span>
                    </div>
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">
                        <select id="roleSelect_${uid}" style="padding:4px 8px; border-radius:4px; border:none; font-size:11px; color:#2C3E50;">
                            <option value="mvp" ${currentRole === 'mvp' ? 'selected' : ''}>⭐ MVP (Timers Only)</option>
                            <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>🛡️ Admin (Full Access)</option>
                        </select>
                        <button class="btn btn-sm" style="background:#2ECC71; color:white;" onclick="approveUser('${uid}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm" style="background:#E74C3C; color:white;" onclick="rejectUser('${uid}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                        ${!isCurrentUser ? `
                            <button class="btn btn-sm" style="background:#E74C3C; color:white;" onclick="deleteUser('${uid}')" title="Delete user">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : `
                            <span style="font-size:10px; color:rgba(255,255,255,0.5); padding:4px 8px;">🔒 You</span>
                        `}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    if (count === 0) {
        list.innerHTML = '<div style="text-align:center; padding:12px; opacity:0.7;">🎉 No pending requests</div>';
    } else {
        list.innerHTML = html;
    }
}

// ============================================
// approveUser - Approve a pending user
// ============================================

async function approveUser(uid) {
    if (!confirm('Approve this user?')) return;
    
    try {
        const select = document.getElementById('roleSelect_' + uid);
        const role = select ? select.value : 'admin';
        
        if (role === 'super_admin') {
            showNotification('❌ Cannot assign Super Admin role', 'error');
            return;
        }
        
        console.log('📝 Approving user:', uid, 'with role:', role);
        
        const userSnap = await db.ref('users/' + uid).once('value');
        let userData = userSnap.val();
        
        if (!userData) {
            showNotification('User data not found', 'error');
            console.error('No user data for uid:', uid);
            return;
        }
        
        console.log('📋 User data:', userData);
        
        const adminUid = currentUser ? currentUser.uid : 'system';
        console.log('👑 Admin UID:', adminUid);
        
        const userUpdates = {
            role: role,
            approved: true,
            approvedAt: firebase.database.ServerValue.TIMESTAMP,
            approvedBy: adminUid,
            emailVerified: true
        };
        
        await db.ref('users/' + uid).update(userUpdates);
        console.log('✅ User updated');
        
        await db.ref('pendingUsers/' + uid).remove();
        
        const allPending = await db.ref('pendingUsers').once('value');
        const pendingAll = allPending.val();
        if (pendingAll) {
            Object.keys(pendingAll).forEach(key => {
                if (pendingAll[key].email === userData.email && key !== uid) {
                    db.ref('pendingUsers/' + key).remove();
                }
            });
        }
        
        showNotification(`✅ ${userData.fullName || 'User'} approved as ${role}!`, 'success');
        refreshPendingUsers();
        
    } catch (error) {
        console.error('❌ Approval error:', error);
        showNotification('❌ Error approving user: ' + error.message, 'error');
    }
}

// ============================================
// rejectUser - Reject a pending user
// ============================================

async function rejectUser(uid) {
    if (!confirm('Reject this user request?')) return;
    
    try {
        console.log('📝 Rejecting user:', uid);
        
        const userSnap = await db.ref('users/' + uid).once('value');
        const userData = userSnap.val();
        
        await db.ref('users/' + uid).remove();
        await db.ref('pendingUsers/' + uid).remove();
        
        showNotification(`❌ ${userData?.fullName || 'User'} rejected`, 'info');
        refreshPendingUsers();
        
    } catch (error) {
        console.error('❌ Rejection error:', error);
        showNotification('❌ Error rejecting user: ' + error.message, 'error');
    }
}

// ============================================
// fixUnapprovedUsers - Fix unapproved users (SKIPS SUPER ADMIN)
// ============================================

async function fixUnapprovedUsers() {
    console.log('🔧 Fixing unapproved users...');
    
    if (!confirm('This will find all unapproved users and add them to the pending list. Continue?')) return;
    
    try {
        const snapshot = await db.ref('users').once('value');
        const users = snapshot.val();
        
        if (!users) {
            showNotification('No users found', 'info');
            return;
        }
        
        let fixed = 0;
        const fixes = {};
        
        Object.keys(users).forEach(uid => {
            const user = users[uid];
            
            // ============================================================
            // SECURITY: Skip Super Admin using reliable function
            // ============================================================
            if (isSuperAdminUser(uid, user)) return;
            
            if (user.approved === false && user.role === 'pending') {
                fixes[uid] = {
                    email: user.email,
                    fullName: user.fullName || 'Unknown',
                    phone: user.phone || '',
                    requestedAt: user.requestedAt || firebase.database.ServerValue.TIMESTAMP,
                    uid: uid,
                    _fixed: true
                };
                fixed++;
            }
        });
        
        console.log('📋 Found unapproved users to fix:', fixes);
        
        if (fixed === 0) {
            showNotification('No unapproved users found to fix', 'info');
            return;
        }
        
        const updates = {};
        Object.keys(fixes).forEach(uid => {
            updates['pendingUsers/' + uid] = fixes[uid];
        });
        
        await db.ref().update(updates);
        console.log('✅ Added', fixed, 'users to pendingUsers');
        
        showNotification(`✅ Added ${fixed} unapproved users to pending list!`, 'success');
        refreshPendingUsers();
        
    } catch (error) {
        console.error('❌ Fix error:', error);
        showNotification('❌ Error fixing users: ' + error.message, 'error');
    }
}

// ============================================
// viewAllUsers - View all users (HIDES SUPER ADMIN)
// ============================================

async function viewAllUsers() {
    try {
        console.log('📋 Fetching all users...');
        const snapshot = await db.ref('users').once('value');
        const users = snapshot.val();
        
        if (!users) {
            showNotification('No users found', 'info');
            return;
        }
        
        const isSuperAdmin = window.isSuperAdmin === true || 
                             localStorage.getItem('isSuperAdmin') === 'true';
        
        const role = window.userRole || localStorage.getItem('userRole');
        const isAdmin = role === 'admin' || isSuperAdmin;
        
        console.log('📋 All users data:', users);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        
        let userListHtml = '';
        let userCount = 0;
        
        Object.keys(users).forEach(uid => {
            const data = users[uid];
            
            // ============================================================
            // SECURITY: NEVER show Super Admin to anyone
            // ============================================================
            if (isSuperAdminUser(uid, data)) return;
            
            const name = data.fullName || data.name || 'Unknown';
            const email = data.email || 'No email';
            const userRole = data.role || 'pending';
            const approved = data.approved ? '✅ Approved' : '⏳ Pending';
            const isAdminUser = userRole === 'admin';
            
            const isCurrentUser = currentUser && uid === currentUser.uid;
            
            userListHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; border-bottom:1px solid #F0F2F5; gap:8px; flex-wrap:wrap; ${isAdminUser ? 'background:#EDE9FE; border-left:3px solid #6C3CE1;' : ''} ${isCurrentUser ? 'border-left:3px solid #3498DB;' : ''}">
                    <div style="min-width:120px;">
                        <strong>${name}</strong>
                        ${isAdminUser ? ' 🛡️ Admin' : ''}
                        ${isCurrentUser ? ' 👈 You' : ''}
                        <span style="font-size:11px; color:var(--gray); display:block;">${email}</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <span class="badge ${approved === '✅ Approved' ? 'badge-success' : 'badge-warning'}">${approved}</span>
                        <select id="roleChange_${uid}" style="padding:4px 8px; border-radius:4px; border:1px solid #E8ECF0; font-size:11px; background:white;">
                            <option value="mvp" ${userRole === 'mvp' ? 'selected' : ''}>⭐ MVP</option>
                            <option value="admin" ${userRole === 'admin' ? 'selected' : ''}>🛡️ Admin</option>
                        </select>
                        <button class="btn btn-sm btn-primary" onclick="changeUserRole('${uid}')">
                            <i class="fas fa-save"></i> Change
                        </button>
                        ${!isCurrentUser ? `
                            <button class="btn btn-sm btn-danger" onclick="deleteUser('${uid}')" title="Delete user">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <span style="font-size:10px; color:var(--gray); padding:4px 8px;">🔒 You</span>
                        `}
                    </div>
                </div>
            `;
            userCount++;
        });
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width:700px;">
                <div class="modal-header">
                    <h3>👥 All Users (${userCount})</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                </div>
                <div style="font-size:12px; color:var(--gray); padding:8px; background:#F8F9FC; border-radius:8px; margin-bottom:8px;">
                    👑 All Current Users • <span style="color:var(--danger);">🗑️ Delete removes user permanently</span>
                </div>
                <div style="max-height:400px; overflow-y:auto; background:#F8F9FC; padding:8px; border-radius:8px;">
                    ${userListHtml}
                </div>
                <div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary btn-sm" onclick="refreshPendingUsers(); this.closest('.modal').remove();">
                        <i class="fas fa-sync"></i> Refresh
                    </button>
                    <button class="btn btn-success btn-sm" onclick="this.closest('.modal').remove();">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('active');
        
    } catch (error) {
        console.error('❌ Error viewing users:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// changeUserRole - Change a user's role
// ============================================

async function changeUserRole(uid) {
    const select = document.getElementById('roleChange_' + uid);
    if (!select) {
        showNotification('Role selector not found', 'error');
        return;
    }
    
    const newRole = select.value;
    
    if (newRole === 'super_admin') {
        showNotification('❌ Cannot assign Super Admin role', 'error');
        return;
    }
    
    // ============================================================
    // SECURITY: NEVER allow changing the Super Admin
    // ============================================================
    const userSnapCheck = await db.ref('users/' + uid).once('value');
    const userDataCheck = userSnapCheck.val();
    if (userDataCheck && isSuperAdminUser(uid, userDataCheck)) {
        showNotification('🔒 Cannot modify Super Admin', 'error');
        return;
    }
    
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    
    try {
        console.log('🔄 Changing role for user:', uid, 'to', newRole);
        
        const userSnap = await db.ref('users/' + uid).once('value');
        const userData = userSnap.val();
        
        if (!userData) {
            showNotification('User not found', 'error');
            return;
        }
        
        await db.ref('users/' + uid + '/role').set(newRole);
        await db.ref('users/' + uid + '/approved').set(true);
        
        await db.ref('pendingUsers/' + uid).remove();
        
        showNotification(`✅ ${userData.fullName || 'User'} changed to ${newRole}!`, 'success');
        
        viewAllUsers();
        refreshPendingUsers();
        
    } catch (error) {
        console.error('❌ Role change error:', error);
        showNotification('❌ Error changing role: ' + error.message, 'error');
    }
}

// ============================================
// forceApproveUser - Force approve a user (emergency)
// ============================================

async function forceApproveUser(uid, role = 'admin') {
    try {
        if (role === 'super_admin') {
            showNotification('❌ Cannot assign Super Admin role', 'error');
            return;
        }
        
        // ============================================================
        // SECURITY: NEVER allow changing the Super Admin
        // ============================================================
        const userSnapCheck = await db.ref('users/' + uid).once('value');
        const userDataCheck = userSnapCheck.val();
        if (userDataCheck && isSuperAdminUser(uid, userDataCheck)) {
            showNotification('🔒 Cannot modify Super Admin', 'error');
            return;
        }
        
        console.log('🔄 Force approving user:', uid, 'as', role);
        
        const userSnap = await db.ref('users/' + uid).once('value');
        const userData = userSnap.val();
        
        if (!userData) {
            console.error('User not found');
            showNotification('User not found', 'error');
            return;
        }
        
        console.log('📋 User data:', userData);
        
        await db.ref('users/' + uid).update({
            role: role,
            approved: true,
            approvedAt: firebase.database.ServerValue.TIMESTAMP,
            approvedBy: currentUser ? currentUser.uid : 'system_force',
            emailVerified: true
        });
        
        await db.ref('pendingUsers/' + uid).remove();
        
        console.log('✅ User force approved!');
        showNotification(`✅ ${userData.fullName || 'User'} force approved as ${role}!`, 'success');
        refreshPendingUsers();
        
    } catch (error) {
        console.error('❌ Force approve error:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// ============================================
// DELETE USER - Remove a user completely
// ============================================

async function deleteUser(uid) {
    // ============================================================
    // SECURITY: NEVER allow deleting Super Admin
    // ============================================================
    const userSnapCheck = await db.ref('users/' + uid).once('value');
    const userDataCheck = userSnapCheck.val();
    if (userDataCheck && isSuperAdminUser(uid, userDataCheck)) {
        showNotification('🔒 Cannot delete Super Admin', 'error');
        return;
    }
    
    const userSnap = await db.ref('users/' + uid).once('value');
    const userData = userSnap.val();
    
    if (!userData) {
        showNotification('User not found', 'error');
        return;
    }
    
    const name = userData.fullName || userData.name || 'Unknown';
    
    if (!confirm(`⚠️ Delete user "${name}"?\n\nThis will permanently remove:\n- User profile\n- All attendance records\n- Admin privileges (if any)\n\nThis action CANNOT be undone!`)) return;
    
    try {
        console.log('🗑️ Deleting user:', uid, name);
        
        await db.ref('users/' + uid).remove();
        console.log('✅ Removed from /users/');
        
        await db.ref('admins/' + uid).remove();
        console.log('✅ Removed from /admins/');
        
        await db.ref('pendingUsers/' + uid).remove();
        console.log('✅ Removed from /pendingUsers/');
        
        const churchData = await db.ref('churchData').once('value');
        const data = churchData.val();
        
        if (data && data.attendance) {
            const filteredAttendance = data.attendance.filter(a => a.memberId !== uid);
            
            if (filteredAttendance.length !== data.attendance.length) {
                await db.ref('churchData/attendance').set(filteredAttendance);
                console.log('✅ Removed attendance records for user');
            }
        }
        
        showNotification(`✅ User "${name}" deleted successfully!`, 'success');
        
        refreshPendingUsers();
        viewAllUsers();
        updateStats();
        loadAllViews();
        
    } catch (error) {
        console.error('❌ Delete user error:', error);
        showNotification('❌ Error deleting user: ' + error.message, 'error');
    }
}

// ============================================
// Export functions to window
// ============================================

window.forceApproveUser = forceApproveUser;
window.changeUserRole = changeUserRole;
window.fixUnapprovedUsers = fixUnapprovedUsers;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.viewAllUsers = viewAllUsers;
window.refreshPendingUsers = refreshPendingUsers;
window.populateFilterDropdowns = populateFilterDropdowns;
window.applyFilters = applyFilters;
window.clearAllFilters = clearAllFilters;
window.exportFilteredData = exportFilteredData;
window.renderFilteredMembers = renderFilteredMembers;
window.getFilteredMembers = getFilteredMembers;
window.loadAdminPanel = loadAdminPanel;
window.deleteUser = deleteUser;