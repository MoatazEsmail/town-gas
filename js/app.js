const firebaseConfig = {
  apiKey: "AIzaSyCHHy0mq4E_IQvmXq0BHc5-Pe2Wq9k-8Bk",
  authDomain: "town-gas-app.firebaseapp.com",
  projectId: "town-gas-app",
  storageBucket: "town-gas-app.firebasestorage.app",
  messagingSenderId: "194108900721",
  appId: "1:194108900721:web:fd7b13f33ab32b66eee2d0"
};

const isDemoMode = false; // Cloud mode is now ACTIVE ☁️
let db = null;

if (!isDemoMode) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    } catch(e) {
        console.error("Firebase config missing or invalid", e);
    }
}

// --- State Variables ---
let currentUser = null; 
let currentMonth = new Date().toISOString().slice(0, 7); 
let records = []; 
let currentTechModal = null; 

// --- DOM Elements ---
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const currentUserInfo = document.getElementById('current-user-name');
const currentUserRole = document.getElementById('current-user-role');
const monthFilter = document.getElementById('month-filter');
const exportBtn = document.getElementById('export-excel-btn');
const techGrid = document.getElementById('tech-grid');
const adminStats = document.getElementById('admin-stats');
const loadingData = document.getElementById('loading-data');
const totalChimneyStat = document.getElementById('total-chimney-stat');
const totalDomesticStat = document.getElementById('total-domestic-stat');
const totalCommercialStat = document.getElementById('total-commercial-stat');

const techModal = document.getElementById('tech-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalTechName = document.getElementById('modal-tech-name');
const modalTargetRem = document.getElementById('modal-target-rem');
const modalTargetDone = document.getElementById('modal-target-done');
const modalTargetPerc = document.getElementById('modal-target-perc');
const recordsTbody = document.getElementById('records-tbody');
const recordForm = document.getElementById('record-form');
const recordsMonthLabel = document.getElementById('records-month-label');
const addRecordSection = document.getElementById('quick-add-section');

const reportModal = document.getElementById('report-modal');
const closeReportModalBtn = document.getElementById('close-report-modal');
const reportTbody = document.getElementById('report-tbody');
const podiumContainer = document.getElementById('podium-container');
const reportTabs = document.querySelectorAll('.report-tab');
const showReportsBtn = document.getElementById('show-reports-btn');

// --- Initialization ---
function init() {
    const storedUser = localStorage.getItem('townGasUser');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        showApp();
    } else {
        showLogin();
    }

    if (monthFilter) monthFilter.value = currentMonth;

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            currentMonth = e.target.value;
            updateMonthDisplay();
            fetchRecords();
        });
    }

    const techSelect = document.getElementById('record-tech');
    if (techSelect) techSelect.addEventListener('change', () => {});
    
    const qtyVacation = document.getElementById('qty-vacation');
    const productionInputs = ['qty-domestic', 'qty-replace', 'qty-commercial', 'qty-chimney', 'qty-vent'].map(id => document.getElementById(id));
    
    if (qtyVacation) {
        qtyVacation.addEventListener('input', (e) => {
            let val = Number(e.target.value);
            if (val > 1) {
                val = 1;
                e.target.value = 1;
            }
            const isVacation = val > 0;
            productionInputs.forEach(input => {
                if (input) {
                    input.disabled = isVacation;
                    if (isVacation) input.value = 0;
                }
            });
        });
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (techModal) techModal.classList.add('hidden');
            currentTechModal = null;
        });
    }

    if (recordForm) recordForm.addEventListener('submit', handleAddRecord);
    if (exportBtn) exportBtn.addEventListener('click', handleExportExcel);

    if (showReportsBtn) showReportsBtn.addEventListener('click', () => showReportModal());
    if (closeReportModalBtn) closeReportModalBtn.addEventListener('click', () => reportModal.classList.add('hidden'));
    
    reportTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            reportTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            fetchReportData(tab.dataset.type);
        });
    });
}

