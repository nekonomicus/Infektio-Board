document.addEventListener('DOMContentLoaded', () => {
    // Element References (cached)
    const eventForm = document.getElementById('eventForm');
    const eventListElement = document.getElementById('eventList');
    const timelineSvg = document.getElementById('timelineSvg');
    const timelineSvgWrapper = document.getElementById('timelineSvgWrapper');
    const opListElement = document.getElementById('opList');
    const germListElement = document.getElementById('germList');
    const antibioticListElement = document.getElementById('antibioticList');
    const timelineStatus = document.getElementById('timelineStatus');
    const clearAllButton = document.getElementById('clearAllButton');
    const copyPatientDataButton = document.getElementById('copyPatientDataButton');
    const copyOpsButton = document.getElementById('copyOpsButton');
    const copyGermsButton = document.getElementById('copyGermsButton');
    const copyAntibioticsButton = document.getElementById('copyAntibioticsButton');
    const printTimelineButton = document.getElementById('printTimelineButton'); // New button

    // Patient Data Inputs
    const patientNameInput = document.getElementById('patientName');
    const patientDobInput = document.getElementById('patientDob');
    const patientDiagnosisInput = document.getElementById('patientDiagnosis');
    const patientTeamInput = document.getElementById('patientTeam');
    const infektioInvolviertCheckbox = document.getElementById('infektioInvolviert');
    const plwcInvolviertCheckbox = document.getElementById('plwcInvolviert');
    const orthoTeamSelect = document.getElementById('orthoTeam');
    const eventDateInput = document.getElementById('eventDate'); // Date input


    let events = [];
    loadData(); // Load data on startup

    // --- Datepicker Initialization ---
    // Check if Datepicker library is loaded
    if (typeof Datepicker !== 'undefined') {
         const datepickerOptions = {
             format: 'dd.mm.yyyy', // German format
             language: 'de',      // German language
             autohide: true,
             weekStart: 1         // Monday
         };
         const dobPicker = new Datepicker(patientDobInput, datepickerOptions);
         const eventPicker = new Datepicker(eventDateInput, datepickerOptions);
    } else {
        console.warn("Datepicker library not found. Using native date input.");
        // Optionally revert input types back to 'date' if library fails
        // patientDobInput.type = 'date';
        // eventDateInput.type = 'date';
    }


    // --- Localization & Date Formatting ---
    const lang = 'de-DE';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateLocaleFormat = (dateStr) => { // Handles YYYY-MM-DD
        if (!dateStr) return '';
        try {
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day || year.length !== 4) return dateStr; // Basic validation
            const date = new Date(Date.UTC(year, month - 1, day));
             if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString(lang, dateFormatOptions);
        } catch (e) { return dateStr; }
    };
     // Helper to convert DD.MM.YYYY from datepicker back to YYYY-MM-DD for storage/processing
    const datePickerToIso = (pickerDate) => {
        if (!pickerDate || typeof pickerDate !== 'string') return '';
        const parts = pickerDate.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        if (parts) {
            return `${parts[3]}-${parts[2]}-${parts[1]}`; // YYYY-MM-DD
        }
        return ''; // Return empty if format doesn't match
    };


    // --- Event Handling ---

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Get date value and convert if needed
        const rawDateValue = eventDateInput.value;
        const isoDateValue = datePickerToIso(rawDateValue); // Convert format

        if (!isoDateValue) {
            alert('Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.');
            return;
        }

        const newEvent = {
            id: Date.now(),
            date: isoDateValue, // Store as YYYY-MM-DD
            type: document.getElementById('eventType').value,
            details: document.getElementById('eventDetails').value.trim()
        };

        if (newEvent.date && newEvent.type && (newEvent.details || ['Antibiotika Ende'].includes(newEvent.type)) ) {
             if (!newEvent.details && !['Antibiotika Ende'].includes(newEvent.type)) {
                alert('Bitte Details / Wert eingeben.'); return;
             }
            events.push(newEvent);
            events.sort((a, b) => new Date(a.date) - new Date(b.date));
            saveData();
            render();
            eventForm.reset();
             // Manually clear datepicker if reset doesn't work
            if (typeof Datepicker !== 'undefined' && eventPicker) { eventPicker.setDate({clear: true}); }

        } else {
            alert('Bitte Datum und Typ auswählen (Details optional für Antibiotika Ende).');
        }
    });

    clearAllButton.addEventListener('click', () => { /* ... as before ... */ });
    [patientNameInput, patientDobInput, patientDiagnosisInput, patientTeamInput, infektioInvolviertCheckbox, plwcInvolviertCheckbox, orthoTeamSelect].forEach(element => {
        element.addEventListener('change', saveData);
    });

    // Clipboard Listeners
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)', ['Datum', 'Details'], copyGermsButton));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));

     // Print Timeline Listener
     printTimelineButton.addEventListener('click', () => {
        document.body.classList.add('printing-timeline-only');
        window.print();
        // No reliable 'onafterprint' in all browsers, use timeout as fallback
        setTimeout(() => {
            document.body.classList.remove('printing-timeline-only');
        }, 500); // Adjust timeout if needed
     });


    function handleDelete(eventId) { /* ... as before ... */ }

    // --- Local Storage ---
    function saveData() {
        localStorage.setItem('patientTimelineEvents_v3', JSON.stringify(events));
        const patientData = {
            name: patientNameInput.value,
            // Store DOB in YYYY-MM-DD from picker value
            dob: datePickerToIso(patientDobInput.value),
            diagnosis: patientDiagnosisInput.value,
            team: patientTeamInput.value,
            infektio: infektioInvolviertCheckbox.checked,
            plwc: plwcInvolviertCheckbox.checked,
            ortho: orthoTeamSelect.value
        };
        localStorage.setItem('patientTimelinePatientData_v3', JSON.stringify(patientData));
    }

    function loadData() {
        const storedEvents = localStorage.getItem('patientTimelineEvents_v3');
        events = storedEvents ? JSON.parse(storedEvents) : [];

        const storedPatientData = localStorage.getItem('patientTimelinePatientData_v3');
        if (storedPatientData) {
            const data = JSON.parse(storedPatientData);
            patientNameInput.value = data.name || '';
            // Set DOB picker value using library's method if available
            if (typeof Datepicker !== 'undefined' && dobPicker && data.dob) {
                 dobPicker.setDate(data.dob); // Expects YYYY-MM-DD or Date object
            } else {
                patientDobInput.value = data.dob ? dateLocaleFormat(data.dob) : ''; // Fallback display
            }
            patientDiagnosisInput.value = data.diagnosis || '';
            patientTeamInput.value = data.team || '';
            infektioInvolviertCheckbox.checked = data.infektio || false;
            plwcInvolviertCheckbox.checked = data.plwc || false;
            orthoTeamSelect.value = data.ortho || '';
        }
        render();
    }


    // --- Rendering Functions (render, renderEventList, renderSummaries) ---
    function render() { /* ... as before ... */ }
    function renderEventList() { /* ... Use dateLocaleFormat for display ... */ }
    function renderSummaries() { /* ... Use dateLocaleFormat for display ... */ }


    // --- Timeline Rendering ---
    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear SVG

        // FIX: Reset status message correctly
        timelineStatus.textContent = "Ereignisse eingeben, um die Timeline zu generieren.";
        timelineStatus.style.color = 'inherit';

        if (events.length === 0) {
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
            return;
        }
         timelineStatus.style.display = 'none';
         timelineSvgWrapper.style.display = 'block';

        // --- Setup (Margins, Scales, etc.) ---
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth);
        const svgHeight = 450;
        const margin = { top: 40, right: 30, bottom: 60, left: 90 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        // --- Tooltip ---
        // FIX: Get tooltip element inside functions or ensure reference is solid
        function getTooltipElement() {
            let tooltip = document.querySelector('.tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.classList.add('tooltip');
                document.body.appendChild(tooltip);
            }
            return tooltip;
        }
         function showTooltip(event, content) {
             const tooltip = getTooltipElement(); // Get fresh reference
             tooltip.style.opacity = 1;
             tooltip.innerHTML = content;
             tooltip.style.left = (event.pageX + 15) + 'px';
             tooltip.style.top = (event.pageY + 15) + 'px';
         }
         function hideTooltip() {
             const tooltip = getTooltipElement(); // Get fresh reference
             tooltip.style.opacity = 0;
             tooltip.style.left = '-9999px';
         }

        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Data Prep & Scales ---
        // Ensure dates are valid Date objects for calculations
        const validDates = events.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        if (validDates.length === 0) { // Handle case where no valid dates exist
             timelineStatus.textContent = "Keine gültigen Datumsangaben gefunden.";
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
             return;
        }
        let minDate = new Date(Math.min(...validDates));
        let maxDate = new Date(Math.max(...validDates));
        const datePaddingMs = Math.max((maxDate - minDate) * 0.02, 86400000 * 2);
        minDate = new Date(minDate.getTime() - datePaddingMs);
        maxDate = new Date(maxDate.getTime() + datePaddingMs);

        const xScale = (date) => { /* ... */ };
        // Other scales (opY, eventY, ..., crpYScale, lcYScale) as before

        // --- Draw Axes ---
        // X Axis and Ticks (using helper functions) as before
        // Y Axis Labels (German) as before

        // --- Draw Events (Labs, Bars, Markers) ---
        // Ensure event data passed to plotting functions has valid dates
        const crpData = events.filter(e => e.type === 'Labor CRP' && e.details && !isNaN(parseFloat(e.details)) && !isNaN(new Date(e.date).getTime())).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));
        const lcData = events.filter(e => e.type === 'Labor Lc' && e.details && !isNaN(parseFloat(e.details)) && !isNaN(new Date(e.date).getTime())).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));

        function plotLabData(data, yScale, className, unit) { /* ... Draw lines/points, add tooltips using dateLocaleFormat ... */ }
        plotLabData(crpData, crpYScale, 'crp', 'mg/l');
        plotLabData(lcData, lcYScale, 'lc', 'G/l');

        // Antibiotic Bars (ensure valid dates)
        const antibioticPeriods = [];
        const starts = events.filter(e => e.type === 'Antibiotika Start' && !isNaN(new Date(e.date).getTime()));
        const ends = events.filter(e => e.type === 'Antibiotika Ende' && !isNaN(new Date(e.date).getTime()));
        let usedEndIds_timeline = new Set();
        // ... logic to calculate periods as before ...
        antibioticPeriods.forEach(period => { /* ... draw rect/label, add tooltips using dateLocaleFormat ... */ });

        // Germ Markers (ensure valid dates)
        const germEvents = events.filter(e => e.type === 'Mikrobiologie' && !isNaN(new Date(e.date).getTime()));
        germEvents.forEach(event => { /* ... draw marker, add tooltip using dateLocaleFormat ... */ });

        // Point Markers (OPs, Events, Notes - ensure valid dates)
        events.forEach(event => {
            const date = new Date(event.date);
            if (isNaN(date.getTime())) return; // Skip invalid dates
            // ... rest of marker drawing logic as before ...
             const tooltipContent = `<b>${event.type} (${dateLocaleFormat(event.date)})</b><br>${event.details}`;
             // Add listeners inside the 'if (markerSymbol)' block
        });


    } // End of renderTimeline


    // --- Timeline Axis Helper Functions ---
    function calculateTickInterval(timeRangeMs, widthPx) { /* ... */ }
    function getFirstTickDate(minDate, unit) { /* ... */ }
    function formatTickDate(date, unit) { /* ... */ }


    // --- Clipboard Functions (copyPatientDataToClipboard, copySummaryToClipboard, copyToClipboard) ---
     function copyPatientDataToClipboard() {
        const name = patientNameInput.value || 'N/A';
        // Format DOB correctly from picker/storage
        const dobIso = datePickerToIso(patientDobInput.value);
        const dobFormatted = dobIso ? dateLocaleFormat(dobIso) : 'N/A';
        const diagnosis = patientDiagnosisInput.value || 'N/A';
        const team = patientTeamInput.value || 'N/A';
        const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const ortho = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]?.text || 'N/A';

        const text = `Patient: ${name}\nGeburtsdatum: ${dobFormatted}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`;
        const html = `<p><b>Patient:</b> ${name}<br><b>Geburtsdatum:</b> ${dobFormatted}<br><b>Diagnose:</b> ${diagnosis.replace(/\n/g, '<br>')}<br><b>Orthopädie Team:</b> ${ortho}<br><b>Zust. ext. Team/Arzt:</b> ${team}<br><b>Infektiologie involviert:</b> ${infektio}<br><b>PLWC involviert:</b> ${plwc}</p>`;
        copyToClipboard(text, html, copyPatientDataButton);
    }
    function copySummaryToClipboard(listId, title, headers, buttonElement) { /* ... Use dateLocaleFormat in output ... */ }
    function copyToClipboard(plainText, htmlText, buttonElement) { /* ... as before, using data attribute for original text ... */ }


}); // End DOMContentLoaded
