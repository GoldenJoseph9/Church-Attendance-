// ============================================
// ANALYSIS.JS - Pastor's Dashboard
// ============================================

const VALID_SERVICES = ['Sunday AM', 'Sunday PM', 'Sunday 1st', 'Sunday 2nd', 'Wednesday'];

// ============================================
// MAIN ANALYTICS FUNCTION
// ============================================

function loadAnalytics(startDate, endDate) {
    console.log('📊 Loading Pastor Dashboard...');
    const container = document.getElementById('analyticsContent');
    
    if (!container) {
        console.error('❌ analyticsContent element not found!');
        return;
    }
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading dashboard...</div>';
    
    // Default to last 3 months
    if (!startDate || !endDate) {
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    }
    
    setTimeout(() => {
        try {
            _renderDashboard(startDate, endDate);
        } catch (error) {
            console.error('❌ Dashboard error:', error);
            container.innerHTML = `
                <div style="background:#FADBD8; padding:20px; border-radius:10px; text-align:center; color:#922B21;">
                    <div style="font-size:30px;">⚠️</div>
                    <p>Error loading dashboard: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadAnalytics()" style="margin-top:10px;">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    }, 150);
}

// ============================================
// RENDER DASHBOARD
// ============================================

function _renderDashboard(startDate, endDate) {
    const container = document.getElementById('analyticsContent');
    const members = DB.getMembers();
    const allAttendance = DB.getAttendance();
    
    // Filter to Sunday and Wednesday only
    const attendance = allAttendance.filter(a => {
        const day = new Date(a.date).getDay();
        return (day === 0 || day === 3) && a.date >= startDate && a.date <= endDate;
    });
    
    if (members.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:40px;">
                <span class="empty-icon">📊</span>
                <h3>No Data Available</h3>
                <p>Add members and record attendance to see analytics.</p>
                <button class="btn btn-primary" onclick="showTab('mark')" style="margin-top:10px;">
                    <i class="fas fa-user-plus"></i> Add Members
                </button>
            </div>
        `;
        return;
    }
    
    // Calculate metrics
    const totalMembers = members.length;
    const activeMembers = members.filter(m => DB.getDaysSinceLastVisit(m.id) <= 30).length;
    const firstTimers = DB.getFirstTimers().length;
    const secondTimers = DB.getSecondTimers().length;
    const atRiskCount = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).length;
    const conversionRate = firstTimers > 0 ? Math.round((secondTimers / firstTimers) * 100) : 0;
    
    // Sunday attendance trend
    const sundayData = {};
    attendance.forEach(a => {
        if (new Date(a.date).getDay() === 0) {
            sundayData[a.date] = (sundayData[a.date] || 0) + 1;
        }
    });
    const sundayDates = Object.keys(sundayData).sort();
    const sundayCounts = sundayDates.map(d => sundayData[d]);
    const attendanceTrend = _calculateTrend(sundayCounts);
    
    // New members trend
    const newMembers = {};
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length > 0) {
            const first = visits[0];
            const day = new Date(first.date).getDay();
            if (day === 0 || day === 3) {
                newMembers[first.date] = (newMembers[first.date] || 0) + 1;
            }
        }
    });
    const newMemberDates = Object.keys(newMembers).filter(d => d >= startDate && d <= endDate).sort();
    const newMemberCounts = newMemberDates.map(d => newMembers[d]);
    const newMemberTrend = _calculateTrend(newMemberCounts);
    
    // Service distribution
    const serviceMap = {};
    attendance.forEach(a => {
        const key = a.serviceType || 'Sunday AM';
        serviceMap[key] = (serviceMap[key] || 0) + 1;
    });
    
    // At risk members list
    const atRiskMembers = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30)
        .sort((a,b) => DB.getDaysSinceLastVisit(b.id) - DB.getDaysSinceLastVisit(a.id));
    
    // ============================================================
    // BUILD HTML
    // ============================================================
    
    container.innerHTML = `
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
            <div>
                <h2 style="font-size:20px; font-weight:800; display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-chart-line" style="color:var(--primary);"></i> Pastor's Dashboard
                </h2>
                <span style="font-size:12px; color:var(--gray);">${startDate} to ${endDate}</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-sm btn-primary" onclick="showCustomAnalytics()">
                    <i class="fas fa-sliders-h"></i> Customize
                </button>
                <button class="btn btn-sm btn-success" onclick="exportAnalyticsReport()">
                    <i class="fas fa-file-excel"></i> Export
                </button>
            </div>
        </div>
        
        <!-- 4 Key Metrics -->
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:16px;">
            <div style="background:${attendanceTrend > 0 ? '#D5F5E3' : '#FADBD8'}; padding:14px; border-radius:10px; text-align:center;">
                <div style="font-size:22px; font-weight:700; color:${attendanceTrend > 0 ? '#1A7A42' : '#922B21'};">${attendanceTrend > 0 ? '+' : ''}${attendanceTrend}%</div>
                <div style="font-size:11px; color:${attendanceTrend > 0 ? '#1A7A42' : '#922B21'};">${attendanceTrend > 0 ? '📈 Growing' : '📉 Declining'}</div>
                <div style="font-size:9px; color:var(--gray);">Attendance Trend</div>
            </div>
            <div style="background:${newMemberTrend > 0 ? '#D5F5E3' : '#FADBD8'}; padding:14px; border-radius:10px; text-align:center;">
                <div style="font-size:22px; font-weight:700; color:${newMemberTrend > 0 ? '#1A7A42' : '#922B21'};">${newMemberTrend > 0 ? '+' : ''}${newMemberTrend}%</div>
                <div style="font-size:11px; color:${newMemberTrend > 0 ? '#1A7A42' : '#922B21'};">${newMemberTrend > 0 ? '🆕 More' : '📉 Fewer'}</div>
                <div style="font-size:9px; color:var(--gray);">New Visitors Trend</div>
            </div>
            <div style="background:${conversionRate > 30 ? '#D5F5E3' : '#FADBD8'}; padding:14px; border-radius:10px; text-align:center;">
                <div style="font-size:22px; font-weight:700; color:${conversionRate > 30 ? '#1A7A42' : '#922B21'};">${conversionRate}%</div>
                <div style="font-size:11px; color:${conversionRate > 30 ? '#1A7A42' : '#922B21'};">${conversionRate > 30 ? '✅ Good' : '⚠️ Low'}</div>
                <div style="font-size:9px; color:var(--gray);">Conversion Rate</div>
            </div>
            <div style="background:${atRiskCount < 20 ? '#D5F5E3' : '#FADBD8'}; padding:14px; border-radius:10px; text-align:center;">
                <div style="font-size:22px; font-weight:700; color:${atRiskCount < 20 ? '#1A7A42' : '#922B21'};">${atRiskCount}</div>
                <div style="font-size:11px; color:${atRiskCount < 20 ? '#1A7A42' : '#922B21'};">${atRiskCount < 20 ? '✅ Healthy' : '⚠️ At Risk'}</div>
                <div style="font-size:9px; color:var(--gray);">Members At Risk</div>
            </div>
        </div>
        
        <!-- Main Charts Row -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
            <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Sunday Attendance Trend</h4>
                ${sundayCounts.length > 0 ? _renderLineChart(sundayDates, sundayCounts, 'Attendance', '#6C3CE1') : '<div style="text-align:center; padding:20px; color:var(--gray);">No Sunday data</div>'}
            </div>
            <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-user-plus" style="color:var(--success);"></i> New First Timers</h4>
                ${newMemberDates.length > 0 ? _renderLineChart(newMemberDates, newMemberCounts, 'New Members', '#2ECC71') : '<div style="text-align:center; padding:20px; color:var(--gray);">No new members</div>'}
            </div>
        </div>
        
        <!-- Bottom Row -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-exchange-alt" style="color:var(--warning);"></i> Conversion Rate</h4>
                <div style="text-align:center; padding:20px;">
                    <div style="font-size:48px; font-weight:800; color:#92400E;">${conversionRate}%</div>
                    <div style="font-size:13px; color:var(--gray);">
                        ${firstTimers} first timers → ${secondTimers} second timers
                    </div>
                    <div style="font-size:12px; margin-top:4px; color:${conversionRate > 30 ? '#1A7A42' : '#922B21'};">
                        ${conversionRate > 30 ? '✅ Good conversion rate' : conversionRate > 15 ? '📊 Average conversion' : '⚠️ Low conversion - follow up needed'}
                    </div>
                </div>
            </div>
            <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-chart-pie" style="color:var(--info);"></i> Service Distribution</h4>
                ${Object.keys(serviceMap).length > 0 ? _renderPieChart(Object.keys(serviceMap), Object.values(serviceMap)) : '<div style="text-align:center; padding:20px; color:var(--gray);">No service data</div>'}
            </div>
        </div>
        
        <!-- At Risk List -->
        ${atRiskMembers.length > 0 ? `
            <div style="background:#FADBD8; padding:12px; border-radius:10px; margin-top:14px;">
                <h4 style="font-size:13px; margin-bottom:8px; color:#922B21;">⚠️ ${atRiskMembers.length} Members At Risk (30+ days absent)</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:4px; font-size:12px; max-height:120px; overflow-y:auto;">
                    ${atRiskMembers.slice(0, 20).map(m => {
                        const days = DB.getDaysSinceLastVisit(m.id);
                        const color = days > 90 ? '#C0392B' : days > 60 ? '#E67E22' : '#F39C12';
                        return `<div style="background:white; padding:4px 10px; border-radius:4px; display:flex; justify-content:space-between; border-left:3px solid ${color};">
                            <span>${m.name}</span>
                            <span style="font-weight:600; color:${color};">${days}d</span>
                        </div>`;
                    }).join('')}
                    ${atRiskMembers.length > 20 ? `<div style="color:var(--gray); font-size:11px; padding:4px;">... and ${atRiskMembers.length - 20} more</div>` : ''}
                </div>
            </div>
        ` : ''}
        
        <!-- Footer -->
        <div style="margin-top:12px; font-size:11px; color:var(--gray); text-align:center; border-top:1px solid #E8ECF0; padding-top:12px;">
            ⛪ Based on Sunday & Wednesday services | ${attendance.length} records analyzed
        </div>
    `;
}

