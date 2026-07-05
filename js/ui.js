// ============================================
// UI FUNCTIONS - Tabs, Stats, Search, Mark, Import
// ============================================

function showTab(tabName) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const section = document.getElementById('section-' + tabName);
    if (section) section.classList.add('active');
    
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => {
        const text = el.textContent.toLowerCase().trim();
        if (text.includes(tabName.toLowerCase()) || 
            (tabName === 'mark' && text.includes('mark')) ||
            (tabName === 'absentees' && text.includes('risk'))) {
            el.classList.add('active');
        }
    });
    
    if (tabName === 'today') loadTodayAttendance();
    if (tabName === 'members') loadMembers();
    if (tabName === 'firstTimers') { populateAddressFilters(); loadFirstTimers(); }
    if (tabName === 'secondTimers') { populateAddressFilters(); loadSecondTimers(); }
    if (tabName === 'absentees') loadAbsentees();
    if (tabName === 'analytics') loadAnalytics();
    
    if (tabName === 'mark') {
        setTimeout(() => document.getElementById('memberSearch').focus(), 300);
    }
}

function updateStats() {
    const stats = DB.getStats();
    document.getElementById('todayCount').textContent = stats.todayAttendance;
    document.getElementById('firstTimerCount').textContent = stats.firstTimers;
    document.getElementById('secondTimerCount').textContent = stats.secondTimers;
    document.getElementById('totalMembers').textContent = stats.totalMembers;
    document.getElementById('absentCount').textContent = stats.absentCount;
}

function populateAddressFilters() {
    const addresses = DB.getUniqueAddresses();
    ['firstTimerAddressFilter', 'secondTimerAddressFilter'].forEach(selectorId => {
        const select = document.getElementById(selectorId);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="all">All Locations</option>';
        addresses.forEach(addr => {
            const option = document.createElement('option');
            option.value = addr;
            option.textContent = addr;
            if (addr === currentValue) option.selected = true;
            select.appendChild(option);
        });
    });
}

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
    const serviceType = 'Sunday AM';
    
    const result = DB.addAttendance({
        memberId: memberId,
        date: today,
        serviceType: serviceType
    });
    
    if (result) {
        const member = DB.getMemberById(memberId);
        const count = DB.getMemberVisitCount(memberId);
        let msg = `${member ? member.name : 'Member'} marked present!`;
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
// TOGGLE FUNCTIONS - Consolidated to avoid duplicates
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

function showQuickAdd() {
    document.getElementById('quickAdd').classList.add('visible');
    document.getElementById('quickFirstName').focus();
}

function hideQuickAdd() {
    document.getElementById('quickAdd').classList.remove('visible');
}

function quickAddMember() {
    const firstName = document.getElementById('quickFirstName').value.trim();
    const lastName = document.getElementById('quickLastName').value.trim();
    const phone = document.getElementById('quickPhone').value.trim();
    const address = document.getElementById('quickAddress').value.trim();
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
        address: address,
        gender: gender,
        dob: dob,
        maritalStatus: maritalStatus,
        worker: worker
    });
    
    const today = new Date().toISOString().split('T')[0];
    DB.addAttendance({
        memberId: member.id,
        date: today,
        serviceType: 'Sunday AM'
    });
    
    document.getElementById('quickAddResult').innerHTML = `
        <div style="background:#D5F5E3; padding:8px; border-radius:var(--radius-sm); color:#1A7A42; text-align:center;">
            ✅ Added ${fullName} and marked present! ⭐ First timer!
        </div>
    `;
    
    document.getElementById('quickFirstName').value = '';
    document.getElementById('quickLastName').value = '';
    document.getElementById('quickPhone').value = '';
    document.getElementById('quickAddress').value = '';
    document.getElementById('quickGender').value = '';
    document.getElementById('quickDOB').value = '';
    document.getElementById('quickMaritalStatus').value = '';
    document.getElementById('quickWorkerToggle').classList.remove('active');
    document.getElementById('quickWorker').value = 'No';
    
    showNotification(`Added ${fullName} and marked present!`, 'success');
    updateStats();
    loadTodayAttendance();
    loadMembers();
    searchMembers();
    populateAddressFilters();
    
    if (isFirebaseConnected && currentUser) {
        setTimeout(() => syncToFirebase(), 1000);
    }
    
    setTimeout(() => {
        document.getElementById('quickAddResult').innerHTML = '';
        hideQuickAdd();
    }, 3000);
}

