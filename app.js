document.addEventListener('DOMContentLoaded', () => {
    const entriesContainer = document.getElementById('entries-container');
    const addEntryBtn = document.getElementById('add-entry-btn');
    const generateBtn = document.getElementById('generate-whatsapp-btn');
    const entryTemplate = document.getElementById('entry-template');
    const reportDateInput = document.getElementById('report-date');
    const reportAreaInput = document.getElementById('report-area');
    const conclusionInput = document.getElementById('report-conclusion');
    const visitCounter = document.getElementById('visit-counter');
    
    let entryCount = 0;
    const WHATSAPP_NUMBER = '256702370441';

    // Auto Set Date Format
    function setDefaultDate() {
        const date = new Date();
        const suffixes = ["th", "st", "nd", "rd"];
        const day = date.getDate();
        const relevantDigits = (day < 30) ? day % 20 : day % 30;
        const suffix = (relevantDigits <= 3) ? suffixes[relevantDigits] : suffixes[0];
        
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();

        reportDateInput.value = `${day}${suffix}, ${month} ${year}`;
    }
    setDefaultDate();

    // Adds a new card entry
    function addEntry() {
        entryCount++;
        const clone = entryTemplate.content.cloneNode(true);
        const entryCard = clone.querySelector('.entry-card');
        
        // Update labels
        entryCard.setAttribute('data-id', entryCount);
        clone.querySelector('.entry-number').textContent = entryCount;
        
        // Remove Functionality
        const removeBtn = clone.querySelector('.remove-entry-btn');
        removeBtn.addEventListener('click', () => {
            entryCard.remove();
            updateEntryNumbers();
        });

        const firstInput = clone.querySelector('.input-facility');
        entriesContainer.appendChild(clone);
        
        updateCounterUI(entriesContainer.children.length);

        // Smooth scroll focus
        setTimeout(() => {
            firstInput.focus();
            entryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }

    // Recalculates indices after deletion
    function updateEntryNumbers() {
        const cards = entriesContainer.querySelectorAll('.entry-card');
        entryCount = 0;
        cards.forEach((card, index) => {
            entryCount = index + 1;
            card.querySelector('.entry-number').textContent = entryCount;
            card.setAttribute('data-id', entryCount);
        });
        updateCounterUI(cards.length);
    }

    function updateCounterUI(count) {
        visitCounter.textContent = `${count} ${count === 1 ? 'Facility' : 'Facilities'}`;
    }

    // Start with 1 entry
    addEntry();

    addEntryBtn.addEventListener('click', addEntry);

    // Generation Logic
    generateBtn.addEventListener('click', () => {
        const dateVal = reportDateInput.value.trim();
        const areaVal = reportAreaInput.value.trim();
        const conclusion = conclusionInput.value.trim();
        const cards = entriesContainer.querySelectorAll('.entry-card');

        if (cards.length === 0) {
            alert('Please add at least one facility visit before sending.');
            return;
        }

        // Initialize report header with Date and Area
        let reportText = `${dateVal} Report\n\n`;
        if (areaVal) {
            reportText += `📍 Area: ${areaVal}\n\n`;
        }

        let isValid = true;
        let entriesFormatted = [];

        cards.forEach((card, index) => {
            const facility = card.querySelector('.input-facility').value.trim();
            const doctor = card.querySelector('.input-doctor').value.trim();
            const phone = card.querySelector('.input-phone').value.trim();
            const remarks = card.querySelector('.input-remarks').value.trim();

            if (!facility || !remarks) {
                isValid = false;
                card.style.borderLeftColor = 'var(--error)';
            } else {
                card.style.borderLeftColor = 'var(--accent)';
            }

            // Build formatting based on requirements:
            // [Number]. [Facility Name]. [Remarks]. [Contact Info]
            let contactInfo = '';
            if (phone && doctor) {
                contactInfo = ` - ${phone}- ${doctor}`;
            } else if (phone) {
                contactInfo = ` - ${phone}`;
            } else if (doctor) {
                contactInfo = ` - ${doctor}`;
            }
            
            const cleanFacility = facility.replace(/\.+$/, '');
            const cleanRemarks = remarks.trim();
            
            let entryLine = `${index + 1}. ${cleanFacility}. ${cleanRemarks}${contactInfo}`;
            entriesFormatted.push(entryLine);
        });

        if (!isValid) {
            alert('Please fill out the highlighted fields before generating the report.');
            return;
        }

        reportText += entriesFormatted.join('\n') + '\n\n';

        if (conclusion) {
            reportText += conclusion + '\n';
        }

        const encodedMessage = encodeURIComponent(reportText);
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

        window.open(whatsappUrl, '_blank');
    });
});