// --- Auth Functions ---
function handleLogin(e) {
    e.preventDefault();
    const userId = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (userId === 'admin' && pass === ADMIN_PASSWORD) {
        currentUser = { id: 'admin', role: 'admin', name: 'معتز إسماعيل', techData: null };
        finishLogin();
    } else if (userId === 'viewer1' && pass === VIEWER_PASSWORD) {
        currentUser = { id: 'viewer1', role: 'viewer', name: 'م/ محمد سامي', techData: null };
        finishLogin();
    } else if (TECH_DATA[userId] && pass === (TECH_DATA[userId].password || DEFAULT_TECH_PASSWORD)) {
        currentUser = { id: userId, role: 'tech', name: TECH_DATA[userId].name, techData: TECH_DATA[userId] };
        finishLogin();
    } else {
        if (loginError) loginError.classList.remove('hidden');
    }
}

function finishLogin() {
    if (loginError) loginError.classList.add('hidden');
    localStorage.setItem('townGasUser', JSON.stringify(currentUser));
    const passField = document.getElementById('password');
    if (passField) passField.value = '';
    showApp();
}

function handleLogout() {
    localStorage.removeItem('townGasUser');
    currentUser = null;
    if(unsubscribeFirestore) unsubscribeFirestore();
    showLogin();
}

function showLogin() {
    if (appScreen) appScreen.classList.add('hidden');
    if (loginScreen) loginScreen.classList.remove('hidden');
}

function showApp() {
    if (loginScreen) loginScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    
    if (currentUserInfo) currentUserInfo.textContent = currentUser.name;
    
    let roleTitle = 'فني';
    if(currentUser.role === 'admin') roleTitle = 'المشرف العام';
    if(currentUser.role === 'viewer') roleTitle = 'الباشمهندس';
    if (currentUserRole) currentUserRole.textContent = roleTitle;
    
    const recordDate = document.getElementById('record-date');
    if (recordDate) recordDate.value = new Date().toISOString().slice(0, 10);
    
    const techSelectGroup = document.getElementById('tech-select-group');
    if(currentUser.role === 'admin') {
        if(adminStats) adminStats.style.display = 'flex';
        if(exportBtn) exportBtn.style.display = 'inline-block';
        if(techSelectGroup) techSelectGroup.style.display = 'block';
        if(addRecordSection) addRecordSection.style.display = 'block';
    } else if (currentUser.role === 'tech') {
        if(adminStats) adminStats.style.display = 'none';
        if(exportBtn) exportBtn.style.display = 'none';
        if(techSelectGroup) techSelectGroup.style.display = 'none';
        if(addRecordSection) addRecordSection.style.display = 'block';
    } else {
        // Viewer
        if(adminStats) adminStats.style.display = 'flex';
        if(exportBtn) exportBtn.style.display = 'inline-block';
        if(techSelectGroup) techSelectGroup.style.display = 'none';
        if(addRecordSection) addRecordSection.style.display = 'none';
    }

    updateMonthDisplay();
    fetchRecords();
}

function updateMonthDisplay() {
    try {
        const d = new Date(currentMonth + "-01");
        const monthName = d.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
        const displayEl = document.getElementById('current-month-display');
        if(displayEl) {
            displayEl.textContent = `إنتاجية شهر ${monthName}`;
        }
    } catch(e) {}
}

let unsubscribeFirestore = null;
function fetchRecords() {
    if (loadingData) loadingData.classList.remove('hidden');
    if (techGrid) techGrid.innerHTML = ''; 
    
    if(unsubscribeFirestore) unsubscribeFirestore(); 

    const startDate = `${currentMonth}-01`;
    const year = parseInt(currentMonth.split('-')[0]);
    const monthIndex = parseInt(currentMonth.split('-')[1]);
    const lastDay = new Date(year, monthIndex, 0).getDate();
    const endDate = `${currentMonth}-${lastDay}`;

    try {
        if (isDemoMode) {
            const localData = JSON.parse(localStorage.getItem('demo_records') || '[]');
            records = localData.filter(r => r.date >= startDate && r.date <= endDate);
            updateDashboard();
            if (loadingData) loadingData.classList.add('hidden');
            return;
        }

        if (!db) throw new Error("Database not initialized");
        const q = db.collection("productivity_records")
            .where("date", ">=", startDate)
            .where("date", "<=", endDate);

        unsubscribeFirestore = q.onSnapshot((snapshot) => {
            records = [];
            snapshot.forEach((doc) => {
                records.push({ ...doc.data(), id: doc.id });
            });
            updateDashboard();
            if (loadingData) loadingData.classList.add('hidden');
        }, (error) => {
            console.error("Firebase fetch error:", error);
            if (loadingData) loadingData.innerHTML = `<span class="error-msg">خطأ في الاتصال بقاعدة البيانات.</span>`;
        });
    } catch (error) {
        console.error("Fetch error:", error);
        if (loadingData) loadingData.innerHTML = `<span class="error-msg">حدث خطأ أثناء تحميل البيانات.</span>`;
    }
}