function showNotification(message, type = 'success') {
    const el = document.getElementById('notification');
    el.className = `notification ${type}`;
    el.innerHTML = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function updateStorageInfo() {
    const members = DB.getMembers();
    const attendance = DB.getAttendance();
    const size = new Blob([JSON.stringify({ members, attendance })]).size;
    document.getElementById('storageInfo').innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:6px; font-size:13px;">
            <div><i class="fas fa-users" style="color:var(--primary);"></i> ${members.length} Members</div>
            <div><i class="fas fa-list" style="color:var(--success);"></i> ${attendance.length} Records</div>
            <div><i class="fas fa-database" style="color:var(--info);"></i> ${(size / 1024).toFixed(1)} KB</div>
            <div><i class="fas fa-cloud" style="color:${isFirebaseConnected ? 'var(--success)' : 'var(--gray)'};"></i> ${isFirebaseConnected ? 'Cloud Connected' : 'Cloud Offline'}</div>
            <div><i class="fas fa-user" style="color:var(--primary);"></i> ${currentUser ? currentUser.email : 'Not logged in'}</div>
        </div>
    `;
}

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
                    populateAddressFilters();
                    showNotification('Data restored!', 'success');
                    if (isFirebaseConnected && currentUser) {
                        setTimeout(() => syncToFirebase(), 1000);
                    }
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
    if (confirm('⚠️ Delete ALL data? This cannot be undone!\n\nMake sure you have a backup first.')) {
        if (confirm('Really? All members and attendance will be permanently deleted.')) {
            DB.clearAll();
            updateStats();
            loadAllViews();
            updateStorageInfo();
            populateAddressFilters();
            showNotification('All data cleared', 'info');
        }
    }
}

function loadSampleData() {
    if (!confirm('Load sample data with 10 members and attendance records?')) return;
    
    DB.clearAll();
    const sampleMembers = [
        { name: 'John Smith', phone: '080-1234-5678', address: '12 Church Street, Lagos', gender: 'Male', dob: '01/15', maritalStatus: 'Married', worker: 'Yes' },
        { name: 'Mary Johnson', phone: '080-2345-6789', address: '45 Faith Avenue, Abuja', gender: 'Female', dob: '03/22', maritalStatus: 'Single', worker: 'Yes' },
        { name: 'David Williams', phone: '080-3456-7890', address: '78 Grace Road, PH', gender: 'Male', dob: '06/10', maritalStatus: 'Married', worker: 'No' },
        { name: 'Sarah Brown', phone: '080-4567-8901', address: '9 Hope Street, Lagos', gender: 'Female', dob: '09/05', maritalStatus: 'Single', worker: 'No' },
        { name: 'Michael Davis', phone: '080-5678-9012', address: '23 Peace Avenue, Abuja', gender: 'Male', dob: '12/25', maritalStatus: 'Married', worker: 'Yes' },
        { name: 'Jessica Miller', phone: '080-6789-0123', address: '56 Love Lane, PH', gender: 'Female', dob: '04/18', maritalStatus: 'Divorced', worker: 'No' },
        { name: 'Robert Wilson', phone: '080-7890-1234', address: '89 Joy Boulevard, Lagos', gender: 'Male', dob: '07/30', maritalStatus: 'Single', worker: 'Yes' },
        { name: 'Jennifer Moore', phone: '080-8901-2345', address: '34 Faith Street, Abuja', gender: 'Female', dob: '10/12', maritalStatus: 'Married', worker: 'No' },
        { name: 'James Taylor', phone: '080-9012-3456', address: '67 Glory Road, PH', gender: 'Male', dob: '02/28', maritalStatus: 'Single', worker: 'Yes' },
        { name: 'Linda Anderson', phone: '080-0123-4567', address: '12 Mercy Drive, Lagos', gender: 'Female', dob: '08/08', maritalStatus: 'Married', worker: 'No' }
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
            DB.addAttendance({ memberId, date: dateStr, serviceType: 'Sunday AM' });
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
            serviceType: 'Sunday AM' 
        });
    });
    
    const firstTimerId = memberIds[8];
    const firstDate = new Date(today);
    firstDate.setDate(firstDate.getDate() - 7);
    DB.addAttendance({ 
        memberId: firstTimerId, 
        date: firstDate.toISOString().split('T')[0], 
        serviceType: 'Sunday AM' 
    });
    
    const secondTimerId = memberIds[9];
    const sd1 = new Date(today);
    sd1.setDate(sd1.getDate() - 21);
    const sd2 = new Date(today);
    sd2.setDate(sd2.getDate() - 14);
    DB.addAttendance({ memberId: secondTimerId, date: sd1.toISOString().split('T')[0], serviceType: 'Sunday AM' });
    DB.addAttendance({ memberId: secondTimerId, date: sd2.toISOString().split('T')[0], serviceType: 'Sunday AM' });
    
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
    populateAddressFilters();
    showNotification('Sample data loaded with risk indicators!', 'success');
    
    if (isFirebaseConnected && currentUser) {
        setTimeout(() => syncToFirebase(), 1000);
    }
}

function syncToFirebase() {
    if (!currentUser) {
        showNotification('Not logged in', 'error');
        return;
    }
    showNotification('Syncing to cloud...', 'info');
    DB.syncToFirebase();
    setTimeout(() => {
        showNotification('Sync attempted! Check status.', 'info');
    }, 2000);
}

function loadFromFirebase() {
    if (!currentUser) {
        showNotification('Not logged in', 'error');
        return;
    }
    showNotification('Loading from cloud...', 'info');
    DB.loadFromFirebase().then((loaded) => {
        if (loaded) {
            updateStats();
            loadAllViews();
            updateStorageInfo();
            populateAddressFilters();
            showNotification('Data loaded from cloud!', 'success');
        } else {
            showNotification('No data found in cloud', 'warning');
        }
    });
}

// ============================================
// PASTE IMPORT FUNCTIONS - LINE BY LINE PARSER
// ============================================

function parsePasteImport() {
    const text = document.getElementById('pasteInput').value;
    if (!text.trim()) {
        showNotification('Please paste some data first', 'error');
        return;
    }
    
    const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 5);
    
    if (lines.length === 0) {
        showNotification('No valid data found', 'error');
        return;
    }
    
    const parsedMembers = [];
    const parseErrors = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (/S\/N|Name|Phone|Gender|Bus Stop|DOB|Marital/i.test(line) && line.length < 30) continue;
        if (/^[\d\s]+$/.test(line)) continue;
        if (line.includes('Page') || line.includes('=====')) continue;
        if (line.includes('Service') || line.includes('Attendance')) continue;
        
        const result = parseMemberLine(line);
        if (result && result.name && result.name.length > 1) {
            parsedMembers.push(result);
        } else {
            parseErrors.push(`Line ${i + 1}: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
        }
    }
    
    if (parsedMembers.length === 0 && lines.length > 0) {
        let combined = '';
        for (const line of lines) {
            combined += ' ' + line;
        }
        const phoneRegex = /(0[789][01]\d{8})/g;
        const phoneMatches = [];
        let match;
        while ((match = phoneRegex.exec(combined)) !== null) {
            phoneMatches.push(match.index);
        }
        
        if (phoneMatches.length > 0) {
            for (let i = 0; i < phoneMatches.length; i++) {
                const start = phoneMatches[i];
                const end = i < phoneMatches.length - 1 ? phoneMatches[i + 1] : combined.length;
                let entry = combined.substring(start, end).trim();
                const beforeStart = Math.max(0, start - 100);
                const beforeText = combined.substring(beforeStart, start);
                const nameMatch = beforeText.match(/([A-Za-z\.\s]+?)(?=\s*(?:Male|Female|0[789][01]\d{8}|$))/);
                if (nameMatch) {
                    const namePart = nameMatch[1].trim();
                    if (namePart.length > 2) {
                        entry = namePart + ' ' + entry;
                    }
                }
                const result = parseMemberLine(entry);
                if (result && result.name && result.name.length > 1) {
                    parsedMembers.push(result);
                }
            }
        }
    }
    
    displayPasteResults(parsedMembers, parseErrors);
}

