// ============================================
// ANALYSIS.JS - Pastor's Dashboard
// ============================================

// Valid service types
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
    
    // Default to last 3 months if no dates provided
    if (!startDate || !endDate) {
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        startDate = threeMonthsAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    }
    
    setTimeout(() => {
        try {
            _loadDashboardData(startDate, endDate);
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
// CUSTOM FILTER FUNCTIONS - For Pastor
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
    
    // Show/hide custom date range
    document.getElementById('customPeriod').addEventListener('change', function() {
        document.getElementById('customDateRange').style.display = this.value === 'custom' ? 'block' : 'none';
    });
    
    // Close on backdrop click
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
    
    // Load specific metric
    loadSingleMetric(metric, startDate, endDate, service);
}

function loadSingleMetric(metric, startDate, endDate, serviceFilter) {
    const container = document.getElementById('analyticsContent');
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading...</div>';
    
    setTimeout(() => {
        try {
            const allMembers = DB.getMembers();
            const allAttendance = DB.getAttendance();
            
            // Filter attendance by service type if specified
            let attendance = allAttendance.filter(a => a.date >= startDate && a.date <= endDate);
            
            if (serviceFilter !== 'all') {
                attendance = attendance.filter(a => a.serviceType === serviceFilter);
            }
            
            // Only Sunday and Wednesday
            attendance = attendance.filter(a => {
                const day = new Date(a.date).getDay();
                return day === 0 || day === 3;
            });
            
            let html = '';
            
            switch(metric) {
                case 'attendance':
                    html = renderAttendanceTrend(attendance, startDate, endDate, serviceFilter);
                    break;
                case 'newMembers':
                    html = renderNewMembersTrend(attendance, allMembers, startDate, endDate, serviceFilter);
                    break;
                case 'conversion':
                    html = renderConversionChart(attendance, allMembers, startDate, endDate);
                    break;
                case 'retention':
                    html = renderRetentionChart(attendance, allMembers);
                    break;
                case 'serviceDistribution':
                    html = renderServiceDistribution(attendance);
                    break;
                default:
                    html = '<p>Unknown metric</p>';
            }
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('❌ Error loading metric:', error);
            container.innerHTML = `
                <div style="background:#FADBD8; padding:20px; border-radius:10px; text-align:center; color:#922B21;">
                    <p>Error: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadAnalytics()" style="margin-top:10px;">Retry</button>
                </div>
            `;
        }
    }, 150);
}

// ============================================
// RENDER ATTENDANCE TREND - Line Chart
// ============================================

function renderAttendanceTrend(attendance, startDate, endDate, serviceFilter) {
    // Group by Sunday
    const sundayData = {};
    attendance.forEach(a => {
        const day = new Date(a.date).getDay();
        if (day === 0) {
            if (!sundayData[a.date]) sundayData[a.date] = 0;
            sundayData[a.date] += 1;
        }
    });
    
    const dates = Object.keys(sundayData).sort();
    const counts = dates.map(d => sundayData[d]);
    
    // Calculate trend
    const trend = calculateTrend(counts);
    const avg = counts.length > 0 ? Math.round(counts.reduce((a,b) => a+b, 0) / counts.length) : 0;
    const max = Math.max(...counts, 1);
    const min = Math.min(...counts, 0);
    
    const serviceLabel = serviceFilter !== 'all' ? serviceFilter : 'All Services';
    
    return `
        <div class="section" style="display:block;">
            <div class="section-header">
                <h2><i class="fas fa-chart-line" style="color:var(--primary);"></i> ${serviceLabel} Attendance Trend</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="showCustomAnalytics()">
                        <i class="fas fa-sliders-h"></i> Customize
                    </button>
                    <button class="btn btn-sm btn-success" onclick="exportAttendanceData('${startDate}','${endDate}')">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            
            <!-- Summary Stats -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px; margin-bottom:16px;">
                <div style="background:#EDE9FE; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:var(--primary);">${avg}</div>
                    <div style="font-size:10px; color:var(--gray);">📊 Average Attendance</div>
                </div>
                <div style="background:#D5F5E3; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:#1A7A42;">${max}</div>
                    <div style="font-size:10px; color:var(--gray);">⬆ Highest</div>
                </div>
                <div style="background:#FADBD8; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:#922B21;">${min}</div>
                    <div style="font-size:10px; color:var(--gray);">⬇ Lowest</div>
                </div>
                <div style="background:${trend > 0 ? '#D5F5E3' : '#FADBD8'}; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:${trend > 0 ? '#1A7A42' : '#922B21'};">${trend > 0 ? '+' : ''}${trend}%</div>
                    <div style="font-size:10px; color:var(--gray);">${trend > 0 ? '📈 Growing' : '📉 Declining'}</div>
                </div>
            </div>
            
            <!-- Main Chart -->
            <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
                ${renderLineChart(dates, counts, 'Sunday Attendance', '#6C3CE1')}
            </div>
            
            <div style="margin-top:12px; font-size:12px; color:var(--gray); text-align:center;">
                ${dates.length} Sundays analyzed | ${serviceLabel} | ${startDate} to ${endDate}
                ${trend > 5 ? '📈 <strong style="color:#1A7A42;">Church is growing!</strong>' : trend < -5 ? '📉 <strong style="color:#922B21;">Attendance declining - needs attention</strong>' : '📊 <strong>Stable attendance</strong>'}
            </div>
        </div>
    `;
}

// ============================================
// RENDER NEW MEMBERS TREND
// ============================================

function renderNewMembersTrend(attendance, members, startDate, endDate, serviceFilter) {
    // Find first visit for each member
    const firstVisits = {};
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length > 0) {
            const first = visits[0];
            const day = new Date(first.date).getDay();
            if (day === 0 || day === 3) {
                if (!firstVisits[first.date]) firstVisits[first.date] = [];
                firstVisits[first.date].push(m.id);
            }
        }
    });
    
    // Get all Sundays in range
    const dateRange = getDateRange(startDate, endDate);
    const sundays = dateRange.filter(d => new Date(d).getDay() === 0);
    
    const labels = sundays;
    const data = sundays.map(d => (firstVisits[d] || []).length);
    
    // Calculate trend
    const trend = calculateTrend(data);
    const totalNew = data.reduce((a,b) => a+b, 0);
    const avg = data.length > 0 ? Math.round(totalNew / data.length) : 0;
    
    const serviceLabel = serviceFilter !== 'all' ? serviceFilter : 'All Services';
    
    return `
        <div class="section" style="display:block;">
            <div class="section-header">
                <h2><i class="fas fa-user-plus" style="color:var(--success);"></i> New First Timers Trend</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="showCustomAnalytics()">
                        <i class="fas fa-sliders-h"></i> Customize
                    </button>
                    <button class="btn btn-sm btn-success" onclick="exportNewMembersData('${startDate}','${endDate}')">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
            
            <!-- Summary Stats -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px; margin-bottom:16px;">
                <div style="background:#EDE9FE; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:var(--primary);">${totalNew}</div>
                    <div style="font-size:10px; color:var(--gray);">🆕 Total New First Timers</div>
                </div>
                <div style="background:#D5F5E3; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:#1A7A42;">${avg}</div>
                    <div style="font-size:10px; color:var(--gray);">📊 Average per Sunday</div>
                </div>
                <div style="background:${trend > 0 ? '#D5F5E3' : '#FADBD8'}; padding:12px; border-radius:10px; text-align:center;">
                    <div style="font-size:22px; font-weight:700; color:${trend > 0 ? '#1A7A42' : '#922B21'};">${trend > 0 ? '+' : ''}${trend}%</div>
                    <div style="font-size:10px; color:var(--gray);">${trend > 0 ? '📈 More visitors' : '📉 Fewer visitors'}</div>
                </div>
            </div>
            
            <!-- Main Chart -->
            <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
                ${renderLineChart(labels, data, 'New First Timers', '#2ECC71')}
            </div>
            
            <div style="margin-top:12px; font-size:12px; color:var(--gray); text-align:center;">
                ${labels.length} Sundays analyzed | ${serviceLabel} | ${startDate} to ${endDate}
                ${trend > 10 ? '🆕 <strong style="color:#1A7A42;">Great! More new visitors coming!</strong>' : trend < -10 ? '⚠️ <strong style="color:#922B21;">Fewer new visitors - need outreach</strong>' : '📊 <strong>Steady visitor flow</strong>'}
            </div>
        </div>
    `;
}

