// ============================================
// UI-CORE.JS - Core UI Functions
// ============================================

// ============================================
// SHOW TAB - UPDATED to handle missing sections gracefully
// ============================================

function showTab(tabName) {
    // First, hide all sections
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    
    // Then show the requested section if it exists and is visible
    const section = document.getElementById('section-' + tabName);
    if (section) {
        // Check if section is not hidden (style.display !== 'none')
        if (section.style.display !== 'none') {
            section.classList.add('active');
        } else {
            console.warn('Section section-' + tabName + ' is hidden for this role');
            // If section is hidden, fall back to first visible section
            const firstVisible = document.querySelector('.section[style*="display: none"]');
            if (!firstVisible) {
                const allSections = document.querySelectorAll('.section');
                for (let s of allSections) {
                    if (s.style.display !== 'none') {
                        s.classList.add('active');
                        break;
                    }
                }
            }
        }
    }
    
    // Update tab active state
    document.querySelectorAll('.tab').forEach(el => {
        el.classList.remove('active');
        const dataTab = el.getAttribute('data-tab');
        if (dataTab === tabName) {
            // Only mark active if the section is visible
            const section = document.getElementById('section-' + tabName);
            if (section && section.style.display !== 'none') {
                el.classList.add('active');
            }
        }
    });
    
    // Load content based on tab
    const loaders = {
        'today': loadTodayAttendance,
        'members': loadMembers,
        'firstTimers': () => { 
            if (typeof populateLocationFilters === 'function') populateLocationFilters(); 
            loadFirstTimers(); 
        },
        'secondTimers': () => { 
            if (typeof populateLocationFilters === 'function') populateLocationFilters(); 
            loadSecondTimers(); 
        },
        'absentees': loadAbsentees,
        'analytics': loadAnalytics,
        'filters': () => { 
            if (typeof populateFilterDropdowns === 'function') populateFilterDropdowns(); 
            loadFilteredAnalytics(); 
        },
        'mvp': loadMVPDashboard,
        'import': () => {},
        'settings': () => {}
    };
    
    if (loaders[tabName]) {
        // Check if section is visible before loading
        const section = document.getElementById('section-' + tabName);
        if (section && section.style.display !== 'none') {
            loaders[tabName]();
        }
    }
    
    if (tabName === 'mark') {
        setTimeout(() => {
            const searchInput = document.getElementById('memberSearch');
            if (searchInput) searchInput.focus();
        }, 300);
    }
}

// ============================================
// STATS
// ============================================

function updateStats() {
    const stats = DB.getStats();
    document.getElementById('todayCount').textContent = stats.todayAttendance;
    document.getElementById('firstTimerCount').textContent = stats.firstTimers;
    document.getElementById('secondTimerCount').textContent = stats.secondTimers;
    document.getElementById('totalMembers').textContent = stats.totalMembers;
    document.getElementById('absentCount').textContent = stats.absentCount;
}

