// ============================================
// MVP.JS - Simplified Interface for MVP Users
// ============================================

// ============================================
// MVP MARK ATTENDANCE
// ============================================

function mvpMarkPresent(memberId) {
    const today = new Date().toISOString().split('T')[0];
    const serviceType = 'Sunday 1st';
    
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
        mvpSearchMembers();
        updateMVPStats();
        loadTodayAttendance();
    } else {
        showNotification('Already marked for today', 'warning');
    }
}

// ============================================
// MVP SEARCH
// ============================================

function mvpSearchMembers() {
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
                        `<button class="mark-btn" onclick="mvpMarkPresent('${m.id}')">
                            <i class="fas fa-check"></i> Mark
                        </button>`
                    }
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// UPDATED: MVP QUICK ADD - includes location
// ============================================

function mvpQuickAddMember() {
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
        address: address,
        location: location,
        gender: gender,
        dob: dob,
        maritalStatus: maritalStatus,
        worker: worker
    });
    
    const today = new Date().toISOString().split('T')[0];
    const serviceType = 'Sunday 1st';
    
    DB.addAttendance({
        memberId: member.id,
        date: today,
        serviceType: serviceType
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
    document.getElementById('quickLocation').value = '';
    document.getElementById('quickGender').value = '';
    document.getElementById('quickDOB').value = '';
    document.getElementById('quickMaritalStatus').value = '';
    document.getElementById('quickWorkerToggle').classList.remove('active');
    document.getElementById('quickWorker').value = 'No';
    
    showNotification(`Added ${fullName} and marked present!`, 'success');
    updateMVPStats();
    loadTodayAttendance();
    mvpSearchMembers();
    populateLocationFilters();
    
    setTimeout(() => {
        document.getElementById('quickAddResult').innerHTML = '';
        hideQuickAdd();
    }, 3000);
}

// ============================================
// UPDATED: MVP EXPORT TIMERS - includes location
// ============================================

function mvpExportTimers(type, format) {
    const members = type === 'first' ? DB.getFirstTimers() : DB.getSecondTimers();
    const label = type === 'first' ? 'First Timers' : 'Second Timers';
    
    if (members.length === 0) {
        showNotification(`No ${label} to export`, 'warning');
        return;
    }
    
    const data = members.map((m, i) => ({
        'S/N': i + 1,
        'Name': m.name,
        'Phone': m.phone || '',
        'Gender': m.gender || '',
        'Address': m.address || '',
        'Location': m.location || '',
        'DOB': m.dob || '',
        'Marital Status': m.maritalStatus || '',
        'Worker': m.worker || 'No'
    }));
    
    if (format === 'excel') {
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, label);
            XLSX.writeFile(wb, `${label}_${new Date().toISOString().split('T')[0]}.xlsx`);
            showNotification(`${label} exported to Excel!`, 'success');
        } catch (e) {
            showNotification('Excel export failed: ' + e.message, 'error');
        }
    } else if (format === 'share') {
        let text = `📊 ${label} Report\n`;
        text += `📅 ${new Date().toLocaleString()}\n`;
        text += `${'─'.repeat(40)}\n\n`;
        data.slice(0, 30).forEach(row => {
            text += `${row['S/N']}. ${row.Name}`;
            if (row.Phone) text += ` 📱${row.Phone}`;
            if (row.Address) text += ` 📍${row.Address}`;
            text += '\n';
        });
        if (data.length > 30) {
            text += `\n... and ${data.length - 30} more`;
        }
        text += `\n\n${'─'.repeat(40)}\n`;
        text += `Total: ${data.length} ${label}`;
        copyMVPToClipboard(text, `${label} report copied to clipboard!`);
    } else {
        let html = generateMVPExportHTML(data, label);
        const ext = format === 'pdf' ? 'html' : 'doc';
        const mime = format === 'pdf' ? 'text/html' : 'application/msword';
        downloadMVPFile(html, mime, `${label}_${new Date().toISOString().split('T')[0]}.${ext}`);
        showNotification(`${label} exported!`, 'success');
    }
}

// ============================================
// MVP HELPER FUNCTIONS - (unchanged)
// ============================================

function generateMVPExportHTML(data, title) {
    if (!data || data.length === 0) return '<h1>No data</h1>';
    
    const headers = Object.keys(data[0]);
    
    return `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #6C3CE1; text-align: center; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #6C3CE1; color: white; padding: 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
                .total { margin-top: 20px; font-weight: bold; text-align: right; }
            </style>
        </head>
        <body>
            <h1>⛪ ${title}</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>${headers.map(h => `<td>${row[h] || '-'}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="total">Total: ${data.length} records</div>
        </body>
        </html>
    `;
}

function downloadMVPFile(content, mimeType, filename) {
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

function copyMVPToClipboard(text, successMessage) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(() => showNotification(successMessage || 'Copied to clipboard!', 'success'))
            .catch(() => fallbackMVPCopy(text, successMessage));
    } else {
        fallbackMVPCopy(text, successMessage);
    }
}

function fallbackMVPCopy(text, successMessage) {
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
// MVP INIT
// ============================================

function initMVPOverrides() {
    console.log('⭐ Initializing MVP overrides');
    
    window.searchMembers = mvpSearchMembers;
    window.markPresent = mvpMarkPresent;
    window.quickAddMember = mvpQuickAddMember;
    window.exportTimers = mvpExportTimers;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMVPOverrides);
} else {
    initMVPOverrides();
}

console.log('⭐ MVP module loaded');