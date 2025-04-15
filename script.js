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
    const printTimelineButton = document.getElementById('printTimelineButton');

    // Patient Data Inputs
    const patientNameInput = document.getElementById('patientName');
    const patientDobInput = document.getElementById('patientDob'); // Now type="date"
    const patientDiagnosisInput = document.getElementById('patientDiagnosis');
    const patientTeamInput = document.getElementById('patientTeam');
    const infektioInvolviertCheckbox = document.getElementById('infektioInvolviert');
    const plwcInvolviertCheckbox = document.getElementById('plwcInvolviert');
    const orthoTeamSelect = document.getElementById('orthoTeam');
    const eventDateInput = document.getElementById('eventDate'); // Now type="date"


    let events = [];
    // Tooltip Element Reference (initialized once)
    let tooltipElement = null;

    loadData(); // Load data on startup


    // --- Localization & Date Formatting ---
    const lang = 'de-DE';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateLocaleFormat = (dateStr) => { // Handles YYYY-MM-DD
        if (!dateStr) return '';
        try {
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day || year.length !== 4) return dateStr;
            const date = new Date(Date.UTC(year, month - 1, day));
             if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString(lang, dateFormatOptions);
        } catch (e) { return dateStr; }
    };
    // Removed datePickerToIso function

    // --- Event Handling ---

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const isoDateValue = eventDateInput.value; // Read directly (YYYY-MM-DD)

        if (!isoDateValue) {
            alert('Bitte ein gültiges Datum auswählen.');
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
     printTimelineButton.addEventListener('click', () => { /* ... as before ... */ });


    function handleDelete(eventId) { /* ... as before ... */ }

    // --- Local Storage ---
    function saveData() {
        localStorage.setItem('patientTimelineEvents_v4', JSON.stringify(events)); // Use new key for compatibility break
        const patientData = {
            name: patientNameInput.value,
            dob: patientDobInput.value, // Store native date input value (YYYY-MM-DD)
            diagnosis: patientDiagnosisInput.value,
            team: patientTeamInput.value,
            infektio: infektioInvolviertCheckbox.checked,
            plwc: plwcInvolviertCheckbox.checked,
            ortho: orthoTeamSelect.value
        };
        localStorage.setItem('patientTimelinePatientData_v4', JSON.stringify(patientData));
    }

    function loadData() {
        const storedEvents = localStorage.getItem('patientTimelineEvents_v4');
        events = storedEvents ? JSON.parse(storedEvents) : [];

        const storedPatientData = localStorage.getItem('patientTimelinePatientData_v4');
        if (storedPatientData) {
            const data = JSON.parse(storedPatientData);
            patientNameInput.value = data.name || '';
            patientDobInput.value = data.dob || ''; // Set native date input value
            patientDiagnosisInput.value = data.diagnosis || '';
            patientTeamInput.value = data.team || '';
            infektioInvolviertCheckbox.checked = data.infektio || false;
            plwcInvolviertCheckbox.checked = data.plwc || false;
            orthoTeamSelect.value = data.ortho || '';
        }
        // Initialize tooltip element once after DOM is ready
        tooltipElement = document.querySelector('.tooltip');
        if (!tooltipElement) {
             tooltipElement = document.createElement('div');
             tooltipElement.classList.add('tooltip');
             document.body.appendChild(tooltipElement);
        }

        render(); // Render after loading
    }


    // --- Rendering Functions (render, renderEventList, renderSummaries) ---
    function render() { /* ... as before ... */ }
    function renderEventList() { /* ... Use dateLocaleFormat ... */ }
    function renderSummaries() { /* ... Use dateLocaleFormat ... */ }


    // --- Timeline Rendering ---
    function renderTimeline() {
        timelineSvg.innerHTML = '';
        timelineStatus.textContent = "Ereignisse eingeben, um die Timeline zu generieren.";
        timelineStatus.style.color = 'inherit';

        if (events.length === 0) {
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
            return;
        }
         timelineStatus.style.display = 'none';
         timelineSvgWrapper.style.display = 'block';

        // --- Setup ---
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth);
        const svgHeight = 450;
        const margin = { top: 40, right: 30, bottom: 60, left: 90 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        // --- Tooltip Functions (using the global tooltipElement) ---
         function showTooltip(event, content) {
             if (!tooltipElement) return; // Safety check
             tooltipElement.style.opacity = 1;
             tooltipElement.innerHTML = content;
             tooltipElement.style.left = (event.pageX + 15) + 'px';
             tooltipElement.style.top = (event.pageY + 15) + 'px';
         }
         function hideTooltip() {
             if (!tooltipElement) return; // Safety check
             tooltipElement.style.opacity = 0;
             tooltipElement.style.left = '-9999px';
         }

        // --- SVG Canvas, Data Prep, Scales ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        /* ... rest of setup as before (chartGroup, date filtering, scales) ... */
        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Draw Axes ---
         /* ... Axis drawing logic as before ... */

        // --- Draw Events (Labs, Bars, Markers) ---
        /* ... Event drawing logic as before, ensuring tooltips call the fixed show/hide functions ... */
        // Example for marker tooltip attachment:
        // markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
        // markerSymbol.addEventListener('mouseout', hideTooltip);
        // (Make sure this pattern is used for all elements needing tooltips: points, bars, markers)

         // --- Draw Events ---
        // Plot Labs
        function plotLabData(data, yScale, className, unit) { /* ... as before ... */ }
        plotLabData(crpData, crpYScale, 'crp', 'mg/l');
        plotLabData(lcData, lcYScale, 'lc', 'G/l');

        // Draw Antibiotic Bars
        /* ... calculation logic as before ... */
        antibioticPeriods.forEach(period => {
            /* ... draw rect/label ... */
             const endDateText = period.endDateActual ? dateLocaleFormat(period.endDateActual.toISOString().split('T')[0]) : 'Laufend';
              rect.addEventListener('mouseover', (e) => showTooltip(e, `<b>Antibiotikum:</b> ${period.details}<br><b>Start:</b> ${dateLocaleFormat(period.start.toISOString().split('T')[0])}<br><b>Ende:</b> ${endDateText}`));
              rect.addEventListener('mouseout', hideTooltip);
        });

         // Draw Germ Markers
         const germEvents = events.filter(e => e.type === 'Mikrobiologie' && !isNaN(new Date(e.date).getTime()));
         germEvents.forEach(event => {
             /* ... draw marker ... */
              marker.addEventListener('mouseover', (e) => showTooltip(e, `<b>Keim (${dateLocaleFormat(event.date)}):</b><br>${event.details}`));
              marker.addEventListener('mouseout', hideTooltip);
          });

        // Draw Point Markers (OPs, Events, Notes)
        events.forEach(event => {
            const date = new Date(event.date);
            if (isNaN(date.getTime())) return;
            /* ... marker drawing logic ... */
             if (markerSymbol) {
                 /* ... append marker ... */
                 const tooltipContent = `<b>${event.type} (${dateLocaleFormat(event.date)})</b><br>${event.details}`;
                 markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                 markerSymbol.addEventListener('mouseout', hideTooltip);
             }
        });


    } // End of renderTimeline


    // --- Timeline Axis Helper Functions ---
    function calculateTickInterval(timeRangeMs, widthPx) { /* ... */ }
    function getFirstTickDate(minDate, unit) { /* ... */ }
    function formatTickDate(date, unit) { /* ... */ }


    // --- Clipboard Functions ---
     function copyPatientDataToClipboard() {
        const name = patientNameInput.value || 'N/A';
        const dobFormatted = dateLocaleFormat(patientDobInput.value); // Format native date value
        const diagnosis = patientDiagnosisInput.value || 'N/A';
        const team = patientTeamInput.value || 'N/A';
        const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const ortho = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]?.text || 'N/A';
        /* ... Text and HTML formatting as before ... */
        copyToClipboard(text, html, copyPatientDataButton);
    }
    function copySummaryToClipboard(listId, title, headers, buttonElement) { /* ... Use dateLocaleFormat ... */ }
    function copyToClipboard(plainText, htmlText, buttonElement) { /* ... as before ... */ }


}); // End DOMContentLoaded
