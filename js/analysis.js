// ============================================
// ANALYSIS.JS - Advanced Church Analytics
// (No external chart libraries needed)
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

function loadAnalytics(startDate, endDate) {
    console.log('📊 loadAnalytics called');
    const container = document.getElementById('analyticsContent');
    
    if (!container) {
        console.error('❌ analyticsContent element not found!');
        return;
    }
    
    // Show loading state
    container.innerHTML = '<div class="loading"><div class="spinner"></div>Loading analytics...</div>';
    
    // If no dates provided, default to last 30 days
    if (!startDate || !endDate) {
        const today = new Date();
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
    }
    
    // Use setTimeout to let the DOM update before processing
    setTimeout(() => {
        try {
            _loadAnalyticsData(startDate, endDate);
        } catch (error) {
            console.error('❌ Analytics error:', error);
            container.innerHTML = `
                <div style="background:#FADBD8; padding:20px; border-radius:var(--radius-sm); text-align:center; color:#922B21;">
                    <div style="font-size:30px;">⚠️</div>
                    <p>Error loading analytics: ${error.message}</p>
                    <button class="btn btn-primary" onclick="loadAnalytics()" style="margin-top:10px;">
                        <i class="fas fa-sync"></i> Retry
                    </button>
                </div>
            `;
        }
    }, 150);
}