// ============================================
// UPDATED: populateLocationFilters - uses location
// ============================================
function populateLocationFilters() {
    const locations = DB.getUniqueLocations();
    ['firstTimerLocationFilter', 'secondTimerLocationFilter', 'filterLocation', 'absentLocationFilter'].forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="all">All Locations</option>';
        locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            if (loc === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
}

// ============================================
// SEARCH & MARK
// ============================================

function searchMembers() {
    const query = document.getElementById('memberSearch').value;
    const resultsDiv = document.getElementById('memberResults');
    const listDiv = document.getElementById('memberListItems');
    const noResults = document.getElementById('noResults');
    const clearBtn = document.getElementById('clearSearch');
    
    clearBtn.style.display = query.length > 0 ? 'block' : 'none';
    
    if (!query.trim()) {
        resultsDiv.classList.remove('visible');
        noResults.style.display = 'none';
        return;
    }
    
    const members = DB.searchMembers(query);
    
    if (members.length === 0) {
        resultsDiv.classList.add('visible');
        listDiv.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    resultsDiv.classList.add('visible');
    
    const today = new Date().toISOString().split('T')[0];
    const todayAtt = DB.getTodayAttendance();
    const todayIds = new Set(todayAtt.map(a => a.memberId));
    
    members.sort((a, b) => {
        const aPresent = todayIds.has(a.id);
        const bPresent = todayIds.has(b.id);
        if (aPresent && !bPresent) return -1;
        if (!aPresent && bPresent) return 1;
        return a.name.localeCompare(b.name);
    });
    
    listDiv.innerHTML = members.map(m => {
        const isPresent = todayIds.has(m.id);
        const status = DB.getMemberStatus(m.id);
        const statusLabels = {
            'first': '<span class="status-badge first">⭐ First</span>',
            'second': '<span class="status-badge second">🌟 Second</span>',
            'regular': '<span class="status-badge regular">✅ Regular</span>',
            'absent': '<span class="status-badge absent">❌ Absent</span>'
        };
        
        return `
            <div class="member-item">
                <div class="member-info" onclick="openMemberModal('${m.id}')">
                    <div style="min-width:0;">
                        <div class="member-name">${m.name}</div>
                        <div class="member-details">
                            ${m.phone ? '📱 ' + m.phone : ''} 
                            ${m.phone && m.worker === 'Yes' ? ' • ' : ''}
                            ${m.worker === 'Yes' ? '🔧 Worker' : ''}
                            ${statusLabels[status] || ''}
                        </div>
                    </div>
                </div>
                <div class="member-status">
                    ${isPresent ? 
                        `<span class="status-badge present"><i class="fas fa-check"></i> Present</span>` :
                        `<button class="mark-btn" onclick="markPresent('${m.id}')">
                            <i class="fas fa-check"></i> Mark
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

function clearSearch() {
    document.getElementById('memberSearch').value = '';
    document.getElementById('memberResults').classList.remove('visible');
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('clearSearch').style.display = 'none';
    document.getElementById('memberSearch').focus();
}

function resetSearch() {
    clearSearch();
    document.getElementById('memberSearch').focus();
}

function markPresent(memberId) {
    const today = new Date().toISOString().split('T')[0];
    const serviceSelect = document.getElementById('activeService');
    const serviceType = serviceSelect ? serviceSelect.value : 'Sunday 1st';
    
    const result = DB.addAttendance({
        memberId: memberId,
        date: today,
        serviceType: serviceType
    });
    
    if (result) {
        const member = DB.getMemberById(memberId);
        const count = DB.getMemberVisitCount(memberId);
        let msg = `${member ? member.name : 'Member'} marked present for ${serviceType}!`;
        if (count === 1) msg += ' ⭐ First timer!';
        else if (count === 2) msg += ' 🌟 Second timer!';
        showNotification(msg, 'success');
        searchMembers();
        updateStats();
        loadTodayAttendance();
    } else {
        showNotification('Already marked for today', 'warning');
    }
}

// ============================================
// TOGGLE FUNCTIONS
// ============================================

function toggleWorkerToggle(toggleId, hiddenId) {
    const toggle = document.getElementById(toggleId);
    const hidden = document.getElementById(hiddenId);
    if (toggle && hidden) {
        toggle.classList.toggle('active');
        hidden.value = toggle.classList.contains('active') ? 'Yes' : 'No';
    }
}

function toggleQuickWorker() {
    toggleWorkerToggle('quickWorkerToggle', 'quickWorker');
}

// ============================================
// UPDATED: QUICK ADD - includes location
// ============================================

function showQuickAdd() {
    document.getElementById('quickAdd').classList.add('visible');
    document.getElementById('quickFirstName').focus();
}

function hideQuickAdd() {
    document.getElementById('quickAdd').classList.remove('visible');
}

// ============================================
// UPDATED: QUICK ADD - includes location
// ============================================

function quickAddMember() {
    const firstName = document.getElementById('quickFirstName').value.trim();
    const lastName = document.getElementById('quickLastName').value.trim();
    const phone = document.getElementById('quickPhone').value.trim();
    const address = document.getElementById('quickAddress').value.trim();
    const location = document.getElementById('quickLocation').value.trim();
    const gender = document.getElementById('quickGender').value;
    const dob = document.getElementById('quickDOB').value.trim();
    const maritalStatus = document.getElementById('quickMaritalStatus').value;
    const worker = document.getElementById('quickWorker').value;
    
    if (!firstName || !lastName) {
        showNotification('Please enter first and last name', 'error');
        return;
    }
    
    const fullName = `${firstName} ${lastName}`;
    if (DB.findMemberByName(fullName)) {
        showNotification('Member already exists!', 'error');
        return;
    }
    
    const member = DB.addMember({
        name: fullName,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        location: location,
        address: address,
        gender: gender,
        dob: dob,
        maritalStatus: maritalStatus,
        worker: worker
    });
    
    const today = new Date().toISOString().split('T')[0];
    const serviceSelect = document.getElementById('activeService');
    const serviceType = serviceSelect ? serviceSelect.value : 'Sunday 1st';
    
    DB.addAttendance({
        memberId: member.id,
        date: today,
        serviceType: serviceType
    });
    
    document.getElementById('quickAddResult').innerHTML = `
        <div style="background:#D5F5E3; padding:8px; border-radius:var(--radius-sm); color:#1A7A42; text-align:center;">
            ✅ Added ${fullName} and marked present for ${serviceType}! ⭐ First timer!
        </div>
    `;
    
    document.getElementById('quickFirstName').value = '';
    document.getElementById('quickLastName').value = '';
    document.getElementById('quickPhone').value = '';
    document.getElementById('quickAddress').value = '';
    document.getElementById('quickLocation').value = '';
    document.getElementById('quickGender').value = '';
    document.getElementById('quickDOB').value = '';
    document.getElementById('quickMaritalStatus').value = '';
    document.getElementById('quickWorkerToggle').classList.remove('active');
    document.getElementById('quickWorker').value = 'No';
    
    showNotification(`Added ${fullName} and marked present for ${serviceType}!`, 'success');
    updateStats();
    loadTodayAttendance();
    loadMembers();
    searchMembers();
    populateLocationFilters();
    populateFilterDropdowns();
    
    if (isFirebaseConnected && currentUser) {
        setTimeout(() => syncToFirebase(), 1000);
    }
    
    setTimeout(() => {
        document.getElementById('quickAddResult').innerHTML = '';
        hideQuickAdd();
    }, 3000);
}

// ============================================
// NOTIFICATION
// ============================================

function showNotification(message, type = 'success') {
    const el = document.getElementById('notification');
    el.className = `notification ${type}`;
    el.innerHTML = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ============================================
// STORAGE INFO
// ============================================

function updateStorageInfo() {
    const members = DB.getMembers() || [];
    const attendance = DB.getAttendance() || [];
    document.getElementById('storageInfo').innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:6px; font-size:13px;">
            <div><i class="fas fa-users" style="color:var(--primary);"></i> ${members.length} Members</div>
            <div><i class="fas fa-list" style="color:var(--success);"></i> ${attendance.length} Records</div>
            <div><i class="fas fa-cloud" style="color:${isFirebaseConnected ? 'var(--success)' : 'var(--gray)'};"></i> ${isFirebaseConnected ? '☁️ Online' : '⚠️ Offline'}</div>
            <div><i class="fas fa-user" style="color:var(--primary);"></i> ${currentUser ? currentUser.email : 'Not logged in'}</div>
        </div>
    `;
}

// ============================================
// FILTERED ANALYTICS
// ============================================

function loadFilteredAnalytics() {
    const container = document.getElementById('filteredAnalyticsContent');
    if (!container) return;
    
    const members = getFilteredMembers(currentFilters);
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:20px;">
                <span class="empty-icon">📊</span>
                <p>No members match your filters</p>
            </div>
        `;
        return;
    }
    
    const totalMembers = members.length;
    const firstTimers = members.filter(m => DB.getMemberVisitCount(m.id) === 1).length;
    const secondTimers = members.filter(m => DB.getMemberVisitCount(m.id) === 2).length;
    const regulars = members.filter(m => DB.getMemberVisitCount(m.id) >= 3).length;
    const neverVisited = members.filter(m => DB.getMemberVisitCount(m.id) === 0).length;
    const atRisk = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).length;
    
    const monthFilter = document.getElementById('filterBirthdayMonth')?.value || 'all';
    const dayFilter = document.getElementById('filterBirthdayDay')?.value || 'all';
    let filterLabel = 'Filtered Members';
    if (monthFilter !== 'all') {
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        filterLabel = `Birthday: ${monthNames[parseInt(monthFilter) - 1]}`;
        if (dayFilter !== 'all') {
            filterLabel += ` ${parseInt(dayFilter)}`;
        }
    }
    
    container.innerHTML = `
        <div style="background:#F8F9FC; padding:16px; border-radius:10px; margin-top:12px;">
            <h4 style="font-size:14px; margin-bottom:10px;">📊 ${filterLabel} - Analytics</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(100px,1fr)); gap:8px;">
                <div style="background:#EDE9FE; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:20px; font-weight:700; color:var(--primary);">${totalMembers}</div>
                    <div style="font-size:10px; color:var(--gray);">Total</div>
                </div>
                <div style="background:#FDEBD0; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:20px; font-weight:700; color:#935E38;">${firstTimers}</div>
                    <div style="font-size:10px; color:var(--gray);">⭐ First Timers</div>
                </div>
                <div style="background:#D6EAF8; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:20px; font-weight:700; color:#1A5276;">${secondTimers}</div>
                    <div style="font-size:10px; color:var(--gray);">🌟 Second Timers</div>
                </div>
                <div style="background:#D5F5E3; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:20px; font-weight:700; color:#1A7A42;">${regulars}</div>
                    <div style="font-size:10px; color:var(--gray);">✅ Regulars</div>
                </div>
                <div style="background:#FADBD8; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:20px; font-weight:700; color:#922B21;">${atRisk}</div>
                    <div style="font-size:10px; color:var(--gray);">⚠️ At Risk</div>
                </div>
                <div style="background:#EBF5FB; padding:10px; border-radius:8px; text-align:center;">
                    <div style="font-size:20px; font-weight:700; color:#2E86C1;">${neverVisited}</div>
                    <div style="font-size:10px; color:var(--gray);">❌ Never Visited</div>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MVP DASHBOARD
// ============================================

function loadMVPDashboard() {
    console.log('📊 Loading MVP Dashboard...');
    const container = document.getElementById('mvpDashboardContent');
    if (!container) return;
    
    const firstTimers = DB.getFirstTimers();
    const secondTimers = DB.getSecondTimers();
    
    if (firstTimers.length === 0 && secondTimers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📊</span>
                <h3>No Timers Yet</h3>
                <p>Start marking attendance to track first and second timers.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="background:#FDEBD0; padding:16px; border-radius:10px;">
                <h3 style="font-size:16px; color:#935E38;">⭐ First Timers</h3>
                <div style="font-size:32px; font-weight:800; color:#935E38;">${firstTimers.length}</div>
                <div style="font-size:12px; color:var(--gray);">Visited only once</div>
                <button class="btn btn-sm btn-warning" onclick="showTab('firstTimers')" style="margin-top:8px;">
                    <i class="fas fa-eye"></i> View All
                </button>
            </div>
            <div style="background:#D6EAF8; padding:16px; border-radius:10px;">
                <h3 style="font-size:16px; color:#1A5276;">🌟 Second Timers</h3>
                <div style="font-size:32px; font-weight:800; color:#1A5276;">${secondTimers.length}</div>
                <div style="font-size:12px; color:var(--gray);">Visited twice</div>
                <button class="btn btn-sm btn-info" onclick="showTab('secondTimers')" style="margin-top:8px;">
                    <i class="fas fa-eye"></i> View All
                </button>
            </div>
        </div>
        <div style="margin-top:16px; padding:12px; background:#F8F9FC; border-radius:8px; text-align:center; font-size:13px; color:var(--gray);">
            💡 First timers become second timers when they visit again.
        </div>
    `;
}

// ============================================
// DATA MANAGEMENT
// ============================================

function exportAllData() {
    const data = DB.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `church_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Backup downloaded!', 'success');
}

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.members || !data.attendance) {
                    showNotification('Invalid backup file', 'error');
                    return;
                }
                if (confirm(`Replace all data with ${data.members.length} members and ${data.attendance.length} records?`)) {
                    DB.importData(data);
                    updateStats();
                    loadAllViews();
                    updateStorageInfo();
                    populateLocationFilters();
                    populateFilterDropdowns();
                    showNotification('Data restored!', 'success');
                }
            } catch (error) {
                showNotification('Error: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (confirm('⚠️ Delete ALL data from Firebase? This cannot be undone!\n\nMake sure you have a backup first.')) {
        if (confirm('Really? All members and attendance will be permanently deleted.')) {
            DB.clearAll();
            updateStats();
            loadAllViews();
            updateStorageInfo();
            populateLocationFilters();
            populateFilterDropdowns();
            showNotification('All data cleared from Firebase', 'info');
        }
    }
}

function loadSampleData() {
    if (!confirm('Load sample data with 10 members and attendance records?')) return;
    
    DB.clearAll();
    const sampleMembers = [
        { name: 'John Smith', phone: '080-1234-5678', address: '12 Church Street, Lagos', location: 'Lagos', gender: 'Male', dob: '01/15', maritalStatus: 'Married', worker: 'Yes' },
        { name: 'Mary Johnson', phone: '080-2345-6789', address: '45 Faith Avenue, Abuja', location: 'Abuja', gender: 'Female', dob: '03/22', maritalStatus: 'Single', worker: 'Yes' },
        { name: 'David Williams', phone: '080-3456-7890', address: '78 Grace Road, PH', location: 'PH', gender: 'Male', dob: '06/10', maritalStatus: 'Married', worker: 'No' },
        { name: 'Sarah Brown', phone: '080-4567-8901', address: '9 Hope Street, Lagos', location: 'Lagos', gender: 'Female', dob: '09/05', maritalStatus: 'Single', worker: 'No' },
        { name: 'Michael Davis', phone: '080-5678-9012', address: '23 Peace Avenue, Abuja', location: 'Abuja', gender: 'Male', dob: '12/25', maritalStatus: 'Married', worker: 'Yes' },
        { name: 'Jessica Miller', phone: '080-6789-0123', address: '56 Love Lane, PH', location: 'PH', gender: 'Female', dob: '04/18', maritalStatus: 'Divorced', worker: 'No' },
        { name: 'Robert Wilson', phone: '080-7890-1234', address: '89 Joy Boulevard, Lagos', location: 'Lagos', gender: 'Male', dob: '07/30', maritalStatus: 'Single', worker: 'Yes' },
        { name: 'Jennifer Moore', phone: '080-8901-2345', address: '34 Faith Street, Abuja', location: 'Abuja', gender: 'Female', dob: '10/12', maritalStatus: 'Married', worker: 'No' },
        { name: 'James Taylor', phone: '080-9012-3456', address: '67 Glory Road, PH', location: 'PH', gender: 'Male', dob: '02/28', maritalStatus: 'Single', worker: 'Yes' },
        { name: 'Linda Anderson', phone: '080-0123-4567', address: '12 Mercy Drive, Lagos', location: 'Lagos', gender: 'Female', dob: '08/08', maritalStatus: 'Married', worker: 'No' }
    ];
    
    const memberIds = [];
    sampleMembers.forEach(m => {
        const member = DB.addMember(m);
        memberIds.push(member.id);
    });
    
    const today = new Date();
    for (let i = 0; i < 4; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (7 * i + 1));
        const dateStr = date.toISOString().split('T')[0];
        const attending = memberIds.filter(() => Math.random() > 0.2);
        attending.forEach(memberId => {
            DB.addAttendance({ memberId, date: dateStr, serviceType: 'Sunday 1st' });
        });
    }
    
    const atRiskIds = [1, 3, 5];
    atRiskIds.forEach(idx => {
        const memberId = memberIds[idx];
        const oldDate = new Date(today);
        oldDate.setDate(oldDate.getDate() - 50);
        DB.addAttendance({ 
            memberId: memberId, 
            date: oldDate.toISOString().split('T')[0], 
            serviceType: 'Sunday 1st' 
        });
    });
    
    const firstTimerId = memberIds[8];
    const firstDate = new Date(today);
    firstDate.setDate(firstDate.getDate() - 7);
    DB.addAttendance({ 
        memberId: firstTimerId, 
        date: firstDate.toISOString().split('T')[0], 
        serviceType: 'Sunday 1st' 
    });
    
    const secondTimerId = memberIds[9];
    const sd1 = new Date(today);
    sd1.setDate(sd1.getDate() - 21);
    const sd2 = new Date(today);
    sd2.setDate(sd2.getDate() - 14);
    DB.addAttendance({ memberId: secondTimerId, date: sd1.toISOString().split('T')[0], serviceType: 'Sunday 1st' });
    DB.addAttendance({ memberId: secondTimerId, date: sd2.toISOString().split('T')[0], serviceType: 'Sunday 1st' });
    
    for (let i = 0; i < 2; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (7 * i + 3));
        const dateStr = date.toISOString().split('T')[0];
        const attending = memberIds.filter(() => Math.random() > 0.6);
        attending.forEach(memberId => {
            DB.addAttendance({ memberId, date: dateStr, serviceType: 'Wednesday' });
        });
    }
    
    updateStats();
    loadAllViews();
    updateStorageInfo();
    populateLocationFilters();
    populateFilterDropdowns();
    showNotification('Sample data loaded!', 'success');
}

function loadAllViews() {
    loadTodayAttendance();
    loadMembers();
    loadFirstTimers();
    loadSecondTimers();
    loadAbsentees();
    loadAnalytics();
}

// ============================================
// EXPORT ABSENTEES - FIXED
// ============================================

function exportAbsentees(format) {
    console.log('📤 Exporting absentees...');
    
    const days = parseInt(document.getElementById('absentPeriod')?.value) || 30;
    const riskLevel = document.getElementById('absentRiskLevel')?.value || 'all';
    const workerFilter = document.getElementById('absentWorkerFilter')?.value || 'all';
    const locationFilter = document.getElementById('absentLocationFilter')?.value || 'all';
    
    // Get absent members with all filters
    const absentees = DB.getAbsentMembers(days, riskLevel, workerFilter, locationFilter);
    
    if (absentees.length === 0) {
        showNotification('No absentees to export', 'warning');
        return;
    }
    
    // Prepare data for export
    const data = absentees.map((m, i) => {
        const daysAbsent = DB.getDaysSinceLastVisit(m.id);
        let riskLabel = 'Low';
        if (daysAbsent > 60) riskLabel = 'High';
        else if (daysAbsent > 30) riskLabel = 'Medium';
        return {
            'S/N': i + 1,
            'Name': m.name,
            'Phone': m.phone || '',
            'Location': m.location || '',
            'Address': m.address || '',
            'Days Absent': daysAbsent,
            'Risk Level': riskLabel,
            'Worker': m.worker || 'No'
        };
    });
    
    const filterLabel = locationFilter !== 'all' ? `_${locationFilter}` : '';
    const riskLabel = riskLevel !== 'all' ? `_${riskLevel}` : '';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `At_Risk_Members${filterLabel}${riskLabel}_${dateStr}`;
    
    if (format === 'excel') {
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            
            // Set column widths
            ws['!cols'] = [
                { wch: 5 },   // S/N
                { wch: 25 },  // Name
                { wch: 15 },  // Phone
                { wch: 15 },  // Location
                { wch: 30 },  // Address
                { wch: 12 },  // Days Absent
                { wch: 12 },  // Risk Level
                { wch: 10 }   // Worker
            ];
            
            XLSX.utils.book_append_sheet(wb, ws, 'At Risk Members');
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            showNotification(`${absentees.length} at-risk members exported to Excel!`, 'success');
        } catch (e) {
            console.error('Excel export error:', e);
            showNotification('Excel export failed: ' + e.message, 'error');
        }
    } else if (format === 'share') {
        let text = `⚠️ AT RISK MEMBERS REPORT\n`;
        text += `📅 ${new Date().toLocaleString()}\n`;
        if (locationFilter !== 'all') text += `📍 Location: ${locationFilter}\n`;
        if (riskLevel !== 'all') text += `🎯 Risk Level: ${riskLevel.toUpperCase()}\n`;
        text += `${'─'.repeat(50)}\n\n`;
        
        data.forEach(row => {
            const emoji = row['Risk Level'] === 'High' ? '🔴' : row['Risk Level'] === 'Medium' ? '🟡' : '🟢';
            text += `${row['S/N']}. ${row.Name}`;
            if (row.Phone) text += ` 📱${row.Phone}`;
            if (row.Location) text += ` 📍${row.Location}`;
            text += ` - ${emoji} ${row['Risk Level']} (${row['Days Absent']} days)\n`;
        });
        
        text += `\n${'─'.repeat(50)}\n`;
        text += `Total: ${data.length} members at risk`;
        copyToClipboard(text, 'At Risk report copied to clipboard!');
    } else {
        // PDF/Word - HTML format
        let title = `At Risk Members`;
        if (locationFilter !== 'all') title += ` - ${locationFilter}`;
        if (riskLevel !== 'all') title += ` - ${riskLevel.toUpperCase()} Risk`;
        
        let html = generateExportHTML(data, title, 'At Risk Members');
        const ext = format === 'pdf' ? 'html' : 'doc';
        const mime = format === 'pdf' ? 'text/html' : 'application/msword';
        downloadFile(html, mime, `${fileName}.${ext}`);
        showNotification(`${absentees.length} at-risk members exported!`, 'success');
    }
}

// ============================================
// EXPORT HELPER FUNCTIONS
// ============================================

function generateExportHTML(data, title, sheetName) {
    if (!data || data.length === 0) return '<h1>No data</h1>';
    
    const headers = Object.keys(data[0]);
    
    return `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #6C3CE1; text-align: center; }
                h2 { text-align: center; color: #555; font-size: 14px; font-weight: normal; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #6C3CE1; color: white; padding: 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
                .total { margin-top: 20px; font-weight: bold; text-align: right; }
                .footer { margin-top: 20px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
                .risk-high { color: #C0392B; font-weight: bold; }
                .risk-medium { color: #E67E22; font-weight: bold; }
                .risk-low { color: #27AE60; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>⛪ ${title}</h1>
            <h2>Generated: ${new Date().toLocaleString()}</h2>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>${headers.map(h => {
                            let value = row[h] || '-';
                            if (h === 'Risk Level') {
                                const cls = value === 'High' ? 'risk-high' : value === 'Medium' ? 'risk-medium' : 'risk-low';
                                return `<td class="${cls}">${value}</td>`;
                            }
                            return `<td>${value}</td>`;
                        }).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total">Total: ${data.length} records</div>
            <div class="footer">⛪ Church Attendance System</div>
        </body>
        </html>
    `;
}

function downloadFile(content, mimeType, filename) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function copyToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showNotification(successMessage || 'Copied to clipboard!', 'success'))
            .catch(() => fallbackCopy(text, successMessage));
    } else {
        fallbackCopy(text, successMessage);
    }
}

function fallbackCopy(text, successMessage) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showNotification(successMessage || 'Copied to clipboard!', 'success');
    } catch (e) {
        showNotification('Failed to copy. Please copy manually.', 'error');
    }
    document.body.removeChild(textarea);
}

// ============================================
// MAKE FUNCTIONS AVAILABLE GLOBALLY
// ============================================

window.exportAbsentees = exportAbsentees;
window.exportAllData = exportAllData;
window.importAllData = importAllData;
window.clearAllData = clearAllData;
window.loadSampleData = loadSampleData;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.generateExportHTML = generateExportHTML;