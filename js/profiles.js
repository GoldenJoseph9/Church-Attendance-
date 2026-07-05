// ============================================
// PROFILES.JS - Member Profile Management
// ============================================

function loadMembers() {
    const container = document.getElementById('memberList');
    const search = document.getElementById('memberListSearch').value.toLowerCase().trim();
    let members = DB.getMembers();
    if (search) members = members.filter(m => m.name.toLowerCase().includes(search));
    members.sort((a, b) => a.name.localeCompare(b.name));
    
    document.getElementById('memberCount').textContent = `${members.length} members`;
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">👥</span>
                <h3>${search ? 'No matches' : 'No members yet'}</h3>
                <button class="btn btn-success" onclick="showTab('mark'); showQuickAdd();">
                    <i class="fas fa-user-plus"></i> Add Member
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead><tr>
                    <th>Name</th><th>Phone</th><th>Address</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>
                    ${members.map(m => {
                        const count = DB.getMemberVisitCount(m.id);
                        const status = count === 0 ? '❌ Never' : 
                                      count === 1 ? '⭐ First' : 
                                      count === 2 ? '🌟 Second' : '✅ Regular';
                        return `
                            <tr>
                                <td><strong>${m.name}</strong></td>
                                <td>${m.phone || '-'}</td>
                                <td>${m.address || '-'}</td>
                                <td><span class="badge ${count === 0 ? 'badge-danger' : count === 1 ? 'badge-warning' : count === 2 ? 'badge-info' : 'badge-success'}">${status}</span></td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="openMemberModal('${m.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-success btn-sm" onclick="markPresent('${m.id}')">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="deleteMember('${m.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function loadFirstTimers() {
    const container = document.getElementById('firstTimerList');
    const addressFilter = document.getElementById('firstTimerAddressFilter').value;
    const workerFilter = document.getElementById('firstTimerWorkerFilter').value;
    const firstTimers = DB.getFirstTimers(addressFilter, workerFilter);
    
    if (firstTimers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">⭐</span>
                <h3>No First Timers</h3>
                <p>${addressFilter !== 'all' ? 'No first timers from this location' : 'Everyone has visited more than once!'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="background:#FDEBD0; padding:12px; border-radius:var(--radius-sm); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong>⭐ ${firstTimers.length} First Timers</strong>
            <span style="font-size:12px; color:var(--gray);">
                ${addressFilter !== 'all' ? '📍 ' + addressFilter : 'All Locations'}
                ${workerFilter !== 'all' ? ' • ' + (workerFilter === 'Yes' ? 'Workers' : 'Non-Workers') : ''}
            </span>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th>Action</th></tr></thead>
                <tbody>
                    ${firstTimers.map((m, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td><strong>${m.name}</strong></td>
                            <td>${m.phone || '-'}</td>
                            <td>${m.address || '-'}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="openMemberModal('${m.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-success btn-sm" onclick="markPresent('${m.id}')">
                                    <i class="fas fa-check"></i> Mark
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function loadSecondTimers() {
    const container = document.getElementById('secondTimerList');
    const addressFilter = document.getElementById('secondTimerAddressFilter').value;
    const workerFilter = document.getElementById('secondTimerWorkerFilter').value;
    const secondTimers = DB.getSecondTimers(addressFilter, workerFilter);
    
    if (secondTimers.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🌟</span>
                <h3>No Second Timers</h3>
                <p>${addressFilter !== 'all' ? 'No second timers from this location' : 'Keep inviting people!'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="background:#D6EAF8; padding:12px; border-radius:var(--radius-sm); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong>🌟 ${secondTimers.length} Second Timers</strong>
            <span style="font-size:12px; color:var(--gray);">
                ${addressFilter !== 'all' ? '📍 ' + addressFilter : 'All Locations'}
                ${workerFilter !== 'all' ? ' • ' + (workerFilter === 'Yes' ? 'Workers' : 'Non-Workers') : ''}
            </span>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th>Action</th></tr></thead>
                <tbody>
                    ${secondTimers.map((m, i) => `
                        <tr>
                            <td>${i+1}</td>
                            <td><strong>${m.name}</strong></td>
                            <td>${m.phone || '-'}</td>
                            <td>${m.address || '-'}</td>
                            <td>
                                <button class="btn btn-primary btn-sm" onclick="openMemberModal('${m.id}')">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-success btn-sm" onclick="markPresent('${m.id}')">
                                    <i class="fas fa-check"></i> Mark
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function loadAbsentees() {
    const container = document.getElementById('absenteeList');
    const days = parseInt(document.getElementById('absentPeriod').value);
    const riskLevel = document.getElementById('absentRiskLevel').value;
    const workerFilter = document.getElementById('absentWorkerFilter').value;
    
    const absentees = DB.getAbsentMembers(days, riskLevel, workerFilter);
    
    if (absentees.length === 0) {
        let msg = 'All members have attended recently! 🎉';
        if (riskLevel !== 'all') {
            const labels = { 'high': '🔴 High Risk (60+ days)', 'medium': '🟡 Medium Risk (30-60 days)', 'low': '🟢 Low Risk (7-30 days)' };
            msg = `No members at ${labels[riskLevel] || riskLevel} risk level`;
        }
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🎉</span>
                <h3>${msg}</h3>
                <p>${days} day period checked</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="background:#FADBD8; padding:12px; border-radius:var(--radius-sm); margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong>⚠️ ${absentees.length} members at risk</strong>
            <span style="font-size:12px; color:var(--gray);">
                ${riskLevel !== 'all' ? ({"high":"🔴 High","medium":"🟡 Medium","low":"🟢 Low"}[riskLevel] || riskLevel) : 'All Risk'} • 
                ${days} days • 
                ${workerFilter !== 'all' ? (workerFilter === 'Yes' ? 'Workers' : 'Non-Workers') : 'All Members'}
            </span>
        </div>
        <div class="table-container">
            <table>
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th>Days Absent</th><th>Risk</th><th>Action</th></tr></thead>
                <tbody>
                    ${absentees.map((m, i) => {
                        const daysAbsent = DB.getDaysSinceLastVisit(m.id);
                        let riskClass = 'risk-low';
                        let riskLabel = '🟢 Low';
                        if (daysAbsent > 60) { riskClass = 'risk-high'; riskLabel = '🔴 High'; }
                        else if (daysAbsent > 30) { riskClass = 'risk-medium'; riskLabel = '🟡 Medium'; }
                        return `
                            <tr>
                                <td>${i+1}</td>
                                <td><strong>${m.name}</strong></td>
                                <td>${m.phone || '-'}</td>
                                <td>${m.address || '-'}</td>
                                <td><span class="badge ${riskClass}">${daysAbsent} days</span></td>
                                <td><span class="badge ${riskClass}">${riskLabel}</span></td>
                                <td>
                                    <button class="btn btn-primary btn-sm" onclick="openMemberModal('${m.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    <button class="btn btn-success btn-sm" onclick="markPresent('${m.id}')">
                                        <i class="fas fa-check"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top:12px; padding:12px; background:#F8F9FC; border-radius:var(--radius-sm); font-size:13px; text-align:center;">
            💡 <strong>Tip:</strong> Start with 🔴 High Risk members first - they need immediate follow-up!
        </div>
    `;
}

function loadTodayAttendance() {
    const container = document.getElementById('todayAttendanceList');
    const today = new Date().toISOString().split('T')[0];
    const attendance = DB.getAttendance().filter(a => a.date === today);
    
    if (attendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <h3>No attendance yet today</h3>
                <p>Go to the "Mark" tab to record attendance</p>
            </div>
        `;
        return;
    }
    
    const records = attendance.map(a => {
        const m = DB.getMemberById(a.memberId);
        const count = DB.getMemberVisitCount(a.memberId);
        const status = count === 1 ? '⭐ First' : count === 2 ? '🌟 Second' : '';
        return { ...a, name: m ? m.name : 'Unknown', status, worker: m ? m.worker : 'No', phone: m ? m.phone : '' };
    });
    
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
            <strong>${records.length} members</strong>
        </div>
        <div class="attendance-list">
            ${records.map(r => `
                <div class="attendance-item" onclick="openMemberModal('${r.memberId}')" style="cursor:pointer; padding:8px 12px; border-bottom:1px solid #F0F2F5; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${r.name}</strong>
                        ${r.phone ? ' 📱 ' + r.phone : ''}
                        ${r.status ? `<span class="badge badge-warning">${r.status}</span>` : ''}
                        ${r.worker === 'Yes' ? '<span class="badge badge-info">Worker</span>' : ''}
                    </div>
                    <div style="font-size:12px; color:var(--gray);">${r.serviceType || 'Service'}</div>
                </div>
            `).join('')}
        </div>
    `;
}

function toggleEditWorker() {
    const toggle = document.getElementById('editWorkerToggle');
    const hidden = document.getElementById('editWorker');
    toggle.classList.toggle('active');
    hidden.value = toggle.classList.contains('active') ? 'Yes' : 'No';
}

function openMemberModal(memberId) {
    const modal = document.getElementById('memberModal');
    const body = document.getElementById('modalBody');
    modal.classList.add('active');
    modalMemberId = memberId;
    
    const member = DB.getMemberById(memberId);
    if (!member) {
        body.innerHTML = '<p>Member not found</p>';
        return;
    }
    
    document.getElementById('modalMemberName').textContent = member.name;
    
    const attendance = DB.getAttendanceByMember(memberId);
    const count = attendance.length;
    const daysAbsent = DB.getDaysSinceLastVisit(memberId);
    const status = count === 0 ? 'Never visited' : 
                   count === 1 ? '⭐ First Timer' : 
                   count === 2 ? '🌟 Second Timer' : '✅ Regular Member';
    
    const lastAtt = attendance.slice(-5).reverse();
    
    let riskWarning = '';
    if (count > 0 && daysAbsent > 30) {
        riskWarning = `
            <div style="background:#FADBD8; padding:10px; border-radius:var(--radius-sm); margin:8px 0; text-align:center;">
                ⚠️ <strong>At Risk:</strong> Not attended in ${daysAbsent} days. 
                ${daysAbsent > 60 ? '🔴 Urgent follow-up needed!' : '🟡 Please reach out soon.'}
            </div>
        `;
    }
    
    body.innerHTML = `
        <div style="text-align:center; margin-bottom:12px;">
            <div style="font-size:40px;">👤</div>
            <h2 style="font-size:20px;">${member.name}</h2>
            <span class="badge ${count === 0 ? 'badge-danger' : count === 1 ? 'badge-warning' : count === 2 ? 'badge-info' : 'badge-success'}">${status}</span>
            ${member.worker === 'Yes' ? ' <span class="badge badge-primary">🔧 Worker</span>' : ''}
        </div>
        
        ${riskWarning}
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:12px 0;">
            <div style="background:#F8F9FC; padding:8px; border-radius:var(--radius-sm); text-align:center;">
                <div style="font-size:20px; font-weight:700;">${count}</div>
                <div style="font-size:10px; color:var(--gray);">Total Visits</div>
            </div>
            <div style="background:#F8F9FC; padding:8px; border-radius:var(--radius-sm); text-align:center;">
                <div style="font-size:20px; font-weight:700;">${count > 0 ? daysAbsent + ' days' : 'Never'}</div>
                <div style="font-size:10px; color:var(--gray);">Since Last Visit</div>
            </div>
        </div>
        
        <div style="margin:12px 0;">
            <h4 style="font-size:13px; margin-bottom:6px;">✏️ Edit Details</h4>
            <div class="form-row">
                <div class="form-group" style="margin-bottom:6px;">
                    <label>Phone</label>
                    <input type="tel" id="editPhone" value="${member.phone || ''}" placeholder="Phone">
                </div>
                <div class="form-group" style="margin-bottom:6px;">
                    <label>Address</label>
                    <input type="text" id="editAddress" value="${member.address || ''}" placeholder="Address">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group" style="margin-bottom:6px;">
                    <label>Gender</label>
                    <select id="editGender">
                        <option value="">Select</option>
                        <option value="Male" ${member.gender === 'Male' ? 'selected' : ''}>Male</option>
                        <option value="Female" ${member.gender === 'Female' ? 'selected' : ''}>Female</option>
                        <option value="Other" ${member.gender === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:6px;">
                    <label>DOB (MM/DD)</label>
                    <input type="text" id="editDOB" value="${member.dob || ''}" placeholder="e.g., 01/15" maxlength="5">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group" style="margin-bottom:6px;">
                    <label>Marital Status</label>
                    <select id="editMaritalStatus">
                        <option value="">Select</option>
                        <option value="Single" ${member.maritalStatus === 'Single' ? 'selected' : ''}>Single</option>
                        <option value="Married" ${member.maritalStatus === 'Married' ? 'selected' : ''}>Married</option>
                        <option value="Divorced" ${member.maritalStatus === 'Divorced' ? 'selected' : ''}>Divorced</option>
                        <option value="Widowed" ${member.maritalStatus === 'Widowed' ? 'selected' : ''}>Widowed</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom:6px;">
                    <label>Worker</label>
                    <div class="toggle-group">
                        <span style="font-size:12px; color:var(--gray);">No</span>
                        <div class="toggle ${member.worker === 'Yes' ? 'active' : ''}" id="editWorkerToggle" onclick="toggleEditWorker()">
                            <div class="toggle-slider"></div>
                        </div>
                        <span style="font-size:12px; color:var(--gray);">Yes</span>
                        <input type="hidden" id="editWorker" value="${member.worker || 'No'}">
                    </div>
                </div>
            </div>
            <button class="btn btn-success btn-block" onclick="saveMemberEdit('${member.id}')" style="margin-top:4px;">
                <i class="fas fa-save"></i> Save Changes
            </button>
            <div id="editResult" style="margin-top:6px;"></div>
        </div>
        
        <div style="margin-top:12px;">
            <h4 style="font-size:13px; margin-bottom:6px;">📋 Recent Attendance</h4>
            ${lastAtt.length === 0 ? '<p style="font-size:13px; color:var(--gray);">No attendance records</p>' :
                `<ul style="list-style:none; padding:0;">
                    ${lastAtt.map(a => `
                        <li style="padding:4px 0; border-bottom:1px solid #F0F2F5; font-size:13px; display:flex; justify-content:space-between;">
                            <span>${a.date}</span>
                            <span class="badge badge-info">${a.serviceType || 'Service'}</span>
                        </li>
                    `).join('')}
                </ul>`
            }
        </div>
        
        <button class="btn btn-primary btn-block" onclick="closeModal()" style="margin-top:12px;">
            Close
        </button>
    `;
}

function saveMemberEdit(memberId) {
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();
    const gender = document.getElementById('editGender').value;
    const dob = document.getElementById('editDOB').value.trim();
    const maritalStatus = document.getElementById('editMaritalStatus').value;
    const worker = document.getElementById('editWorker').value;
    
    const result = DB.updateMember(memberId, {
        phone, address, gender, dob, maritalStatus, worker
    });
    
    if (result) {
        document.getElementById('editResult').innerHTML = `
            <div style="background:#D5F5E3; padding:8px; border-radius:var(--radius-sm); color:#1A7A42; text-align:center;">
                ✅ Changes saved successfully!
            </div>
        `;
        showNotification('Member details updated!', 'success');
        updateStats();
        loadMembers();
        loadFirstTimers();
        loadSecondTimers();
        loadAbsentees();
        populateAddressFilters();
        
        setTimeout(() => {
            document.getElementById('editResult').innerHTML = '';
        }, 3000);
    }
}

function deleteMember(memberId) {
    if (!confirm('Delete this member and all attendance records?')) return;
    DB.deleteMember(memberId);
    showNotification('Member deleted', 'info');
    loadMembers();
    updateStats();
    loadTodayAttendance();
    loadFirstTimers();
    loadSecondTimers();
    loadAbsentees();
    populateAddressFilters();
}

function closeModal() {
    document.getElementById('memberModal').classList.remove('active');
}

document.getElementById('memberModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});