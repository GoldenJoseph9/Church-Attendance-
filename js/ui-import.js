// ============================================
// UI-IMPORT.JS - Import Functions
// ============================================

let importDataCache = null;

// ============================================
// EXCEL IMPORT FUNCTIONS
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
            
            console.log('📊 Excel data:', jsonData);
            
            showImportPreview(jsonData);
            importDataCache = jsonData;
            
        } catch (error) {
            console.error('❌ Error reading file:', error);
            showNotification('Error reading file: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function showImportPreview(data) {
    const previewDiv = document.getElementById('previewContent');
    const importPreview = document.getElementById('importPreview');
    
    if (!previewDiv) return;
    
    if (!data || data.length === 0) {
        previewDiv.innerHTML = '<p style="color:var(--gray);">No data found in file</p>';
        importPreview.style.display = 'block';
        return;
    }
    
    const headers = Object.keys(data[0]);
    
    let html = `
        <div style="font-size:12px; color:var(--gray); margin-bottom:8px;">
            Found ${data.length} records
            <span style="margin-left:8px; font-size:10px; color:var(--success);">✓ Columns: ${headers.join(', ')}</span>
        </div>
        <div style="max-height:200px; overflow-y:auto; border:1px solid #E8ECF0; border-radius:6px;">
            <table style="font-size:11px; min-width:auto;">
                <thead>
                    <tr>${headers.map(h => `<th style="padding:4px 8px; font-size:10px; background:#EDE9FE;">${h}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.slice(0, 10).map(row => `
                        <tr>${headers.map(h => `<td style="padding:4px 8px; font-size:10px; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row[h] || ''}</td>`).join('')}</tr>
                    `).join('')}
                    ${data.length > 10 ? `<tr><td colspan="${headers.length}" style="padding:4px 8px; font-size:10px; color:var(--gray);">... and ${data.length - 10} more</td></tr>` : ''}
                </tbody>
            </table>
        </div>
        <div style="margin-top:8px; font-size:11px; color:var(--gray); background:#F8F9FC; padding:8px; border-radius:6px;">
            <strong>📋 Column Mapping:</strong><br>
            <span style="display:inline-block; margin:2px 8px 2px 0;">📛 Name → <code>Name</code></span>
            <span style="display:inline-block; margin:2px 8px 2px 0;">📱 Phone → <code>PhoneNo</code></span>
            <span style="display:inline-block; margin:2px 8px 2px 0;">📍 Full Address → <code>Bus Stop</code></span>
            <span style="display:inline-block; margin:2px 8px 2px 0;">📍 Location (filter) → <code>Location</code></span>
            <span style="display:inline-block; margin:2px 8px 2px 0;">👤 Gender → <code>Gender</code></span>
            <span style="display:inline-block; margin:2px 8px 2px 0;">🎂 DOB → <code>DOB</code></span>
            <span style="display:inline-block; margin:2px 8px 2px 0;">💍 Marital → <code>Marital Status</code></span>
        </div>
    `;
    
    previewDiv.innerHTML = html;
    importPreview.style.display = 'block';
}

// ============================================
// UPDATED: confirmImport - includes location
// ============================================
function confirmImport() {
    if (!importDataCache || importDataCache.length === 0) {
        showNotification('No data to import', 'error');
        return;
    }
    
    if (!confirm(`Import ${importDataCache.length} members?`)) return;
    
    try {
        const members = importDataCache.map(row => {
            let fullName = row.Name || row.name || row['Full Name'] || row['FullName'] || '';
            
            let firstName = row.FirstName || row['First Name'] || row.firstName || '';
            let lastName = row.LastName || row['Last Name'] || row.lastName || '';
            
            if (!fullName && firstName && lastName) {
                fullName = `${firstName} ${lastName}`.trim();
            }
            
            if (!fullName) {
                const nameKeys = Object.keys(row).filter(k => 
                    k.toLowerCase().includes('name') || 
                    k.toLowerCase().includes('fullname')
                );
                if (nameKeys.length > 0) {
                    fullName = row[nameKeys[0]] || '';
                }
            }
            
            let phone = row.PhoneNo || row.Phone || row.phone || row.Mobile || row.mobile || row['Phone Number'] || '';
            if (phone) {
                phone = phone.toString().replace(/[\s\-\(\)]/g, '');
            }
            
            let address = row['Bus Stop'] || row.BusStop || row.Address || row.address || '';
            
            let location = row.Location || row.location || row['Location'] || '';
            
            let gender = row.Gender || row.gender || '';
            if (gender) {
                gender = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
                if (gender.toLowerCase() === 'male') gender = 'Male';
                else if (gender.toLowerCase() === 'female') gender = 'Female';
                else if (gender.toLowerCase() === 'other') gender = 'Other';
            }
            
            let dob = row.DOB || row.dob || row.Birthday || row.birthday || row['Date of Birth'] || row['DOB'] || '';
            if (dob) {
                dob = dob.toString().trim();
                const monthMap = {
                    'january': '01', 'february': '02', 'march': '03', 'april': '04',
                    'may': '05', 'june': '06', 'july': '07', 'august': '08',
                    'september': '09', 'october': '10', 'november': '11', 'december': '12',
                    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
                };
                
                let day = '';
                let month = '';
                
                const match1 = dob.match(/(\d+)(?:st|nd|rd|th)?\s*(\w+)/i);
                if (match1) {
                    day = String(parseInt(match1[1])).padStart(2, '0');
                    const monthName = match1[2].toLowerCase();
                    month = monthMap[monthName] || '';
                } else {
                    const match2 = dob.match(/(\w+)\s*(\d+)(?:st|nd|rd|th)?/i);
                    if (match2) {
                        const monthName = match2[1].toLowerCase();
                        month = monthMap[monthName] || '';
                        day = String(parseInt(match2[2])).padStart(2, '0');
                    }
                }
                
                if (month && day) {
                    dob = month + '/' + day;
                } else {
                    const match3 = dob.match(/(\d{1,2})\/(\d{1,2})/);
                    if (match3) {
                        dob = String(parseInt(match3[1])).padStart(2, '0') + '/' + String(parseInt(match3[2])).padStart(2, '0');
                    }
                }
            }
            
            let maritalStatus = row['Marital Status'] || row.maritalStatus || row['MaritalStatus'] || row['Marital_Status'] || '';
            if (maritalStatus) {
                maritalStatus = maritalStatus.charAt(0).toUpperCase() + maritalStatus.slice(1).toLowerCase();
                const validStatuses = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
                if (!validStatuses.includes(maritalStatus)) {
                    const lowerStatus = maritalStatus.toLowerCase();
                    if (lowerStatus.includes('single')) maritalStatus = 'Single';
                    else if (lowerStatus.includes('married') || lowerStatus.includes('marry')) maritalStatus = 'Married';
                    else if (lowerStatus.includes('divorced')) maritalStatus = 'Divorced';
                    else if (lowerStatus.includes('widow')) maritalStatus = 'Widowed';
                    else if (lowerStatus.includes('separated')) maritalStatus = 'Separated';
                    else maritalStatus = '';
                }
            }
            
            let worker = row.Worker || row.worker || 'No';
            if (worker === 'TRUE' || worker === 'true' || worker === '1' || worker === 'Yes' || worker === 'yes') {
                worker = 'Yes';
            } else {
                worker = 'No';
            }
            
            return {
                name: fullName,
                firstName: firstName || (fullName ? fullName.split(' ')[0] : ''),
                lastName: lastName || (fullName ? fullName.split(' ').slice(1).join(' ') : ''),
                phone: phone || '',
                address: address || '',
                location: location || '',
                gender: gender || '',
                dob: dob || '',
                maritalStatus: maritalStatus || '',
                worker: worker
            };
        }).filter(m => m.name && m.name.trim());
        
        if (members.length === 0) {
            showNotification('No valid members found. Make sure you have a "Name" column.', 'error');
            return;
        }
        
        const result = DB.addMembersBulk(members);
        DB._saveToFirebase();
        
        showNotification(`✅ Imported ${result.added} members (${result.updated} updated)`, 'success');
        
        importDataCache = null;
        document.getElementById('importPreview').style.display = 'none';
        document.getElementById('fileInput').value = '';
        
        updateStats();
        loadAllViews();
        updateStorageInfo();
        populateLocationFilters();
        populateFilterDropdowns();
        
        setTimeout(() => {
            DB.loadFromFirebase().then(() => {
                updateStats();
                loadAllViews();
            });
        }, 1000);
        
    } catch (error) {
        console.error('❌ Import error:', error);
        showNotification('Error importing: ' + error.message, 'error');
    }
}

function cancelImport() {
    importDataCache = null;
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
    showNotification('Import cancelled', 'info');
}

// ============================================
// UPDATED: downloadTemplate - includes location
// ============================================
function downloadTemplate() {
    const headers = ['Name', 'PhoneNo', 'Bus Stop', 'Location', 'Gender', 'DOB', 'Marital Status', 'Worker'];
    const sample = [
        ['Aramide Richard', '08142955410', '12 Church Street, Lagos', 'Lagos', 'Male', '28th March', 'Single', 'No'],
        ['Sola Ayangbade', '08051966145', '45 Faith Avenue, Abuja', 'Abuja', 'Male', '', 'Married', 'No'],
        ['Ondiok K.', '07068719688', '78 Grace Road, PH', 'PH', 'Male', '14th January', 'Married', 'No']
    ];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, 'Member_Import_Template.xlsx');
    showNotification('Template downloaded!', 'success');
}

// ============================================
// PASTE IMPORT FUNCTIONS - (unchanged but includes location via mapping)
// ============================================

function parsePasteImport() {
    const text = document.getElementById('pasteInput').value;
    if (!text.trim()) {
        showNotification('Please paste some text first', 'error');
        return;
    }
    
    const lines = text.split('\n').filter(line => line.trim());
    const members = lines.map(line => {
        const parts = line.split(/\t|,|\|/).map(s => s.trim());
        
        const name = parts[0] || '';
        const phone = parts[1] || '';
        const address = parts[2] || '';
        const location = parts[3] || '';
        const gender = parts[4] || '';
        const dob = parts[5] || '';
        const maritalStatus = parts[6] || '';
        
        let formattedDob = dob;
        if (dob) {
            const monthMap = {
                'january': '01', 'february': '02', 'march': '03', 'april': '04',
                'may': '05', 'june': '06', 'july': '07', 'august': '08',
                'september': '09', 'october': '10', 'november': '11', 'december': '12'
            };
            const match = dob.match(/(\d+)(?:st|nd|rd|th)?\s*(\w+)/i);
            if (match) {
                const day = String(parseInt(match[1])).padStart(2, '0');
                const monthName = match[2].toLowerCase();
                if (monthMap[monthName]) {
                    formattedDob = monthMap[monthName] + '/' + day;
                }
            }
        }
        
        let marital = maritalStatus || '';
        if (marital) {
            marital = marital.charAt(0).toUpperCase() + marital.slice(1).toLowerCase();
        }
        
        return { 
            name, 
            phone, 
            address,
            location,
            gender, 
            dob: formattedDob,
            maritalStatus: marital
        };
    }).filter(m => m.name);
    
    if (members.length === 0) {
        showNotification('No valid members found in paste', 'error');
        return;
    }
    
    importDataCache = members;
    displayPasteResults(members);
}

function displayPasteResults(members) {
    const previewDiv = document.getElementById('pastePreview');
    
    previewDiv.style.display = 'block';
    previewDiv.innerHTML = `
        <div style="background:#EDE9FE; padding:12px; border-radius:8px; margin-bottom:8px;">
            <strong>📋 Found ${members.length} members</strong>
            <button class="btn btn-sm btn-success" onclick="confirmPasteImport()" style="margin-left:10px;">
                <i class="fas fa-check"></i> Import All
            </button>
            <button class="btn btn-sm btn-danger" onclick="clearPaste()">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
        <div style="max-height:200px; overflow-y:auto; border:1px solid #E8ECF0; border-radius:6px;">
            <table style="font-size:11px;">
                <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Address</th><th>Location</th><th>Gender</th><th>DOB</th><th>Marital Status</th></tr></thead>
                <tbody>
                    ${members.slice(0, 20).map((m, i) => `
                        <tr><td>${i+1}</td><td>${m.name}</td><td>${m.phone || '-'}</td><td>${m.address || '-'}</td><td>${m.location || '-'}</td><td>${m.gender || '-'}</td><td>${m.dob || '-'}</td><td>${m.maritalStatus || '-'}</td></tr>
                    `).join('')}
                    ${members.length > 20 ? `<tr><td colspan="8" style="padding:4px 8px; color:var(--gray);">... and ${members.length - 20} more</td></tr>` : ''}
                </tbody>
            </table>
        </div>
        <div id="pasteImportResult" style="margin-top:8px;"></div>
    `;
}

function confirmPasteImport() {
    if (!importDataCache || importDataCache.length === 0) {
        showNotification('No data to import', 'error');
        return;
    }
    
    const members = importDataCache.map(m => ({
        ...m,
        worker: m.worker || 'No'
    }));
    
    const result = DB.addMembersBulk(members);
    DB._saveToFirebase();
    
    showNotification(`✅ Imported ${result.added} members (${result.updated} updated)`, 'success');
    
    document.getElementById('pastePreview').style.display = 'none';
    document.getElementById('pasteInput').value = '';
    document.getElementById('pasteResult').innerHTML = `
        <div style="background:#D5F5E3; padding:12px; border-radius:8px; color:#1A7A42;">
            ✅ Successfully imported ${result.added} members, updated ${result.updated}
        </div>
    `;
    
    importDataCache = null;
    
    updateStats();
    loadAllViews();
    updateStorageInfo();
    populateLocationFilters();
    populateFilterDropdowns();
    
    setTimeout(() => {
        DB.loadFromFirebase().then(() => {
            updateStats();
            loadAllViews();
        });
    }, 1000);
}

function clearPaste() {
    document.getElementById('pasteInput').value = '';
    document.getElementById('pastePreview').style.display = 'none';
    document.getElementById('pasteResult').innerHTML = '';
    importDataCache = null;
}

window.handleFileImport = handleFileImport;
window.confirmImport = confirmImport;
window.cancelImport = cancelImport;
window.downloadTemplate = downloadTemplate;
window.parsePasteImport = parsePasteImport;
window.confirmPasteImport = confirmPasteImport;
window.clearPaste = clearPaste;