// ============================================
// CUSTOM ANALYTICS MODAL
// ============================================

function showCustomAnalytics() {
    const modal = document.createElement('div');
    modal.id = 'customAnalyticsModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <div class="modal-header">
                <h3><i class="fas fa-sliders-h" style="color:var(--primary);"></i> Custom Analytics</h3>
                <button class="modal-close" onclick="closeCustomAnalytics()">×</button>
            </div>
            <p style="font-size:13px; color:var(--gray); margin-bottom:12px;">
                Select what you want to see and the time period.
            </p>
            
            <div class="form-group">
                <label>📊 What to show</label>
                <select id="customMetric" style="width:100%; padding:10px; border:2px solid #E8ECF0; border-radius:8px;">
                    <option value="attendance">Sunday Attendance Trend</option>
                    <option value="newMembers">New First Timers Trend</option>
                    <option value="conversion">First → Second Timer Conversion</option>
                    <option value="retention">Member Retention</option>
                    <option value="serviceDistribution">Service Distribution</option>
                    <option value="all">All Dashboard</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>📅 Time Period</label>
                <select id="customPeriod" style="width:100%; padding:10px; border:2px solid #E8ECF0; border-radius:8px;">
                    <option value="4">Last 4 Weeks</option>
                    <option value="8">Last 8 Weeks</option>
                    <option value="12" selected>Last 3 Months</option>
                    <option value="26">Last 6 Months</option>
                    <option value="52">Last 12 Months</option>
                    <option value="custom">Custom Date Range</option>
                </select>
            </div>
            
            <div id="customDateRange" style="display:none; margin-top:10px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="date" id="customStartDate" style="width:100%; padding:10px; border:2px solid #E8ECF0; border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>End Date</label>
                        <input type="date" id="customEndDate" style="width:100%; padding:10px; border:2px solid #E8ECF0; border-radius:8px;">
                    </div>
                </div>
            </div>
            
            <div class="form-group">
                <label>⛪ Service Type</label>
                <select id="customService" style="width:100%; padding:10px; border:2px solid #E8ECF0; border-radius:8px;">
                    <option value="all">All Services</option>
                    <option value="Sunday 1st">Sunday 1st Only</option>
                    <option value="Sunday 2nd">Sunday 2nd Only</option>
                    <option value="Wednesday">Wednesday Only</option>
                </select>
            </div>
            
            <button class="btn btn-primary btn-block" onclick="applyCustomAnalytics()" style="margin-top:8px;">
                <i class="fas fa-chart-line"></i> Generate Report
            </button>
            <div id="customAnalyticsResult" style="margin-top:12px;"></div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('active');
    
    document.getElementById('customPeriod').addEventListener('change', function() {
        document.getElementById('customDateRange').style.display = this.value === 'custom' ? 'block' : 'none';
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeCustomAnalytics();
    });
}

