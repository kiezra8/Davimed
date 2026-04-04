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
            
            // AUTOMATIC GENERATION: If weekly fields are empty, sync from daily history automatically.
            if (!weeklyAreas.value.trim() && !weeklyFacilitiesSummary.value.trim()) {
                syncWeeklyFromDaily(true); // silent sync
            }
        }
    }

    // --- AGGREGATION LOGIC (Smart Sync) ---
    function syncWeeklyFromDaily(silent = false) {
        const history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        const dailyReports = history.filter(r => r.type === 'daily');

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

        if (!thisWeekReports.length) {
            if (silent) return; // Don't annoy with confirm dialog on tab switch
            if (!confirm("No daily reports found from the last 7 days. Pull from all available daily history instead?")) return;
        }

        const reportsToUse = thisWeekReports.length ? thisWeekReports : dailyReports;

        // Data processing
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
    }

    autoGenerateBtn.onclick = () => syncWeeklyFromDaily(false);

    // --- Facility Logic ---
    function addFacility() {
        const facId = Date.now();
        const clone = facilityTemplate.content.cloneNode(true);
        const card = clone.querySelector('.facility-card');
        card.dataset.id = facId;

        // Numbering
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

    // --- Saving & History ---
    function saveToHistory() {
        const report = compileReportData();
        let history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        history.unshift({ ...report, savedAt: new Date().toISOString() });
        localStorage.setItem('davimed_history', JSON.stringify(history.slice(0, 50)));
        alert("Report saved to history!");
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

    // --- History View ---
    historyBtn.onclick = () => {
        const history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        historyList.innerHTML = history.length ? '' : '<p class="text-secondary">No saved reports found.</p>';
        
        history.forEach((rep, idx) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            const subtitle = rep.type === 'daily' ? (rep.area || 'Unknown Area') : 'Weekly Summary';
            div.innerHTML = `
                <div class="flex-between">
                    <strong>${rep.date || 'No Date'} (${rep.type || 'daily'})</strong>
                </div>
                <p class="text-secondary small mb-2">${subtitle}</p>
                <div class="flex-between mt-2">
                    <button class="btn-text btn-load-hist" data-idx="${idx}">Load</button>
                    <button class="btn-icon-sm text-danger btn-del-hist" data-idx="${idx}"><i class="ph ph-trash"></i></button>
                    <button class="btn-text btn-pdf-hist" data-idx="${idx}">PDF</button>
                </div>
            `;
            historyList.appendChild(div);
        });
        historyOverlay.classList.add('active');
    };

    closeHistoryBtn.onclick = () => historyOverlay.classList.remove('active');

    historyList.addEventListener('click', (e) => {
        const idx = e.target.closest('button')?.dataset.idx;
        if (idx === undefined) return;
        const history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        const report = history[parseInt(idx)];

        if (e.target.classList.contains('btn-load-hist')) {
            loadReport(report);
            historyOverlay.classList.remove('active');
        } else if (e.target.classList.contains('btn-del-hist')) {
            if (confirm("Delete?")) {
                history.splice(idx, 1);
                localStorage.setItem('davimed_history', JSON.stringify(history));
                historyBtn.click();
            }
        } else if (e.target.classList.contains('btn-pdf-hist')) {
             generatePDF(report);
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
        const pdfSections = document.getElementById('pdf-sections');
        const pdfBody = document.getElementById('pdf-body');
        
        document.getElementById('pdf-date').innerText = report.date || 'N/A';
        document.getElementById('pdf-subtitle').innerText = report.type === 'daily' ? 'DAILY FIELD REPORT' : 'WEEKLY PERFORMANCE REPORT';
        document.getElementById('pdf-conclusion-text').innerText = report.conclusion || 'No conclusion provided.';
        
        const areaRow = document.getElementById('pdf-area-row');
        pdfSections.innerHTML = '';
        pdfBody.innerHTML = '';

        if (report.type === 'daily') {
            areaRow.style.display = 'block';
            document.getElementById('pdf-area').innerText = report.area || 'N/A';
            
            (report.facilities || []).forEach((fac, idx) => {
                const facDiv = document.createElement('div');
                facDiv.className = 'pdf-fac';
                facDiv.innerHTML = `
                    <div class="pdf-fac-name">FACILITY #${idx + 1}: ${fac.name.toUpperCase()} (${fac.type})</div>
                    ${fac.people.map((p, pIdx) => `
                        <div class="pdf-doc-row">
                            <p><strong>Person ${pIdx + 1}:</strong> ${p.name || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${p.phone || 'N/A'}</p>
                            <p><strong>Remarks:</strong> ${p.remarks || 'N/A'}</p>
                        </div>
                    `).join('')}
                `;
                pdfBody.appendChild(facDiv);
            });
        } else {
            areaRow.style.display = 'none';
            const w = report.weeklyData;
            const sections = [
                { label: 'MAJOR AREAS COVERED', value: w.majorAreas },
                { label: 'FACILITIES COVERED', value: w.facilitiesSummary },
                { label: 'PROMISED ORDERS', value: w.promised },
                { label: 'ORDERS MADE', value: w.orders },
                { label: 'TASK EVALUATION', value: w.tasks },
                { label: 'DOCTORS MET & CONTACT NUMBERS', value: w.doctors },
                { label: 'PAYMENT RECOVERY', value: w.payments }
            ];

            sections.forEach(s => {
                const sDiv = document.createElement('div');
                sDiv.style.marginBottom = '20px';
                sDiv.innerHTML = `<div style="background:#f0f0f0; padding:5px; font-weight:bold; border-bottom:1px solid #000">${s.label}</div>
                                  <p style="padding:10px; font-size:14px; white-space:pre-wrap">${s.value || 'N/A'}</p>`;
                pdfSections.appendChild(sDiv);
            });
        }

        const element = document.getElementById('pdf-template').cloneNode(true);
        element.style.display = 'block';
        
        const opt = {
            margin: [10, 10],
            filename: `Davimed_${report.type}_Report_${report.date.replace(/ /g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    }

    // --- WhatsApp Sharing ---
    function shareToWhatsApp() {
        const report = compileReportData();
        let message = `*DAVIMED ${report.type.toUpperCase()} REPORT*\n`;
        message += `Date: ${report.date}\n`;
        
        if (report.type === 'daily') {
            message += `Area: ${report.area}\n`;
            message += `Facilities: ${report.facilities.length}\n\n`;
            report.facilities.forEach((f, i) => {
                message += `${i+1}. ${f.name} (${f.type})\n`;
            });
        } else {
            const w = report.weeklyData;
            message += `\n*Major Areas:* ${w.majorAreas}\n`;
            message += `*Facilities:* ${w.facilitiesSummary}\n`;
            message += `*Promised Orders:* ${w.promised}\n`;
            message += `*Orders Made:* ${w.orders}\n`;
            message += `*Task Evaluation:* ${w.tasks}\n`;
            message += `*Doctors & Contacts:* ${w.doctors}\n`;
            message += `*Payment Recovery:* ${w.payments}\n`;
        }
        
        message += `\n*Conclusion:* ${report.conclusion}\n\n`;
        message += `_Note: Please attach the generated PDF report to this message._`;

        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }

    exportPdfBtn.onclick = () => generatePDF();
    whatsappBtn.onclick = shareToWhatsApp;
    saveReportBtn.onclick = saveToHistory;
});
