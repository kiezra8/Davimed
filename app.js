// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBbc2vDFdjQPVksaHCtgxXoETHjVIKwku4",
  authDomain: "davimed-b7c99.firebaseapp.com",
  projectId: "davimed-b7c99",
  storageBucket: "davimed-b7c99.firebasestorage.app",
  messagingSenderId: "1050199232126",
  appId: "1:1050199232126:web:cc510322decec04cae922f",
  measurementId: "G-05MC3E1EKT"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const facilitiesContainer = document.getElementById('facilities-container');
    const addFacilityBtn = document.getElementById('add-facility-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const whatsappBtn = document.getElementById('whatsapp-btn');
    const saveReportBtn = document.getElementById('save-report-btn');
    const reportDateInput = document.getElementById('report-date');
    const reportAreaInput = document.getElementById('report-area');
    const reportConclusionInput = document.getElementById('report-conclusion');
    const facilityCountSpan = document.getElementById('facility-count');
    const historyBtn = document.getElementById('view-history-btn');
    const historyOverlay = document.getElementById('history-overlay');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');

    // Type Switcher Elements
    const dailyBtn = document.getElementById('daily-btn');
    const weeklyBtn = document.getElementById('weekly-btn');
    const generalInfoTitle = document.getElementById('general-info-title');
    const weeklySections = document.getElementById('weekly-sections');
    const workAreaGroup = document.getElementById('work-area-group');
    const autoGenerateBtn = document.getElementById('auto-generate-weekly-btn');

    // Weekly Form Fields
    const weeklyAreas = document.getElementById('weekly-areas');
    const weeklyFacilitiesSummary = document.getElementById('weekly-facilities-summary');
    const weeklyPromised = document.getElementById('weekly-promised');
    const weeklyOrders = document.getElementById('weekly-orders');
    const weeklyTasks = document.getElementById('weekly-tasks');
    const weeklyDoctors = document.getElementById('weekly-doctors');
    const weeklyPayments = document.getElementById('weekly-payments');

    // Templates
    const facilityTemplate = document.getElementById('facility-template');
    const doctorTemplate = document.getElementById('doctor-template');

    // State
    let currentType = 'daily';

    // Initialize Default Date
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    reportDateInput.value = dateFormatted;

    // --- Report Type logic ---
    dailyBtn.onclick = () => switchReportType('daily');
    weeklyBtn.onclick = () => switchReportType('weekly');

    function switchReportType(type) {
        currentType = type;
        if (type === 'daily') {
            dailyBtn.classList.add('active');
            weeklyBtn.classList.remove('active');
            generalInfoTitle.innerText = "Daily Field Report";
            weeklySections.classList.add('hidden');
            workAreaGroup.classList.remove('hidden');
            document.getElementById('facilities-list-section').classList.remove('hidden');
        } else {
            weeklyBtn.classList.add('active');
            dailyBtn.classList.remove('active');
            generalInfoTitle.innerText = "Weekly Performance Report";
            weeklySections.classList.remove('hidden');
            workAreaGroup.classList.add('hidden');
            document.getElementById('facilities-list-section').classList.add('hidden');
            
            // AUTOMATIC GENERATION: If weekly fields are empty, sync from daily history
            if (!weeklyAreas.value.trim() && !weeklyFacilitiesSummary.value.trim()) {
                syncWeeklyFromDaily(true);
            }
        }
    }

    // --- AGGREGATION LOGIC (Smart Sync) ---
    async function syncWeeklyFromDaily(silent = false) {
        // Fetch from Firebase for most accurate sync
        try {
            const snapshot = await db.collection("reports")
                .where("type", "==", "daily")
                .orderBy("savedAt", "desc")
                .limit(20)
                .get();
            
            const dailyReports = [];
            snapshot.forEach(doc => dailyReports.push(doc.data()));

            if (!dailyReports.length) {
                if (!silent) alert("No daily reports found in history to sync data from.");
                return;
            }

            // Filter for last 7 days from now
            const now = new Date();
            const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
            const thisWeekReports = dailyReports.filter(r => {
                const saveDate = r.savedAt ? new Date(r.savedAt).getTime() : 0;
                return saveDate >= oneWeekAgo;
            });

            const reportsToUse = thisWeekReports.length ? thisWeekReports : dailyReports;

            const areasSet = new Set();
            const facilitiesSet = new Set();
            const doctorsArr = [];
            let totalCount = 0;

            reportsToUse.forEach(r => {
                if (r.area) areasSet.add(r.area);
                (r.facilities || []).forEach(f => {
                    if (f.name) facilitiesSet.add(f.name);
                    (f.people || []).forEach(p => {
                        if (p.name) doctorsArr.push(`${p.name}${p.phone ? ' (' + p.phone + ')' : ''}`);
                    });
                    totalCount++;
                });
            });

            weeklyAreas.value = Array.from(areasSet).join(', ');
            weeklyFacilitiesSummary.value = `Visited ${totalCount} facilities:\n${Array.from(facilitiesSet).join(', ')}`;
            weeklyDoctors.value = Array.from(new Set(doctorsArr)).join('\n');
            
            if (!silent) alert(`Successfully synced data from ${reportsToUse.length} daily report(s).`);
        } catch (e) {
            console.error(e);
            if (!silent) alert("Failed to sync from Firebase. Please check your connection.");
        }
    }

    autoGenerateBtn.onclick = () => syncWeeklyFromDaily(false);

    // --- Facility Logic ---
    function addFacility() {
        const facId = Date.now();
        const clone = facilityTemplate.content.cloneNode(true);
        const card = clone.querySelector('.facility-card');
        card.dataset.id = facId;

        updateIndices();

        // Remove Facility
        clone.querySelector('.remove-fac-btn').onclick = () => {
            card.remove();
            updateIndices();
        };

        // Add Doctor
        const doctorsContainer = clone.querySelector('.doctors-container');
        clone.querySelector('.add-doc-btn').onclick = () => addDoctor(doctorsContainer);

        // Initial Doctor
        addDoctor(doctorsContainer);

        facilitiesContainer.appendChild(clone);
        updateIndices();
    }

    function addDoctor(container) {
        const clone = doctorTemplate.content.cloneNode(true);
        const docCard = clone.querySelector('.doctor-subcard');
        
        clone.querySelector('.remove-doc-btn').onclick = () => {
            if (container.children.length > 1) {
                docCard.remove();
                updateDocIndices(container);
            }
        };

        container.appendChild(clone);
        updateDocIndices(container);
    }

    function updateIndices() {
        const cards = facilitiesContainer.querySelectorAll('.facility-card');
        cards.forEach((card, idx) => {
            card.querySelector('.fac-idx').textContent = idx + 1;
        });
        facilityCountSpan.textContent = `${cards.length} Facilities`;
    }

    function updateDocIndices(container) {
        const docSubcards = container.querySelectorAll('.doctor-subcard');
        docSubcards.forEach((card, idx) => {
            card.querySelector('.doc-idx').textContent = idx + 1;
        });
    }

    // Start with 1 facility
    addFacility();
    addFacilityBtn.onclick = addFacility;

    // --- FIREBASE SAVING ---
    async function saveToFirebase() {
        saveReportBtn.disabled = true;
        saveReportBtn.innerHTML = '<i class="ph ph-spinner-gap spin"></i> Saving...';
        
        const report = compileReportData();
        const reportWithTimestamp = { ...report, savedAt: new Date().toISOString() };

        try {
            await db.collection("reports").add(reportWithTimestamp);
            alert("Report saved securely to Firebase!");
        } catch (e) {
            console.error(e);
            alert("Warning: Firebase cloud save failed. Saving locally instead.");
            // Local fallback
            let localHistory = JSON.parse(localStorage.getItem('davimed_history') || '[]');
            localHistory.unshift(reportWithTimestamp);
            localStorage.setItem('davimed_history', JSON.stringify(localHistory.slice(0, 50)));
        } finally {
            saveReportBtn.disabled = false;
            saveReportBtn.innerHTML = '<i class="ph ph-floppy-disk"></i> Save';
        }
    }

    function compileReportData() {
        const data = {
            type: currentType,
            date: reportDateInput.value,
            conclusion: reportConclusionInput.value
        };

        if (currentType === 'daily') {
            data.area = reportAreaInput.value;
            const facCards = facilitiesContainer.querySelectorAll('.facility-card');
            const facs = [];
            facCards.forEach(card => {
                const docCards = card.querySelectorAll('.doctor-subcard');
                const docs = [];
                docCards.forEach(docCard => {
                    docs.push({
                        name: docCard.querySelector('.doc-name').value.trim(),
                        phone: docCard.querySelector('.doc-phone').value.trim(),
                        remarks: docCard.querySelector('.doc-remarks').value.trim()
                    });
                });
                facs.push({
                    name: card.querySelector('.fac-name').value.trim(),
                    type: card.querySelector('.fac-type').value,
                    people: docs
                });
            });
            data.facilities = facs;
        } else {
            data.weeklyData = {
                majorAreas: weeklyAreas.value.trim(),
                facilitiesSummary: weeklyFacilitiesSummary.value.trim(),
                promised: weeklyPromised.value.trim(),
                orders: weeklyOrders.value.trim(),
                tasks: weeklyTasks.value.trim(),
                doctors: weeklyDoctors.value.trim(),
                payments: weeklyPayments.value.trim()
            };
        }
        return data;
    }

    // --- History View (FIREBASE) ---
    historyBtn.onclick = async () => {
        historyList.innerHTML = '<p class="text-secondary">Fetching reports from cloud...</p>';
        historyOverlay.classList.add('active');

        try {
            const snapshot = await db.collection("reports").orderBy("savedAt", "desc").limit(50).get();
            const history = [];
            snapshot.forEach(doc => history.push({ id: doc.id, ...doc.data() }));

            historyList.innerHTML = history.length ? '' : '<p class="text-secondary">No cloud reports found.</p>';
            
            history.forEach((rep) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                const subtitle = rep.type === 'daily' ? (rep.area || 'Unknown Area') : 'Weekly Summary';
                div.innerHTML = `
                    <div class="flex-between">
                        <strong>${rep.date || 'No Date'} (${rep.type || 'daily'})</strong>
                    </div>
                    <p class="text-secondary small mb-2">${subtitle}</p>
                    <div class="flex-between mt-2">
                        <button class="btn-text btn-load-hist" data-id="${rep.id}">Load</button>
                        <button class="btn-icon-sm text-danger btn-del-hist" data-id="${rep.id}"><i class="ph ph-trash"></i></button>
                        <button class="btn-text btn-pdf-hist" data-id="${rep.id}">PDF</button>
                    </div>
                `;
                historyList.appendChild(div);
            });
        } catch (e) {
            console.error(e);
            historyList.innerHTML = '<p class="text-danger">Failed to fetch from cloud. Checking local history...</p>';
            loadLocalHistory();
        }
    };

    function loadLocalHistory() {
        const history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        historyList.innerHTML = history.length ? '' : '<p class="text-secondary">No saved reports found locally.</p>';
        history.forEach((rep, idx) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            const subtitle = rep.type === 'daily' ? (rep.area || 'Unknown Area') : 'Weekly Summary';
            div.innerHTML = `
                <div class="flex-between">
                    <strong>${rep.date || 'No Date'} (${rep.type || 'local'})</strong>
                </div>
                <p class="text-secondary small mb-2">${subtitle}</p>
                <div class="flex-between mt-2">
                    <button class="btn-text btn-load-hist-local" data-idx="${idx}">Load</button>
                    <button class="btn-icon-sm text-danger btn-del-hist-local" data-idx="${idx}"><i class="ph ph-trash"></i></button>
                    <button class="btn-text btn-pdf-hist-local" data-idx="${idx}">PDF</button>
                </div>
            `;
            historyList.appendChild(div);
        });
    }

    closeHistoryBtn.onclick = () => historyOverlay.classList.remove('active');

    historyList.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const cloudId = btn.dataset.id;
        const localIdx = btn.dataset.idx;

        if (cloudId) {
            const doc = await db.collection("reports").doc(cloudId).get();
            const report = doc.data();

            if (btn.classList.contains('btn-load-hist')) {
                loadReport(report);
                historyOverlay.classList.remove('active');
            } else if (btn.classList.contains('btn-del-hist')) {
                if (confirm("Permanently delete from cloud?")) {
                    await db.collection("reports").doc(cloudId).delete();
                    historyBtn.click();
                }
            } else if (btn.classList.contains('btn-pdf-hist')) {
                 generatePDF(report);
            }
        } else if (localIdx !== undefined) {
             const history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
             const report = history[parseInt(localIdx)];
             if (btn.classList.contains('btn-load-hist-local')) {
                loadReport(report);
                historyOverlay.classList.remove('active');
             } else if (btn.classList.contains('btn-del-hist-local')) {
                 history.splice(localIdx, 1);
                 localStorage.setItem('davimed_history', JSON.stringify(history));
                 loadLocalHistory();
             } else if (btn.classList.contains('btn-pdf-hist-local')) {
                 generatePDF(report);
             }
        }
    });

    function loadReport(data) {
        switchReportType(data.type || 'daily');
        reportDateInput.value = data.date;
        reportConclusionInput.value = data.conclusion;

        if (data.type === 'daily') {
            reportAreaInput.value = data.area || '';
            facilitiesContainer.innerHTML = '';
            (data.facilities || []).forEach(fac => {
                addFacility();
                const lastFac = facilitiesContainer.lastElementChild;
                lastFac.querySelector('.fac-name').value = fac.name;
                lastFac.querySelector('.fac-type').value = fac.type;
                const docContainer = lastFac.querySelector('.doctors-container');
                docContainer.innerHTML = '';
                fac.people.forEach(person => {
                    addDoctor(docContainer);
                    const lastDoc = docContainer.lastElementChild;
                    lastDoc.querySelector('.doc-name').value = person.name;
                    lastDoc.querySelector('.doc-phone').value = person.phone;
                    lastDoc.querySelector('.doc-remarks').value = person.remarks;
                });
                updateDocIndices(docContainer);
            });
            updateIndices();
        } else if (data.weeklyData) {
            weeklyAreas.value = data.weeklyData.majorAreas || '';
            weeklyFacilitiesSummary.value = data.weeklyData.facilitiesSummary || '';
            weeklyPromised.value = data.weeklyData.promised || '';
            weeklyOrders.value = data.weeklyData.orders || '';
            weeklyTasks.value = data.weeklyData.tasks || '';
            weeklyDoctors.value = data.weeklyData.doctors || '';
            weeklyPayments.value = data.weeklyData.payments || '';
        }
    }

    // --- PDF Generation ---
    function generatePDF(data = null) {
        const report = data || compileReportData();
        
        // Create a temporary container for PDF rendering
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '210mm'; // A4 width
        document.body.appendChild(tempContainer);

        const pdfHTML = `
            <div class="pdf-report" style="background: white; padding: 20mm; min-height: 297mm; color: #111; font-family: 'Inter', sans-serif;">
                <div style="text-align: center; border-bottom: 2px solid #0A3A6A; margin-bottom: 20px; padding-bottom: 15px;">
                    <h1 style="font-family: 'Playfair Display', serif; color: #0A3A6A; font-size: 32px; margin: 0;">DAVIMED</h1>
                    <p style="text-transform: uppercase; letter-spacing: 2px; font-weight: 600; margin-top: 5px; color: #0076D6;">${report.type === 'daily' ? 'DAILY FIELD REPORT' : 'WEEKLY PERFORMANCE REPORT'}</p>
                    
                    <div style="display: flex; justify-content: space-between; margin-top: 15px; font-size: 14px; text-align: left;">
                        <p><strong>Date:</strong> <span>${report.date || 'N/A'}</span></p>
                        ${report.type === 'daily' ? `<p><strong>Area:</strong> <span>${report.area || 'N/A'}</span></p>` : ''}
                    </div>
                </div>

                <div id="pdf-content-body">
                    ${report.type === 'daily' ? 
                        (report.facilities || []).map((fac, idx) => `
                            <div class="pdf-fac" style="margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                                <div style="background: #f8fafc; padding: 10px 15px; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 16px; color: #0A3A6A;">
                                    FACILITY #${idx + 1}: ${fac.name.toUpperCase()} (${fac.type})
                                </div>
                                <div style="padding: 15px;">
                                    ${fac.people.map((p, pIdx) => `
                                        <div style="margin-bottom: 15px; padding-left: 15px; border-left: 3px solid #0076D6; page-break-inside: avoid;">
                                            <p style="margin-bottom: 5px;"><strong>Person ${pIdx + 1}:</strong> ${p.name || 'N/A'}</p>
                                            <p style="margin-bottom: 5px;"><strong>Phone:</strong> ${p.phone || 'N/A'}</p>
                                            <p style="margin-bottom: 0; color: #475569; font-style: italic;">" ${p.remarks || 'No remarks recorded.'} "</p>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')
                        : 
                        `
                        <div style="margin-bottom: 20px;">
                            ${[
                                { label: 'MAJOR AREAS COVERED', value: report.weeklyData.majorAreas },
                                { label: 'FACILITIES COVERED', value: report.weeklyData.facilitiesSummary },
                                { label: 'PROMISED ORDERS', value: report.weeklyData.promised },
                                { label: 'ORDERS MADE', value: report.weeklyData.orders },
                                { label: 'TASK EVALUATION', value: report.weeklyData.tasks },
                                { label: 'DOCTORS MET & CONTACT NUMBERS', value: report.weeklyData.doctors },
                                { label: 'PAYMENT RECOVERY', value: report.weeklyData.payments }
                            ].map(s => `
                                <div style="margin-bottom: 15px; page-break-inside: avoid;">
                                    <div style="background: #eff6ff; padding: 8px 12px; font-weight: bold; border-left: 4px solid #0076D6; color: #0A3A6A; font-size: 14px;">${s.label}</div>
                                    <p style="padding: 12px; font-size: 14px; white-space: pre-wrap; margin: 0; color: #1e293b; background: #fff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 4px 4px;">${s.value || 'N/A'}</p>
                                </div>
                            `).join('')}
                        </div>
                        `
                    }
                </div>

                <div style="margin-top: 30px; border-top: 2px solid #0A3A6A; padding-top: 15px; page-break-inside: avoid;">
                    <h3 style="font-size: 16px; color: #0A3A6A; margin-bottom: 10px;">General Conclusion:</h3>
                    <p style="font-size: 14px; color: #1e293b; line-height: 1.6;">${report.conclusion || 'No conclusion provided.'}</p>
                </div>

                <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                    Generated by Davimed Pro Reporting System • ${new Date().toLocaleDateString()}
                </div>
            </div>
        `;

        tempContainer.innerHTML = pdfHTML;
        
        const opt = {
            margin: [0, 0, 0, 0], // Margins handled in CSS padding
            filename: `Davimed_${report.type}_Report_${report.date.replace(/ /g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Pre-load fonts or wait a bit if needed, then generate
        html2pdf().set(opt).from(tempContainer).toPdf().get('pdf').then(function (pdf) {
            // Clean up
            document.body.removeChild(tempContainer);
        }).save();
    }

    // --- WhatsApp Sharing ---
    function shareToWhatsApp() {
        const report = compileReportData();
        let message = `*DAVIMED ${report.type.toUpperCase()} REPORT*\n`;
        message += `📅 *Date:* ${report.date}\n`;
        
        if (report.type === 'daily') {
            message += `📍 *Area:* ${report.area}\n`;
            message += `🏥 *Facilities Visited:* ${report.facilities.length}\n\n`;
            
            report.facilities.forEach((f, i) => {
                message += `🏨 *${i+1}. ${f.name.toUpperCase()}* (${f.type})\n`;
                if (f.people && f.people.length > 0) {
                    f.people.forEach((p, pi) => {
                        message += `👤 _Person ${pi+1}:_ ${p.name || 'N/A'} - ${p.phone || 'N/A'}\n`;
                        if (p.remarks) message += `💬 _Notes:_ ${p.remarks}\n`;
                    });
                }
                message += `\n`;
            });
        } else {
            const w = report.weeklyData;
            message += `\n📍 *Major Areas:* ${w.majorAreas || 'N/A'}\n`;
            message += `🏥 *Facilities:* ${w.facilitiesSummary || 'N/A'}\n`;
            message += `🤝 *Promised Orders:* ${w.promised || 'N/A'}\n`;
            message += `🛍️ *Orders Made:* ${w.orders || 'N/A'}\n`;
            message += `📋 *Task Evaluation:* ${w.tasks || 'N/A'}\n`;
            message += `🩺 *Doctors & Contacts:* ${w.doctors || 'N/A'}\n`;
            message += `💰 *Payment Recovery:* ${w.payments || 'N/A'}\n`;
        }
        
        message += `\n📝 *Conclusion:* ${report.conclusion || 'N/A'}\n\n`;
        message += `_Report generated by Davimed Pro Reporting_`;

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }

    exportPdfBtn.onclick = () => generatePDF();
    whatsappBtn.onclick = shareToWhatsApp;
    saveReportBtn.onclick = saveToFirebase;
});