// ============================================
// RENDER CONVERSION CHART
// ============================================

function renderConversionChart(attendance, members, startDate, endDate) {
    // Get first timers and second timers in the period
    const firstTimers = DB.getFirstTimers();
    const secondTimers = DB.getSecondTimers();
    
    // Filter to those who became first/second in this period
    const firstInPeriod = firstTimers.filter(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        return visits.length > 0 && visits[0].date >= startDate && visits[0].date <= endDate;
    });
    
    const secondInPeriod = secondTimers.filter(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        return visits.length >= 2 && visits[1].date >= startDate && visits[1].date <= endDate;
    });
    
    const totalFirst = firstInPeriod.length;
    const totalSecond = secondInPeriod.length;
    const conversionRate = totalFirst > 0 ? Math.round((totalSecond / totalFirst) * 100) : 0;
    
    // Monthly conversion breakdown
    const monthlyData = {};
    firstInPeriod.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length > 0) {
            const month = visits[0].date.substring(0, 7);
            if (!monthlyData[month]) monthlyData[month] = { first: 0, second: 0 };
            monthlyData[month].first += 1;
        }
    });
    
    secondInPeriod.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length >= 2) {
            const month = visits[1].date.substring(0, 7);
            if (monthlyData[month]) {
                monthlyData[month].second += 1;
            }
        }
    });
    
    const months = Object.keys(monthlyData).sort();
    const conversionData = months.map(m => {
        const d = monthlyData[m];
        return d.first > 0 ? Math.round((d.second / d.first) * 100) : 0;
    });
    
    return `
        <div class="section" style="display:block;">
            <div class="section-header">
                <h2><i class="fas fa-exchange-alt" style="color:var(--warning);"></i> First → Second Timer Conversion</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="showCustomAnalytics()">
                        <i class="fas fa-sliders-h"></i> Customize
                    </button>
                </div>
            </div>
            
            <!-- Big Number Display -->
            <div style="text-align:center; padding:20px; background:linear-gradient(135deg, #FDEBD0, #FEF3C7); border-radius:10px; margin-bottom:16px;">
                <div style="font-size:48px; font-weight:800; color:#92400E;">${conversionRate}%</div>
                <div style="font-size:14px; color:#92400E;">
                    ${totalFirst} first timers → ${totalSecond} second timers
                    <span style="display:block; font-size:12px; opacity:0.7;">
                        ${conversionRate > 30 ? '✅ Good conversion rate!' : conversionRate > 15 ? '📊 Average conversion' : '⚠️ Low conversion - follow up needed'}
                    </span>
                </div>
            </div>
            
            <!-- Monthly Trend -->
            <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
                <h4 style="font-size:13px; margin-bottom:8px;">Monthly Conversion Rate Trend</h4>
                ${renderLineChart(months, conversionData, 'Conversion %', '#F39C12')}
            </div>
            
            <div style="margin-top:12px; font-size:12px; color:var(--gray); text-align:center;">
                ${totalFirst} new visitors analyzed | ${startDate} to ${endDate}
                ${conversionRate > 30 ? '✅ <strong style="color:#1A7A42;">Good conversion! First timers are coming back.</strong>' : 
                  conversionRate > 15 ? '📊 <strong>Average conversion - focus on follow-up.</strong>' : 
                  '⚠️ <strong style="color:#922B21;">Low conversion - need better welcome/follow-up.</strong>'}
            </div>
        </div>
    `;
}