function _loadAnalyticsData(startDate, endDate) {
    console.log('📊 Processing analytics data...');
    const container = document.getElementById('analyticsContent');
    
    if (!container) {
        console.error('❌ Container not found');
        return;
    }
    
    try {
        // Get data
        const allMembers = DB.getMembers();
        console.log('📊 Members:', allMembers.length);
        
        const allAttendance = DB.getAttendance();
        console.log('📊 Attendance records:', allAttendance.length);
        
        const attendance = allAttendance.filter(a => a.date >= startDate && a.date <= endDate);
        console.log('📊 Filtered attendance:', attendance.length);
        
        // If no members, show empty state
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
        
        // If no attendance in period, show message
        if (attendance.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:40px;">
                    <span class="empty-icon">📊</span>
                    <h3>No Attendance in This Period</h3>
                    <p>There are no attendance records for the selected period.</p>
                    <div style="margin-top:10px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="setAnalyticsPeriod('week')">Last Week</button>
                        <button class="btn btn-primary" onclick="setAnalyticsPeriod('month')">Last Month</button>
                        <button class="btn btn-primary" onclick="setAnalyticsPeriod('quarter')">Last Quarter</button>
                    </div>
                </div>
            `;
            return;
        }
        
        // ========== BASIC STATS ==========
        const totalMembers = allMembers.length;
        const activeMembers = allMembers.filter(m => DB.getDaysSinceLastVisit(m.id) <= 30).length;
        const inactiveMembers = totalMembers - activeMembers;
        const totalVisits = attendance.length;
        const uniqueVisitors = new Set(attendance.map(a => a.memberId)).size;
        
        // ========== FIRST TIMER ANALYSIS ==========
        const firstTimers = DB.getFirstTimers();
        const firstTimerCount = firstTimers.length;
        const newFirstTimers = firstTimers.filter(m => {
            const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
            return visits.length > 0 && visits[0].date >= startDate && visits[0].date <= endDate;
        });
        const newFirstTimerCount = newFirstTimers.length;
        
        // ========== SECOND TIMER ANALYSIS ==========
        const secondTimers = DB.getSecondTimers();
        const secondTimerCount = secondTimers.length;
        const newSecondTimers = secondTimers.filter(m => {
            const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
            return visits.length === 2 && visits[1].date >= startDate && visits[1].date <= endDate;
        });
        const newSecondTimerCount = newSecondTimers.length;
        
        // ========== CONVERSION RATE ==========
        const conversionRate = firstTimerCount > 0 ? Math.round((secondTimerCount / firstTimerCount) * 100) : 0;
        const firstToSecond = newFirstTimerCount > 0 ? Math.round((newSecondTimerCount / newFirstTimerCount) * 100) : 0;
        
        // ========== RETENTION ANALYSIS ==========
        const retentionData = calculateRetention(allAttendance, allMembers);
        const weeklyRetention = retentionData.weekly || 0;
        const monthlyRetention = retentionData.monthly || 0;
        
        // ========== GROWTH TREND ==========
        const growthData = calculateGrowthTrend(attendance, allMembers, startDate, endDate);
        
        // ========== SERVICE DISTRIBUTION ==========
        const serviceMap = {};
        attendance.forEach(a => {
            serviceMap[a.serviceType] = (serviceMap[a.serviceType] || 0) + 1;
        });
        const serviceNames = Object.keys(serviceMap);
        const serviceCounts = Object.values(serviceMap);
        
        // ========== TOP MEMBERS ==========
        const memberMap = {};
        attendance.forEach(a => {
            memberMap[a.memberId] = (memberMap[a.memberId] || 0) + 1;
        });
        const top = Object.entries(memberMap).sort((a,b) => b[1] - a[1]).slice(0, 10);
        const topNames = top.map(([id]) => {
            const m = DB.getMemberById(id);
            return m ? m.name : 'Unknown';
        });
        const topCounts = top.map(([,c]) => c);
        const maxCount = Math.max(...topCounts, 1);
        
        // ========== AT RISK MEMBERS ==========
        const atRiskMembers = allMembers.filter(m => DB.getDaysSinceLastVisit(m.id) > 30);
        const atRiskCount = atRiskMembers.length;
        const criticalRisk = allMembers.filter(m => DB.getDaysSinceLastVisit(m.id) > 90).length;
        
        // ========== RENDER UI ==========
        console.log('📊 Rendering analytics UI...');
        container.innerHTML = `
            <!-- Top Stats Row -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px,1fr)); gap:8px; margin-bottom:16px;">
                <div style="background:#EDE9FE; padding:12px; border-radius:var(--radius-sm); text-align:center; border:2px solid var(--primary);">
                    <div style="font-size:24px; font-weight:700; color:var(--primary);">${totalMembers}</div>
                    <div style="font-size:10px; color:var(--gray);">👥 Total Members</div>
                </div>
                <div style="background:#D5F5E3; padding:12px; border-radius:var(--radius-sm); text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#1A7A42;">${activeMembers}</div>
                    <div style="font-size:10px; color:var(--gray);">✅ Active (30 days)</div>
                </div>
                <div style="background:#FADBD8; padding:12px; border-radius:var(--radius-sm); text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#922B21;">${inactiveMembers}</div>
                    <div style="font-size:10px; color:var(--gray);">❌ Inactive</div>
                </div>
                <div style="background:#FDEBD0; padding:12px; border-radius:var(--radius-sm); text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#935E38;">${firstTimerCount}</div>
                    <div style="font-size:10px; color:var(--gray);">⭐ First Timers</div>
                </div>
                <div style="background:#D6EAF8; padding:12px; border-radius:var(--radius-sm); text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#1A5276;">${secondTimerCount}</div>
                    <div style="font-size:10px; color:var(--gray);">🌟 Second Timers</div>
                </div>
                <div style="background:#FADBD8; padding:12px; border-radius:var(--radius-sm); text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#922B21;">${atRiskCount}</div>
                    <div style="font-size:10px; color:var(--gray);">⚠️ At Risk</div>
                </div>
                <div style="background:#FEF3C7; padding:12px; border-radius:var(--radius-sm); text-align:center;">
                    <div style="font-size:24px; font-weight:700; color:#92400E;">${criticalRisk}</div>
                    <div style="font-size:10px; color:var(--gray);">🔴 Critical</div>
                </div>
            </div>
            
            <!-- Growth & Conversion Cards -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px,1fr)); gap:10px; margin-bottom:16px;">
                <div style="background:linear-gradient(135deg, #6C3CE1, #8B6BF0); padding:16px; border-radius:var(--radius-sm); color:white; text-align:center;">
                    <div style="font-size:28px; font-weight:700;">${newFirstTimerCount}</div>
                    <div style="font-size:12px; opacity:0.9;">🆕 New First Timers</div>
                </div>
                <div style="background:linear-gradient(135deg, #2ECC71, #27AE60); padding:16px; border-radius:var(--radius-sm); color:white; text-align:center;">
                    <div style="font-size:28px; font-weight:700;">${newSecondTimerCount}</div>
                    <div style="font-size:12px; opacity:0.9;">🔄 New Second Timers</div>
                </div>
                <div style="background:linear-gradient(135deg, #F39C12, #E67E22); padding:16px; border-radius:var(--radius-sm); color:white; text-align:center;">
                    <div style="font-size:28px; font-weight:700;">${conversionRate}%</div>
                    <div style="font-size:12px; opacity:0.9;">📈 First → Second</div>
                </div>
                <div style="background:linear-gradient(135deg, #3498DB, #2E86C1); padding:16px; border-radius:var(--radius-sm); color:white; text-align:center;">
                    <div style="font-size:28px; font-weight:700;">${firstToSecond}%</div>
                    <div style="font-size:12px; opacity:0.9;">📊 Recent Conversion</div>
                </div>
            </div>
            
            <!-- Charts Row - Using Pure HTML/CSS -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px,1fr)); gap:12px; margin-bottom:12px;">
                <div style="background:#F8F9FC; padding:14px; border-radius:var(--radius-sm);">
                    <h4 style="font-size:13px; margin-bottom:8px;"><i class="fas fa-chart-line" style="color:var(--primary);"></i> Growth Trend</h4>
                    <div style="width:100%; height:200px; overflow-y:auto;">
                        ${renderSimpleBarChart(growthData.dates, growthData.visits, 'Visits', '#6C3CE1')}
                    </div>
                </div>
                <div style="background:#F8F9FC; padding:14px; border-radius:var(--radius-sm);">
                    <h4 style="font-size:13px; margin-bottom:8px;"><i class="fas fa-users" style="color:var(--success);"></i> Retention</h4>
                    <div style="width:100%; height:200px; display:flex; align-items:center; justify-content:center; gap:40px;">
                        ${renderDoughnutChart(weeklyRetention, monthlyRetention)}
                    </div>
                </div>
            </div>
            
            <!-- Third Row -->
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(340px,1fr)); gap:12px; margin-bottom:12px;">
                <div style="background:#F8F9FC; padding:14px; border-radius:var(--radius-sm);">
                    <h4 style="font-size:13px; margin-bottom:8px;"><i class="fas fa-chart-pie" style="color:var(--warning);"></i> Services</h4>
                    <div style="width:100%; height:200px; overflow-y:auto;">
                        ${renderPieChart(serviceNames, serviceCounts)}
                    </div>
                </div>
                <div style="background:#F8F9FC; padding:14px; border-radius:var(--radius-sm);">
                    <h4 style="font-size:13px; margin-bottom:8px;"><i class="fas fa-trophy" style="color:var(--success);"></i> Top 10 Members</h4>
                    <div style="width:100%; height:200px; overflow-y:auto;">
                        ${renderHorizontalBarChart(topNames, topCounts, maxCount)}
                    </div>
                </div>
            </div>
            
            <!-- At Risk List -->
            ${atRiskMembers.length > 0 ? `
                <div style="background:#FADBD8; padding:12px; border-radius:var(--radius-sm); margin-top:12px;">
                    <h4 style="font-size:13px; margin-bottom:8px; color:#922B21;">⚠️ At Risk Members (${atRiskMembers.length})</h4>
                    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(180px,1fr)); gap:6px; font-size:12px;">
                        ${atRiskMembers.slice(0, 20).map(m => {
                            const days = DB.getDaysSinceLastVisit(m.id);
                            const riskColor = days > 90 ? '#C0392B' : days > 60 ? '#E67E22' : '#F39C12';
                            return `<div style="background:white; padding:6px 10px; border-radius:6px; display:flex; justify-content:space-between; border-left:3px solid ${riskColor};">
                                <span>${m.name}</span>
                                <span style="font-weight:600; color:${riskColor};">${days}d</span>
                            </div>`;
                        }).join('')}
                        ${atRiskMembers.length > 20 ? `<div style="color:var(--gray); font-size:11px; padding:6px;">... and ${atRiskMembers.length - 20} more</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Church Health Summary -->
            <div style="background:#F8F9FC; padding:14px; border-radius:var(--radius-sm); margin-top:12px; border:2px solid #E8ECF0;">
                <h4 style="font-size:14px; margin-bottom:8px;">🏥 Church Health Summary</h4>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:8px; font-size:12px;">
                    <div>✅ Active Rate: <strong>${totalMembers > 0 ? Math.round((activeMembers/totalMembers)*100) : 0}%</strong></div>
                    <div>⭐ First Timer Rate: <strong>${totalMembers > 0 ? Math.round((firstTimerCount/totalMembers)*100) : 0}%</strong></div>
                    <div>🔄 Conversion Rate: <strong>${conversionRate}%</strong></div>
                    <div>⚠️ At Risk Rate: <strong>${totalMembers > 0 ? Math.round((atRiskCount/totalMembers)*100) : 0}%</strong></div>
                    <div>📊 Avg Visits/Member: <strong>${totalMembers > 0 ? (totalVisits/totalMembers).toFixed(1) : 0}</strong></div>
                    <div>📈 Growth: <strong>${growthData.growthRate > 0 ? '+' : ''}${growthData.growthRate || 0}%</strong></div>
                </div>
            </div>
        `;
        
        console.log('✅ Analytics loaded successfully!');
        
    } catch (error) {
        console.error('❌ Fatal error in _loadAnalyticsData:', error);
        container.innerHTML = `
            <div style="background:#FADBD8; padding:20px; border-radius:var(--radius-sm); text-align:center; color:#922B21;">
                <div style="font-size:30px;">⚠️</div>
                <p>Error: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadAnalytics()" style="margin-top:10px;">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================
// SIMPLE CHART RENDERERS (HTML/CSS only)
// ============================================

function renderSimpleBarChart(labels, data, label, color) {
    if (!labels || labels.length === 0 || !data || data.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:20px;">No data available</div>';
    }
    
    // Sample data if too many points
    if (labels.length > 30) {
        const step = Math.floor(labels.length / 30);
        const newLabels = [];
        const newData = [];
        for (let i = 0; i < labels.length; i += step) {
            newLabels.push(labels[i]);
            newData.push(data[i]);
        }
        labels = newLabels;
        data = newData;
    }
    
    const maxVal = Math.max(...data, 1);
    const barHeight = 120;
    const barWidth = Math.max(20, Math.min(40, 400 / labels.length));
    
    let bars = '';
    labels.forEach((label, i) => {
        const height = (data[i] / maxVal) * barHeight;
        bars += `
            <div style="display:flex; flex-direction:column; align-items:center; flex:1; min-width:${barWidth}px;">
                <div style="width:${barWidth * 0.6}px; height:${Math.max(height, 4)}px; background:${color}; border-radius:4px 4px 0 0; transition:height 0.3s;"></div>
                <div style="font-size:8px; color:var(--gray); margin-top:4px; text-align:center; max-width:${barWidth}px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${label}</div>
            </div>
        `;
    });
    
    return `
        <div style="display:flex; align-items:flex-end; justify-content:space-around; height:160px; padding:0 4px; gap:2px;">
            ${bars}
        </div>
        <div style="text-align:center; font-size:10px; color:var(--gray); margin-top:4px;">${label} (Max: ${maxVal})</div>
    `;
}

function renderDoughnutChart(weekly, monthly) {
    const total = weekly + monthly || 1;
    const weeklyPct = (weekly / total) * 100;
    const monthlyPct = (monthly / total) * 100;
    
    return `
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
            <div style="position:relative; width:120px; height:120px;">
                <svg viewBox="0 0 120 120" style="transform:rotate(-90deg); width:120px; height:120px;">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#E8ECF0" stroke-width="20"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#6C3CE1" stroke-width="20"
                        stroke-dasharray="${weeklyPct * 3.14} ${(100 - weeklyPct) * 3.14}"
                        stroke-dashoffset="0" stroke-linecap="round"/>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#2ECC71" stroke-width="20"
                        stroke-dasharray="${monthlyPct * 3.14} ${(100 - monthlyPct) * 3.14}"
                        stroke-dashoffset="${-weeklyPct * 3.14}" stroke-linecap="round"/>
                </svg>
                <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
                    <div style="font-size:16px; font-weight:700;">${weekly + monthly}</div>
                    <div style="font-size:8px; color:var(--gray);">Total</div>
                </div>
            </div>
            <div style="display:flex; gap:12px; font-size:11px;">
                <span><span style="display:inline-block; width:10px; height:10px; background:#6C3CE1; border-radius:2px;"></span> Weekly: ${weekly}</span>
                <span><span style="display:inline-block; width:10px; height:10px; background:#2ECC71; border-radius:2px;"></span> Monthly: ${monthly}</span>
            </div>
        </div>
    `;
}

function renderPieChart(labels, data) {
    if (!labels || labels.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:20px;">No service data</div>';
    }
    
    const colors = ['#6C3CE1', '#2ECC71', '#F39C12', '#3498DB', '#E74C3C', '#1ABC9C', '#9B59B6', '#E67E22', '#2C3E50', '#95A5A6'];
    const total = data.reduce((a,b) => a + b, 0);
    
    let legendItems = '';
    let startAngle = 0;
    let slices = '';
    const size = 120;
    const center = size / 2;
    const radius = 50;
    
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
        legendItems += `<div style="display:flex; align-items:center; gap:4px; font-size:10px;"><span style="display:inline-block; width:10px; height:10px; background:${colors[i % colors.length]}; border-radius:2px;"></span> ${label}: ${data[i]} (${pct.toFixed(1)}%)</div>`;
        
        startAngle = endAngle;
    });
    
    return `
        <div style="display:flex; align-items:center; gap:16px; justify-content:center;">
            <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
                ${slices}
                <circle cx="${center}" cy="${center}" r="${radius * 0.5}" fill="white"/>
            </svg>
            <div style="font-size:10px; max-height:150px; overflow-y:auto;">
                ${legendItems}
            </div>
        </div>
    `;
}