function closeCustomAnalytics() {
    const modal = document.getElementById('customAnalyticsModal');
    if (modal) modal.remove();
}

function applyCustomAnalytics() {
    const metric = document.getElementById('customMetric').value;
    const period = document.getElementById('customPeriod').value;
    const service = document.getElementById('customService').value;
    
    let startDate, endDate;
    const today = new Date();
    endDate = today.toISOString().split('T')[0];
    
    if (period === 'custom') {
        startDate = document.getElementById('customStartDate').value;
        endDate = document.getElementById('customEndDate').value;
        if (!startDate || !endDate) {
            showNotification('Please select both start and end dates', 'error');
            return;
        }
    } else {
        const weeks = parseInt(period);
        const start = new Date(today);
        start.setDate(start.getDate() - (weeks * 7));
        startDate = start.toISOString().split('T')[0];
    }
    
    closeCustomAnalytics();
    
    if (metric === 'all') {
        loadAnalytics(startDate, endDate);
        showNotification('📊 Loading full dashboard...', 'info');
        return;
    }
    
    _loadSingleMetric(metric, startDate, endDate, service);
}

// ============================================
// LOAD SINGLE METRIC
// ============================================

function _loadSingleMetric(metric, startDate, endDate, serviceFilter) {
    const container = document.getElementById('analyticsContent');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
    
    setTimeout(() => {
        try {
            const members = DB.getMembers();
            let attendance = DB.getAttendance().filter(a => a.date >= startDate && a.date <= endDate);
            
            if (serviceFilter !== 'all') {
                attendance = attendance.filter(a => a.serviceType === serviceFilter);
            }
            
            // Sunday and Wednesday only
            attendance = attendance.filter(a => {
                const day = new Date(a.date).getDay();
                return day === 0 || day === 3;
            });
            
            let html = '';
            
            switch(metric) {
                case 'attendance':
                    html = _renderAttendanceMetric(attendance, startDate, endDate);
                    break;
                case 'newMembers':
                    html = _renderNewMembersMetric(attendance, members, startDate, endDate);
                    break;
                case 'conversion':
                    html = _renderConversionMetric(attendance, members);
                    break;
                case 'retention':
                    html = _renderRetentionMetric(attendance, members);
                    break;
                case 'serviceDistribution':
                    html = _renderServiceDistributionMetric(attendance);
                    break;
                default:
                    html = '<p style="padding:20px; text-align:center; color:var(--gray);">Unknown metric</p>';
            }
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Metric error:', error);
            container.innerHTML = `
                <div style="background:#FADBD8; padding:20px; border-radius:10px; text-align:center; color:#922B21;">
                    <p>Error: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadAnalytics()" style="margin-top:10px;">Back</button>
                </div>
            `;
        }
    }, 150);
}

