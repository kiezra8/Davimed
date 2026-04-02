document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const facilitiesContainer = document.getElementById('facilities-container');
    const addFacilityBtn = document.getElementById('add-facility-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const saveReportBtn = document.getElementById('save-report-btn');
    const reportDateInput = document.getElementById('report-date');
    const reportAreaInput = document.getElementById('report-area');
    const reportConclusionInput = document.getElementById('report-conclusion');
    const facilityCountSpan = document.getElementById('facility-count');
    const historyBtn = document.getElementById('view-history-btn');
    const historyOverlay = document.getElementById('history-overlay');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyList = document.getElementById('history-list');

    // Templates
    const facilityTemplate = document.getElementById('facility-template');
    const doctorTemplate = document.getElementById('doctor-template');

    // State
    let facilities = [];

    // Initialize Default Date
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    reportDateInput.value = dateFormatted;

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

    // --- Saving & History (Local Storage) ---
    function saveToHistory() {
        const report = compileReportData();
        if (!report.facilities.length) return alert("Please add at least one facility.");

        let history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        history.unshift({ ...report, savedAt: new Date().toISOString() });
        localStorage.setItem('davimed_history', JSON.stringify(history.slice(0, 50))); // Keep last 50
        alert("Report saved to history!");
    }

    function compileReportData() {
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

        return {
            date: reportDateInput.value,
            area: reportAreaInput.value,
            conclusion: reportConclusionInput.value,
            facilities: facs
        };
    }

    // --- History View ---
    historyBtn.onclick = () => {
        const history = JSON.parse(localStorage.getItem('davimed_history') || '[]');
        historyList.innerHTML = history.length ? '' : '<p class="text-secondary">No saved reports found.</p>';
        
        history.forEach((rep, idx) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="flex-between">
                    <strong>${rep.date || 'Unnamed Date'}</strong>
                    <span class="badge">${rep.facilities.length} Facs</span>
                </div>
                <p class="text-secondary small mb-2">${rep.area || 'Unknown Area'}</p>
                <div class="flex-between mt-2">
                    <button class="btn-text btn-load-hist" data-idx="${idx}">Load Report</button>
                    <button class="btn-icon-sm text-danger btn-del-hist" data-idx="${idx}"><i class="ph ph-trash"></i></button>
                    <button class="btn-text btn-pdf-hist" data-idx="${idx}">Download PDF</button>
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
            if (confirm("Delete this report from history?")) {
                history.splice(idx, 1);
                localStorage.setItem('davimed_history', JSON.stringify(history));
                historyBtn.click(); // Redraw
            }
        } else if (e.target.classList.contains('btn-pdf-hist')) {
             generatePDF(report);
        }
    });

    function loadReport(data) {
        reportDateInput.value = data.date;
        reportAreaInput.value = data.area;
        reportConclusionInput.value = data.conclusion;
        facilitiesContainer.innerHTML = '';
        data.facilities.forEach(fac => {
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
    }

    // --- PDF Generation (Organized format) ---
    function generatePDF(data = null) {
        const report = data || compileReportData();
        const pdfContent = document.getElementById('pdf-body');
        document.getElementById('pdf-date').innerText = report.date || 'N/A';
        document.getElementById('pdf-area').innerText = report.area || 'N/A';
        document.getElementById('pdf-conclusion-text').innerText = report.conclusion || 'No conclusion provided.';

        pdfContent.innerHTML = '';
        report.facilities.forEach((fac, idx) => {
            const facDiv = document.createElement('div');
            facDiv.className = 'pdf-fac';
            facDiv.innerHTML = `
                <div class="pdf-fac-name">FACILITY #${idx + 1}: ${fac.name.toUpperCase() || 'UNTITLED'} (${fac.type})</div>
                ${fac.people.map((p, pIdx) => `
                    <div class="pdf-doc-row">
                        <p><strong>Person ${pIdx + 1}:</strong> ${p.name || 'Not specified'}</p>
                        <p><strong>Phone:</strong> ${p.phone || 'N/A'}</p>
                        <p><strong>Remarks:</strong> ${p.remarks || 'No remarks recorded.'}</p>
                    </div>
                `).join('')}
            `;
            pdfContent.appendChild(facDiv);
        });

        const element = document.getElementById('pdf-template').cloneNode(true);
        element.style.display = 'block';
        
        const opt = {
            margin:       [10, 10],
            filename:     `Davimed_Report_${report.date.replace(/ /g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 1 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2canvas = null; // Ensuring no conflict
        html2pdf().set(opt).from(element).save();
    }

    exportPdfBtn.onclick = () => generatePDF();
    saveReportBtn.onclick = saveToHistory;
});
