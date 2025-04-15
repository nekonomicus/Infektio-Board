document.addEventListener('DOMContentLoaded', () => {
    // --- Element Caching ---
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
    const eventDetailsInput = document.getElementById('eventDetails');
    const eventTypeInput = document.getElementById('eventType');
    let tooltipElement = document.querySelector('.tooltip'); // Get tooltip element

    // --- Global State ---
    let events = [];
    const SVG_NS = "http://www.w3.org/2000/svg"; // SVG Namespace

    // --- Localization & Date Formatting ---
    const lang = 'de-CH'; // Use Swiss German locale for DD.MM.YYYY format
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const monthYearFormatOptions = { year: 'numeric', month: 'short' };
    const dayMonthFormatOptions = { month: 'short', day: 'numeric' };

    const dateLocaleFormat = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A';
        try {
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day || year.length !== 4) return dateStr; // Basic validation
            const date = new Date(Date.UTC(year, month - 1, day)); // Use UTC to avoid timezone shifts
            if (isNaN(date.getTime())) return 'Ungültiges Datum';
            return date.toLocaleDateString(lang, dateFormatOptions);
        } catch (e) { console.error("Error formatting date:", dateStr, e); return 'Fehler'; }
    };

    // --- Event Handling ---
    function handleEventSubmit(e) {
        e.preventDefault();
        const isoDateValue = eventDateInput.value;
        const eventType = eventTypeInput.value;
        const eventDetails = eventDetailsInput.value.trim();

        if (!isoDateValue) { alert('Bitte ein gültiges Datum auswählen.'); return; }
        if (!eventType) { alert('Bitte einen Ereignistyp auswählen.'); return; }
        // Allow empty details ONLY for 'Antibiotika Ende'
        if (!eventDetails && eventType !== 'Antibiotika Ende') {
            alert('Bitte Details / Wert eingeben.');
            return;
         }
         // Validate numeric inputs
         if ((eventType === 'Labor CRP' || eventType === 'Labor Lc') && isNaN(parseFloat(eventDetails))) {
            alert(`Bitte einen gültigen numerischen Wert für ${eventType} eingeben.`);
            return;
         }


        const newEvent = { id: Date.now(), date: isoDateValue, type: eventType, details: eventDetails };
        events.push(newEvent);
        events.sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort events by date
        saveData();
        render();
        eventForm.reset();
        eventTypeInput.selectedIndex = 0; // Reset dropdown
        eventDateInput.focus(); // Focus date for next entry
    }

    function handleClearAll() {
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse UND Patientendaten löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            events = [];
            // Clear patient data fields
            patientNameInput.value = '';
            patientDobInput.value = '';
            patientDiagnosisInput.value = '';
            patientTeamInput.value = '';
            infektioInvolviertCheckbox.checked = false;
            plwcInvolviertCheckbox.checked = false;
            orthoTeamSelect.selectedIndex = 0;
            saveData(); // Save cleared state
            render();
        }
    }

    function handlePrintTimeline() {
        if (events.length === 0) { alert("Es gibt keine Ereignisse zum Drucken der Timeline."); return; }
        document.body.classList.add('printing-timeline-only');
        window.print();
         // Use setTimeout to ensure the class removal happens after print dialog potentially blocks
        setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 500);
    }

    function handleDeleteEvent(eventId) {
         const eventIndex = events.findIndex(event => event.id === eventId);
         if (eventIndex > -1) {
             const eventToDelete = events[eventIndex];
             if (confirm(`Soll das Ereignis "${dateLocaleFormat(eventToDelete.date)} - ${eventToDelete.type}: ${eventToDelete.details.substring(0,30)}..." wirklich gelöscht werden?`)) {
                events.splice(eventIndex, 1); // More efficient removal
                saveData();
                render();
            }
         }
    }

    // --- Tooltip Functions ---
    function showTooltip(evt, text) {
        if (!tooltipElement) return; // Safety check
        tooltipElement.innerHTML = text;
        tooltipElement.style.opacity = 1;

        // Position tooltip near the mouse pointer
        // Use pageX/pageY for coordinates relative to the whole page
        let x = evt.pageX + 15;
        let y = evt.pageY + 10;

        // Adjust position if tooltip goes off-screen
        const tooltipRect = tooltipElement.getBoundingClientRect(); // Get size after content is set
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

        if (x + tooltipRect.width > viewportWidth) {
            x = evt.pageX - tooltipRect.width - 15; // Move left
        }
        if (y + tooltipRect.height > viewportHeight) {
            y = evt.pageY - tooltipRect.height - 10; // Move above
        }

        tooltipElement.style.left = `${x}px`;
        tooltipElement.style.top = `${y}px`;
    }

    function hideTooltip() {
         if (!tooltipElement) return;
        tooltipElement.style.opacity = 0;
        // Reset position slightly off-screen to prevent accidental hover triggers during fade-out
        tooltipElement.style.left = '-9999px';
        tooltipElement.style.top = '-9999px';
    }


    // --- Attach Event Listeners ---
    eventForm.addEventListener('submit', handleEventSubmit);
    clearAllButton.addEventListener('click', handleClearAll);
    printTimelineButton.addEventListener('click', handlePrintTimeline);

    // Save patient data on change
    [patientNameInput, patientDobInput, patientDiagnosisInput, patientTeamInput, infektioInvolviertCheckbox, plwcInvolviertCheckbox, orthoTeamSelect].forEach(element => {
        if(element) element.addEventListener('change', saveData);
    });

    // Copy Buttons
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)', ['Datum', 'Details'], copyGermsButton));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));

    // Ensure tooltip element exists or create it
    if (!tooltipElement) {
         console.warn("Tooltip element not found, creating dynamically.");
         tooltipElement = document.createElement('div');
         tooltipElement.classList.add('tooltip');
         document.body.appendChild(tooltipElement);
     }


    // --- Local Storage ---
    const STORAGE_KEY_EVENTS = 'patientTimelineEvents_v7'; // Incremented version
    const STORAGE_KEY_PATIENT = 'patientTimelinePatientData_v7'; // Incremented version

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
            const patientData = {
                name: patientNameInput.value, dob: patientDobInput.value, diagnosis: patientDiagnosisInput.value,
                team: patientTeamInput.value, infektio: infektioInvolviertCheckbox.checked,
                plwc: plwcInvolviertCheckbox.checked, ortho: orthoTeamSelect.value
            };
            localStorage.setItem(STORAGE_KEY_PATIENT, JSON.stringify(patientData));
        } catch (e) { console.error("Fehler beim Speichern der Daten:", e); alert("Fehler beim Speichern der Daten. Möglicherweise ist der Speicherplatz voll.");}
    }

    function loadData() {
        try {
            const storedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
            events = storedEvents ? JSON.parse(storedEvents) : [];
            // Basic validation for loaded events (check if it's an array)
            if (!Array.isArray(events)) {
                console.warn("Geladene Ereignisse sind kein Array, setze zurück.");
                events = [];
             } else {
                 // Further validation: ensure dates are valid strings
                 events = events.filter(event => event && typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}$/));
                 events.sort((a, b) => new Date(a.date) - new Date(b.date)); // Ensure sorted
             }


            const storedPatientData = localStorage.getItem(STORAGE_KEY_PATIENT);
            if (storedPatientData) {
                const data = JSON.parse(storedPatientData);
                // Check if data is an object before accessing properties
                 if (typeof data === 'object' && data !== null) {
                     patientNameInput.value = data.name || '';
                     patientDobInput.value = data.dob || '';
                     patientDiagnosisInput.value = data.diagnosis || '';
                     patientTeamInput.value = data.team || '';
                     infektioInvolviertCheckbox.checked = data.infektio || false;
                     plwcInvolviertCheckbox.checked = data.plwc || false;
                     orthoTeamSelect.value = data.ortho || '';
                 } else {
                     console.warn("Geladene Patientendaten sind ungültig.");
                 }
            }
        } catch (e) {
            console.error("Fehler beim Laden der Daten:", e);
            alert("Fehler beim Laden der gespeicherten Daten. Starte mit leerem Zustand.");
            events = []; // Reset on error
        }
        render(); // Render after loading/error
    }


    // --- Rendering Functions ---
    function render() {
        try { renderEventList(); } catch (e) { console.error("Fehler in renderEventList:", e); }
        try { renderSummaries(); } catch (e) { console.error("Fehler in renderSummaries:", e); }
        try {
             renderTimeline();
             timelineStatus.style.display = events.length > 0 ? 'none' : 'block'; // Hide/show status
             timelineSvgWrapper.style.display = events.length > 0 ? 'block' : 'none';
        } catch (e) {
             console.error("Fehler in renderTimeline:", e);
             timelineSvg.innerHTML = ''; // Clear SVG on error
             timelineStatus.textContent = "Fehler beim Rendern der Timeline. Details siehe Konsole (F12).";
             timelineStatus.style.color = 'red';
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
        }
    }

    function renderEventList() {
        eventListElement.innerHTML = '';
        if (events.length === 0) {
            eventListElement.innerHTML = '<li>Noch keine Ereignisse hinzugefügt.</li>';
            return;
         }
        const typeMap = { // German type map for display
            'OP': 'OP', 'Antibiotika Start': 'AB Start', 'Antibiotika Ende': 'AB Ende',
            'Mikrobiologie': 'Mikro (Keim)', 'Labor CRP': 'CRP', 'Labor Lc': 'Lc',
            'Klinisches Ereignis': 'Ereignis', 'Notiz': 'Notiz'
          };
        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            const displayType = typeMap[event.type] || event.type;
            let detailsText = event.details || '';
            if (event.type === 'Labor CRP') detailsText += ' mg/l';
            if (event.type === 'Labor Lc') detailsText += ' G/l';

            textSpan.textContent = `${dateLocaleFormat(event.date)} - ${displayType}: ${detailsText}`;
            li.appendChild(textSpan);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '✕'; // Use '✕' for delete symbol
            deleteButton.title = "Ereignis löschen"; // Add tooltip
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => handleDeleteEvent(event.id);
            li.appendChild(deleteButton);

            eventListElement.appendChild(li);
        });
    }

    function renderSummaries() {
        opListElement.innerHTML = ''; germListElement.innerHTML = ''; antibioticListElement.innerHTML = '';

        const ops = events.filter(e => e.type === 'OP');
        const germs = events.filter(e => e.type === 'Mikrobiologie');
        const antibioticStarts = events.filter(e => e.type === 'Antibiotika Start').sort((a,b) => new Date(a.date) - new Date(b.date));
        const antibioticEnds = events.filter(e => e.type === 'Antibiotika Ende').sort((a,b) => new Date(a.date) - new Date(b.date));

        // OPs
        if (ops.length === 0) opListElement.innerHTML = '<li>Keine OPs eingegeben.</li>';
        else ops.forEach(op => opListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(op.date)}:</span> ${op.details}</li>`);

        // Germs
        if (germs.length === 0) germListElement.innerHTML = '<li>Keine Mikrobiologie eingegeben.</li>';
        else germs.forEach(germ => germListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(germ.date)}:</span> ${germ.details}</li>`);

        // Antibiotics (Improved matching logic)
        const antibiotics = [];
        let usedEndIds = new Set();

        antibioticStarts.forEach(start => {
            // Find the *earliest* relevant end date after the start date
            // An end event is relevant if:
            // 1. It's on or after the start date.
            // 2. It hasn't been used yet.
            // 3. EITHER the end event has details and they match the start event's drug (first word),
            //    OR the end event has NO details (considered a generic stop for the timeline start).
            const startDrugName = start.details ? start.details.split(' ')[0].trim().toLowerCase() : null;

            let matchedEnd = null;
            const potentialEnds = antibioticEnds
                .filter(end => !usedEndIds.has(end.id) && new Date(end.date) >= new Date(start.date))
                // Sort primarily by date, then by specificity (detailed end > empty end)
                .sort((a, b) => {
                    const dateDiff = new Date(a.date) - new Date(b.date);
                    if (dateDiff !== 0) return dateDiff;
                    // Prefer specific match if dates are the same
                    const aMatches = a.details && startDrugName && a.details.toLowerCase().includes(startDrugName);
                    const bMatches = b.details && startDrugName && b.details.toLowerCase().includes(startDrugName);
                    if (aMatches && !bMatches) return -1;
                    if (!aMatches && bMatches) return 1;
                    // Prefer empty end over non-matching specific end if dates are same
                    if (!a.details && b.details && !bMatches) return -1;
                    if (a.details && !aMatches && !b.details) return 1;
                    return 0;
                 });


            for (const end of potentialEnds) {
                const endDrugName = end.details ? end.details.split(' ')[0].trim().toLowerCase() : null;
                // Match if:
                // - End has details and matches start drug
                // - End has no details (generic stop)
                // - Start has no details (accept any end - less common case)
                if ( (startDrugName && endDrugName && endDrugName === startDrugName) || !endDrugName || !startDrugName ) {
                    matchedEnd = end;
                    usedEndIds.add(matchedEnd.id);
                    break; // Found the best match for this start
                }
            }

             antibiotics.push({
                 id: start.id, // Keep original ID for potential future use
                 start: start.date,
                 end: matchedEnd ? matchedEnd.date : null, // Use null for ongoing
                 details: start.details || ''
             });
        });

        if (antibiotics.length === 0) antibioticListElement.innerHTML = '<li>Keine Antibiotika eingegeben.</li>';
        else antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => {
            const endDateFormatted = ab.end ? dateLocaleFormat(ab.end) : 'Laufend';
            antibioticListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(ab.start)} bis ${endDateFormatted}:</span> ${ab.details || '(Details fehlen)'}</li>`;
        });
    }


    // --- Timeline Rendering (Revised) ---
    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear previous SVG content

        const validEvents = events.filter(e => e.date && typeof e.date === 'string');
        if (validEvents.length === 0) { return; } // Exit if no valid events

        const allDates = validEvents.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
         // Also consider antibiotic end dates for range calculation
        const antibioticEnds = events.filter(e => e.type === 'Antibiotika Ende' && e.date).map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        allDates.push(...antibioticEnds);

        if (allDates.length === 0) { return; } // Exit if no valid dates at all


        // --- Setup ---
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth); // Ensure min width
        const svgHeight = 450;
        const margin = { top: 40, right: 30, bottom: 60, left: 90 }; // Increased left margin for labels
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet'); // Ensure scaling
        const chartGroup = document.createElementNS(SVG_NS, "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Data Prep & Scales ---
        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));

        // Ensure minDate and maxDate are valid before padding
        if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) {
             console.error("Invalid min/max date calculated.");
             return; // Cannot proceed without valid date range
         }

        const timeDiffMs = maxDate.getTime() - minDate.getTime();

        // Add padding (e.g., 2% of range or min 2 days)
         const datePaddingMs = Math.max(timeDiffMs * 0.02, 2 * 24 * 60 * 60 * 1000);
         // Handle single-day case: Add padding before and after
         if (timeDiffMs === 0) {
             minDate = new Date(minDate.getTime() - datePaddingMs / 2);
             maxDate = new Date(maxDate.getTime() + datePaddingMs / 2);
         } else {
             minDate = new Date(minDate.getTime() - datePaddingMs);
             maxDate = new Date(maxDate.getTime() + datePaddingMs);
         }

        const totalTime = maxDate.getTime() - minDate.getTime();

        const xScale = (date) => {
            if (!(date instanceof Date) || isNaN(date.getTime())) {
                console.warn("Invalid date passed to xScale:", date);
                return 0;
            }
            if (totalTime <= 0) return 0; // Avoid division by zero
            const timeOffset = date.getTime() - minDate.getTime();
            return Math.max(0, Math.min(width, (timeOffset / totalTime) * width)); // Clamp to width
        };

        // Define Y positions for different event types
        const rowHeight = 25; // Increased row height for clarity
        const opY = 0;
        const eventY = rowHeight * 1.5;
        const antibioticY = rowHeight * 3;
        const germY = rowHeight * 4.5;
        const labPlotAreaY = rowHeight * 6; // Start of lab plot area
        const labPlotAreaHeight = Math.max(80, height - labPlotAreaY); // Min height for lab area
        const crpPlotY = labPlotAreaY + labPlotAreaHeight * 0.75; // CRP at bottom
        const lcPlotY = labPlotAreaY + labPlotAreaHeight * 0.25;  // Lc at top

        // Prepare Lab Data
        const crpData = validEvents.filter(e => e.type === 'Labor CRP' && e.details && !isNaN(parseFloat(e.details)))
                                 .map(e => ({ date: new Date(e.date), value: parseFloat(e.details) }))
                                 .filter(d => !isNaN(d.date.getTime())) // Ensure date is valid
                                 .sort((a, b) => a.date - b.date); // Sort by date

        const lcData = validEvents.filter(e => e.type === 'Labor Lc' && e.details && !isNaN(parseFloat(e.details)))
                                .map(e => ({ date: new Date(e.date), value: parseFloat(e.details) }))
                                .filter(d => !isNaN(d.date.getTime()))
                                .sort((a, b) => a.date - b.date);

        // Lab Scales (adjust range slightly above max for better viz)
        const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value), 0) : 0; // Use 0 if no data
        const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value), 0) : 0;

        const crpYScale = (value) => {
             if (maxCrpValue <= 0) return crpPlotY; // Place at baseline if no positive max
             // Map value from [0, maxCrpValue * 1.1] to [crpPlotY, labPlotAreaY + labPlotAreaHeight * 0.5] (bottom half)
             const scaleMax = maxCrpValue * 1.1;
             const plotHeight = labPlotAreaHeight * 0.5;
             return crpPlotY - Math.min(1, Math.max(0, value / scaleMax)) * plotHeight;
        };

        const lcYScale = (value) => {
            if (maxLcValue <= 0) return lcPlotY;
            // Map value from [0, maxLcValue * 1.1] to [lcPlotY, labPlotAreaY] (top half)
            const scaleMax = maxLcValue * 1.1;
            const plotHeight = labPlotAreaHeight * 0.5;
            return lcPlotY - Math.min(1, Math.max(0, value / scaleMax)) * plotHeight;
        };

        // --- Draw Axes ---
        // X Axis Line
        const xAxisLine = document.createElementNS(SVG_NS, "line");
        xAxisLine.setAttribute('x1', 0); xAxisLine.setAttribute('y1', height); xAxisLine.setAttribute('x2', width); xAxisLine.setAttribute('y2', height); xAxisLine.setAttribute('class', 'axis-line');
        chartGroup.appendChild(xAxisLine);

        // X Ticks and Grid Lines
        const tickInterval = calculateTickInterval(totalTime, width);
        let currentTickDate = getFirstTickDate(minDate, tickInterval.unit);
        let safety = 0;
        const tickLabelY = height + 20; // Position labels below the axis line
        const tickMarkY1 = height;
        const tickMarkY2 = height + 5; // Small ticks below the line
        const gridLineY1 = 0; // Grid lines span the chart height
        const gridLineY2 = height;

        while (currentTickDate <= maxDate && safety < 200) {
             const xPos = xScale(currentTickDate);
             if (xPos >= 0 && xPos <= width) {
                 // Grid Line
                 const gridLine = document.createElementNS(SVG_NS, "line");
                 gridLine.setAttribute('x1', xPos); gridLine.setAttribute('y1', gridLineY1);
                 gridLine.setAttribute('x2', xPos); gridLine.setAttribute('y2', gridLineY2);
                 gridLine.setAttribute('class', 'grid-line');
                 chartGroup.appendChild(gridLine);

                 // Tick Mark
                 const tickMark = document.createElementNS(SVG_NS, "line");
                 tickMark.setAttribute('x1', xPos); tickMark.setAttribute('y1', tickMarkY1);
                 tickMark.setAttribute('x2', xPos); tickMark.setAttribute('y2', tickMarkY2);
                 tickMark.setAttribute('class', 'axis-tick');
                 chartGroup.appendChild(tickMark);

                 // Tick Label
                 const tickLabel = document.createElementNS(SVG_NS, "text");
                 tickLabel.setAttribute('x', xPos); tickLabel.setAttribute('y', tickLabelY);
                 tickLabel.setAttribute('class', 'axis-tick');
                 tickLabel.textContent = formatTickDate(currentTickDate, tickInterval.unit);
                 chartGroup.appendChild(tickLabel);
             }

             const tempDate = new Date(currentTickDate); // Use a temporary date for advancement
             if (tickInterval.unit === 'day') tempDate.setUTCDate(tempDate.getUTCDate() + tickInterval.step);
             else if (tickInterval.unit === 'week') tempDate.setUTCDate(tempDate.getUTCDate() + 7 * tickInterval.step);
             else if (tickInterval.unit === 'month') tempDate.setUTCMonth(tempDate.getUTCMonth() + tickInterval.step);
             else tempDate.setUTCDate(tempDate.getUTCDate() + 1); // Fallback

             if (tempDate <= currentTickDate) { console.warn("Tick date did not advance:", currentTickDate, tickInterval); break; }
             currentTickDate = tempDate;
             safety++;
        }
         if(safety >= 200) console.error("Exceeded max ticks safety limit in timeline drawing.");


        // Y Axis Labels
        const yLabels = [
            { y: opY + rowHeight / 2, text: 'OPs' },
            { y: eventY + rowHeight / 2, text: 'Ereignisse' },
            { y: antibioticY + rowHeight / 2, text: 'Antibiotika' },
            { y: germY + rowHeight / 2, text: 'Keim(e)' },
            { y: lcPlotY, text: `Lc (G/l)` }, // Align with top of Lc area
            { y: crpPlotY, text: `CRP (mg/l)` }  // Align with bottom of CRP area
        ];
        yLabels.forEach(label => {
            const textElement = document.createElementNS(SVG_NS, "text");
            textElement.setAttribute('x', -10); // Position left of chart area
            textElement.setAttribute('y', label.y);
            textElement.setAttribute('class', 'axis-label');
            textElement.setAttribute('dominant-baseline', 'middle'); // Center vertically
            textElement.textContent = label.text;
            chartGroup.appendChild(textElement);
        });


        // --- Draw Events ---
        try {
             // Plot Labs
            function plotLabData(data, yScale, className, pointClass, unit) {
                if (!data || data.length === 0) return;

                // Draw line connecting points
                if (data.length > 1) {
                    const linePath = document.createElementNS(SVG_NS, "path");
                    let d = `M ${xScale(data[0].date)} ${yScale(data[0].value)}`;
                    for (let i = 1; i < data.length; i++) {
                        d += ` L ${xScale(data[i].date)} ${yScale(data[i].value)}`;
                    }
                    linePath.setAttribute('d', d);
                    linePath.setAttribute('class', `${className}-plot`);
                    chartGroup.appendChild(linePath);
                }

                // Draw points and labels
                data.forEach(d => {
                    const x = xScale(d.date);
                    const y = yScale(d.value);

                    // Draw point
                    const point = document.createElementNS(SVG_NS, "circle");
                    point.setAttribute('cx', x);
                    point.setAttribute('cy', y);
                    point.setAttribute('r', 4); // Point radius
                    point.setAttribute('class', `${pointClass}-point marker-base`);
                    chartGroup.appendChild(point);

                    // Draw label (optional, can get cluttered)
                    /*
                    const label = document.createElementNS(SVG_NS, "text");
                    label.setAttribute('x', x);
                    label.setAttribute('y', y - 8); // Position above point
                    label.setAttribute('class', 'lab-value-label');
                    label.textContent = d.value.toFixed(1); // Format value
                    chartGroup.appendChild(label);
                    */

                    // Tooltip for point
                    const tooltipContent = `${dateLocaleFormat(d.date.toISOString().split('T')[0])}<br>${className.toUpperCase()}: ${d.value.toFixed(1)} ${unit}`;
                    point.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                    point.addEventListener('mouseout', hideTooltip);
                     // Optional: Add tooltip to label too if uncommented
                     // label.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                     // label.addEventListener('mouseout', hideTooltip);
                });
            }
            plotLabData(crpData, crpYScale, 'crp', 'crp', 'mg/l');
            plotLabData(lcData, lcYScale, 'lc', 'lc', 'G/l');

            // Draw Antibiotic Bars
            const antibioticPeriods = calculateAntibioticPeriods(validEvents);
            const barHeight = rowHeight * 0.6; // Height of the antibiotic bar
            const barY = antibioticY - barHeight / 2; // Center bar vertically in its row

            antibioticPeriods.forEach((period, index) => {
                const xStart = xScale(period.startDate);
                // Use maxDate for ongoing, ensuring it's within the chart
                const xEnd = xScale(period.endDate ? period.endDate : maxDate);
                const barWidth = Math.max(1, xEnd - xStart); // Ensure minimum width of 1px

                 if (barWidth > 0 && xStart < width) { // Only draw if visible
                     const rect = document.createElementNS(SVG_NS, "rect");
                     rect.setAttribute('x', xStart);
                     rect.setAttribute('y', barY);
                     rect.setAttribute('width', barWidth);
                     rect.setAttribute('height', barHeight);
                     rect.setAttribute('class', 'antibiotic-bar');
                     rect.setAttribute('rx', 2); // Slightly rounded corners
                     rect.setAttribute('ry', 2);
                     chartGroup.appendChild(rect);

                     const endDateFormatted = period.endDate ? dateLocaleFormat(period.endDate.toISOString().split('T')[0]) : 'Laufend';
                     const tooltipContent = `<b>Antibiotikum</b><br>${period.details || '(Unbekannt)'}<br>${dateLocaleFormat(period.startDate.toISOString().split('T')[0])} bis ${endDateFormatted}`;
                     rect.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                     rect.addEventListener('mouseout', hideTooltip);

                     // Add label inside the bar if it's wide enough
                      if (barWidth > 50) { // Only add label if bar is reasonably wide
                          const label = document.createElementNS(SVG_NS, "text");
                          label.setAttribute('x', xStart + barWidth / 2);
                          label.setAttribute('y', antibioticY); // Center text vertically
                          label.setAttribute('class', 'bar-label'); // White text
                          label.textContent = period.details.split(' ')[0]; // Show first word (drug name)
                          chartGroup.appendChild(label);
                          label.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent)); // Add tooltip to label too
                          label.addEventListener('mouseout', hideTooltip);
                      }
                 }
            });

            // --- Draw Point Markers (OPs, Events, Germs, Notes) ---
             validEvents.forEach(event => {
                const date = new Date(event.date);
                if (isNaN(date.getTime())) return; // Skip invalid dates

                const x = xScale(date);
                let y, markerClass, markerSymbol, markerSize = 6;

                switch (event.type) {
                    case 'OP':
                        y = opY;
                        markerClass = 'op-marker';
                         // Use a rotated square (diamond) for OP
                         markerSymbol = document.createElementNS(SVG_NS, "rect");
                         markerSymbol.setAttribute('x', x - markerSize / 2);
                         markerSymbol.setAttribute('y', y - markerSize / 2);
                         markerSymbol.setAttribute('width', markerSize);
                         markerSymbol.setAttribute('height', markerSize);
                         // Apply rotation around the center of the square
                         markerSymbol.setAttribute('transform', `rotate(45 ${x} ${y})`);
                        break;
                    case 'Klinisches Ereignis':
                        y = eventY;
                        markerClass = 'event-marker';
                        // Use a triangle for clinical events
                         markerSymbol = document.createElementNS(SVG_NS, "path");
                         markerSymbol.setAttribute('d', `M ${x} ${y - markerSize / 1.5} L ${x - markerSize / 1.5} ${y + markerSize / 3} L ${x + markerSize / 1.5} ${y + markerSize / 3} Z`); // Triangle pointing up
                         break;
                    case 'Mikrobiologie':
                         y = germY;
                         markerClass = 'germ-marker';
                          // Use a circle for germs
                         markerSymbol = document.createElementNS(SVG_NS, "circle");
                         markerSymbol.setAttribute('cx', x);
                         markerSymbol.setAttribute('cy', y);
                         markerSymbol.setAttribute('r', markerSize / 2);
                         break;
                     case 'Notiz':
                         y = eventY; // Place notes on the event line for now
                         markerClass = 'note-marker';
                          // Use a smaller square for notes
                         markerSymbol = document.createElementNS(SVG_NS, "rect");
                         markerSymbol.setAttribute('x', x - markerSize / 2.5);
                         markerSymbol.setAttribute('y', y - markerSize / 2.5);
                         markerSymbol.setAttribute('width', markerSize * 0.8);
                         markerSymbol.setAttribute('height', markerSize * 0.8);
                         break;
                    // Ignore lab events and antibiotic start/end for point markers
                    case 'Labor CRP':
                    case 'Labor Lc':
                    case 'Antibiotika Start':
                    case 'Antibiotika Ende':
                        return; // Don't draw individual points for these
                    default:
                        console.warn("Unbekannter Ereignistyp für Marker:", event.type);
                        return;
                }

                if (markerSymbol) {
                    markerSymbol.setAttribute('class', `${markerClass} marker-base`);
                    chartGroup.appendChild(markerSymbol);

                    const tooltipContent = `<b>${event.type} (${dateLocaleFormat(event.date)})</b><br>${event.details || '(Keine Details)'}`;
                    markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                    markerSymbol.addEventListener('mouseout', hideTooltip);
                }
            });

        } catch (e) { console.error("Fehler beim Zeichnen der Timeline-Elemente:", e); }

    } // End of renderTimeline


     // --- Timeline Helper: Calculate Antibiotic Periods ---
    function calculateAntibioticPeriods(allEvents) {
        const starts = allEvents.filter(e => e.type === 'Antibiotika Start' && e.date)
                                .map(e => ({...e, dateObj: new Date(e.date)}))
                                .filter(e => !isNaN(e.dateObj.getTime()))
                                .sort((a, b) => a.dateObj - b.dateObj);
        const ends = allEvents.filter(e => e.type === 'Antibiotika Ende' && e.date)
                              .map(e => ({...e, dateObj: new Date(e.date)}))
                              .filter(e => !isNaN(e.dateObj.getTime()))
                              .sort((a, b) => a.dateObj - b.dateObj);

        const periods = [];
        let usedEndIndices = new Set();

        starts.forEach(start => {
            const startDrugName = start.details ? start.details.split(' ')[0].trim().toLowerCase() : null;
            let matchedEnd = null;

            // Find the best matching end event
             const potentialEnds = ends
                 .map((end, index) => ({ ...end, index })) // Keep original index
                 .filter(end => !usedEndIndices.has(end.index) && end.dateObj >= start.dateObj)
                 // Sort potential ends: earlier date first, then specific match > generic stop
                 .sort((a, b) => {
                     const dateDiff = a.dateObj - b.dateObj;
                     if (dateDiff !== 0) return dateDiff;
                     const aIsSpecific = a.details && startDrugName && a.details.toLowerCase().includes(startDrugName);
                     const bIsSpecific = b.details && startDrugName && b.details.toLowerCase().includes(startDrugName);
                     if (aIsSpecific && !bIsSpecific) return -1; // Prefer specific A
                     if (!aIsSpecific && bIsSpecific) return 1;  // Prefer specific B
                     if (!a.details && b.details) return -1; // Prefer generic A over non-matching B
                     if (a.details && !b.details) return 1; // Prefer generic B over non-matching A
                     return 0; // Same preference
                  });


             // Iterate through potential ends to find the first valid match
             for (const end of potentialEnds) {
                  const endDrugName = end.details ? end.details.split(' ')[0].trim().toLowerCase() : null;
                  // Conditions for a match:
                  // 1. End is generic (no details)
                  // 2. End is specific and matches the start drug name
                  // 3. Start is generic (no details) - accept any end (less likely scenario)
                  if (!endDrugName || (startDrugName && endDrugName === startDrugName) || !startDrugName) {
                      matchedEnd = end;
                      usedEndIndices.add(end.index); // Mark this end event as used
                      break; // Stop searching once a match is found
                  }
             }


            periods.push({
                startDate: start.dateObj,
                endDate: matchedEnd ? matchedEnd.dateObj : null, // null means ongoing
                details: start.details || ''
            });
        });

        return periods;
    }


    // --- Timeline Axis Helper Functions ---
    function calculateTickInterval(timeRangeMs, widthPx) {
         const maxTicks = Math.max(5, Math.floor(widthPx / 80)); // Adjust density based on width (e.g., 80px per tick)
         const msPerDay = 24 * 60 * 60 * 1000;
         const days = timeRangeMs / msPerDay;

         if (days <= 0) return { unit: 'day', step: 1 }; // Default for zero range

         // Determine interval based on number of days and desired tick density
         if (days <= maxTicks * 1.5) return { unit: 'day', step: 1 }; // Daily ticks for short periods
         if (days <= maxTicks * 4) return { unit: 'day', step: 2 }; // Every 2 days
         if (days <= maxTicks * 10) return { unit: 'day', step: Math.ceil(days / maxTicks) }; // Dynamic day step
         if (days <= maxTicks * 20) return { unit: 'week', step: 1 }; // Weekly ticks
         if (days <= maxTicks * 50) return { unit: 'week', step: 2 }; // Bi-weekly ticks
         if (days <= maxTicks * 150) return { unit: 'month', step: 1 }; // Monthly ticks
         if (days <= maxTicks * 400) return { unit: 'month', step: 3 }; // Quarterly ticks
         return { unit: 'month', step: 6 }; // Semi-annual ticks for very long ranges
    }

    function getFirstTickDate(minDate, unit) {
        const firstTick = new Date(minDate);
        firstTick.setUTCHours(0, 0, 0, 0); // Start at midnight UTC

        switch (unit) {
            case 'day':
                // Already at the start of a day
                break;
            case 'week':
                 // Move to the *next* Monday (ISO week start) unless minDate is already Monday
                 const dayOfWeek = (firstTick.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
                 if (dayOfWeek > 0) {
                     firstTick.setUTCDate(firstTick.getUTCDate() + (7 - dayOfWeek));
                 }
                 // If the calculated first tick is before the minDate, advance by a week
                 if (firstTick < minDate) {
                     firstTick.setUTCDate(firstTick.getUTCDate() + 7);
                 }

                break;
            case 'month':
                firstTick.setUTCDate(1); // Start at the 1st of the month
                // If the 1st is before the minDate, move to the 1st of the *next* month
                 if (firstTick < minDate) {
                     firstTick.setUTCMonth(firstTick.getUTCMonth() + 1);
                 }
                break;
            default:
                break; // Should not happen
        }
         // Ensure the first tick is not before the actual minimum date requested
         while (firstTick < minDate) {
             if (unit === 'day') firstTick.setUTCDate(firstTick.getUTCDate() + 1); // Adjust step later if needed
             else if (unit === 'week') firstTick.setUTCDate(firstTick.getUTCDate() + 7);
             else if (unit === 'month') firstTick.setUTCMonth(firstTick.getUTCMonth() + 1);
             else break; // Failsafe
         }
        return firstTick;
    }

    function formatTickDate(date, unit) {
         if (!(date instanceof Date) || isNaN(date.getTime())) return '';
        try {
            switch (unit) {
                case 'day':
                    return date.toLocaleDateString(lang, dayMonthFormatOptions); // e.g., "5. Apr"
                case 'week':
                     return date.toLocaleDateString(lang, dayMonthFormatOptions); // Label week start date
                     // Alternative: Show week number? Might need a helper function.
                     // return `KW ${getWeekNumber(date)}`;
                case 'month':
                    // Show Month Year only if it's the first day of the month
                     if (date.getUTCDate() === 1) {
                         return date.toLocaleDateString(lang, monthYearFormatOptions); // e.g., "Apr 2024"
                     } else {
                         // For mid-month ticks (less common with this logic), show day/month
                         return date.toLocaleDateString(lang, dayMonthFormatOptions);
                     }
                default:
                    return date.toLocaleDateString(lang, dateFormatOptions); // Fallback to DD.MM.YYYY
            }
        } catch (e) {
             console.error("Error formatting tick date:", date, unit, e);
             return '';
        }
    }


    // --- Clipboard Functions ---
    function copyPatientDataToClipboard() {
        // Fixed function to copy actual data
        const name = patientNameInput.value.trim() || 'N/A';
        const dobFormatted = dateLocaleFormat(patientDobInput.value); // Uses the locale formatter
        const diagnosis = patientDiagnosisInput.value.trim() || 'N/A';
        const team = patientTeamInput.value.trim() || 'N/A';
        const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const orthoOption = orthoTeamSelect.options[orthoTeamSelect.selectedIndex];
        const ortho = orthoOption ? orthoOption.text : 'N/A'; // Get selected text

        const text = `Patient: ${name}\nGeburtsdatum: ${dobFormatted}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`;

        // Use <br> for HTML line breaks, especially for diagnosis
        const html = `<p><b>Patient:</b> ${escapeHtml(name)}<br><b>Geburtsdatum:</b> ${dobFormatted}<br><b>Diagnose:</b> ${escapeHtml(diagnosis).replace(/\n/g, '<br>')}<br><b>Orthopädie Team:</b> ${escapeHtml(ortho)}<br><b>Zust. ext. Team/Arzt:</b> ${escapeHtml(team)}<br><b>Infektiologie involviert:</b> ${infektio}<br><b>PLWC involviert:</b> ${plwc}</p>`;

        copyToClipboard(text, html, copyPatientDataButton);
    }

    function copySummaryToClipboard(listId, title, headers, buttonElement) {
        const listElement = document.getElementById(listId);
        if (!listElement || listElement.children.length === 0 || (listElement.children.length === 1 && listElement.firstElementChild.textContent.includes('Keine'))) {
            showCopyFeedback(buttonElement, 'Nichts zu kopieren', false);
            return;
        }

        let plainText = `${title}:\n`;
        let tableHtml = `<table class="clipboard-table"><caption>${escapeHtml(title)}</caption><thead><tr>`;
        headers.forEach(header => { tableHtml += `<th>${escapeHtml(header)}</th>`; });
        tableHtml += `</tr></thead><tbody>`;

        Array.from(listElement.children).forEach(li => {
            const dateSpan = li.querySelector('.date');
            const dateText = dateSpan ? dateSpan.textContent.replace(':', '').trim() : '';
            // Get the text content excluding the date part
            const detailsText = (dateSpan ? li.textContent.replace(dateSpan.textContent, '') : li.textContent).trim();

            plainText += `- ${dateText}: ${detailsText}\n`;
            tableHtml += `<tr><td>${escapeHtml(dateText)}</td><td>${escapeHtml(detailsText)}</td></tr>`;
        });

        tableHtml += `</tbody></table>`;

        copyToClipboard(plainText, tableHtml, buttonElement);
    }

    function copyToClipboard(plainText, htmlText, buttonElement) {
        if (!navigator.clipboard || !navigator.clipboard.write) {
            // Fallback for older browsers or insecure contexts (http)
             try {
                 const textArea = document.createElement("textarea");
                 textArea.value = plainText; // Fallback uses plain text only
                 textArea.style.position = "fixed"; // Prevent scrolling to bottom
                 textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.opacity = "0";
                 document.body.appendChild(textArea);
                 textArea.focus(); textArea.select();
                 const successful = document.execCommand('copy');
                 document.body.removeChild(textArea);
                 showCopyFeedback(buttonElement, successful ? 'Kopiert!' : 'Fehler (Fallback)', successful);
             } catch (err) {
                 console.error('Fallback Copy: Fehler beim Kopieren: ', err);
                 showCopyFeedback(buttonElement, 'Fehler', false);
             }
            return;
        }

        // Modern Clipboard API (requires HTTPS or localhost)
        navigator.clipboard.write([
            new ClipboardItem({
                "text/plain": new Blob([plainText], { type: "text/plain" }),
                "text/html": new Blob([htmlText], { type: "text/html" })
            })
        ]).then(() => {
            showCopyFeedback(buttonElement, 'Kopiert!', true);
        }).catch(err => {
            console.error('Async Copy: Fehler beim Kopieren: ', err);
            // Attempt plain text copy as a secondary fallback if HTML fails
             navigator.clipboard.writeText(plainText).then(() => {
                 showCopyFeedback(buttonElement, 'Kopiert (Text)!', true);
             }).catch(err2 => {
                 console.error('Async Copy: Fehler beim Kopieren von Text: ', err2);
                 showCopyFeedback(buttonElement, 'Fehler', false);
             });
        });
    }

    function showCopyFeedback(buttonElement, message, success) {
        const originalText = buttonElement.textContent;
        buttonElement.textContent = message;
        buttonElement.disabled = true;
        buttonElement.style.backgroundColor = success ? '#2ecc71' : '#e74c3c'; // Green for success, Red for error

        setTimeout(() => {
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
             buttonElement.style.backgroundColor = ''; // Reset style
        }, 1500); // Show feedback for 1.5 seconds
    }

    // Simple HTML escaping function
    function escapeHtml(unsafe) {
         if (unsafe === null || unsafe === undefined) return '';
        return unsafe
             .toString()
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }


    // --- Initial Load ---
    loadData(); // Load data and trigger initial render

}); // End DOMContentLoaded