function updateDashboard() {
    if (!techGrid) return;
    techGrid.innerHTML = '';
    
    let totalAdminChimney = 0;
    let totalAdminDomestic = 0;
    let totalAdminCommercial = 0;

    const techsProgress = Object.keys(TECH_DATA).map(techId => {
        const techInfo = TECH_DATA[techId];
        const techRecords = records.filter(r => r.techId === techId);
        const stats = calculateMonthlyStats(techRecords, techInfo.type);
        
        totalAdminChimney += stats.rawChimney;
        totalAdminDomestic += (stats.rawDomestic + stats.rawReplace);
        totalAdminCommercial += stats.rawCommercial;

        const percentage = Math.round((stats.done / techInfo.target) * 100);
        return { ...techInfo, done: stats.done, rawVacation: stats.rawVacation, percentage, records: techRecords };
    });

    techsProgress.sort((a, b) => b.done - a.done || b.percentage - a.percentage);

    if (totalChimneyStat) totalChimneyStat.textContent = totalAdminChimney;
    if (totalDomesticStat) totalDomesticStat.textContent = totalAdminDomestic;
    if (totalCommercialStat) totalCommercialStat.textContent = totalAdminCommercial;

    // Count working days (6 days/week: Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4 → exclude Fri=5)
    function countWorkingDays(from, to) {
        let count = 0;
        const cur = new Date(from);
        while (cur <= to) {
            if (cur.getDay() !== 5) count++; // skip Friday
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    }

    const today = new Date();
    const [cYear, cMonth] = currentMonth.split('-').map(Number);
    const isCurrentMonth = today.getFullYear() === cYear && (today.getMonth() + 1) === cMonth;

    const monthStart = new Date(cYear, cMonth - 1, 1);
    const monthEnd = new Date(cYear, cMonth, 0); // last day of month
    const elapsedEnd = isCurrentMonth ? today : monthEnd;

    const workingDaysElapsed = countWorkingDays(monthStart, elapsedEnd);
    const workingDaysTotal = countWorkingDays(monthStart, monthEnd);
    const workingDaysRemaining = Math.max(workingDaysTotal - workingDaysElapsed, 0);


    techsProgress.forEach((tech, index) => {
        let pColorClass = 'progress-bad';
        let progressColor = '#ef4444';
        if(tech.percentage >= 100) { pColorClass = 'progress-excellent'; progressColor = '#22c55e'; }
        else if (tech.percentage >= 75) { pColorClass = 'progress-good'; progressColor = '#22c55e'; }
        else if (tech.percentage >= 50) { pColorClass = 'progress-good'; progressColor = '#f59e0b'; }
        else if (tech.percentage >= 25) { progressColor = '#f97316'; }

        // Daily average calculation (working days only, excl. Fridays)
        // idealPerDay = monthly target ÷ total working days this month (e.g. 210 ÷ 26 = ~8.07)
        const idealPerDay = workingDaysTotal > 0 ? (tech.target / workingDaysTotal).toFixed(2) : 0;
        const dailyAvg    = workingDaysElapsed > 0 ? (tech.done / workingDaysElapsed).toFixed(2) : 0;
        const neededPerDay = workingDaysRemaining > 0 ? ((tech.target - tech.done) / workingDaysRemaining).toFixed(2) : 0;

        const avgColor    = parseFloat(dailyAvg) >= parseFloat(idealPerDay) ? '#22c55e' : '#ef4444';
        const neededColor = parseFloat(neededPerDay) <= parseFloat(idealPerDay) ? '#22c55e' : '#ef4444';

        const dailyHtml = `
            <div class="daily-stats-grid">
                <div class="ds-item">
                    <span class="ds-label">📋 المستهدف اليومي</span>
                    <span class="ds-value" style="color:#1d4ed8">${idealPerDay}</span>
                </div>
                <div class="ds-item">
                    <span class="ds-label">📈 معدلك الحالي</span>
                    <span class="ds-value" style="color:${avgColor}">${dailyAvg}</span>
                </div>
                <div class="ds-item">
                    <span class="ds-label">🎯 مطلوب/يوم متبقي</span>
                    <span class="ds-value" style="color:${neededColor}">${workingDaysRemaining > 0 ? neededPerDay : '—'}</span>
                </div>
            </div>
        `;

        // Celebration banner for 100%+
        const celebrationHtml = tech.percentage >= 100 ? `<div class="celebration-banner">🎉 تم تحقيق الهدف!</div>` : '';

        const card = document.createElement('div');
        card.className = `tech-card tech-type-${tech.type.replace(' ', '-')}${tech.percentage >= 100 ? ' achieved' : ''}`;
        card.innerHTML = `
            ${celebrationHtml}
            <div class="tech-header">
                <div>
                    <div class="tech-name">${tech.name}</div>
                    <span class="tech-type">${tech.type}</span>
                </div>
                <div class="tech-rank">#${index + 1}</div>
            </div>
            <div class="tech-progress">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px; font-size:0.9rem;">
                    <span>الهدف: ${tech.target}</span>
                    <strong style="color:${progressColor}">${tech.percentage}%</strong>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar ${pColorClass}" style="width: ${Math.min(tech.percentage, 100)}%; background: ${progressColor}; transition: width 1s ease;"></div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:var(--text-muted); margin-top:4px;">
                    <span>المحقق: <strong>${tech.done}</strong></span>
                    <span style="color:var(--red-danger); font-weight:bold;">إجازة: <span dir="ltr">${tech.rawVacation}</span> يوم</span>
                </div>
                ${dailyHtml}
            </div>
        `;

        card.addEventListener('click', () => openTechModal(tech.id, tech));
        techGrid.appendChild(card);

        // Show toast notification for 100% achievement (only for current user)
        if (tech.percentage >= 100 && currentUser.role === 'tech' && currentUser.id === tech.id) {
            showCelebrationToast(tech.name);
        }
    });

    if(currentTechModal) {
        const t = techsProgress.find(x => x.id === currentTechModal);
        if(t) openTechModal(t.id, t, true);
    }
}

function showCelebrationToast(name) {
    if (document.getElementById('celebration-toast')) return;
    const toast = document.createElement('div');
    toast.id = 'celebration-toast';
    toast.className = 'celebration-toast';
    toast.innerHTML = `
        <div class="toast-icon">🏆</div>
        <div>
            <strong>مبروك يا ${name}!</strong>
            <p>لقد تجاوزت مستهدفك الشهري 🎉</p>
        </div>
        <button onclick="this.parentElement.remove()" style="background:none; border:none; cursor:pointer; color:white; font-size:1.2rem;">✕</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 8000);
}

function openTechModal(techId, techProgressData, isRefresh = false) {
    currentTechModal = techId;
    if (modalTechName) modalTechName.textContent = techProgressData.name;
    if (modalTargetDone) modalTargetDone.textContent = techProgressData.done;
    
    const rem = techProgressData.target - techProgressData.done;
    if (modalTargetRem) modalTargetRem.textContent = rem > 0 ? rem.toFixed(2) : 'تم إنجاز الهدف 🎉';
    if (modalTargetPerc) modalTargetPerc.textContent = techProgressData.percentage + '%';
    if (recordsMonthLabel) recordsMonthLabel.textContent = `(${currentMonth})`;
    
    const vacEl = document.getElementById('modal-target-vac');
    if(vacEl) vacEl.textContent = techProgressData.rawVacation || 0;

    if (!recordsTbody) return;
    recordsTbody.innerHTML = '';
    const sortedRecords = [...techProgressData.records].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(sortedRecords.length === 0) {
        recordsTbody.innerHTML = `<tr><td colspan="7" style="text-align:center">لا توجد سجلات.</td></tr>`;
    } else {
        sortedRecords.forEach(rec => {
            const tr = document.createElement('tr');
            if((rec.vacation || 0) > 0) tr.style.backgroundColor = '#ffebee';
            
            let actionsHtml = '-';
            if(currentUser.role !== 'viewer' && (currentUser.role === 'admin' || currentUser.id === rec.techId)) {
                actionsHtml = `
                    <div style="display:flex; gap:4px; justify-content:center;">
                        <button class="btn info-btn" style="padding:2px 6px; font-size:0.75rem;" onclick="window.editRecord('${rec.id}')"><i class="fa-solid fa-edit"></i></button>
                        <button class="btn delete-btn" style="padding:2px 6px; font-size:0.75rem;" onclick="window.deleteRecord('${rec.id}')"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
            }

            const domLabel = (rec.domestic || 0) + (rec.replace || 0);
            const chimVentLabel = `م: ${rec.chimney || 0} / هـ: ${rec.vent || 0}`;
            const rowStats = calculateMonthlyStats([rec], techProgressData.type);

            tr.innerHTML = `
                <td>${rec.date}</td>
                <td>${domLabel}</td>
                <td>${rec.commercial || 0}</td>
                <td style="font-size:0.85rem">${chimVentLabel}</td>
                <td style="color:var(--red-danger); font-weight:bold;">${rec.vacation || 0}</td>
                <td><span class="badge">${rowStats.done}</span></td>
                <td>${actionsHtml}</td>
            `;
            recordsTbody.appendChild(tr);
        });
    }

    if(!isRefresh && techModal) techModal.classList.remove('hidden');
}

