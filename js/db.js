// ============================================
// DATABASE LAYER - localStorage PRIMARY, Firebase Realtime DB BACKUP
// ============================================

const DB = {
    // ----- Local Storage (Primary) -----
    getMembers() {
        try {
            const data = localStorage.getItem('usher_members_v9');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    setMembers(members) {
        localStorage.setItem('usher_members_v9', JSON.stringify(members));
        this.syncToFirebase();
    },
    
    getAttendance() {
        try {
            const data = localStorage.getItem('usher_attendance_v9');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },
    
    setAttendance(attendance) {
        localStorage.setItem('usher_attendance_v9', JSON.stringify(attendance));
        this.syncToFirebase();
    },
    
    // ----- Firebase Realtime Database Sync -----
    syncToFirebase() {
        if (!currentUser) {
            console.log('No user, skipping sync');
            return;
        }
        
        // Don't block, just try
        setTimeout(() => {
            try {
                const data = {
                    members: this.getMembers(),
                    attendance: this.getAttendance(),
                    lastSynced: new Date().toISOString()
                };
                
                // Use Realtime Database reference
                db.ref('churchData/' + currentUser.uid).set(data)
                    .then(() => {
                        updateCloudStatus(true, 'Synced ✓');
                        console.log('✅ Synced to Firebase Realtime DB');
                    })
                    .catch((error) => {
                        console.warn('⚠️ Sync failed:', error.message);
                        updateCloudStatus(false, 'Offline');
                    });
            } catch (e) {
                console.warn('⚠️ Sync error:', e.message);
            }
        }, 500);
    },
    
    // ----- Load from Firebase Realtime Database -----
    loadFromFirebase() {
        if (!currentUser) {
            console.log('No user, skipping load');
            return Promise.resolve(false);
        }
        
        return new Promise((resolve) => {
            // Use Realtime Database reference
            db.ref('churchData/' + currentUser.uid).once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    if (data && data.members && data.attendance) {
                        const localMembers = this.getMembers();
                        // Only load if we have data and local is empty OR Firebase has more data
                        if (localMembers.length === 0 || data.members.length > localMembers.length) {
                            this.setMembers(data.members);
                            this.setAttendance(data.attendance);
                            console.log('✅ Loaded from Firebase Realtime DB:', data.members.length, 'members');
                            resolve(true);
                        } else {
                            console.log('Local data is newer or same, skipping Firebase load');
                            resolve(false);
                        }
                    } else {
                        console.log('No data found in Firebase');
                        resolve(false);
                    }
                })
                .catch((error) => {
                    console.warn('⚠️ Could not load from Firebase:', error.message);
                    resolve(false);
                });
        });
    },
    
    // ----- CRUD Operations (All sync automatically) -----
    addMember(member) {
        const members = this.getMembers();
        member.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
        member.createdAt = new Date().toISOString();
        members.push(member);
        this.setMembers(members);
        return member;
    },
    
    addMembersBulk(membersArray) {
        const existing = this.getMembers();
        let added = 0, updated = 0;
        
        membersArray.forEach(m => {
            if (!m.name || !m.name.trim()) return;
            const nameKey = m.name.toLowerCase();
            const existingMember = existing.find(e => e.name.toLowerCase() === nameKey);
            
            if (existingMember) {
                Object.keys(m).forEach(key => {
                    if (m[key] && m[key].trim && m[key].trim() !== '') {
                        existingMember[key] = m[key];
                    }
                });
                updated++;
            } else {
                m.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
                m.createdAt = new Date().toISOString();
                existing.push(m);
                added++;
            }
        });
        
        this.setMembers(existing);
        return { added, updated, total: membersArray.length };
    },
    
    updateMember(id, updates) {
        const members = this.getMembers();
        const index = members.findIndex(m => m.id === id);
        if (index !== -1) {
            members[index] = { ...members[index], ...updates };
            this.setMembers(members);
            return members[index];
        }
        return null;
    },
    
    deleteMember(id) {
        let members = this.getMembers();
        members = members.filter(m => m.id !== id);
        this.setMembers(members);
        let attendance = this.getAttendance();
        attendance = attendance.filter(a => a.memberId !== id);
        this.setAttendance(attendance);
    },
    
    addAttendance(record) {
        const attendance = this.getAttendance();
        const exists = attendance.some(a => 
            a.memberId === record.memberId && 
            a.date === record.date && 
            a.serviceType === record.serviceType
        );
        if (exists) return null;
        record.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
        record.recordedAt = new Date().toISOString();
        attendance.push(record);
        this.setAttendance(attendance);
        return record;
    },
    
    // ----- Query Methods -----
    getMemberById(id) {
        return this.getMembers().find(m => m.id === id) || null;
    },
    
    findMemberByName(name) {
        return this.getMembers().find(m => m.name.toLowerCase() === name.toLowerCase()) || null;
    },
    
    searchMembers(query) {
        const members = this.getMembers();
        const q = query.toLowerCase().trim();
        if (!q) return members;
        return members.filter(m => 
            m.name.toLowerCase().includes(q) || 
            (m.phone && m.phone.includes(q))
        );
    },
    
    getAttendanceByMember(memberId) {
        return this.getAttendance().filter(a => a.memberId === memberId);
    },
    
    getLastAttendanceDate(memberId) {
        const att = this.getAttendanceByMember(memberId);
        if (att.length === 0) return null;
        return att.sort((a, b) => b.date.localeCompare(a.date))[0].date;
    },
    
    getDaysSinceLastVisit(memberId) {
        const lastDate = this.getLastAttendanceDate(memberId);
        if (!lastDate) return 999;
        const diff = new Date() - new Date(lastDate);
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    },
    
    getMemberVisitCount(memberId) {
        return this.getAttendanceByMember(memberId).length;
    },
    
    getMemberStatus(memberId) {
        const count = this.getMemberVisitCount(memberId);
        if (count === 0) return 'absent';
        if (count === 1) return 'first';
        if (count === 2) return 'second';
        return 'regular';
    },
    
    getFirstTimers(addressFilter = 'all', workerFilter = 'all') {
        let members = this.getMembers().filter(m => this.getMemberVisitCount(m.id) === 1);
        if (addressFilter !== 'all') members = members.filter(m => m.address === addressFilter);
        if (workerFilter !== 'all') members = members.filter(m => m.worker === workerFilter);
        return members;
    },
    
    getSecondTimers(addressFilter = 'all', workerFilter = 'all') {
        let members = this.getMembers().filter(m => this.getMemberVisitCount(m.id) === 2);
        if (addressFilter !== 'all') members = members.filter(m => m.address === addressFilter);
        if (workerFilter !== 'all') members = members.filter(m => m.worker === workerFilter);
        return members;
    },
    
    getTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendance().filter(a => a.date === today);
    },
    
    getAbsentMembers(days, riskLevel = 'all', workerFilter = 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const attendance = this.getAttendance();
        const activeIds = new Set();
        attendance.filter(a => a.date >= cutoffStr).forEach(a => activeIds.add(a.memberId));
        
        let members = this.getMembers().filter(m => !activeIds.has(m.id));
        
        if (riskLevel !== 'all') {
            members = members.filter(m => {
                const daysAbsent = this.getDaysSinceLastVisit(m.id);
                if (riskLevel === 'high') return daysAbsent > 60;
                if (riskLevel === 'medium') return daysAbsent > 30 && daysAbsent <= 60;
                if (riskLevel === 'low') return daysAbsent > 7 && daysAbsent <= 30;
                return true;
            });
        }
        
        if (workerFilter !== 'all') members = members.filter(m => m.worker === workerFilter);
        return members;
    },
    
    getUniqueAddresses() {
        const members = this.getMembers();
        const addresses = new Set();
        members.forEach(m => { if (m.address && m.address.trim()) addresses.add(m.address.trim()); });
        return Array.from(addresses).sort();
    },
    
    getStats() {
        const members = this.getMembers();
        const attendance = this.getAttendance();
        const today = new Date().toISOString().split('T')[0];
        const todayAtt = attendance.filter(a => a.date === today);
        const firstTimers = this.getFirstTimers();
        const secondTimers = this.getSecondTimers();
        const atRisk = members.filter(m => this.getDaysSinceLastVisit(m.id) > 30);
        return {
            totalMembers: members.length,
            todayAttendance: todayAtt.length,
            firstTimers: firstTimers.length,
            secondTimers: secondTimers.length,
            absentCount: atRisk.length
        };
    },
    
    clearAll() {
        localStorage.removeItem('usher_members_v9');
        localStorage.removeItem('usher_attendance_v9');
        // Also clear Firebase
        if (currentUser) {
            db.ref('churchData/' + currentUser.uid).remove()
                .then(() => console.log('✅ Firebase data cleared'))
                .catch((e) => console.warn('⚠️ Could not clear Firebase:', e.message));
        }
    },
    
    exportData() {
        return {
            members: this.getMembers(),
            attendance: this.getAttendance(),
            exportedAt: new Date().toISOString(),
            version: '9.0'
        };
    },
    
    importData(data) {
        if (data.members) this.setMembers(data.members);
        if (data.attendance) this.setAttendance(data.attendance);
    }
};

console.log('✅ DB module loaded (Realtime Database)');