// ============================================
// RENDER RETENTION CHART
// ============================================

function renderRetentionChart(attendance, members) {
    let weeklyCount = 0;
    let monthlyCount = 0;
    
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id)
            .filter(a => {
                const day = new Date(a.date).getDay();
                return day === 0 || day === 3;
            })
            .sort((a,b) => a.date.localeCompare(b.date));
        
        if (visits.length < 2) return;
        
        let hasWeekly = false;
        let hasMonthly = false;
        
        for (let i = 0; i < visits.length - 1; i++) {
            const current = new Date(visits[i].date);
            const next = new Date(visits[i+1].date);
            const daysDiff = Math.floor((next - current) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 7) hasWeekly = true;
            if (daysDiff <= 30) hasMonthly = true;
        }
        
        if (hasWeekly) weeklyCount++;
        if (hasMonthly) monthlyCount++;
    });
    
    const totalActive = members.filter(m => DB.getDaysSinceLastVisit(m.id) <= 30).length;
    const weeklyPct = totalActive > 0 ? Math.round((weeklyCount / totalActive) * 100) : 0;
    const monthlyPct = totalActive > 0 ? Math.round((monthlyCount / totalActive) * 100) : 0;
    const atRisk = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).length;
    const atRiskPct = members.length > 0 ? Math.round((atRisk / members.length) * 100) : 0;
    
    return `
        <div class="section" style="display:block;">
            <div class="section-header">
                <h2><i class="fas fa-users" style="color:var(--info);"></i> Member Retention</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="showCustomAnalytics()">
                        <i class="fas fa-sliders-h"></i> Customize
                    </button>
                </div>
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:12px; margin-bottom:16px;">
                <div style="background:#D5F5E3; padding:16px; border-radius:10px; text-align:center;">
                    <div style="font-size:28px; font-weight:700; color:#1A7A42;">${weeklyPct}%</div>
                    <div style="font-size:12px; color:#1A7A42;">✅ Weekly Attendees</div>
                    <div style="font-size:10px; color:var(--gray);">${weeklyCount} members</div>
                </div>
                <div style="background:#D6EAF8; padding:16px; border-radius:10px; text-align:center;">
                    <div style="font-size:28px; font-weight:700; color:#1A5276;">${monthlyPct}%</div>
                    <div style="font-size:12px; color:#1A5276;">📅 Monthly Attendees</div>
                    <div style="font-size:10px; color:var(--gray);">${monthlyCount} members</div>
                </div>
                <div style="background:#FADBD8; padding:16px; border-radius:10px; text-align:center;">
                    <div style="font-size:28px; font-weight:700; color:#922B21;">${atRiskPct}%</div>
                    <div style="font-size:12px; color:#922B21;">⚠️ At Risk</div>
                    <div style="font-size:10px; color:var(--gray);">${atRisk} members</div>
                </div>
            </div>
            
            <!-- Doughnut Chart -->
            <div style="background:#F8F9FC; padding:20px; border-radius:10px; display:flex; justify-content:center;">
                ${renderDoughnutChart(weeklyPct, monthlyPct, atRiskPct)}
            </div>
            
            <div style="margin-top:12px; font-size:12px; color:var(--gray); text-align:center;">
                ${weeklyPct > 60 ? '✅ <strong style="color:#1A7A42;">Strong weekly attendance!</strong>' : 
                  weeklyPct > 40 ? '📊 <strong>Decent weekly attendance</strong>' : 
                  '⚠️ <strong style="color:#922B21;">Low weekly attendance - investigate</strong>'}
            </div>
        </div>
    `;
}