window.editRecord = (docId) => {
    const r = records.find(x => x.id === docId);
    if(!r) return;
    
    const dateInput = document.getElementById('record-date');
    const domInput = document.getElementById('qty-domestic');
    const repInput = document.getElementById('qty-replace');
    const comInput = document.getElementById('qty-commercial');
    const chiInput = document.getElementById('qty-chimney');
    const venInput = document.getElementById('qty-vent');
    const vacInput = document.getElementById('qty-vacation');

    if (dateInput) dateInput.value = r.date;
    if (domInput) domInput.value = r.domestic || 0;
    if (repInput) repInput.value = r.replace || 0;
    if (comInput) comInput.value = r.commercial || 0;
    if (chiInput) chiInput.value = r.chimney || 0;
    if (venInput) venInput.value = r.vent || 0;
    if (vacInput) {
        vacInput.value = r.vacation || 0;
        vacInput.dispatchEvent(new Event('input'));
    }
    
    if(currentUser.role === 'admin') {
        const sel = document.getElementById('record-tech');
        if(sel) sel.value = r.techId;
    }
    
    window.editDocId = docId;
    const btn = recordForm.querySelector('button[type="submit"]');
    if (btn) btn.textContent = 'حفظ التعديلات';
    
    if(currentTechModal && techModal) {
        techModal.classList.add('hidden');
        currentTechModal = null;
    }
    
    const quickSection = document.getElementById('quick-add-section');
    if (quickSection) quickSection.scrollIntoView({ behavior: 'smooth' });
};

