document.addEventListener('DOMContentLoaded', () => {
    // --- Element Caching ---
    // Get references to frequently used DOM elements once
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
    const printTimelineButton = document.getElementById('printTimelineButton');
    const patientNameInput = document.getElementById('patientName');
    const patientDobInput = document.getElementById('patientDob');
    const patientDiagnosisInput = document.getElementById('patientDiagnosis');
    const patientTeamInput = document.getElementById('patientTeam');
    const infektioInvolviertCheckbox = document.getElementById('infektioInvolviert');
    const plwcInvolviertCheckbox = document.getElementById('plwcInvolviert');
    const orthoTeamSelect = document.getElementById('orthoTeam');
    const eventDateInput = document.getElementById('eventDate');
    // Create or get tooltip element reference
    let tooltipElement = document.querySelector('.tooltip');
    if (!tooltipElement) {
         tooltipElement = document.createElement('div');
         tooltipElement.classList.add('tooltip');
         tooltipElement.style.opacity = 0; // Ensure it's hidden initially
         tooltipElement.style.pointerEvents = 'none'; // Prevent interaction
         document.body.appendChild(tooltipElement);
         console.log("Tooltip element created.");
    } else {
        console.log("Tooltip element found.");
    }


    // --- Global State ---
    let events = [];


    // --- Localization & Date Formatting ---
    const lang = 'de-DE';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateLocaleFormat = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return '';
        try {
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day || year.length !== 4) return dateStr;
            const date = new Date(Date.UTC(year, month - 1, day));
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString(lang, dateFormatOptions);
        } catch (e) { console.error("Error formatting date:", dateStr, e); return dateStr; }
    };


    // --- Event Handling ---
    function handleEventSubmit(e) {
        e.preventDefault();
        const isoDateValue = eventDateInput.value;
        const eventType = document.getElementById('eventType').value;
        const eventDetails = document.getElementById('eventDetails').value.trim();

        if (!isoDateValue) { alert('Bitte ein gültiges Datum auswählen.'); return; }
        if (!eventType) { alert('Bitte einen Ereignistyp auswählen.'); return; }
        if (!eventDetails && !['Antibiotika Ende'].includes(eventType)) { alert('Bitte Details / Wert eingeben.'); return; }

        const newEvent = { id: Date.now(), date: isoDateValue, type: eventType, details: eventDetails };
        events.push(newEvent);
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveData();
        render();
        eventForm.reset();
         // Reset selects to default option
        document.getElementById('eventType').selectedIndex = 0;
    }

    function handleClearAll() {
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            events = [];
            saveData();
            render();
        }
    }

    function handlePrintTimeline() {
         // Check if there's anything to print
         if (events.length === 0) {
            alert("Es gibt keine Ereignisse zum Drucken der Timeline.");
            return;
         }
        document.body.classList.add('printing-timeline-only');
        window.print();
        // Use requestAnimationFrame for potentially smoother class removal after print dialog
        if (window.requestAnimationFrame) {
             window.requestAnimationFrame(() => {
                 setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 0);
             });
        } else {
            setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 500); // Fallback
        }
    }

    function handleDeleteEvent(eventId) {
        events = events.filter(event => event.id !== eventId);
        saveData();
        render();
    }

    // Attach Event Listeners
    eventForm.addEventListener('submit', handleEventSubmit);
    clearAllButton.addEventListener('click', handleClearAll);
    printTimelineButton.addEventListener('click', handlePrintTimeline);
    [patientNameInput, patientDobInput, patientDiagnosisInput, patientTeamInput, infektioInvolviertCheckbox, plwcInvolviertCheckbox, orthoTeamSelect].forEach(element => {
        element.addEventListener('change', saveData); // Save patient data on change
    });
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)', ['Datum', 'Details'], copyGermsButton));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));


    // --- Local Storage ---
    function saveData() {
        try {
            localStorage.setItem('patientTimelineEvents_v5', JSON.stringify(events));
            const patientData = {
                name: patientNameInput.value, dob: patientDobInput.value, diagnosis: patientDiagnosisInput.value,
                team: patientTeamInput.value, infektio: infektioInvolviertCheckbox.checked,
                plwc: plwcInvolviertCheckbox.checked, ortho: orthoTeamSelect.value
            };
            localStorage.setItem('patientTimelinePatientData_v5', JSON.stringify(patientData));
        } catch (e) { console.error("Fehler beim Speichern der Daten:", e); }
    }

    function loadData() {
        try {
            const storedEvents = localStorage.getItem('patientTimelineEvents_v5');
            events = storedEvents ? JSON.parse(storedEvents) : [];
            const storedPatientData = localStorage.getItem('patientTimelinePatientData_v5');
            if (storedPatientData) {
                const data = JSON.parse(storedPatientData);
                patientNameInput.value = data.name || ''; patientDobInput.value = data.dob || '';
                patientDiagnosisInput.value = data.diagnosis || ''; patientTeamInput.value = data.team || '';
                infektioInvolviertCheckbox.checked = data.infektio || false;
                plwcInvolviertCheckbox.checked = data.plwc || false; orthoTeamSelect.value = data.ortho || '';
            }
        } catch (e) {
             console.error("Fehler beim Laden der Daten:", e);
             events = []; // Reset events on error
        }
        render(); // Render after loading/error
    }


    // --- Rendering Functions ---
    function render() {
        // Wrap rendering calls in try-catch to prevent one error stopping others
        try { renderEventList(); } catch (e) { console.error("Fehler in renderEventList:", e); }
        try { renderSummaries(); } catch (e) { console.error("Fehler in renderSummaries:", e); }
        try { renderTimeline(); } catch (e) {
             console.error("Fehler in renderTimeline:", e);
             timelineStatus.textContent = "Fehler beim Rendern der Timeline. Prüfen Sie die Konsole.";
             timelineStatus.style.color = 'red';
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
        }
    }

    function renderEventList() {
        eventListElement.innerHTML = '';
        if (events.length === 0) { eventListElement.innerHTML = '<li>Noch keine Ereignisse hinzugefügt.</li>'; return; }
        const typeMap = { /* ... German type map ... */ };
        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            const displayType = typeMap[event.type] || event.type;
            textSpan.textContent = `${dateLocaleFormat(event.date)} - ${displayType}: ${event.details || ''}`;
            li.appendChild(textSpan);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Löschen';
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => handleDeleteEvent(event.id); // Corrected handler name
            li.appendChild(deleteButton);
            eventListElement.appendChild(li);
        });
    }

    function renderSummaries() {
        opListElement.innerHTML = ''; germListElement.innerHTML = ''; antibioticListElement.innerHTML = '';
        const ops = events.filter(e => e.type === 'OP');
        const germs = events.filter(e => e.type === 'Mikrobiologie');
        const antibioticStarts = events.filter(e => e.type === 'Antibiotika Start');
        const antibioticEnds = events.filter(e => e.type === 'Antibiotika Ende');

        // OPs
        if (ops.length === 0) opListElement.innerHTML = '<li>Keine OPs eingegeben.</li>';
        else ops.forEach(op => opListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(op.date)}:</span> ${op.details}</li>`);
        // Germs
        if (germs.length === 0) germListElement.innerHTML = '<li>Keine Mikrobiologie eingegeben.</li>';
        else germs.forEach(germ => germListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(germ.date)}:</span> ${germ.details}</li>`);
        // Antibiotics
        const antibiotics = []; let usedEndIds = new Set();
        antibioticStarts.forEach(start => { /* ... matching logic as before ... */ });
        if (antibiotics.length === 0) antibioticListElement.innerHTML = '<li>Keine Antibiotika eingegeben.</li>';
        else antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => { /* ... render li ... */ });
    }


    // --- Timeline Rendering ---
    function renderTimeline() {
        timelineSvg.innerHTML = '';
        timelineStatus.textContent = "Ereignisse eingeben, um die Timeline zu generieren.";
        timelineStatus.style.color = 'inherit';

        if (events.length === 0) { /* ... hide SVG, show status ... */ return; }

        // Check for valid dates before proceeding
        const validDates = events.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        if (validDates.length === 0) {
             timelineStatus.textContent = "Keine gültigen Datumsangaben für die Timeline gefunden.";
             timelineStatus.style.display = 'block'; timelineSvgWrapper.style.display = 'none';
             return;
        }

        timelineStatus.style.display = 'none'; timelineSvgWrapper.style.display = 'block';

        // --- Setup ---
        /* ... svgWidth, svgHeight, margin, width, height ... */
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth);
        const svgHeight = 450;
        const margin = { top: 40, right: 30, bottom: 60, left: 90 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;


        // --- Tooltip Functions (Referencing the global tooltipElement) ---
         function showTooltip(event, content) {
             if (!tooltipElement) return;
             try { // Add try-catch around style modifications
                 tooltipElement.style.opacity = 1;
                 tooltipElement.innerHTML = content;
                 // Basic boundary check (prevent tooltip going too far left/top)
                 const x = Math.max(10, event.pageX + 15);
                 const y = Math.max(10, event.pageY + 15);
                 tooltipElement.style.left = x + 'px';
                 tooltipElement.style.top = y + 'px';
             } catch (e) { console.error("Error showing tooltip:", e); }
         }
         function hideTooltip() {
             if (!tooltipElement) return;
             try {
                 tooltipElement.style.opacity = 0;
                 // Move off-screen after fade out (or immediately if no transition)
                 setTimeout(() => { tooltipElement.style.left = '-9999px'; }, 200); // Match CSS transition
             } catch (e) { console.error("Error hiding tooltip:", e); }
         }

        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Data Prep & Scales ---
        /* ... date range calculation, padding, lab data filtering, scales (opY, eventY, ...) ... */
         let minDate = new Date(Math.min(...validDates));
         let maxDate = new Date(Math.max(...validDates));
         const datePaddingMs = Math.max((maxDate - minDate) * 0.02, 86400000 * 2);
         minDate = new Date(minDate.getTime() - datePaddingMs);
         maxDate = new Date(maxDate.getTime() + datePaddingMs);

        const xScale = (date) => { /* ... */ };
        const rowHeight = 20; const opY = 0; const eventY = rowHeight * 1.5; const antibioticY = rowHeight * 3; const germY = rowHeight * 4.5; const labPlotAreaY = rowHeight * 6;
        const labPlotAreaHeight = Math.max(50, height - labPlotAreaY);
        const crpData = events.filter(e => e.type === 'Labor CRP' && e.details && !isNaN(parseFloat(e.details)) && !isNaN(new Date(e.date).getTime())).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));
        const lcData = events.filter(e => e.type === 'Labor Lc' && e.details && !isNaN(parseFloat(e.details)) && !isNaN(new Date(e.date).getTime())).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));
        const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value), 1) : 1;
        const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value), 1) : 1;
        const crpYScale = (value) => labPlotAreaY + labPlotAreaHeight - Math.max(0,(value / maxCrpValue)) * labPlotAreaHeight * 0.45;
        const lcYScale = (value) => labPlotAreaY + (labPlotAreaHeight * 0.5) - Math.max(0,(value / maxLcValue)) * labPlotAreaHeight * 0.45;


        // --- Draw Axes ---
        /* ... Axis drawing logic (xAxisLine, xTicks, yLabels) ... */
        const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line"); /* ... */ chartGroup.appendChild(xAxisLine);
        const timeRange = maxDate.getTime() - minDate.getTime();
        if (timeRange > 0) { /* ... xTick drawing loop ... */ }
        const yLabels = [ /* ... German labels ... */ ];
        yLabels.forEach(label => { /* ... create and append Y labels ... */ });


        // --- Draw Events ---
        // Wrap each drawing section in try-catch for robustness
         try {
             function plotLabData(data, yScale, className, unit) {
                 if (data.length < 1) return;
                 data.sort((a, b) => a.date - b.date);
                 if (data.length > 1) { /* ... draw line ... */ }
                 data.forEach(d => {
                     const x = xScale(d.date); const y = yScale(d.value);
                     const point = document.createElementNS("http://www.w3.org/2000/svg", "circle"); /* ... */ chartGroup.appendChild(point);
                     const label = document.createElementNS("http://www.w3.org/2000/svg", "text"); /* ... */ chartGroup.appendChild(label);
                     const tooltipContent = `${dateLocaleFormat(d.date.toISOString().split('T')[0])}<br>${className.toUpperCase()}: ${d.value} ${unit}`;
                     point.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                     point.addEventListener('mouseout', hideTooltip);
                     label.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent)); // Tooltip on label too
                     label.addEventListener('mouseout', hideTooltip);
                 });
             }
             plotLabData(crpData, crpYScale, 'crp', 'mg/l');
             plotLabData(lcData, lcYScale, 'lc', 'G/l');
         } catch(e) { console.error("Fehler beim Zeichnen der Labordaten:", e); }

         try {
             const antibioticPeriods = []; /* ... calculate periods ... */
             antibioticPeriods.forEach(period => { /* ... draw rect/label, add tooltips ... */ });
         } catch(e) { console.error("Fehler beim Zeichnen der Antibiotika:", e); }

         try {
             const germEvents = events.filter(e => e.type === 'Mikrobiologie' && !isNaN(new Date(e.date).getTime()));
             germEvents.forEach(event => { /* ... draw marker, add tooltips ... */ });
         } catch(e) { console.error("Fehler beim Zeichnen der Keime:", e); }

         try {
             events.forEach(event => { /* ... draw point markers, add tooltips ... */ });
         } catch(e) { console.error("Fehler beim Zeichnen der Marker:", e); }


    } // End of renderTimeline


    // --- Timeline Axis Helper Functions ---
    function calculateTickInterval(timeRangeMs, widthPx) { /* ... */ }
    function getFirstTickDate(minDate, unit) { /* ... */ }
    function formatTickDate(date, unit) { /* ... */ }


    // --- Clipboard Functions ---
     function copyPatientDataToClipboard() {
        // FIX: Ensure function creates the text/html correctly and calls copyToClipboard
        const name = patientNameInput.value || 'N/A';
        const dobFormatted = dateLocaleFormat(patientDobInput.value); // Format native date value
        const diagnosis = patientDiagnosisInput.value || 'N/A';
        const team = patientTeamInput.value || 'N/A';
        const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const ortho = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]?.text || 'N/A';

        // Construct the text string correctly
        const text = `Patient: ${name}\nGeburtsdatum: ${dobFormatted}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`;
        // Construct the HTML string correctly
        const html = `<p><b>Patient:</b> ${name}<br><b>Geburtsdatum:</b> ${dobFormatted}<br><b>Diagnose:</b> ${diagnosis.replace(/\n/g, '<br>')}<br><b>Orthopädie Team:</b> ${ortho}<br><b>Zust. ext. Team/Arzt:</b> ${team}<br><b>Infektiologie involviert:</b> ${infektio}<br><b>PLWC involviert:</b> ${plwc}</p>`;

        copyToClipboard(text, html, copyPatientDataButton); // Pass the strings
    }
    function copySummaryToClipboard(listId, title, headers, buttonElement) { /* ... as before ... */ }
    function copyToClipboard(plainText, htmlText, buttonElement) { /* ... as before ... */ }


    // --- Initial Load ---
     loadData(); // Load data and triggers initial render


}); // End DOMContentLoaded