function renderHorizontalBarChart(labels, data, maxVal) {
    if (!labels || labels.length === 0) {
        return '<div style="text-align:center; color:var(--gray); padding:20px;">No member data</div>';
    }
    
    const max = Math.max(...data, 1);
    const barHeight = 16;
    const maxWidth = 250;
    
    let bars = '';
    labels.slice(0, 10).forEach((label, i) => {
        const width = (data[i] / max) * maxWidth;
        const pct = ((data[i] / max) * 100).toFixed(0);
        bars += `
            <div style="display:flex; align-items:center; gap:6px; margin:2px 0;">
                <div style="font-size:10px; color:var(--gray); width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:right;">${label}</div>
                <div style="flex:1; height:${barHeight}px; background:#E8ECF0; border-radius:4px; overflow:hidden;">
                    <div style="height:100%; width:${width}px; background:linear-gradient(90deg, #6C3CE1, #8B6BF0); border-radius:4px; transition:width 0.5s;"></div>
                </div>
                <div style="font-size:10px; font-weight:600; width:30px;">${data[i]}</div>
            </div>
        `;
    });
    
    return `
        <div style="padding:4px 0;">
            ${bars}
        </div>
    `;
}

// ============================================
// GROWTH TREND CALCULATION
// ============================================

function calculateGrowthTrend(attendance, members, startDate, endDate) {
    const dailyData = {};
    const dateRange = getDateRange(startDate, endDate);
    
    // Initialize all dates with 0
    dateRange.forEach(date => {
        dailyData[date] = { visits: 0, unique: new Set(), newMembers: 0 };
    });
    
    // Count visits per day
    attendance.forEach(a => {
        if (dailyData[a.date]) {
            dailyData[a.date].visits += 1;
            dailyData[a.date].unique.add(a.memberId);
        }
    });
    
    // Count new members (first visit in this period)
    const firstVisitMap = {};
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length > 0) {
            firstVisitMap[m.id] = visits[0].date;
        }
    });
    
    dateRange.forEach(date => {
        members.forEach(m => {
            if (firstVisitMap[m.id] === date) {
                dailyData[date].newMembers += 1;
            }
        });
    });
    
    const dates = dateRange;
    const visits = dates.map(d => dailyData[d].visits);
    const newMembers = dates.map(d => dailyData[d].newMembers);
    
    // Calculate growth rate (compare first half vs second half)
    const midPoint = Math.floor(dates.length / 2);
    const firstHalfVisits = visits.slice(0, midPoint).reduce((a,b) => a + b, 0);
    const secondHalfVisits = visits.slice(midPoint).reduce((a,b) => a + b, 0);
    const growthRate = firstHalfVisits > 0 ? Math.round(((secondHalfVisits - firstHalfVisits) / firstHalfVisits) * 100) : 0;
    
    return {
        dates,
        visits,
        newMembers,
        growthRate,
        totalNewMembers: newMembers.reduce((a,b) => a + b, 0)
    };
}