async function handleAddRecord(e) {
    e.preventDefault();
    if(currentUser.role === 'viewer') return;
    
    const techId = currentUser.role === 'admin' ? document.getElementById('record-tech').value : currentUser.id;
    if(!techId) {
        alert("الرجاء اختيار الفني أولاً");
        return;
    }

    const qtyVacation = Number(document.getElementById('qty-vacation').value) || 0;
    const isVacation = qtyVacation > 0;
    const dateVal = document.getElementById('record-date').value;
    const existingDayRecords = records.filter(r => r.techId === techId && r.date === dateVal && r.id !== window.editDocId);
    
    const incProd = (Number(document.getElementById('qty-domestic').value) || 0) +
                    (Number(document.getElementById('qty-replace').value) || 0) +
                    (Number(document.getElementById('qty-commercial').value) || 0) +
                    (Number(document.getElementById('qty-chimney').value) || 0) +
                    (Number(document.getElementById('qty-vent').value) || 0);

    if (isVacation && existingDayRecords.some(r => ((r.domestic||0)+(r.replace||0)+(r.commercial||0)+(r.chimney||0)+(r.vent||0)) > 0)) {
        alert("لا يمكن تسجيل إجازة! يوجد إنتاجية في نفس اليوم.");
        return;
    } 
    if (incProd > 0 && existingDayRecords.some(r => (r.vacation||0) > 0)) {
        alert("لا يمكن تسجيل إنتاجية! الفني مسجل كإجازة في هذا اليوم.");
        return;
    }

    const btn = recordForm.querySelector('button[type="submit"]');
    const bText = btn.textContent;
    btn.textContent = 'جاري...';
    btn.disabled = true;

    const newRecord = {
        techId: techId,
        date: dateVal,
        domestic: isVacation ? 0 : (Number(document.getElementById('qty-domestic').value) || 0),
        replace: isVacation ? 0 : (Number(document.getElementById('qty-replace').value) || 0),
        commercial: isVacation ? 0 : (Number(document.getElementById('qty-commercial').value) || 0),
        chimney: isVacation ? 0 : (Number(document.getElementById('qty-chimney').value) || 0),
        vent: isVacation ? 0 : (Number(document.getElementById('qty-vent').value) || 0),
        vacation: isVacation ? 1 : 0
    };

    try {
        if (isDemoMode) {
            const localData = JSON.parse(localStorage.getItem('demo_records') || '[]');
            if (window.editDocId) {
                const idx = localData.findIndex(x => x.id === window.editDocId);
                if(idx > -1) localData[idx] = { ...localData[idx], ...newRecord };
            } else {
                newRecord.id = Date.now().toString();
                localData.push(newRecord);
            }
            localStorage.setItem('demo_records', JSON.stringify(localData));
            window.editDocId = null;
            if (btn) btn.textContent = 'سجل الآن';
            fetchRecords();
            recordForm.reset();
            document.getElementById('qty-vacation').dispatchEvent(new Event('input'));
            document.getElementById('record-date').value = new Date().toISOString().slice(0, 10);
            return;
        }

        if (!db) throw new Error("DB Error");
        if (window.editDocId) {
            await db.collection("productivity_records").doc(window.editDocId).update(newRecord);
            window.editDocId = null;
        } else {
            newRecord.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("productivity_records").add(newRecord);
        }
        recordForm.reset();
        document.getElementById('qty-vacation').dispatchEvent(new Event('input'));
        document.getElementById('record-date').value = new Date().toISOString().slice(0, 10);
    } catch (err) {
        alert("فشل العملية.");
    } finally {
        btn.textContent = 'سجل الآن';
        btn.disabled = false;
    }
}