// ============================================
// METRIC RENDERERS
// ============================================

function _renderAttendanceMetric(attendance, startDate, endDate) {
    const sundayData = {};
    attendance.forEach(a => {
        if (new Date(a.date).getDay() === 0) {
            sundayData[a.date] = (sundayData[a.date] || 0) + 1;
        }
    });
    const dates = Object.keys(sundayData).sort();
    const counts = dates.map(d => sundayData[d]);
    
    return `
        <div style="background:#EDE9FE; padding:12px 16px; border-radius:10px; margin-bottom:16px;">
            <strong>📈 Sunday Attendance Trend</strong>
            <span style="font-size:12px; color:var(--gray); display:block;">${startDate} to ${endDate}</span>
        </div>
        <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
            ${dates.length > 0 ? _renderLineChart(dates, counts, 'Attendance', '#6C3CE1') : '<div style="text-align:center; padding:20px; color:var(--gray);">No data</div>'}
        </div>
        <div style="margin-top:12px; text-align:center; font-size:13px; color:var(--gray);">
            Total: ${attendance.length} attendance records
        </div>
    `;
}

function _renderNewMembersMetric(attendance, members, startDate, endDate) {
    const firstVisits = {};
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length > 0) {
            const first = visits[0];
            const day = new Date(first.date).getDay();
            if (day === 0 || day === 3) {
                firstVisits[first.date] = (firstVisits[first.date] || 0) + 1;
            }
        }
    });
    const dates = Object.keys(firstVisits).filter(d => d >= startDate && d <= endDate).sort();
    const counts = dates.map(d => firstVisits[d]);
    const total = counts.reduce((a,b) => a+b, 0);
    
    return `
        <div style="background:#FDEBD0; padding:12px 16px; border-radius:10px; margin-bottom:16px;">
            <strong>⭐ New First Timers Trend</strong>
            <span style="font-size:12px; color:var(--gray); display:block;">${startDate} to ${endDate}</span>
        </div>
        <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
            ${dates.length > 0 ? _renderLineChart(dates, counts, 'New Members', '#F39C12') : '<div style="text-align:center; padding:20px; color:var(--gray);">No new members</div>'}
        </div>
        <div style="margin-top:12px; text-align:center; font-size:13px; color:var(--gray);">
            Total: ${total} new first timers
        </div>
    `;
}