// ============================================
// RETENTION CALCULATION
// ============================================

function calculateRetention(attendance, members) {
    let weeklyCount = 0;
    let weeklyTotal = 0;
    let monthlyCount = 0;
    let monthlyTotal = 0;
    
    members.forEach(m => {
        const visits = DB.getAttendanceByMember(m.id).sort((a,b) => a.date.localeCompare(b.date));
        if (visits.length < 2) return;
        
        let weeklyReturns = 0;
        let monthlyReturns = 0;
        
        for (let i = 0; i < visits.length - 1; i++) {
            const current = new Date(visits[i].date);
            const next = new Date(visits[i+1].date);
            const daysDiff = Math.floor((next - current) / (1000 * 60 * 60 * 24));
            
            if (daysDiff <= 7) weeklyReturns++;
            if (daysDiff <= 30) monthlyReturns++;
        }
        
        if (weeklyReturns > 0) {
            weeklyCount++;
            weeklyTotal += weeklyReturns;
        }
        if (monthlyReturns > 0) {
            monthlyCount++;
            monthlyTotal += monthlyReturns;
        }
    });
    
    return {
        weekly: weeklyCount > 0 ? Math.round((weeklyTotal / weeklyCount) * 10) / 10 : 0,
        monthly: monthlyCount > 0 ? Math.round((monthlyTotal / monthlyCount) * 10) / 10 : 0
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function exportAnalyticsReport() {
    const members = DB.getMembers();
    const attendance = DB.getAttendance();
    const firstTimers = DB.getFirstTimers();
    const secondTimers = DB.getSecondTimers();
    const atRisk = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30);
    const critical = members.filter(m => DB.getDaysSinceLastVisit(m.id) > 90);
    const active = members.filter(m => DB.getDaysSinceLastVisit(m.id) <= 30);
    
    const report = [
        ['CHURCH ATTENDANCE REPORT'],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['=== SUMMARY ==='],
        ['Metric', 'Value'],
        ['Total Members', members.length],
        ['Active Members (30 days)', active.length],
        ['Inactive Members', members.filter(m => DB.getDaysSinceLastVisit(m.id) > 30).length],
        ['First Timers', firstTimers.length],
        ['Second Timers', secondTimers.length],
        ['At Risk', atRisk.length],
        ['Critical Risk (90+ days)', critical.length],
        ['Total Attendance Records', attendance.length],
        [''],
        ['=== CONVERSION ==='],
        ['First to Second Conversion Rate', firstTimers.length > 0 ? Math.round((secondTimers.length/firstTimers.length)*100) + '%' : 'N/A'],
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
    XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
    XLSX.writeFile(wb, `church_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Analytics report exported!', 'success');
}

// ============================================
// INIT - Add export button to analytics section
// ============================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addExportButton);
} else {
    addExportButton();
}

function addExportButton() {
    const analyticsSection = document.getElementById('section-analytics');
    if (analyticsSection) {
        const header = analyticsSection.querySelector('.section-header');
        if (header) {
            // Check if button already exists
            if (!header.querySelector('.export-analytics-btn')) {
                const exportBtn = document.createElement('button');
                exportBtn.className = 'btn btn-success btn-sm export-analytics-btn';
                exportBtn.innerHTML = '<i class="fas fa-file-excel"></i> Export Report';
                exportBtn.onclick = exportAnalyticsReport;
                header.appendChild(exportBtn);
            }
        }
    }
}

console.log('✅ Advanced Analytics module loaded (No Chart.js required)');