window.deleteRecord = async (docId) => {
    console.log("Attempting to delete record:", docId);
    
    if(currentUser.role === 'viewer') {
        alert("عذراً، لا تمتلك صلاحية الحذف بصفتك (مشاهد).");
        return;
    }

    const r = records.find(x => x.id === docId);
    if(!r) {
        console.error("Record not found locally:", docId, "Current records:", records);
        alert("خطأ: لم يتم العثور على السجل في الذاكرة المحلية للمتصفح. يرجى تحديث الصفحة والمحاولة مرة أخرى.");
        return;
    }

    // Permission check
    if(currentUser.role !== 'admin' && currentUser.id !== r.techId) {
        alert("ليس لديك صلاحية لحذف هذا السجل (يمكنك فقط حذف السجلات الخاصة بك).");
        return;
    }

    if(!confirm(`هل أنت متأكد من حذف هذا السجل؟\nالتاريخ: ${r.date}`)) return;

    try {
        if (isDemoMode) {
            const localData = JSON.parse(localStorage.getItem('demo_records') || '[]');
            const updated = localData.filter(rec => rec.id !== docId);
            localStorage.setItem('demo_records', JSON.stringify(updated));
            fetchRecords();
            return;
        }

        if (!db) throw new Error("Database not initialized");
        
        await db.collection("productivity_records").doc(docId).delete();
        console.log("Document successfully deleted.");
        // We don't need to call fetchRecords() because onSnapshot will update automatically
    } catch (err) {
        console.error("Firebase Delete Error:", err);
        alert("فشل الحذف من قاعدة البيانات: " + err.message);
    }
};

