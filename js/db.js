// ============================================
// DATABASE LAYER - Firebase Realtime DB PRIMARY
// ============================================

const DB = {
    // ----- In-memory cache -----
    _members: [],
    _attendance: [],
    _loaded: false,
    
    // ----- Get members from cache (loaded from Firebase) -----
    getMembers() {
        return this._members || [];
    },
    
    setMembers(members) {
        this._members = members;
        this._saveToFirebase();
    },
    
    getAttendance() {
        return this._attendance || [];
    },
    
    setAttendance(attendance) {
        this._attendance = attendance;
        this._saveToFirebase();
    },
    
    // ----- Helper: Convert Firebase object to array -----
    _convertToArray(obj) {
        if (!obj) return [];
        if (Array.isArray(obj)) return obj;
        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return [];
            if (keys.every(k => !isNaN(parseInt(k)))) {
                return Object.values(obj);
            }
            if (keys.includes('0')) {
                return Object.values(obj);
            }
            return [obj];
        }
        return [];
    },
    
    // ============================================================
    // SAVE TO FIREBASE - Direct write to root churchData
    // ============================================================
    _saveToFirebase() {
        if (!currentUser) {
            console.log('No user, skipping save');
            return;
        }

        // 🛡️ Don't store Super Admin UID in data
        const isSuperAdmin = currentUser.uid === SUPER_ADMIN_UID || 
                             SUPER_ADMINS.includes(currentUser.email);

        const data = {
            members: this._members || [],
            attendance: this._attendance || [],
            lastUpdated: firebase.database.ServerValue.TIMESTAMP,
            updatedBy: isSuperAdmin ? 'super_admin' : currentUser.uid,
            updatedByEmail: isSuperAdmin ? 'super_admin@system' : currentUser.email
        };

        console.log('💾 Saving to Firebase:', {
            members: data.members.length,
            attendance: data.attendance.length
        });

        db.ref('churchData').set(data)
            .then(() => {
                console.log('✅ Saved to Firebase');
                updateCloudStatus(true, 'Saved ✓');
            })
            .catch((error) => {
                console.error('❌ Save error:', error.message);
                updateCloudStatus(false, 'Save failed');
                if (typeof showNotification === 'function') {
                    showNotification('❌ Save failed: ' + error.message, 'error');
                }
            });
    },
    
    // ============================================================
    // LOAD FROM FIREBASE - Read from root churchData
    // ============================================================
    loadFromFirebase() {
        console.log('📥 Loading data from Firebase...');
        
        return new Promise((resolve) => {
            db.ref('churchData').once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    console.log('📋 Firebase data received:', data ? 'Data exists' : 'No data');
                    
                    if (data) {
                        let members = data.members || [];
                        let attendance = data.attendance || [];
                        
                        members = this._convertToArray(members);
                        attendance = this._convertToArray(attendance);
                        
                        // ===== MIGRATION: Move address to location =====
                        members = members.map(m => {
                            if (!m.location && m.address) {
                                m.location = m.address;
                            }
                            return m;
                        });
                        
                        this._members = members;
                        this._attendance = attendance;
                        this._loaded = true;
                        
                        console.log('✅ Loaded from Firebase:', members.length, 'members,', attendance.length, 'attendance');
                        updateCloudStatus(true, 'Connected ✓');
                        resolve(true);
                    } else {
                        // No data in Firebase - initialize empty
                        this._members = [];
                        this._attendance = [];
                        this._loaded = true;
                        console.log('📭 No data found in Firebase - starting fresh');
                        resolve(false);
                    }
                })
                .catch((error) => {
                    console.error('❌ Error loading from Firebase:', error);
                    this._members = [];
                    this._attendance = [];
                    this._loaded = true;
                    updateCloudStatus(false, 'Error: ' + error.message);
                    resolve(false);
                });
        });
    },
    
    // ============================================================
    // LISTEN FOR REAL-TIME UPDATES
    // ============================================================
    listenForUpdates(callback) {
        if (!currentUser) {
            console.log('No user, skipping real-time listener');
            return;
        }
        
        console.log('🔄 Setting up real-time listener...');
        
        db.ref('churchData').on('value', (snapshot) => {
            const data = snapshot.val();
            console.log('📡 Real-time update received:', data ? 'Data exists' : 'No data');
            
            if (data) {
                let members = data.members || [];
                let attendance = data.attendance || [];
                
                members = this._convertToArray(members);
                attendance = this._convertToArray(attendance);
                
                // ===== MIGRATION: Move address to location =====
                members = members.map(m => {
                    if (!m.location && m.address) {
                        m.location = m.address;
                    }
                    return m;
                });
                
                this._members = members;
                this._attendance = attendance;
                
                console.log('🔄 Data updated in real-time:', members.length, 'members,', attendance.length, 'attendance');
                
                if (callback && typeof callback === 'function') {
                    callback(members, attendance);
                }
            }
        }, (error) => {
            console.error('❌ Real-time listener error:', error);
        });
    },
    
    // ============================================================
    // CRUD Operations
    // ============================================================
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
    
    getUniqueLocations() {
        const members = this.getMembers();
        const locations = new Set();
        members.forEach(m => { 
            if (m.location && m.location.trim()) {
                // Store as-is but trim
                locations.add(m.location.trim()); 
            }
        });
        return Array.from(locations).sort();
    },
    
    // ===== FIXED: Case-insensitive location filters =====
    getFirstTimers(locationFilter = 'all', workerFilter = 'all') {
        let members = this.getMembers().filter(m => this.getMemberVisitCount(m.id) === 1);
        if (locationFilter !== 'all') {
            const filterLower = locationFilter.toLowerCase();
            members = members.filter(m => {
                return m.location && m.location.toLowerCase() === filterLower;
            });
        }
        if (workerFilter !== 'all') members = members.filter(m => m.worker === workerFilter);
        return members;
    },
    
    getSecondTimers(locationFilter = 'all', workerFilter = 'all') {
        let members = this.getMembers().filter(m => this.getMemberVisitCount(m.id) === 2);
        if (locationFilter !== 'all') {
            const filterLower = locationFilter.toLowerCase();
            members = members.filter(m => {
                return m.location && m.location.toLowerCase() === filterLower;
            });
        }
        if (workerFilter !== 'all') members = members.filter(m => m.worker === workerFilter);
        return members;
    },
    
    // ===== FIXED: Main function - getAbsentMembers with case-insensitive =====
    getAbsentMembers(days, riskLevel = 'all', workerFilter = 'all', locationFilter = 'all') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        const attendance = this.getAttendance();
        const activeIds = new Set();
        attendance.filter(a => a.date >= cutoffStr).forEach(a => activeIds.add(a.memberId));
        
        let members = this.getMembers().filter(m => !activeIds.has(m.id));
        
        // ===== CASE-INSENSITIVE LOCATION FILTER =====
        if (locationFilter !== 'all') {
            const filterLower = locationFilter.toLowerCase();
            members = members.filter(m => {
                return m.location && m.location.toLowerCase() === filterLower;
            });
        }
        
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
        return this.getUniqueLocations();
    },
    
    getTodayAttendance() {
        const today = new Date().toISOString().split('T')[0];
        return this.getAttendance().filter(a => a.date === today);
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
        this._members = [];
        this._attendance = [];
        if (currentUser) {
            db.ref('churchData').remove()
                .then(() => {
                    console.log('✅ Firebase data cleared');
                    updateCloudStatus(true, 'Cleared ✓');
                })
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
        if (data.members) {
            data.members = data.members.map(m => {
                if (!m.location && m.address) {
                    m.location = m.address;
                }
                return m;
            });
            this._members = Array.isArray(data.members) ? data.members : [];
        }
        if (data.attendance) {
            this._attendance = Array.isArray(data.attendance) ? data.attendance : [];
        }
        this._saveToFirebase();
    }
};

console.log('✅ DB module loaded (Firebase Primary)');