function parseMemberLine(line) {
    let text = line.trim();
    
    text = text.replace(/^S\/N\s*/i, '');
    text = text.replace(/^[\d]+[\.\s]+/, '');
    text = text.replace(/^\d+\s+/, '');
    text = text.replace(/[^\w\s\.\-\(\)]/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    
    const phoneMatch = text.match(/(0[789][01]\d{8})/);
    let phone = '';
    let remaining = text;
    
    if (phoneMatch) {
        phone = phoneMatch[1];
        remaining = text.replace(phoneMatch[1], '').trim();
    }
    
    const genderMatch = remaining.match(/\b(Male|Female)\b/i);
    let gender = '';
    if (genderMatch) {
        gender = genderMatch[1];
        remaining = remaining.replace(genderMatch[1], '').trim();
    }
    
    const statusMatch = remaining.match(/\b(Single|Married|Divorced|Widowed)\b/i);
    let maritalStatus = '';
    if (statusMatch) {
        maritalStatus = statusMatch[1];
        remaining = remaining.replace(statusMatch[1], '').trim();
    }
    
    let dob = '';
    const dobPatterns = [
        /(\d{1,2})(?:st|nd|rd|th)?\s*(January|February|March|April|May|June|July|August|September|October|November|December)/i,
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?/i,
        /(\d{2})\/(\d{2})/
    ];
    
    for (const pattern of dobPatterns) {
        const match = remaining.match(pattern);
        if (match) {
            const monthMap = {
                'January': '01', 'February': '02', 'March': '03', 'April': '04',
                'May': '05', 'June': '06', 'July': '07', 'August': '08',
                'September': '09', 'October': '10', 'November': '11', 'December': '12'
            };
            
            if (pattern === dobPatterns[2]) {
                dob = match[0];
            } else if (pattern === dobPatterns[0]) {
                const day = match[1].padStart(2, '0');
                const month = monthMap[match[2]] || '01';
                dob = `${month}/${day}`;
            } else if (pattern === dobPatterns[1]) {
                const month = monthMap[match[1]] || '01';
                const day = match[2].padStart(2, '0');
                dob = `${month}/${day}`;
            }
            
            remaining = remaining.replace(match[0], '').trim();
            break;
        }
    }
    
    let name = remaining;
    let address = '';
    
    const addressKeywords = [
        'Dalemo', 'Sango', 'Sona', 'Alishiba', 'Ojuore', 'Tarmac', 
        'Tollgate', 'Kola', 'Joju', 'Ijako', 'Obasanjo', 'Temidire',
        'Iloye', 'Singer', 'Alakuko', 'Iloje', 'Alagbado', 'Atan',
        'Abule Iroko', 'Ijoko', 'Mosalashi', 'Itori', 'Kola',
        'Tarmac', 'Saka'
    ];
    
    for (const keyword of addressKeywords) {
        if (name.includes(keyword)) {
            const parts = name.split(keyword);
            name = parts[0].trim();
            address = keyword + (parts[1] || '').trim();
            break;
        }
    }
    
    name = name.replace(/\s+/g, ' ').trim();
    name = name.replace(/^\d+\s+/, '');
    name = name.replace(/\s+\d+$/, '');
    
    if (!name || name.length < 2) {
        const nameMatch = line.match(/([A-Za-z]+(?:\s+[A-Za-z]+){0,2})/);
        if (nameMatch) {
            name = nameMatch[1].trim();
        }
    }
    
    name = name.replace(/\b\d+\b/g, '').trim();
    
    if (!name || name.length < 2) {
        return null;
    }
    
    return {
        name: name,
        phone: phone,
        gender: gender,
        address: address,
        dob: dob,
        maritalStatus: maritalStatus,
        worker: 'No'
    };
}

function displayPasteResults(parsedMembers, parseErrors) {
    const previewDiv = document.getElementById('pastePreview');
    const resultDiv = document.getElementById('pasteResult');
    
    if (parsedMembers.length === 0) {
        resultDiv.innerHTML = `
            <div style="background:#FADBD8; padding:16px; border-radius:var(--radius-sm); color:#922B21;">
                <strong>⚠️ No members could be parsed</strong>
                <p>Please check the format. Each member should have: Name, Phone, Gender, Address, DOB, Status</p>
                ${parseErrors.length > 0 ? `
                    <details style="margin-top:8px;">
                        <summary style="cursor:pointer;">View errors (${parseErrors.length})</summary>
                        <ul style="margin-top:8px; padding-left:20px; max-height:200px; overflow-y:auto;">
                            ${parseErrors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </details>
                ` : ''}
            </div>
        `;
        previewDiv.style.display = 'none';
        return;
    }
    
    previewDiv.style.display = 'block';
    previewDiv.innerHTML = `
        <div style="background:#D5F5E3; padding:12px; border-radius:var(--radius-sm); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong>✅ Parsed ${parsedMembers.length} members</strong>
            ${parseErrors.length > 0 ? ` (${parseErrors.length} lines skipped)` : ''}
            <div>
                <button class="btn btn-success" onclick="confirmPasteImport(${JSON.stringify(parsedMembers).replace(/"/g, '&quot;')})">
                    <i class="fas fa-check"></i> Import ${parsedMembers.length} Members
                </button>
                <button class="btn btn-danger" onclick="clearPaste()">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </div>
        <div class="table-container">
            <table>
                <thead><tr>
                    <th>#</th><th>Name</th><th>Phone</th><th>Gender</th>
                    <th>Address</th><th>DOB</th><th>Marital Status</th>
                </tr></thead>
                <tbody>
                    ${parsedMembers.slice(0, 30).map((m, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td><strong>${m.name}</strong></td>
                            <td>${m.phone || '-'}</td>
                            <td>${m.gender || '-'}</td>
                            <td>${m.address || '-'}</td>
                            <td>${m.dob || '-'}</td>
                            <td>${m.maritalStatus || '-'}</td>
                        </tr>
                    `).join('')}
                    ${parsedMembers.length > 30 ? `<tr><td colspan="7" style="text-align:center; color:var(--gray);">... and ${parsedMembers.length - 30} more</td></tr>` : ''}
                </tbody>
            </table>
        </div>
        ${parseErrors.length > 0 ? `
            <details style="margin-top:8px;">
                <summary style="cursor:pointer; color:var(--gray); font-size:13px;">⚠️ ${parseErrors.length} lines skipped</summary>
                <ul style="margin-top:8px; padding-left:20px; font-size:13px; color:#922B21; max-height:200px; overflow-y:auto;">
                    ${parseErrors.map(e => `<li>${e}</li>`).join('')}
                </ul>
            </details>
        ` : ''}
        <div style="margin-top:8px; font-size:12px; color:var(--gray); text-align:center;">
            💡 Total: ${parsedMembers.length} valid members found
        </div>
    `;
    
    window._pasteMembers = parsedMembers;
    resultDiv.innerHTML = '';
}

function confirmPasteImport(members) {
    if (!members || members.length === 0) {
        showNotification('No members to import', 'error');
        return;
    }
    
    if (!confirm(`Import ${members.length} members? Existing members will be updated.`)) return;
    
    const result = DB.addMembersBulk(members);
    
    document.getElementById('pasteResult').innerHTML = `
        <div style="background:#D5F5E3; padding:16px; border-radius:var(--radius-sm); color:#1A7A42;">
            <strong>✅ Import Complete!</strong>
            <p>${result.added} new members added</p>
            <p>${result.updated} existing members updated</p>
            <p>Total: ${result.total} members processed</p>
        </div>
    `;
    
    document.getElementById('pastePreview').style.display = 'none';
    document.getElementById('pasteInput').value = '';
    window._pasteMembers = null;
    
    showNotification(`Imported ${result.total} members!`, 'success');
    updateStats();
    loadAllViews();
    populateAddressFilters();
    
    if (isFirebaseConnected && currentUser) {
        setTimeout(() => syncToFirebase(), 1000);
    }
}

function clearPaste() {
    document.getElementById('pasteInput').value = '';
    document.getElementById('pastePreview').style.display = 'none';
    document.getElementById('pasteResult').innerHTML = '';
}

// ============================================
// EXCEL IMPORT FUNCTIONS - FIXED FOR YOUR DATA
// ============================================

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            console.log('📊 Found columns:', Object.keys(jsonData[0] || {}));
            console.log('📊 Total rows:', jsonData.length);
            
            // Map columns - handles your specific column names
            const members = jsonData.map((row, index) => {
                // Helper to get value case-insensitively
                const getValue = (keys) => {
                    for (const key of keys) {
                        // Check if key exists in row (case insensitive)
                        const foundKey = Object.keys(row).find(k => 
                            k.toLowerCase().trim() === key.toLowerCase().trim()
                        );
                        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                            const val = String(row[foundKey]).trim();
                            // Skip empty values or values that are just numbers (like S/N)
                            if (val && !/^[\d\.]+$/.test(val)) {
                                return val;
                            }
                            return val;
                        }
                    }
                    return '';
                };
                
                // Map all fields
                const name = getValue(['Name', 'name', 'Full Name', 'Member Name']);
                const phone = getValue(['PhoneNo', 'Phone', 'phone', 'Phone Number', 'Telephone']);
                const gender = getValue(['Gender', 'gender']);
                const address = getValue(['Bus Stop', 'Address', 'address', 'Location', 'Area']);
                const dob = getValue(['DOB', 'dob', 'Date of Birth', 'Birthday']);
                const maritalStatus = getValue(['Marital Status', 'MaritalStatus', 'maritalStatus', 'Status']);
                
                // Skip empty rows or rows without a name
                if (!name || name.length === 0) {
                    return null;
                }
                
                // Convert "Worker" - we'll default to "No" since it's not in your data
                const worker = getValue(['Worker', 'worker', 'Worker?', 'Is Worker']);
                
                return {
                    name: name,
                    phone: phone,
                    gender: gender,
                    address: address,
                    dob: dob,
                    maritalStatus: maritalStatus,
                    worker: (worker.toLowerCase() === 'yes' || worker.toLowerCase() === 'y') ? 'Yes' : 'No'
                };
            }).filter(m => m !== null && m.name && m.name.length > 0);
            
            console.log('📊 Parsed members:', members.length);
            
            if (members.length === 0) {
                showNotification('No valid members found. Make sure you have a "Name" column.', 'error');
                return;
            }
            
            // Store in global cache
            importDataCache = members;
            showImportPreview(members);
            
        } catch (error) {
            console.error('❌ Import error:', error);
            showNotification('Error reading file: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showImportPreview(members) {
    const previewDiv = document.getElementById('importPreview');
    const contentDiv = document.getElementById('previewContent');
    
    if (!previewDiv) {
        console.error('importPreview element not found');
        return;
    }
    
    previewDiv.style.display = 'block';
    previewDiv.classList.add('visible');
    
    // Update the confirm button text
    const confirmBtn = previewDiv.querySelector('.btn-success');
    if (confirmBtn) {
        confirmBtn.innerHTML = `<i class="fas fa-check"></i> Import All (${members.length} members)`;
    }
    
    // Build preview table
    contentDiv.innerHTML = `
        <div style="background:#D5F5E3; padding:8px; border-radius:var(--radius-sm); margin-bottom:8px;">
            Found <strong>${members.length}</strong> members ready to import
        </div>
        <div class="table-container">
            <table>
                <thead><tr>
                    <th>#</th><th>Name</th><th>Phone</th><th>Gender</th>
                    <th>Address/Bus Stop</th><th>DOB</th><th>Status</th>
                </tr></thead>
                <tbody>
                    ${members.slice(0, 20).map((m, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td><strong>${m.name}</strong></td>
                            <td>${m.phone || '-'}</td>
                            <td>${m.gender || '-'}</td>
                            <td>${m.address || '-'}</td>
                            <td>${m.dob || '-'}</td>
                            <td>${m.maritalStatus || '-'}</td>
                        </tr>
                    `).join('')}
                    ${members.length > 20 ? `<tr><td colspan="7" style="text-align:center; color:var(--gray);">... and ${members.length - 20} more</td></tr>` : ''}
                </tbody>
            </table>
        </div>
    `;
}

function confirmImport() {
    if (!importDataCache || importDataCache.length === 0) {
        showNotification('No data to import', 'error');
        return;
    }
    
    if (!confirm(`Import ${importDataCache.length} members? Existing members with same name will be updated.`)) return;
    
    const result = DB.addMembersBulk(importDataCache);
    
    document.getElementById('importResult').innerHTML = `
        <div style="background:#D5F5E3; padding:16px; border-radius:var(--radius-sm); color:#1A7A42;">
            <strong>✅ Import Complete!</strong>
            <p>${result.added} new members added</p>
            <p>${result.updated} existing members updated</p>
            <p>Total: ${result.total} members processed</p>
        </div>
    `;
    
    // Hide preview
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importPreview').classList.remove('visible');
    document.getElementById('fileInput').value = '';
    
    // Clear cache
    importDataCache = null;
    
    showNotification(`Imported ${result.total} members!`, 'success');
    updateStats();
    loadAllViews();
    populateAddressFilters();
    
    if (isFirebaseConnected && currentUser) {
        setTimeout(() => syncToFirebase(), 1000);
    }
}

function cancelImport() {
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importPreview').classList.remove('visible');
    document.getElementById('fileInput').value = '';
    importDataCache = null;
    showNotification('Import cancelled', 'info');
}

function downloadTemplate() {
    const template = [
        ['Name', 'PhoneNo', 'Gender', 'Bus Stop', 'DOB', 'Marital Status', 'Worker'],
        ['John Doe', '08012345678', 'Male', 'Dalemo', '15/01', 'Married', 'Yes'],
        ['Jane Smith', '08087654321', 'Female', 'Sango', '22/03', 'Single', 'No']
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'church_members_template.xlsx');
    showNotification('Template downloaded!', 'success');
}

function loadAllViews() {
    loadTodayAttendance();
    loadMembers();
    loadFirstTimers();
    loadSecondTimers();
    loadAbsentees();
    loadAnalytics();
}
