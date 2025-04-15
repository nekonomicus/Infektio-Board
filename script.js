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
    // Tooltip element removed

    // --- Global State ---
    let events = [];
    const SVG_NS = "http://www.w3.org/2000/svg";

    // --- Localization & Date Formatting ---
    const lang = 'de-CH';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const monthYearFormatOptions = { year: 'numeric', month: 'short' };
    const dayMonthFormatOptions = { month: 'short', day: 'numeric' };

    const dateLocaleFormat = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A';
        try {
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day || year.length !== 4) return dateStr;
            const date = new Date(Date.UTC(year, month - 1, day));
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
        if (!eventDetails && eventType !== 'Antibiotika Ende') {
            alert('Bitte Details / Wert eingeben.');
            return;
         }
         if ((eventType === 'Labor CRP' || eventType === 'Labor Lc') && isNaN(parseFloat(eventDetails))) {
            alert(`Bitte einen gültigen numerischen Wert für ${eventType} eingeben.`);
            return;
         }

        const newEvent = { id: Date.now(), date: isoDateValue, type: eventType, details: eventDetails };
        events.push(newEvent);
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveData();
        render();
        eventForm.reset();
        eventTypeInput.selectedIndex = 0;
        eventDateInput.focus();
    }

    function handleClearAll() {
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse UND Patientendaten löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            events = [];
            patientNameInput.value = '';
            patientDobInput.value = '';
            patientDiagnosisInput.value = '';
            patientTeamInput.value = '';
            infektioInvolviertCheckbox.checked = false;
            plwcInvolviertCheckbox.checked = false;
            orthoTeamSelect.selectedIndex = 0;
            saveData();
            render();
        }
    }

    function handlePrintTimeline() {
        if (events.length === 0) { alert("Es gibt keine Ereignisse zum Drucken der Timeline."); return; }
        // Ensure layout is calculated based on current dimensions before printing
        renderTimeline(); // Re-render to potentially adjust layout
        setTimeout(() => { // Allow slight delay for re-render if needed
            document.body.classList.add('printing-timeline-only');
            window.print();
            setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 500);
        }, 100);
    }


    function handleDeleteEvent(eventId) {
         const eventIndex = events.findIndex(event => event.id === eventId);
         if (eventIndex > -1) {
             const eventToDelete = events[eventIndex];
             if (confirm(`Soll das Ereignis "${dateLocaleFormat(eventToDelete.date)} - ${eventToDelete.type}: ${eventToDelete.details.substring(0,30)}..." wirklich gelöscht werden?`)) {
                events.splice(eventIndex, 1);
                saveData();
                render();
            }
         }
    }

    // --- Tooltip Functions Removed ---

    // --- Attach Event Listeners ---
    eventForm.addEventListener('submit', handleEventSubmit);
    clearAllButton.addEventListener('click', handleClearAll);
    printTimelineButton.addEventListener('click', handlePrintTimeline);

    [patientNameInput, patientDobInput, patientDiagnosisInput, patientTeamInput, infektioInvolviertCheckbox, plwcInvolviertCheckbox, orthoTeamSelect].forEach(element => {
        if(element) element.addEventListener('change', saveData);
    });

    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)', ['Datum', 'Details'], copyGermsButton));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));

    // --- Local Storage ---
    const STORAGE_KEY_EVENTS = 'patientTimelineEvents_v8'; // Version bump
    const STORAGE_KEY_PATIENT = 'patientTimelinePatientData_v8'; // Version bump

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
            if (!Array.isArray(events)) {
                console.warn("Geladene Ereignisse sind kein Array, setze zurück.");
                events = [];
             } else {
                 events = events.filter(event => event && typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}$/));
                 events.sort((a, b) => new Date(a.date) - new Date(b.date));
             }

            const storedPatientData = localStorage.getItem(STORAGE_KEY_PATIENT);
            if (storedPatientData) {
                const data = JSON.parse(storedPatientData);
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
            events = [];
        }
        render();
    }


    // --- Rendering Functions ---
    function render() {
        try { renderEventList(); } catch (e) { console.error("Fehler in renderEventList:", e); }
        try { renderSummaries(); } catch (e) { console.error("Fehler in renderSummaries:", e); }
        try {
             renderTimeline(); // Render timeline last as it might depend on calculated summary data if needed
             timelineStatus.style.display = events.length > 0 ? 'none' : 'block';
             timelineSvgWrapper.style.display = events.length > 0 ? 'block' : 'none';
        } catch (e) {
             console.error("Fehler in renderTimeline:", e);
             timelineSvg.innerHTML = '';
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
        const typeMap = {
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
            deleteButton.textContent = '✕';
            deleteButton.title = "Ereignis löschen";
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => handleDeleteEvent(event.id);
            li.appendChild(deleteButton);

            eventListElement.appendChild(li);
        });
    }

    function renderSummaries() {
        // (Summary rendering logic remains the same as before)
        opListElement.innerHTML = ''; germListElement.innerHTML = ''; antibioticListElement.innerHTML = '';
        const ops = events.filter(e => e.type === 'OP');
        const germs = events.filter(e => e.type === 'Mikrobiologie');
        const antibioticStarts = events.filter(e => e.type === 'Antibiotika Start').sort((a,b) => new Date(a.date) - new Date(b.date));
        const antibioticEnds = events.filter(e => e.type === 'Antibiotika Ende').sort((a,b) => new Date(a.date) - new Date(b.date));

        if (ops.length === 0) opListElement.innerHTML = '<li>Keine OPs eingegeben.</li>';
        else ops.forEach(op => opListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(op.date)}:</span> ${escapeHtml(op.details)}</li>`);

        if (germs.length === 0) germListElement.innerHTML = '<li>Keine Mikrobiologie eingegeben.</li>';
        else germs.forEach(germ => germListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(germ.date)}:</span> ${escapeHtml(germ.details)}</li>`);

        const antibiotics = []; let usedEndIds = new Set();
        antibioticStarts.forEach(start => {
            const startDrugName = start.details ? start.details.split(' ')[0].trim().toLowerCase() : null;
            let matchedEnd = null;
            const potentialEnds = antibioticEnds
                .filter(end => !usedEndIds.has(end.id) && new Date(end.date) >= new Date(start.date))
                .sort((a, b) => { /* Sorting logic remains */
                    const dateDiff = new Date(a.date) - new Date(b.date); if (dateDiff !== 0) return dateDiff;
                    const aMatches = a.details && startDrugName && a.details.toLowerCase().includes(startDrugName);
                    const bMatches = b.details && startDrugName && b.details.toLowerCase().includes(startDrugName);
                    if (aMatches && !bMatches) return -1; if (!aMatches && bMatches) return 1;
                    if (!a.details && b.details && !bMatches) return -1; if (a.details && !aMatches && !b.details) return 1;
                    return 0;
                 });
            for (const end of potentialEnds) {
                const endDrugName = end.details ? end.details.split(' ')[0].trim().toLowerCase() : null;
                if ( (startDrugName && endDrugName && endDrugName === startDrugName) || !endDrugName || !startDrugName ) {
                    matchedEnd = end; usedEndIds.add(matchedEnd.id); break;
                }
            }
             antibiotics.push({ start: start.date, end: matchedEnd ? matchedEnd.date : null, details: start.details || '' });
        });
        if (antibiotics.length === 0) antibioticListElement.innerHTML = '<li>Keine Antibiotika eingegeben.</li>';
        else antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => {
            const endDateFormatted = ab.end ? dateLocaleFormat(ab.end) : 'Laufend';
            antibioticListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(ab.start)} bis ${endDateFormatted}:</span> ${escapeHtml(ab.details) || '(Details fehlen)'}</li>`;
        });
    }


    // --- Timeline Rendering (Static, Multi-Row AB) ---
    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear

        const validEvents = events.filter(e => e.date && typeof e.date === 'string');
        if (validEvents.length === 0) { return; }

        const allDates = validEvents.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        const antibioticEndsDates = events.filter(e => e.type === 'Antibiotika Ende' && e.date).map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        allDates.push(...antibioticEndsDates);

        if (allDates.length === 0) { return; }

        // --- Calculate Antibiotic Periods and Required Rows ---
        const antibioticPeriods = calculateAntibioticPeriods(validEvents);
        const { assignedPeriods, maxRows: antibioticRowCount } = assignAntibioticRows(antibioticPeriods);
        const antibioticRowHeight = 15; // Height for each AB row + padding
        const totalAntibioticHeight = Math.max(1, antibioticRowCount) * antibioticRowHeight;

        // --- Setup ---
        const baseRowHeight = 25;
        const opY = 0;
        const eventY = opY + baseRowHeight * 1.5;
        const antibioticStartY = eventY + baseRowHeight * 1.5; // Start Y for first AB row
        const germY = antibioticStartY + totalAntibioticHeight + baseRowHeight * 0.5; // Position germs after AB block
        const labPlotAreaY = germY + baseRowHeight * 1.5;
        const labPlotAreaHeight = 80; // Fixed height for lab area
        const crpPlotY = labPlotAreaY + labPlotAreaHeight * 0.75; // Bottom half
        const lcPlotY = labPlotAreaY + labPlotAreaHeight * 0.25; // Top half

        const margin = { top: 40, right: 30, bottom: 60, left: 90 };
        const dynamicHeight = labPlotAreaY + labPlotAreaHeight; // Calculate required height
        const svgHeight = dynamicHeight + margin.top + margin.bottom;
        const svgWidth = Math.max(1000, timelineSvgWrapper.clientWidth);
        const width = svgWidth - margin.left - margin.right;
        const height = dynamicHeight; // Chart area height


        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('width', svgWidth); // Set explicit width/height for consistency
        timelineSvg.setAttribute('height', svgHeight);
        timelineSvg.style.minWidth = `${svgWidth}px`; // Ensure wrapper respects this
        timelineSvg.style.height = `${svgHeight}px`;

        const chartGroup = document.createElementNS(SVG_NS, "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Data Prep & Scales ---
        let minDate = new Date(Math.min(...allDates));
        let maxDate = new Date(Math.max(...allDates));
        if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) { return; } // Exit if invalid range

        const timeDiffMs = maxDate.getTime() - minDate.getTime();
        const datePaddingMs = Math.max(timeDiffMs * 0.02, 2 * 24 * 60 * 60 * 1000);
         if (timeDiffMs === 0) {
             minDate = new Date(minDate.getTime() - datePaddingMs / 2);
             maxDate = new Date(maxDate.getTime() + datePaddingMs / 2);
         } else {
             minDate = new Date(minDate.getTime() - datePaddingMs);
             maxDate = new Date(maxDate.getTime() + datePaddingMs);
         }
        const totalTime = maxDate.getTime() - minDate.getTime();

        const xScale = (date) => {
            if (!(date instanceof Date) || isNaN(date.getTime())) return 0;
            if (totalTime <= 0) return 0;
            const timeOffset = date.getTime() - minDate.getTime();
            return Math.max(0, Math.min(width, (timeOffset / totalTime) * width));
        };

        // Prepare Lab Data (same as before)
        const crpData = validEvents.filter(e => e.type === 'Labor CRP' && e.details && !isNaN(parseFloat(e.details)))
                                 .map(e => ({ date: new Date(e.date), value: parseFloat(e.details) })).filter(d => !isNaN(d.date.getTime())).sort((a, b) => a.date - b.date);
        const lcData = validEvents.filter(e => e.type === 'Labor Lc' && e.details && !isNaN(parseFloat(e.details)))
                                .map(e => ({ date: new Date(e.date), value: parseFloat(e.details) })).filter(d => !isNaN(d.date.getTime())).sort((a, b) => a.date - b.date);
        const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value), 0) : 0;
        const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value), 0) : 0;
        const crpYScale = (value) => { /* Scaling logic remains */
             if (maxCrpValue <= 0) return crpPlotY; const scaleMax = maxCrpValue * 1.1; const plotHeight = labPlotAreaHeight * 0.5;
             return crpPlotY - Math.min(1, Math.max(0, value / scaleMax)) * plotHeight;
        };
        const lcYScale = (value) => { /* Scaling logic remains */
            if (maxLcValue <= 0) return lcPlotY; const scaleMax = maxLcValue * 1.1; const plotHeight = labPlotAreaHeight * 0.5;
            return lcPlotY - Math.min(1, Math.max(0, value / scaleMax)) * plotHeight;
        };

        // --- Draw Axes ---
        // X Axis Line, Ticks, Grid Lines (same as before)
        const xAxisLine = document.createElementNS(SVG_NS, "line"); xAxisLine.setAttribute('x1', 0); xAxisLine.setAttribute('y1', height); xAxisLine.setAttribute('x2', width); xAxisLine.setAttribute('y2', height); xAxisLine.setAttribute('class', 'axis-line'); chartGroup.appendChild(xAxisLine);
        const tickInterval = calculateTickInterval(totalTime, width); let currentTickDate = getFirstTickDate(minDate, tickInterval.unit); let safety = 0; const tickLabelY = height + 20; const tickMarkY1 = height; const tickMarkY2 = height + 5; const gridLineY1 = 0; const gridLineY2 = height;
        while (currentTickDate <= maxDate && safety < 200) {
             const xPos = xScale(currentTickDate);
             if (xPos >= 0 && xPos <= width) {
                 const gridLine = document.createElementNS(SVG_NS, "line"); gridLine.setAttribute('x1', xPos); gridLine.setAttribute('y1', gridLineY1); gridLine.setAttribute('x2', xPos); gridLine.setAttribute('y2', gridLineY2); gridLine.setAttribute('class', 'grid-line'); chartGroup.appendChild(gridLine);
                 const tickMark = document.createElementNS(SVG_NS, "line"); tickMark.setAttribute('x1', xPos); tickMark.setAttribute('y1', tickMarkY1); tickMark.setAttribute('x2', xPos); tickMark.setAttribute('y2', tickMarkY2); tickMark.setAttribute('class', 'axis-tick'); chartGroup.appendChild(tickMark);
                 const tickLabel = document.createElementNS(SVG_NS, "text"); tickLabel.setAttribute('x', xPos); tickLabel.setAttribute('y', tickLabelY); tickLabel.setAttribute('class', 'axis-tick'); tickLabel.textContent = formatTickDate(currentTickDate, tickInterval.unit); chartGroup.appendChild(tickLabel);
             }
             const tempDate = new Date(currentTickDate);
             if (tickInterval.unit === 'day') tempDate.setUTCDate(tempDate.getUTCDate() + tickInterval.step); else if (tickInterval.unit === 'week') tempDate.setUTCDate(tempDate.getUTCDate() + 7 * tickInterval.step); else if (tickInterval.unit === 'month') tempDate.setUTCMonth(tempDate.getUTCMonth() + tickInterval.step); else tempDate.setUTCDate(tempDate.getUTCDate() + 1);
             if (tempDate <= currentTickDate) { break; } currentTickDate = tempDate; safety++;
        }

        // Y Axis Labels (Adjusted for dynamic antibiotic area)
        const yLabels = [
            { y: opY + baseRowHeight / 2, text: 'OPs' },
            { y: eventY + baseRowHeight / 2, text: 'Ereignisse' },
            // Label for the entire antibiotic block
             { y: antibioticStartY + totalAntibioticHeight / 2 - (antibioticRowCount > 1 ? 5 : 0), text: 'Antibiotika' },
            { y: germY + baseRowHeight / 2, text: 'Keim(e)' },
            { y: lcPlotY, text: `Lc (G/l)` },
            { y: crpPlotY, text: `CRP (mg/l)` }
        ];
        yLabels.forEach(label => {
            const textElement = document.createElementNS(SVG_NS, "text"); textElement.setAttribute('x', -10); textElement.setAttribute('y', label.y); textElement.setAttribute('class', 'axis-label'); textElement.setAttribute('dominant-baseline', 'middle'); textElement.textContent = label.text; chartGroup.appendChild(textElement);
        });


        // --- Draw Events (Static Labels, No Tooltips) ---
        try {
             // Plot Labs (with static labels)
            function plotLabData(data, yScale, className, pointClass, unit) {
                if (!data || data.length === 0) return;
                if (data.length > 1) {
                    const linePath = document.createElementNS(SVG_NS, "path"); let d = `M ${xScale(data[0].date)} ${yScale(data[0].value)}`;
                    for (let i = 1; i < data.length; i++) { d += ` L ${xScale(data[i].date)} ${yScale(data[i].value)}`; }
                    linePath.setAttribute('d', d); linePath.setAttribute('class', `${className}-plot`); chartGroup.appendChild(linePath);
                }
                data.forEach((d, i) => {
                    const x = xScale(d.date); const y = yScale(d.value);
                    const point = document.createElementNS(SVG_NS, "circle"); point.setAttribute('cx', x); point.setAttribute('cy', y); point.setAttribute('r', 3); point.setAttribute('class', `${pointClass}-point marker-base`); chartGroup.appendChild(point);
                     // Add static label above the point
                     const label = document.createElementNS(SVG_NS, "text");
                     label.setAttribute('x', x);
                     // Position label slightly above the point, alternating offset for dense points
                      label.setAttribute('y', y - (i % 2 === 0 ? 7 : 14)); // Stagger labels vertically
                     label.setAttribute('class', 'lab-value-text-label');
                     label.textContent = d.value.toFixed(1);
                     chartGroup.appendChild(label);
                });
            }
            plotLabData(crpData, crpYScale, 'crp', 'crp', 'mg/l');
            plotLabData(lcData, lcYScale, 'lc', 'lc', 'G/l');

            // Draw Antibiotic Bars (Multi-Row)
            const barHeight = antibioticRowHeight * 0.6; // Height of the bar itself
            assignedPeriods.forEach(period => {
                 const xStart = xScale(period.startDate);
                 const xEnd = xScale(period.endDate ? period.endDate : maxDate);
                 const barWidth = Math.max(1, xEnd - xStart);
                 // Calculate Y based on assigned row
                 const rowY = antibioticStartY + period.row * antibioticRowHeight;
                 const barY = rowY - barHeight / 2; // Center bar in its allocated space

                 if (barWidth > 0 && xStart < width) {
                     const rect = document.createElementNS(SVG_NS, "rect");
                     rect.setAttribute('x', xStart);
                     rect.setAttribute('y', barY);
                     rect.setAttribute('width', barWidth);
                     rect.setAttribute('height', barHeight);
                     rect.setAttribute('class', 'antibiotic-bar');
                     rect.setAttribute('rx', 2); rect.setAttribute('ry', 2);
                     chartGroup.appendChild(rect);

                      // Add static label next to the bar start
                      const label = document.createElementNS(SVG_NS, "text");
                      label.setAttribute('x', xStart + 5); // Position label slightly inside the bar start
                      label.setAttribute('y', rowY); // Vertically centered in the row
                      label.setAttribute('class', 'bar-text-label');
                      label.textContent = period.details.split(' ')[0] || '(Unbekannt)'; // Show drug name
                      chartGroup.appendChild(label);
                 }
            });

            // --- Draw Point Markers (Static Labels) ---
             const markerPositions = {}; // Track positions to offset overlapping markers: key = "yValue,xValue"
             validEvents.forEach(event => {
                const date = new Date(event.date); if (isNaN(date.getTime())) return;
                const x = xScale(date);
                let y, markerClass, markerSymbol, markerSize = 6, labelText = '';

                switch (event.type) {
                    case 'OP': y = opY; markerClass = 'op-marker'; markerSymbol = document.createElementNS(SVG_NS, "rect"); markerSymbol.setAttribute('width', markerSize); markerSymbol.setAttribute('height', markerSize); markerSymbol.setAttribute('transform', `rotate(45 ${x} ${y})`); labelText = event.details.split(' ')[0]; break; // Show first word of OP
                    case 'Klinisches Ereignis': y = eventY; markerClass = 'event-marker'; markerSymbol = document.createElementNS(SVG_NS, "path"); markerSymbol.setAttribute('d', `M ${x} ${y - markerSize / 1.5} L ${x - markerSize / 1.5} ${y + markerSize / 3} L ${x + markerSize / 1.5} ${y + markerSize / 3} Z`); labelText = event.details; break;
                    case 'Mikrobiologie': y = germY; markerClass = 'germ-marker'; markerSymbol = document.createElementNS(SVG_NS, "circle"); markerSymbol.setAttribute('r', markerSize / 2); labelText = event.details; break;
                     case 'Notiz': y = eventY; markerClass = 'note-marker'; markerSymbol = document.createElementNS(SVG_NS, "rect"); markerSymbol.setAttribute('width', markerSize * 0.8); markerSymbol.setAttribute('height', markerSize * 0.8); labelText = event.details; break;
                    default: return; // Ignore labs, AB start/end
                }

                if (markerSymbol) {
                    // Simple overlap check and vertical offset
                     let yOffset = 0;
                     const posKey = `${y},${Math.round(x)}`; // Key based on Y and rounded X
                     if (markerPositions[posKey]) {
                         yOffset = markerPositions[posKey] * (markerSize + 4); // Offset by marker size + padding
                         markerPositions[posKey]++;
                     } else {
                         markerPositions[posKey] = 1;
                     }
                     const finalY = y + yOffset;

                     // Adjust symbol position
                     if (event.type === 'OP' || event.type === 'Notiz') { // Rectangles need x,y adjustment
                         markerSymbol.setAttribute('x', x - markerSize / 2);
                         markerSymbol.setAttribute('y', finalY - markerSize / 2);
                         if(event.type === 'OP') markerSymbol.setAttribute('transform', `rotate(45 ${x} ${finalY})`); // Re-apply transform with new Y
                     } else if (event.type === 'Mikrobiologie') { // Circle needs cy
                         markerSymbol.setAttribute('cx', x);
                         markerSymbol.setAttribute('cy', finalY);
                     } else if (event.type === 'Klinisches Ereignis') { // Path needs transform
                         markerSymbol.setAttribute('transform', `translate(0, ${yOffset})`); // Translate path vertically
                     }


                    markerSymbol.setAttribute('class', `${markerClass} marker-base`);
                    chartGroup.appendChild(markerSymbol);

                    // Add static label next to the marker
                    const label = document.createElementNS(SVG_NS, "text");
                    label.setAttribute('x', x + markerSize); // Position to the right
                    label.setAttribute('y', finalY); // Align vertically with (offset) marker center
                    label.setAttribute('class', 'marker-text-label');
                    label.setAttribute('text-anchor', 'start'); // Align text start to the right of marker
                    label.textContent = labelText.length > 25 ? labelText.substring(0, 22) + '...' : labelText; // Truncate long labels
                    chartGroup.appendChild(label);
                }
            });

        } catch (e) { console.error("Fehler beim Zeichnen der Timeline-Elemente:", e); }

    } // End of renderTimeline


     // --- Helper: Calculate Antibiotic Periods (Identical to previous) ---
     function calculateAntibioticPeriods(allEvents) {
        // This function's logic remains the same as the previous version
        const starts = allEvents.filter(e => e.type === 'Antibiotika Start' && e.date).map(e => ({...e, dateObj: new Date(e.date)})).filter(e => !isNaN(e.dateObj.getTime())).sort((a, b) => a.dateObj - b.dateObj);
        const ends = allEvents.filter(e => e.type === 'Antibiotika Ende' && e.date).map(e => ({...e, dateObj: new Date(e.date)})).filter(e => !isNaN(e.dateObj.getTime())).sort((a, b) => a.dateObj - b.dateObj);
        const periods = []; let usedEndIndices = new Set();
        starts.forEach(start => {
            const startDrugName = start.details ? start.details.split(' ')[0].trim().toLowerCase() : null;
            let matchedEnd = null;
             const potentialEnds = ends.map((end, index) => ({ ...end, index })).filter(end => !usedEndIndices.has(end.index) && end.dateObj >= start.dateObj).sort((a, b) => { /* Sort logic */ const dateDiff = a.dateObj - b.dateObj; if (dateDiff !== 0) return dateDiff; const aIsSpecific = a.details && startDrugName && a.details.toLowerCase().includes(startDrugName); const bIsSpecific = b.details && startDrugName && b.details.toLowerCase().includes(startDrugName); if (aIsSpecific && !bIsSpecific) return -1; if (!aIsSpecific && bIsSpecific) return 1; if (!a.details && b.details) return -1; if (a.details && !b.details) return 1; return 0; });
             for (const end of potentialEnds) { const endDrugName = end.details ? end.details.split(' ')[0].trim().toLowerCase() : null; if (!endDrugName || (startDrugName && endDrugName === startDrugName) || !startDrugName) { matchedEnd = end; usedEndIndices.add(end.index); break; } }
            periods.push({ startDate: start.dateObj, endDate: matchedEnd ? matchedEnd.dateObj : null, details: start.details || '' });
        });
        return periods;
    }

    // --- Helper: Assign Antibiotic Rows to Avoid Overlap ---
    function assignAntibioticRows(periods) {
         const assignedPeriods = [];
         let maxRows = 0;
         // Sort periods by start date, then end date (null end date treated as infinity)
         periods.sort((a, b) => {
             const startDiff = a.startDate - b.startDate;
             if (startDiff !== 0) return startDiff;
             const endA = a.endDate ? a.endDate.getTime() : Infinity;
             const endB = b.endDate ? b.endDate.getTime() : Infinity;
             return endA - endB;
         });

         const rowEnds = []; // Track the end time of the last period in each row

         for (const period of periods) {
             let assignedRow = -1;
             // Try to find an existing row where this period can fit
             for (let i = 0; i < rowEnds.length; i++) {
                 if (period.startDate >= rowEnds[i]) { // Can fit in this row
                     assignedRow = i;
                     rowEnds[i] = period.endDate ? period.endDate.getTime() : Infinity; // Update row end time
                     break;
                 }
             }

             // If no suitable row found, add a new row
             if (assignedRow === -1) {
                 assignedRow = rowEnds.length;
                 rowEnds.push(period.endDate ? period.endDate.getTime() : Infinity);
             }

             assignedPeriods.push({ ...period, row: assignedRow });
             maxRows = Math.max(maxRows, assignedRow + 1); // Update max rows needed
         }

         return { assignedPeriods, maxRows };
     }


    // --- Timeline Axis Helper Functions (Identical to previous) ---
    function calculateTickInterval(timeRangeMs, widthPx) { /* Logic remains */
        const maxTicks = Math.max(5, Math.floor(widthPx / 80)); const msPerDay = 86400000; const days = timeRangeMs / msPerDay; if (days <= 0) return { unit: 'day', step: 1 }; if (days <= maxTicks * 1.5) return { unit: 'day', step: 1 }; if (days <= maxTicks * 4) return { unit: 'day', step: 2 }; if (days <= maxTicks * 10) return { unit: 'day', step: Math.ceil(days / maxTicks) }; if (days <= maxTicks * 20) return { unit: 'week', step: 1 }; if (days <= maxTicks * 50) return { unit: 'week', step: 2 }; if (days <= maxTicks * 150) return { unit: 'month', step: 1 }; if (days <= maxTicks * 400) return { unit: 'month', step: 3 }; return { unit: 'month', step: 6 };
    }
    function getFirstTickDate(minDate, unit) { /* Logic remains */
        const firstTick = new Date(minDate); firstTick.setUTCHours(0, 0, 0, 0); switch (unit) { case 'day': break; case 'week': const dayOfWeek = (firstTick.getUTCDay() + 6) % 7; if (dayOfWeek > 0) { firstTick.setUTCDate(firstTick.getUTCDate() + (7 - dayOfWeek));} if (firstTick < minDate) { firstTick.setUTCDate(firstTick.getUTCDate() + 7); } break; case 'month': firstTick.setUTCDate(1); if (firstTick < minDate) { firstTick.setUTCMonth(firstTick.getUTCMonth() + 1); } break; default: break; } while (firstTick < minDate) { if (unit === 'day') firstTick.setUTCDate(firstTick.getUTCDate() + 1); else if (unit === 'week') firstTick.setUTCDate(firstTick.getUTCDate() + 7); else if (unit === 'month') firstTick.setUTCMonth(firstTick.getUTCMonth() + 1); else break; } return firstTick;
    }
    function formatTickDate(date, unit) { /* Logic remains */
         if (!(date instanceof Date) || isNaN(date.getTime())) return ''; try { switch (unit) { case 'day': return date.toLocaleDateString(lang, dayMonthFormatOptions); case 'week': return date.toLocaleDateString(lang, dayMonthFormatOptions); case 'month': if (date.getUTCDate() === 1) { return date.toLocaleDateString(lang, monthYearFormatOptions); } else { return date.toLocaleDateString(lang, dayMonthFormatOptions); } default: return date.toLocaleDateString(lang, dateFormatOptions); } } catch (e) { console.error("Error formatting tick date:", date, unit, e); return ''; }
    }


    // --- Clipboard Functions (Identical to previous) ---
    function copyPatientDataToClipboard() { /* Logic remains */
        const name = patientNameInput.value.trim() || 'N/A'; const dobFormatted = dateLocaleFormat(patientDobInput.value); const diagnosis = patientDiagnosisInput.value.trim() || 'N/A'; const team = patientTeamInput.value.trim() || 'N/A'; const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein'; const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein'; const orthoOption = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]; const ortho = orthoOption ? orthoOption.text : 'N/A'; const text = `Patient: ${name}\nGeburtsdatum: ${dobFormatted}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`; const html = `<p><b>Patient:</b> ${escapeHtml(name)}<br><b>Geburtsdatum:</b> ${dobFormatted}<br><b>Diagnose:</b> ${escapeHtml(diagnosis).replace(/\n/g, '<br>')}<br><b>Orthopädie Team:</b> ${escapeHtml(ortho)}<br><b>Zust. ext. Team/Arzt:</b> ${escapeHtml(team)}<br><b>Infektiologie involviert:</b> ${infektio}<br><b>PLWC involviert:</b> ${plwc}</p>`; copyToClipboard(text, html, copyPatientDataButton);
    }
    function copySummaryToClipboard(listId, title, headers, buttonElement) { /* Logic remains */
        const listElement = document.getElementById(listId); if (!listElement || listElement.children.length === 0 || (listElement.children.length === 1 && listElement.firstElementChild.textContent.includes('Keine'))) { showCopyFeedback(buttonElement, 'Nichts zu kopieren', false); return; } let plainText = `${title}:\n`; let tableHtml = `<table class="clipboard-table"><caption>${escapeHtml(title)}</caption><thead><tr>`; headers.forEach(header => { tableHtml += `<th>${escapeHtml(header)}</th>`; }); tableHtml += `</tr></thead><tbody>`; Array.from(listElement.children).forEach(li => { const dateSpan = li.querySelector('.date'); const dateText = dateSpan ? dateSpan.textContent.replace(':', '').trim() : ''; const detailsText = (dateSpan ? li.textContent.replace(dateSpan.textContent, '') : li.textContent).trim(); plainText += `- ${dateText}: ${detailsText}\n`; tableHtml += `<tr><td>${escapeHtml(dateText)}</td><td>${escapeHtml(detailsText)}</td></tr>`; }); tableHtml += `</tbody></table>`; copyToClipboard(plainText, tableHtml, buttonElement);
    }
    function copyToClipboard(plainText, htmlText, buttonElement) { /* Logic remains */
        if (!navigator.clipboard || !navigator.clipboard.write) { try { const textArea = document.createElement("textarea"); textArea.value = plainText; textArea.style.position = "fixed"; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.opacity = "0"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); const successful = document.execCommand('copy'); document.body.removeChild(textArea); showCopyFeedback(buttonElement, successful ? 'Kopiert!' : 'Fehler (Fallback)', successful); } catch (err) { console.error('Fallback Copy: Fehler: ', err); showCopyFeedback(buttonElement, 'Fehler', false); } return; } navigator.clipboard.write([ new ClipboardItem({ "text/plain": new Blob([plainText], { type: "text/plain" }), "text/html": new Blob([htmlText], { type: "text/html" }) }) ]).then(() => { showCopyFeedback(buttonElement, 'Kopiert!', true); }).catch(err => { console.error('Async Copy: Fehler: ', err); navigator.clipboard.writeText(plainText).then(() => { showCopyFeedback(buttonElement, 'Kopiert (Text)!', true); }).catch(err2 => { console.error('Async Copy: Text Fehler: ', err2); showCopyFeedback(buttonElement, 'Fehler', false); }); });
    }
    function showCopyFeedback(buttonElement, message, success) { /* Logic remains */
        const originalText = buttonElement.textContent; buttonElement.textContent = message; buttonElement.disabled = true; buttonElement.style.backgroundColor = success ? '#2ecc71' : '#e74c3c'; setTimeout(() => { buttonElement.textContent = originalText; buttonElement.disabled = false; buttonElement.style.backgroundColor = ''; }, 1500);
    }
    function escapeHtml(unsafe) { /* Logic remains */
         if (unsafe === null || unsafe === undefined) return ''; return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // --- Initial Load ---
    loadData(); // Load data and trigger initial render

}); // End DOMContentLoaded