function _renderConversionMetric(attendance, members) {
    const firstTimers = DB.getFirstTimers();
    const secondTimers = DB.getSecondTimers();
    const rate = firstTimers.length > 0 ? Math.round((secondTimers.length / firstTimers.length) * 100) : 0;
    
    return `
        <div style="background:#D6EAF8; padding:12px 16px; border-radius:10px; margin-bottom:16px;">
            <strong>🔄 First to Second Timer Conversion</strong>
            <span style="font-size:12px; color:var(--gray); display:block;">All time</span>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
            <div style="background:#FDEBD0; padding:20px; border-radius:10px; text-align:center;">
                <div style="font-size:32px; font-weight:700; color:#935E38;">${firstTimers.length}</div>
                <div style="font-size:11px; color:var(--gray);">⭐ First Timers</div>
            </div>
            <div style="background:#D6EAF8; padding:20px; border-radius:10px; text-align:center;">
                <div style="font-size:32px; font-weight:700; color:#1A5276;">${secondTimers.length}</div>
                <div style="font-size:11px; color:var(--gray);">🌟 Second Timers</div>
            </div>
            <div style="background:#EDE9FE; padding:20px; border-radius:10px; text-align:center;">
                <div style="font-size:32px; font-weight:700; color:var(--primary);">${rate}%</div>
                <div style="font-size:11px; color:var(--gray);">📈 Conversion Rate</div>
            </div>
        </div>
        <div style="background:#F8F9FC; padding:12px; border-radius:10px; text-align:center; font-size:13px; color:var(--gray);">
            ${rate > 30 ? '✅ Great conversion rate! Keep up the good work!' : rate > 15 ? '📈 Focus on converting first timers to second timers.' : '⚠️ Low conversion rate - follow up with first timers!'}
        </div>
    `;
}

function _renderRetentionMetric(attendance, members) {
    let weeklyCount = 0;
    let monthlyCount = 0;
    
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length < 2) return;
        
        for (let i = 0; i < visits.length - 1; i++) {
            const daysDiff = Math.floor((new Date(visits[i+1].date) - new Date(visits[i].date)) / (1000 * 60 * 60 * 24));
            if (daysDiff <= 7) { weeklyCount++; break; }
            if (daysDiff <= 30) { monthlyCount++; break; }
        }
    });
    
    const total = members.length || 1;
    const weeklyPct = Math.round((weeklyCount / total) * 100);
    const monthlyPct = Math.round((monthlyCount / total) * 100);
    const atRisk = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).length;
    const atRiskPct = Math.round((atRisk / total) * 100);
    
    return `
        <div style="background:#D5F5E3; padding:12px 16px; border-radius:10px; margin-bottom:16px;">
            <strong>📊 Member Retention</strong>
            <span style="font-size:12px; color:var(--gray); display:block;">All time</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:12px; margin-bottom:16px;">
            <div style="background:#D5F5E3; padding:16px; border-radius:10px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#1A7A42;">${weeklyPct}%</div>
                <div style="font-size:11px; color:var(--gray);">✅ Weekly</div>
            </div>
            <div style="background:#D6EAF8; padding:16px; border-radius:10px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#1A5276;">${monthlyPct}%</div>
                <div style="font-size:11px; color:var(--gray);">📅 Monthly</div>
            </div>
            <div style="background:#FADBD8; padding:16px; border-radius:10px; text-align:center;">
                <div style="font-size:24px; font-weight:700; color:#922B21;">${atRiskPct}%</div>
                <div style="font-size:11px; color:var(--gray);">⚠️ At Risk</div>
            </div>
        </div>
        <div style="background:#F8F9FC; padding:12px; border-radius:10px; text-align:center; font-size:13px; color:var(--gray);">
            ${weeklyPct > 60 ? '✅ Strong weekly attendance!' : weeklyPct > 40 ? '📊 Decent weekly attendance' : '⚠️ Low weekly attendance - investigate'}
        </div>
    `;
}