function handleExportExcel() {
    if(records.length === 0) return;
    const excelData = records.map(rec => {
        const tech = TECH_DATA[rec.techId];
        return { "الاسم": tech.name, "التاريخ": rec.date, "الإنجاز": calculateMonthlyStats([rec], tech.type).done };
    });
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `Report.xlsx`);
}

async function showReportModal() {
    if (reportModal) reportModal.classList.remove('hidden');
    const activeTab = document.querySelector('.report-tab.active');
    if (activeTab) fetchReportData(activeTab.dataset.type);
}

async function fetchReportData(type) {
    if (reportTbody) reportTbody.innerHTML = `<tr><td colspan="7">جاري...</td></tr>`;
    let reportRecords = [];
    let months = 1;

    if (type === 'month') {
        reportRecords = [...records];
    } else {
        const year = currentMonth.split('-')[0];
        if (isDemoMode) {
            reportRecords = JSON.parse(localStorage.getItem('demo_records') || '[]').filter(r => r.date.startsWith(year));
        } else {
            const snaps = await db.collection("productivity_records").where("date", ">=", `${year}-01-01`).where("date", "<=", `${year}-12-31`).get();
            snaps.forEach(doc => reportRecords.push({ id: doc.id, ...doc.data() }));
        }
        months = 12;
    }
    renderReportTable(reportRecords, type, months);
}

function renderReportTable(data, type, months) {
    if (!reportTbody || !podiumContainer) return;
    
    const techs = Object.keys(TECH_DATA).map(id => {
        const tech = TECH_DATA[id];
        const stats = calculateMonthlyStats(data.filter(r => r.techId === id), tech.type);
        const target = tech.target * months;
        return { ...tech, stats, percentage: Math.round((stats.done / target) * 100), target };
    }).sort((a,b) => b.percentage - a.percentage);

    // Render Podium
    podiumContainer.innerHTML = '';
    const top3 = techs.slice(0, 3);
    const medals = ['🏆', '🥈', '🥉'];
    
    top3.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = `podium-card rank-${i+1}`;
        card.innerHTML = `
            <div class="medal-badge">${medals[i]}</div>
            <div class="podium-avatar">${t.name.charAt(0)}</div>
            <span class="podium-name">${t.name}</span>
            <span class="podium-percentage">${t.percentage}%</span>
            <div class="podium-stats">${t.stats.done} من ${t.target}</div>
        `;
        podiumContainer.appendChild(card);
    });

    // Render Table
    reportTbody.innerHTML = '';
    techs.forEach((t, i) => {
        const tr = document.createElement('tr');
        if (i < 3) tr.className = `top-rank-${i+1}`;
        
        let rankDisplay = i + 1;
        if (i === 0) rankDisplay = '🥇';
        if (i === 1) rankDisplay = '🥈';
        if (i === 2) rankDisplay = '🥉';

        tr.innerHTML = `
            <td><div class="rank-badge">${rankDisplay}</div></td>
            <td><strong>${t.name}</strong></td>
            <td>${t.type}</td>
            <td>${t.stats.done}</td>
            <td>${t.target}</td>
            <td><span class="badge" style="background:${t.percentage >= 100 ? '#2ecc71' : '#e67e22'}">${t.percentage}%</span></td>
            <td>${t.stats.rawVacation}</td>
        `;
        reportTbody.appendChild(tr);
    });
}

init();