// ============================================
// RENDER SERVICE DISTRIBUTION
// ============================================

function renderServiceDistribution(attendance) {
    const serviceMap = {};
    attendance.forEach(a => {
        const key = a.serviceType || 'Sunday AM';
        serviceMap[key] = (serviceMap[key] || 0) + 1;
    });
    
    const labels = Object.keys(serviceMap);
    const data = Object.values(serviceMap);
    const total = data.reduce((a,b) => a+b, 0);
    
    return `
        <div class="section" style="display:block;">
            <div class="section-header">
                <h2><i class="fas fa-chart-pie" style="color:var(--warning);"></i> Service Distribution</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-sm btn-primary" onclick="showCustomAnalytics()">
                        <i class="fas fa-sliders-h"></i> Customize
                    </button>
                </div>
            </div>
            
            <div style="background:#F8F9FC; padding:20px; border-radius:10px;">
                ${renderPieChart(labels, data)}
            </div>
            
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px; margin-top:12px;">
                ${labels.map((label, i) => {
                    const pct = total > 0 ? Math.round((data[i] / total) * 100) : 0;
                    const colors = ['#6C3CE1', '#2ECC71', '#F39C12', '#3498DB', '#E74C3C'];
                    return `
                        <div style="background:${colors[i % colors.length]}; padding:12px; border-radius:10px; text-align:center; color:white;">
                            <div style="font-size:20px; font-weight:700;">${pct}%</div>
                            <div style="font-size:11px; opacity:0.9;">${label}</div>
                            <div style="font-size:10px; opacity:0.7;">${data[i]} people</div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div style="margin-top:12px; font-size:12px; color:var(--gray); text-align:center;">
                Total: ${total} attendance records
            </div>
        </div>
    `;
}

// ============================================
// CHART RENDERERS
// ============================================

function renderLineChart(labels, data, label, color) {
    if (!labels || labels.length === 0 || !data || data.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:30px;">No data available</div>';
    }
    
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;
    const chartHeight = 180;
    const chartWidth = Math.max(200, labels.length * 40);
    const padding = { top: 20, bottom: 30, left: 30, right: 20 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    
    // Calculate points
    const points = data.map((val, i) => {
        const x = padding.left + (i / (labels.length - 1 || 1)) * innerWidth;
        const y = padding.top + innerHeight - ((val - minVal) / range) * innerHeight;
        return { x, y };
    });
    
    // Build SVG path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
    }
    
    // Area fill path
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    let areaPath = path + ` L ${lastPoint.x} ${padding.top + innerHeight} L ${firstPoint.x} ${padding.top + innerHeight} Z`;
    
    // Create grid lines
    let gridLines = '';
    for (let i = 0; i <= 5; i++) {
        const yPos = padding.top + (i / 5) * innerHeight;
        const val = Math.round(maxVal - (i / 5) * range);
        gridLines += `
            <line x1="${padding.left}" y1="${yPos}" x2="${padding.left + innerWidth}" y2="${yPos}" stroke="#E8ECF0" stroke-width="0.5"/>
            <text x="${padding.left - 4}" y="${yPos + 3}" font-size="8" fill="#95A5A6" text-anchor="end">${val}</text>
        `;
    }
    
    // Create x-axis labels (sample if too many)
    let xLabels = '';
    const step = Math.max(1, Math.floor(labels.length / 10));
    for (let i = 0; i < labels.length; i += step) {
        const xPos = padding.left + (i / (labels.length - 1 || 1)) * innerWidth;
        const labelText = labels[i].split('-').slice(1).join('/');
        xLabels += `
            <text x="${xPos}" y="${padding.top + innerHeight + 16}" font-size="8" fill="#95A5A6" text-anchor="middle">${labelText}</text>
        `;
    }
    
    return `
        <div style="width:100%; overflow-x:auto;">
            <svg viewBox="0 0 ${chartWidth} ${chartHeight + 10}" style="width:100%; height:auto; min-height:220px;">
                <!-- Grid lines -->
                ${gridLines}
                
                <!-- Area fill -->
                <path d="${areaPath}" fill="${color}15" opacity="0.4"/>
                
                <!-- Line -->
                <polyline points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                
                <!-- Points -->
                ${points.map((p, i) => `
                    <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" stroke="white" stroke-width="1.5">
                        <title>${labels[i]}: ${data[i]}</title>
                    </circle>
                `).join('')}
                
                <!-- X-axis labels -->
                ${xLabels}
            </svg>
        </div>
        <div style="text-align:center; font-size:10px; color:var(--gray); margin-top:4px;">${label}</div>
    `;
}

function renderDoughnutChart(weekly, monthly, atRisk) {
    const total = weekly + monthly + atRisk || 1;
    const weeklyPct = (weekly / total) * 100;
    const monthlyPct = (monthly / total) * 100;
    const atRiskPct = (atRisk / total) * 100;
    
    return `
        <div style="display:flex; flex-direction:column; align-items:center; gap:12px;">
            <div style="position:relative; width:140px; height:140px;">
                <svg viewBox="0 0 120 120" style="transform:rotate(-90deg); width:140px; height:140px;">
                    <!-- Background -->
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E8ECF0" stroke-width="20"/>
                    <!-- Weekly -->
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#2ECC71" stroke-width="20"
                        stroke-dasharray="${weeklyPct * 3.14} ${(100 - weeklyPct) * 3.14}"
                        stroke-dashoffset="0" stroke-linecap="round"/>
                    <!-- Monthly -->
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#3498DB" stroke-width="20"
                        stroke-dasharray="${monthlyPct * 3.14} ${(100 - monthlyPct) * 3.14}"
                        stroke-dashoffset="${-weeklyPct * 3.14}" stroke-linecap="round"/>
                    <!-- At Risk -->
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E74C3C" stroke-width="20"
                        stroke-dasharray="${atRiskPct * 3.14} ${(100 - atRiskPct) * 3.14}"
                        stroke-dashoffset="${-(weeklyPct + monthlyPct) * 3.14}" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                    <div style="font-size:14px; font-weight:700;">${Math.round(weeklyPct)}%</div>
                    <div style="font-size:8px; color:var(--gray);">Weekly</div>
                </div>
            </div>
            <div style="display:flex; gap:16px; font-size:11px; flex-wrap:wrap; justify-content:center;">
                <span><span style="display:inline-block; width:12px; height:12px; background:#2ECC71; border-radius:3px;"></span> Weekly: ${Math.round(weeklyPct)}%</span>
                <span><span style="display:inline-block; width:12px; height:12px; background:#3498DB; border-radius:3px;"></span> Monthly: ${Math.round(monthlyPct)}%</span>
                <span><span style="display:inline-block; width:12px; height:12px; background:#E74C3C; border-radius:3px;"></span> At Risk: ${Math.round(atRiskPct)}%</span>
            </div>
        </div>
    `;
}

function renderPieChart(labels, data) {
    if (!labels || labels.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:20px;">No service data</div>';
    }
    
    const colors = ['#6C3CE1', '#2ECC71', '#F39C12', '#3498DB', '#E74C3C', '#1ABC9C'];
    const total = data.reduce((a,b) => a + b, 0);
    
    let legendItems = '';
    let startAngle = 0;
    let slices = '';
    const size = 140;
    const center = size / 2;
    const radius = 55;
    
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
        legendItems += `<div style="display:flex; align-items:center; gap:6px; font-size:11px;"><span style="display:inline-block; width:12px; height:12px; background:${colors[i % colors.length]}; border-radius:3px;"></span> ${label}: ${data[i]} (${pct.toFixed(1)}%)</div>`;
        
        startAngle = endAngle;
    });
    
    return `
        <div style="display:flex; align-items:center; gap:20px; justify-content:center; flex-wrap:wrap;">
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                ${slices}
                <circle cx="${center}" cy="${center}" r="${radius * 0.45}" fill="white"/>
            </svg>
            <div style="font-size:11px; max-height:150px; overflow-y:auto;">
                ${legendItems}
            </div>
        </div>
    `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateTrend(data) {
    if (data.length < 2) return 0;
    const midPoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midPoint);
    const secondHalf = data.slice(midPoint);
    const firstAvg = firstHalf.reduce((a,b) => a+b, 0) / firstHalf.length || 1;
    const secondAvg = secondHalf.reduce((a,b) => a+b, 0) / secondHalf.length || 1;
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
// EXPORT FUNCTIONS
// ============================================

function exportAttendanceData(startDate, endDate) {
    const allAttendance = DB.getAttendance();
    const attendance = allAttendance.filter(a => {
        const day = new Date(a.date).getDay();
        return (day === 0 || day === 3) && a.date >= startDate && a.date <= endDate;
    });
    
    const data = attendance.map(a => {
        const m = DB.getMemberById(a.memberId);
        return {
            Date: a.date,
            Service: a.serviceType || 'Sunday AM',
            Member: m ? m.name : 'Unknown',
            Phone: m ? m.phone || '' : ''
        };
    });
    
    if (data.length === 0) {
        showNotification('No data to export', 'warning');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, `Attendance_${startDate}_to_${endDate}.xlsx`);
    showNotification('Attendance data exported!', 'success');
}

function exportNewMembersData(startDate, endDate) {
    const members = DB.getMembers();
    const newMembers = members.filter(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        return visits.length > 0 && visits[0].date >= startDate && visits[0].date <= endDate;
    });
    
    const data = newMembers.map(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        return {
            Name: m.name,
            Phone: m.phone || '',
            Address: m.address || '',
            FirstVisit: visits.length > 0 ? visits[0].date : 'N/A',
            TotalVisits: visits.length,
            Status: visits.length === 1 ? 'First Timer' : visits.length === 2 ? 'Second Timer' : 'Regular'
        };
    });
    
    if (data.length === 0) {
        showNotification('No new members in this period', 'warning');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'New Members');
    XLSX.writeFile(wb, `NewMembers_${startDate}_to_${endDate}.xlsx`);
    showNotification('New members data exported!', 'success');
}

// ============================================
// LOAD DASHBOARD DATA
// ============================================

function _loadDashboardData(startDate, endDate) {
    console.log('📊 Loading dashboard data...');
    const container = document.getElementById('analyticsContent');
    
    try {
        const allMembers = DB.getMembers();
        const allAttendance = DB.getAttendance();
        
        // Filter to Sunday and Wednesday only
        const attendance = allAttendance.filter(a => {
            const day = new Date(a.date).getDay();
            return (day === 0 || day === 3) && a.date >= startDate && a.date <= endDate;
        });
        
        if (allMembers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:40px;">
                    <span class="empty-icon">📊</span>
                    <h3>No Data Available</h3>
                    <p>Add members and record attendance to see analytics here.</p>
                    <button class="btn btn-primary" onclick="showTab('mark')" style="margin-top:10px;">
                        <i class="fas fa-user-plus"></i> Add Members
                    </button>
                </div>
            `;
            return;
        }
        
        if (attendance.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:40px;">
                    <span class="empty-icon">📊</span>
                    <h3>No Attendance in This Period</h3>
                    <p>No Sunday or Wednesday attendance records found.</p>
                    <div style="margin-top:10px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="setAnalyticsPeriod('week')">Last Week</button>
                        <button class="btn btn-primary" onclick="setAnalyticsPeriod('month')">Last Month</button>
                        <button class="btn btn-primary" onclick="setAnalyticsPeriod('quarter')">Last Quarter</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // ========== DASHBOARD HEADER ==========
        const totalMembers = allMembers.length;
        const activeMembers = allMembers.filter(m => DB.getDaysSinceLastVisit(m.id) <= 30).length;
        const firstTimers = DB.getFirstTimers().length;
        const secondTimers = DB.getSecondTimers().length;
        const atRiskCount = allMembers.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).length;
        
        // Sunday attendance trend
        const sundayData = {};
        attendance.forEach(a => {
            if (new Date(a.date).getDay() === 0) {
                if (!sundayData[a.date]) sundayData[a.date] = 0;
                sundayData[a.date] += 1;
            }
        });
        const sundayDates = Object.keys(sundayData).sort();
        const sundayCounts = sundayDates.map(d => sundayData[d]);
        const attendanceTrend = calculateTrend(sundayCounts);
        
        // New members trend
        const firstVisitMap = {};
        allMembers.forEach(m => {
            const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
            if (visits.length > 0) {
                const first = visits[0];
                const day = new Date(first.date).getDay();
                if (day === 0 || day === 3) {
                    if (!firstVisitMap[first.date]) firstVisitMap[first.date] = [];
                    firstVisitMap[first.date].push(m.id);
                }
            }
        });
        const newMemberDates = Object.keys(firstVisitMap).filter(d => d >= startDate && d <= endDate).sort();
        const newMemberCounts = newMemberDates.map(d => firstVisitMap[d].length);
        const newMemberTrend = calculateTrend(newMemberCounts);
        
        // Conversion rate
        const firstInPeriod = DB.getFirstTimers().filter(m => {
            const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
            return visits.length > 0 && visits[0].date >= startDate && visits[0].date <= endDate;
        });
        const secondInPeriod = DB.getSecondTimers().filter(m => {
            const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
            return visits.length >= 2 && visits[1].date >= startDate && visits[1].date <= endDate;
        });
        const conversionRate = firstInPeriod.length > 0 ? Math.round((secondInPeriod.length / firstInPeriod.length) * 100) : 0;
        
        // Service distribution
        const serviceMap = {};
        attendance.forEach(a => {
            const key = a.serviceType || 'Sunday AM';
            serviceMap[key] = (serviceMap[key] || 0) + 1;
        });
        const serviceLabels = Object.keys(serviceMap);
        const serviceData = Object.values(serviceMap);
        
        // ========== RENDER DASHBOARD ==========
        container.innerHTML = `
            <!-- Dashboard Header -->
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
                        <i class="fas fa-file-excel"></i> Export Report
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
                    <div style="font-size:11px; color:${newMemberTrend > 0 ? '#1A7A42' : '#922B21'};">${newMemberTrend > 0 ? '🆕 More visitors' : '📉 Fewer visitors'}</div>
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
            
            <!-- Main Charts -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px;">
                <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                    <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Sunday Attendance Trend</h4>
                    ${sundayCounts.length > 0 ? renderLineChart(sundayDates, sundayCounts, 'Attendance', '#6C3CE1') : '<div style="text-align:center; padding:20px; color:var(--gray);">No Sunday data</div>'}
                </div>
                <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                    <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-user-plus" style="color:var(--success);"></i> New First Timers</h4>
                    ${newMemberDates.length > 0 ? renderLineChart(newMemberDates, newMemberCounts, 'New Members', '#2ECC71') : '<div style="text-align:center; padding:20px; color:var(--gray);">No new members</div>'}
                </div>
            </div>
            
            <!-- Bottom Row -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
                <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                    <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-exchange-alt" style="color:var(--warning);"></i> Conversion Rate</h4>
                    <div style="text-align:center; padding:20px;">
                        <div style="font-size:48px; font-weight:800; color:#92400E;">${conversionRate}%</div>
                        <div style="font-size:13px; color:var(--gray);">
                            ${firstInPeriod.length} first timers → ${secondInPeriod.length} second timers
                        </div>
                        <div style="font-size:12px; margin-top:4px; color:${conversionRate > 30 ? '#1A7A42' : '#922B21'};">
                            ${conversionRate > 30 ? '✅ Good conversion rate' : conversionRate > 15 ? '📊 Average' : '⚠️ Low conversion - follow up needed'}
                        </div>
                    </div>
                </div>
                <div style="background:#F8F9FC; padding:16px; border-radius:10px;">
                    <h4 style="font-size:14px; margin-bottom:8px;"><i class="fas fa-chart-pie" style="color:var(--info);"></i> Service Distribution</h4>
                    ${serviceLabels.length > 0 ? renderPieChart(serviceLabels, serviceData) : '<div style="text-align:center; padding:20px; color:var(--gray);">No service data</div>'}
                </div>
            </div>
            
            <!-- At Risk List -->
            ${atRiskCount > 0 ? `
                <div style="background:#FADBD8; padding:12px; border-radius:10px; margin-top:14px;">
                    <h4 style="font-size:13px; margin-bottom:8px; color:#922B21;">⚠️ ${atRiskCount} Members At Risk (Not attended in 30+ days)</h4>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:4px; font-size:12px; max-height:120px; overflow-y:auto;">
                        ${allMembers.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).slice(0, 20).map(m => {
                            const days = DB.getDaysSinceLastVisit(m.id);
                            const color = days > 90 ? '#C0392B' : days > 60 ? '#E67E22' : '#F39C12';
                            return `<div style="background:white; padding:4px 10px; border-radius:4px; display:flex; justify-content:space-between; border-left:3px solid ${color};">
                                <span>${m.name}</span>
                                <span style="font-weight:600; color:${color};">${days}d</span>
                            </div>`;
                        }).join('')}
                        ${atRiskCount > 20 ? `<div style="color:var(--gray); font-size:11px; padding:4px;">... and ${atRiskCount - 20} more</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Footer -->
            <div style="margin-top:12px; font-size:11px; color:var(--gray); text-align:center; border-top:1px solid #E8ECF0; padding-top:12px;">
                ⛪ Based on Sunday and Wednesday services | ${startDate} to ${endDate}
                | ${attendance.length} attendance records analyzed
            </div>
        `;
        
        console.log('✅ Dashboard loaded successfully!');
        
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        container.innerHTML = `
            <div style="background:#FADBD8; padding:20px; border-radius:10px; text-align:center; color:#922B21;">
                <p>Error loading dashboard: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadAnalytics()" style="margin-top:10px;">Retry</button>
            </div>
        `;
    }
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
    
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];
    loadAnalytics(startStr, endStr);
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
    
    const report = [
        ['PASTOR\'S DASHBOARD REPORT'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['=== OVERVIEW ==='],
        ['Metric', 'Value'],
        ['Total Members', members.length],
        ['Active Members (30 days)', active.length],
        ['At Risk Members', atRisk.length],
        ['First Timers', firstTimers.length],
        ['Second Timers', secondTimers.length],
        ['Total Service Attendance', serviceAttendance.length],
        [''],
        ['=== CONVERSION ==='],
        ['First to Second Rate', firstTimers.length > 0 ? Math.round((secondTimers.length/firstTimers.length)*100) + '%' : 'N/A'],
        [''],
        ['=== AT RISK MEMBERS ==='],
        ['Name', 'Phone', 'Days Since Last Visit', 'Risk Level']
    ];
    
    atRisk.sort((a,b) => DB.getDaysSinceLastVisit(b.id) - DB.getDaysSinceLastVisit(a.id));
    atRisk.forEach(m => {
        const days = DB.getDaysSinceLastVisit(m.id);
        const level = days > 90 ? 'Critical' : days > 60 ? 'High' : 'Medium';
        report.push([m.name, m.phone || '-', days + ' days', level]);
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(report);
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
    XLSX.writeFile(wb, `Church_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Dashboard report exported!', 'success');
}

// ============================================
// INIT
// ============================================

// Add "Customize" button to analytics section
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCustomButton);
} else {
    addCustomButton();
}

function addCustomButton() {
    const analyticsSection = document.getElementById('section-analytics');
    if (analyticsSection) {
        const header = analyticsSection.querySelector('.section-header');
        if (header) {
            // Remove existing buttons to avoid duplicates
            const existing = header.querySelectorAll('.btn-sm');
            existing.forEach(btn => {
                if (btn.textContent.includes('Export Report') || btn.textContent.includes('Customize')) {
                    btn.remove();
                }
            });
            
            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn btn-success btn-sm';
            exportBtn.innerHTML = '<i class="fas fa-file-excel"></i> Export Report';
            exportBtn.onclick = exportAnalyticsReport;
            header.appendChild(exportBtn);
        }
    }
}

console.log('✅ Pastor\'s Dashboard loaded (Sunday & Wednesday only)');