function _renderServiceDistributionMetric(attendance) {
    const serviceMap = {};
    attendance.forEach(a => {
        const key = a.serviceType || 'Sunday AM';
        serviceMap[key] = (serviceMap[key] || 0) + 1;
    });
    const labels = Object.keys(serviceMap);
    const data = Object.values(serviceMap);
    const total = data.reduce((a,b) => a+b, 0);
    
    return `
        <div style="background:#D6EAF8; padding:12px 16px; border-radius:10px; margin-bottom:16px;">
            <strong>⛪ Service Distribution</strong>
            <span style="font-size:12px; color:var(--gray); display:block;">All time</span>
        </div>
        <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
            ${labels.length > 0 ? _renderPieChart(labels, data) : '<div style="text-align:center; padding:20px; color:var(--gray);">No service data</div>'}
        </div>
        <div style="margin-top:12px; display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px;">
            ${labels.map((label, i) => {
                const pct = total > 0 ? Math.round((data[i] / total) * 100) : 0;
                const colors = ['#6C3CE1', '#2ECC71', '#F39C12', '#3498DB'];
                return `
                    <div style="background:${colors[i % colors.length]}; padding:10px; border-radius:8px; text-align:center; color:white;">
                        <div style="font-size:18px; font-weight:700;">${pct}%</div>
                        <div style="font-size:10px; opacity:0.9;">${label}</div>
                        <div style="font-size:9px; opacity:0.7;">${data[i]}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// ============================================
// CHART RENDERERS
// ============================================

function _renderLineChart(labels, data, label, color) {
    if (!labels || labels.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:30px;">No data</div>';
    }
    
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    const chartWidth = Math.max(300, labels.length * 35);
    const chartHeight = 160;
    const pad = { top: 10, bottom: 25, left: 25, right: 10 };
    const innerW = chartWidth - pad.left - pad.right;
    const innerH = chartHeight - pad.top - pad.bottom;
    
    // Generate points
    const points = data.map((val, i) => ({
        x: pad.left + (i / (labels.length - 1 || 1)) * innerW,
        y: pad.top + innerH - ((val - minVal) / range) * innerH
    }));
    
    // Build path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Area fill
    const areaPath = path + ` L ${points[points.length-1].x} ${pad.top + innerH} L ${points[0].x} ${pad.top + innerH} Z`;
    
    // Grid lines
    let gridLines = '';
    for (let i = 0; i <= 4; i++) {
        const yPos = pad.top + (i / 4) * innerH;
        const val = Math.round(maxVal - (i / 4) * range);
        gridLines += `
            <line x1="${pad.left}" y1="${yPos}" x2="${pad.left + innerW}" y2="${yPos}" stroke="#E8ECF0" stroke-width="0.5"/>
            <text x="${pad.left - 4}" y="${yPos + 3}" font-size="8" fill="#95A5A6" text-anchor="end">${val}</text>
        `;
    }
    
    // X labels
    let xLabels = '';
    const step = Math.max(1, Math.floor(labels.length / 8));
    for (let i = 0; i < labels.length; i += step) {
        const xPos = pad.left + (i / (labels.length - 1 || 1)) * innerW;
        const labelText = labels[i].split('-').slice(1).join('/');
        xLabels += `<text x="${xPos}" y="${pad.top + innerH + 14}" font-size="7" fill="#95A5A6" text-anchor="middle">${labelText}</text>`;
    }
    
    // Build SVG
    return `
        <div style="width:100%; overflow-x:auto;">
            <svg viewBox="0 0 ${chartWidth} ${chartHeight + 5}" style="width:100%; height:auto; min-height:180px;">
                ${gridLines}
                <path d="${areaPath}" fill="${color}15" opacity="0.4"/>
                <polyline points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" stroke="white" stroke-width="1.5"/>`).join('')}
                ${xLabels}
            </svg>
        </div>
    `;
}

function _renderPieChart(labels, data) {
    if (!labels || labels.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:20px;">No data</div>';
    }
    
    const colors = ['#6C3CE1', '#2ECC71', '#F39C12', '#3498DB', '#E74C3C', '#1ABC9C'];
    const total = data.reduce((a,b) => a+b, 0);
    const size = 140;
    const center = size / 2;
    const radius = 55;
    
    let slices = '';
    let legend = '';
    let startAngle = 0;
    
    labels.forEach((label, i) => {
        const pct = (data[i] / total) * 100;
        const angle = (data[i] / total) * 360;
        const endAngle = startAngle + angle;
        const radStart = (startAngle - 90) * Math.PI / 180;
        const radEnd = (endAngle - 90) * Math.PI / 180;
        const x1 = center + radius * Math.cos(radStart);
        const y1 = center + radius * Math.sin(radStart);
        const x2 = center + radius * Math.cos(radEnd);
        const y2 = center + radius * Math.sin(radEnd);
        const largeArc = angle > 180 ? 1 : 0;
        
        slices += `<path d="M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z" fill="${colors[i % colors.length]}"/>`;
        legend += `<div style="display:flex; align-items:center; gap:6px; font-size:11px;"><span style="display:inline-block; width:12px; height:12px; background:${colors[i % colors.length]}; border-radius:3px;"></span> ${label}: ${data[i]} (${pct.toFixed(1)}%)</div>`;
        
        startAngle = endAngle;
    });
    
    return `
        <div style="display:flex; align-items:center; gap:20px; justify-content:center; flex-wrap:wrap;">
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                ${slices}
                <circle cx="${center}" cy="${center}" r="${radius * 0.45}" fill="white"/>
            </svg>
            <div style="font-size:11px; max-height:150px; overflow-y:auto;">${legend}</div>
        </div>
    `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function _calculateTrend(data) {
    if (data.length < 2) return 0;
    const mid = Math.floor(data.length / 2);
    const firstAvg = data.slice(0, mid).reduce((a,b) => a+b, 0) / mid || 1;
    const secondAvg = data.slice(mid).reduce((a,b) => a+b, 0) / (data.length - mid) || 1;
    return Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
}

function getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

// ============================================
// PERIOD SHORTCUTS
// ============================================

function setAnalyticsPeriod(period) {
    const today = new Date();
    const start = new Date(today);
    if (period === 'week') start.setDate(start.getDate() - 7);
    else if (period === 'month') start.setMonth(start.getMonth() - 1);
    else if (period === 'quarter') start.setMonth(start.getMonth() - 3);
    else if (period === 'year') start.setFullYear(start.getFullYear() - 1);
    
    loadAnalytics(start.toISOString().split('T')[0], today.toISOString().split('T')[0]);
}

// ============================================
// EXPORT ANALYTICS REPORT
// ============================================

function exportAnalyticsReport() {
    const members = DB.getMembers();
    const allAttendance = DB.getAttendance();
    const serviceAttendance = allAttendance.filter(a => {
        const day = new Date(a.date).getDay();
        return day === 0 || day === 3;
    });
    
    const firstTimers = DB.getFirstTimers();
    const secondTimers = DB.getSecondTimers();
    const atRisk = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30);
    const active = members.filter(m => DB.getDaysSinceLastVisit(m.id) <= 30);
    const conversionRate = firstTimers.length > 0 ? Math.round((secondTimers.length / firstTimers.length) * 100) : 0;
    
    const rows = [
        ['CHURCH DASHBOARD REPORT'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['=== SUMMARY ==='],
        ['Metric', 'Value'],
        ['Total Members', members.length],
        ['Active Members (30 days)', active.length],
        ['At Risk Members', atRisk.length],
        ['First Timers', firstTimers.length],
        ['Second Timers', secondTimers.length],
        ['Total Service Attendance', serviceAttendance.length],
        ['First to Second Rate', conversionRate + '%'],
        [''],
        ['=== AT RISK MEMBERS ==='],
        ['Name', 'Phone', 'Days Since Last Visit']
    ];
    
    atRisk.sort((a,b) => DB.getDaysSinceLastVisit(b.id) - DB.getDaysSinceLastVisit(a.id));
    atRisk.forEach(m => {
        rows.push([m.name, m.phone || '-', DB.getDaysSinceLastVisit(m.id) + ' days']);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
    XLSX.writeFile(wb, `Church_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Report exported!', 'success');
}

console.log('✅ Pastor\'s Dashboard loaded');