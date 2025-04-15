document.addEventListener('DOMContentLoaded', () => {
    // --- Element Caching ---
    const eventForm = document.getElementById('eventForm');
    const eventListElement = document.getElementById('eventList');
    const timelineSvg = document.getElementById('timelineSvg');
    const timelineSvgWrapper = document.getElementById('timelineSvgWrapper');
    const opListElement = document.getElementById('opList');
    // Changed germListElement to probeListElement
    const probeListElement = document.getElementById('probeList');
    const antibioticListElement = document.getElementById('antibioticList');
    const timelineStatus = document.getElementById('timelineStatus');
    const clearAllButton = document.getElementById('clearAllButton');
    const copyPatientDataButton = document.getElementById('copyPatientDataButton');
    const copyOpsButton = document.getElementById('copyOpsButton');
    // Changed copyGermsButton to copyProbesButton
    const copyProbesButton = document.getElementById('copyProbesButton');
    const copyAntibioticsButton = document.getElementById('copyAntibioticsButton');
    const printTimelineButton = document.getElementById('printTimelineButton');
    // Patient Info Inputs (same)
    const patientNameInput = document.getElementById('patientName');
    const patientDobInput = document.getElementById('patientDob');
    const patientDiagnosisInput = document.getElementById('patientDiagnosis');
    const patientTeamInput = document.getElementById('patientTeam');
    const infektioInvolviertCheckbox = document.getElementById('infektioInvolviert');
    const plwcInvolviertCheckbox = document.getElementById('plwcInvolviert');
    const orthoTeamSelect = document.getElementById('orthoTeam');
    // Event Inputs
    const eventDateInput = document.getElementById('eventDate');
    const eventTypeInput = document.getElementById('eventType');
    const eventDetailsInput = document.getElementById('eventDetails');
    const eventDetailsLabel = document.getElementById('eventDetailsLabel');
    // New Probe Inputs
    const probeFields = document.getElementById('probeFields');
    const probeArtInput = document.getElementById('probeArt');
    const probeKeimInput = document.getElementById('probeKeim');

    // --- Global State ---
    let events = [];
    const SVG_NS = "http://www.w3.org/2000/svg";

    // --- Localization & Date Formatting (same) ---
    const lang = 'de-CH';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const monthYearFormatOptions = { year: 'numeric', month: 'short' };
    const dayMonthFormatOptions = { month: 'short', day: 'numeric' };
    const dateLocaleFormat = (dateStr) => { /* same as before */
        if (!dateStr || typeof dateStr !== 'string') return 'N/A'; try { const [year, month, day] = dateStr.split('-'); if (!year || !month || !day || year.length !== 4) return dateStr; const date = new Date(Date.UTC(year, month - 1, day)); if (isNaN(date.getTime())) return 'Ungültiges Datum'; return date.toLocaleDateString(lang, dateFormatOptions); } catch (e) { console.error("Error formatting date:", dateStr, e); return 'Fehler'; }
    };

    // --- Event Handling ---
    function handleEventTypeChange() {
        const selectedType = eventTypeInput.value;
        // Show/hide probe fields
        probeFields.style.display = selectedType === 'Probenentnahme' ? 'flex' : 'none';

        // Update details label/placeholder based on type
        switch (selectedType) {
            case 'OP':
                eventDetailsLabel.textContent = 'OP Details:';
                eventDetailsInput.placeholder = 'Beschreibung der Operation...';
                eventDetailsInput.required = true;
                break;
            case 'Antibiotika Start':
            case 'Antibiotika Ende':
                eventDetailsLabel.textContent = 'Antibiotikum / Dosis:';
                eventDetailsInput.placeholder = 'z.B. Co-Amoxicillin 1.2g iv';
                // Required for Start, optional for End (handled in submit)
                eventDetailsInput.required = (selectedType === 'Antibiotika Start');
                break;
            case 'Labor CRP':
                eventDetailsLabel.textContent = 'CRP Wert (mg/l):';
                eventDetailsInput.placeholder = 'Numerischer Wert, z.B. 50.5';
                eventDetailsInput.required = true;
                break;
            case 'Labor Lc':
                eventDetailsLabel.textContent = 'Lc Wert (G/l):';
                eventDetailsInput.placeholder = 'Numerischer Wert, z.B. 12.3';
                eventDetailsInput.required = true;
                break;
            case 'Probenentnahme':
                eventDetailsLabel.textContent = 'Zusätzliche Details zur Probe:';
                eventDetailsInput.placeholder = '(Optional) z.B. Entnahmeort...';
                eventDetailsInput.required = false; // Details are optional for probes
                break;
            default:
                eventDetailsLabel.textContent = 'Details / Wert:';
                eventDetailsInput.placeholder = 'Details...';
                eventDetailsInput.required = false; // Default to optional
        }
    }

    function handleEventSubmit(e) {
        e.preventDefault();
        const eventType = eventTypeInput.value;
        const eventDate = eventDateInput.value;
        const eventDetails = eventDetailsInput.value.trim();
        const probeArt = probeArtInput.value;
        const probeKeim = probeKeimInput.value.trim();

        // Basic validation
        if (!eventDate) { alert('Bitte Datum auswählen.'); return; }
        if (!eventType) { alert('Bitte Ereignistyp auswählen.'); return; }

        // Type-specific validation
        let newEvent = { id: Date.now(), date: eventDate, type: eventType };

        switch (eventType) {
            case 'OP':
            case 'Antibiotika Start':
                 if (!eventDetails) { alert(`Bitte Details für ${eventType} eingeben.`); return; }
                 newEvent.details = eventDetails;
                 break;
            case 'Antibiotika Ende':
                // Details optional for AB Ende
                newEvent.details = eventDetails;
                 break;
            case 'Labor CRP':
            case 'Labor Lc':
                const numericValue = parseFloat(eventDetails);
                if (isNaN(numericValue)) { alert(`Bitte einen gültigen numerischen Wert für ${eventType} eingeben.`); return; }
                newEvent.details = numericValue.toString(); // Store as string, consistent with others
                break;
            case 'Probenentnahme':
                 if (!probeArt) { alert('Bitte Probenart auswählen.'); return; }
                 if (!probeKeim) { alert('Bitte nachgewiesenen Keim eingeben (oder "Negativ").'); return; }
                 newEvent.sampleType = probeArt;
                 newEvent.germ = probeKeim;
                 newEvent.details = eventDetails; // Optional details
                 break;
            default:
                console.error("Unbekannter Ereignistyp beim Speichern:", eventType);
                return; // Don't save unknown types
        }

        events.push(newEvent);
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveData();
        render();
        // Reset form fields
        eventForm.reset();
        handleEventTypeChange(); // Reset conditional fields and labels
        eventDateInput.focus();
    }

    function handleClearAll() { /* same as before */
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse UND Patientendaten löschen möchten? Dies kann nicht rückgängig gemacht werden.')) { events = []; patientNameInput.value = ''; patientDobInput.value = ''; patientDiagnosisInput.value = ''; patientTeamInput.value = ''; infektioInvolviertCheckbox.checked = false; plwcInvolviertCheckbox.checked = false; orthoTeamSelect.selectedIndex = 0; saveData(); render(); }
    }

    function handlePrintTimeline() { /* same as before */
        if (events.length === 0) { alert("Es gibt keine Ereignisse zum Drucken der Timeline."); return; } renderTimeline(); setTimeout(() => { document.body.classList.add('printing-timeline-only'); window.print(); setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 500); }, 100);
    }

    function handleDeleteEvent(eventId) { /* same as before */
         const eventIndex = events.findIndex(event => event.id === eventId); if (eventIndex > -1) { const eventToDelete = events[eventIndex]; if (confirm(`Soll das Ereignis "${dateLocaleFormat(eventToDelete.date)} - ${eventToDelete.type}: ${ (eventToDelete.details || eventToDelete.germ || '').substring(0,30)}..." wirklich gelöscht werden?`)) { events.splice(eventIndex, 1); saveData(); render(); } }
    }

    // --- Attach Event Listeners ---
    eventForm.addEventListener('submit', handleEventSubmit);
    clearAllButton.addEventListener('click', handleClearAll);
    printTimelineButton.addEventListener('click', handlePrintTimeline);
    eventTypeInput.addEventListener('change', handleEventTypeChange); // Add listener for type change

    // Patient data saving (same)
    [patientNameInput, patientDobInput, patientDiagnosisInput, patientTeamInput, infektioInvolviertCheckbox, plwcInvolviertCheckbox, orthoTeamSelect].forEach(element => { if(element) element.addEventListener('change', saveData); });

    // Copy Buttons (Update for Probes)
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyProbesButton.addEventListener('click', () => copySummaryToClipboard('probeList', 'Übersicht Probenentnahmen', ['Datum', 'Art', 'Keim', 'Details'], copyProbesButton)); // Added headers
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));

    // --- Local Storage ---
    const STORAGE_KEY_EVENTS = 'patientTimelineEvents_v9'; // Version bump
    const STORAGE_KEY_PATIENT = 'patientTimelinePatientData_v9';

    function saveData() { /* Same logic, stores new event structure */
        try { localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events)); const patientData = { name: patientNameInput.value, dob: patientDobInput.value, diagnosis: patientDiagnosisInput.value, team: patientTeamInput.value, infektio: infektioInvolviertCheckbox.checked, plwc: plwcInvolviertCheckbox.checked, ortho: orthoTeamSelect.value }; localStorage.setItem(STORAGE_KEY_PATIENT, JSON.stringify(patientData)); } catch (e) { console.error("Fehler beim Speichern:", e); alert("Fehler beim Speichern.");}
    }

    function loadData() { /* Same logic, handles loading new event structure */
        try {
            const storedEvents = localStorage.getItem(STORAGE_KEY_EVENTS); events = storedEvents ? JSON.parse(storedEvents) : [];
            if (!Array.isArray(events)) { events = []; }
            else { // Add minimal validation for new fields if loading older data
                 events = events.filter(event => event && typeof event.date === 'string' && event.date.match(/^\d{4}-\d{2}-\d{2}$/));
                 events.forEach(event => { if (event.type === 'Probenentnahme') { event.sampleType = event.sampleType || ''; event.germ = event.germ || ''; }});
                 events.sort((a, b) => new Date(a.date) - new Date(b.date));
             }
            const storedPatientData = localStorage.getItem(STORAGE_KEY_PATIENT);
            if (storedPatientData) { const data = JSON.parse(storedPatientData); if (typeof data === 'object' && data !== null) { patientNameInput.value = data.name || ''; patientDobInput.value = data.dob || ''; patientDiagnosisInput.value = data.diagnosis || ''; patientTeamInput.value = data.team || ''; infektioInvolviertCheckbox.checked = data.infektio || false; plwcInvolviertCheckbox.checked = data.plwc || false; orthoTeamSelect.value = data.ortho || ''; } }
        } catch (e) { console.error("Fehler Laden:", e); alert("Fehler Laden."); events = []; }
        render();
    }


    // --- Rendering Functions ---
    function render() {
        try { renderEventList(); } catch (e) { console.error("Fehler renderEventList:", e); }
        try { renderSummaries(); } catch (e) { console.error("Fehler renderSummaries:", e); }
        try {
             renderTimeline();
             timelineStatus.style.display = events.length > 0 ? 'none' : 'block';
             timelineSvgWrapper.style.display = events.length > 0 ? 'block' : 'none';
        } catch (e) {
             console.error("Fehler renderTimeline:", e); timelineSvg.innerHTML = ''; timelineStatus.textContent = "Fehler Timeline Render. Konsole (F12)."; timelineStatus.style.color = 'red'; timelineStatus.style.display = 'block'; timelineSvgWrapper.style.display = 'none';
        }
    }

    function renderEventList() {
        eventListElement.innerHTML = '';
        if (events.length === 0) { eventListElement.innerHTML = '<li>Noch keine Ereignisse hinzugefügt.</li>'; return; }
        const typeMap = { // Updated map
            'OP': 'OP', 'Antibiotika Start': 'AB Start', 'Antibiotika Ende': 'AB Ende',
            'Probenentnahme': 'Probe', 'Labor CRP': 'CRP', 'Labor Lc': 'Lc'
          };
        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            const displayType = typeMap[event.type] || event.type;
            let displayText = `${dateLocaleFormat(event.date)} - ${displayType}: `;

            // Append specific details based on type
            switch(event.type) {
                case 'OP':
                case 'Antibiotika Start':
                case 'Antibiotika Ende':
                    displayText += event.details || ''; break;
                case 'Labor CRP':
                    displayText += `${event.details} mg/l`; break;
                case 'Labor Lc':
                    displayText += `${event.details} G/l`; break;
                case 'Probenentnahme':
                    displayText += `${event.sampleType || '?'} - Keim: ${event.germ || '?'} ${event.details ? `(${event.details})` : ''}`; break;
                 default: displayText += event.details || '';
            }

            textSpan.textContent = displayText;
            li.appendChild(textSpan);

            const deleteButton = document.createElement('button'); /* ... */ deleteButton.textContent = '✕'; deleteButton.title = "Löschen"; deleteButton.classList.add('delete-button'); deleteButton.onclick = () => handleDeleteEvent(event.id); li.appendChild(deleteButton);
            eventListElement.appendChild(li);
        });
    }

    function renderSummaries() {
        opListElement.innerHTML = ''; probeListElement.innerHTML = ''; antibioticListElement.innerHTML = ''; // Changed germList to probeList

        const ops = events.filter(e => e.type === 'OP');
        const probes = events.filter(e => e.type === 'Probenentnahme'); // Filter for probes
        const antibioticStarts = events.filter(e => e.type === 'Antibiotika Start').sort((a,b) => new Date(a.date) - new Date(b.date));
        const antibioticEnds = events.filter(e => e.type === 'Antibiotika Ende').sort((a,b) => new Date(a.date) - new Date(b.date));

        // OPs (same)
        if (ops.length === 0) opListElement.innerHTML = '<li>Keine OPs.</li>';
        else ops.forEach(op => opListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(op.date)}:</span> ${escapeHtml(op.details)}</li>`);

        // Probes (New)
        if (probes.length === 0) probeListElement.innerHTML = '<li>Keine Proben.</li>';
        else probes.forEach(probe => {
            probeListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(probe.date)}:</span> Art: ${escapeHtml(probe.sampleType || '?')} - Keim: ${escapeHtml(probe.germ || '?')} ${probe.details ? `(${escapeHtml(probe.details)})` : ''}</li>`;
        });

        // Antibiotics (same logic)
        const antibiotics = []; let usedEndIds = new Set();
        antibioticStarts.forEach(start => { /* same matching logic */
            const startDrugName = start.details ? start.details.split(' ')[0].trim().toLowerCase() : null; let matchedEnd = null; const potentialEnds = antibioticEnds.filter(end => !usedEndIds.has(end.id) && new Date(end.date) >= new Date(start.date)).sort((a, b) => { const dateDiff = new Date(a.date) - new Date(b.date); if (dateDiff !== 0) return dateDiff; const aMatches = a.details && startDrugName && a.details.toLowerCase().includes(startDrugName); const bMatches = b.details && startDrugName && b.details.toLowerCase().includes(startDrugName); if (aMatches && !bMatches) return -1; if (!aMatches && bMatches) return 1; if (!a.details && b.details && !bMatches) return -1; if (a.details && !aMatches && !b.details) return 1; return 0; }); for (const end of potentialEnds) { const endDrugName = end.details ? end.details.split(' ')[0].trim().toLowerCase() : null; if ( (startDrugName && endDrugName && endDrugName === startDrugName) || !endDrugName || !startDrugName ) { matchedEnd = end; usedEndIds.add(matchedEnd.id); break; } } antibiotics.push({ start: start.date, end: matchedEnd ? matchedEnd.date : null, details: start.details || '' });
        });
        if (antibiotics.length === 0) antibioticListElement.innerHTML = '<li>Keine ABs.</li>';
        else antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => { const endDateFormatted = ab.end ? dateLocaleFormat(ab.end) : 'Laufend'; antibioticListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(ab.start)} bis ${endDateFormatted}:</span> ${escapeHtml(ab.details) || '(Details fehlen)'}</li>`; });
    }


    // --- Timeline Rendering (Simplified, Text-Based) ---
    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear

        const validEvents = events.filter(e => e.date && typeof e.date === 'string');
        if (validEvents.length === 0) { return; }

        const allDates = validEvents.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        const antibioticEndsDates = events.filter(e => e.type === 'Antibiotika Ende' && e.date).map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        allDates.push(...antibioticEndsDates);
        if (allDates.length === 0) { return; }

        // --- Calculate Antibiotic Periods and Rows ---
        const antibioticPeriods = calculateAntibioticPeriods(validEvents);
        const { assignedPeriods, maxRows: antibioticRowCount } = assignAntibioticRows(antibioticPeriods);
        const antibioticRowHeight = 15;
        const totalAntibioticHeight = Math.max(1, antibioticRowCount) * antibioticRowHeight;

        // --- Setup ---
        const baseRowHeight = 25; // Base height for OP row
        const textRowHeight = 20; // Height for text-based rows (Proben, Labor)
        const opY = 0;
        const antibioticStartY = opY + baseRowHeight * 1.5; // Start Y for ABs
        const probeY = antibioticStartY + totalAntibioticHeight + baseRowHeight * 0.5; // Position Proben below ABs
        const laborY = probeY + textRowHeight * 1.5; // Position Labor below Proben

        const margin = { top: 40, right: 30, bottom: 60, left: 110 }; // Increased left margin for longer labels
        const dynamicHeight = laborY + textRowHeight; // Total height needed for rows
        const svgHeight = dynamicHeight + margin.top + margin.bottom;
        const svgWidth = Math.max(1000, timelineSvgWrapper.clientWidth);
        const width = svgWidth - margin.left - margin.right;
        const height = dynamicHeight;

        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('width', svgWidth); timelineSvg.setAttribute('height', svgHeight);
        timelineSvg.style.minWidth = `${svgWidth}px`; timelineSvg.style.height = `${svgHeight}px`;
        const chartGroup = document.createElementNS(SVG_NS, "g"); chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`); timelineSvg.appendChild(chartGroup);

        // --- Scales ---
        let minDate = new Date(Math.min(...allDates)); let maxDate = new Date(Math.max(...allDates));
        if (isNaN(minDate.getTime()) || isNaN(maxDate.getTime())) { return; }
        const timeDiffMs = maxDate.getTime() - minDate.getTime(); const datePaddingMs = Math.max(timeDiffMs * 0.02, 2 * 24 * 60 * 60 * 1000); if (timeDiffMs === 0) { minDate = new Date(minDate.getTime() - datePaddingMs / 2); maxDate = new Date(maxDate.getTime() + datePaddingMs / 2); } else { minDate = new Date(minDate.getTime() - datePaddingMs); maxDate = new Date(maxDate.getTime() + datePaddingMs); } const totalTime = maxDate.getTime() - minDate.getTime();
        const xScale = (date) => { if (!(date instanceof Date) || isNaN(date.getTime())) return 0; if (totalTime <= 0) return 0; const timeOffset = date.getTime() - minDate.getTime(); return Math.max(0, Math.min(width, (timeOffset / totalTime) * width)); };

        // --- Draw Axes ---
        // X Axis (same as before)
        const xAxisLine = document.createElementNS(SVG_NS, "line"); xAxisLine.setAttribute('x1', 0); xAxisLine.setAttribute('y1', height); xAxisLine.setAttribute('x2', width); xAxisLine.setAttribute('y2', height); xAxisLine.setAttribute('class', 'axis-line'); chartGroup.appendChild(xAxisLine); const tickInterval = calculateTickInterval(totalTime, width); let currentTickDate = getFirstTickDate(minDate, tickInterval.unit); let safety = 0; const tickLabelY = height + 20; const tickMarkY1 = height; const tickMarkY2 = height + 5; const gridLineY1 = 0; const gridLineY2 = height;
        while (currentTickDate <= maxDate && safety < 200) { const xPos = xScale(currentTickDate); if (xPos >= 0 && xPos <= width) { const gridLine = document.createElementNS(SVG_NS, "line"); gridLine.setAttribute('x1', xPos); gridLine.setAttribute('y1', gridLineY1); gridLine.setAttribute('x2', xPos); gridLine.setAttribute('y2', gridLineY2); gridLine.setAttribute('class', 'grid-line'); chartGroup.appendChild(gridLine); const tickMark = document.createElementNS(SVG_NS, "line"); tickMark.setAttribute('x1', xPos); tickMark.setAttribute('y1', tickMarkY1); tickMark.setAttribute('x2', xPos); tickMark.setAttribute('y2', tickMarkY2); tickMark.setAttribute('class', 'axis-tick'); chartGroup.appendChild(tickMark); const tickLabel = document.createElementNS(SVG_NS, "text"); tickLabel.setAttribute('x', xPos); tickLabel.setAttribute('y', tickLabelY); tickLabel.setAttribute('class', 'axis-tick'); tickLabel.textContent = formatTickDate(currentTickDate, tickInterval.unit); chartGroup.appendChild(tickLabel); } const tempDate = new Date(currentTickDate); if (tickInterval.unit === 'day') tempDate.setUTCDate(tempDate.getUTCDate() + tickInterval.step); else if (tickInterval.unit === 'week') tempDate.setUTCDate(tempDate.getUTCDate() + 7 * tickInterval.step); else if (tickInterval.unit === 'month') tempDate.setUTCMonth(tempDate.getUTCMonth() + tickInterval.step); else tempDate.setUTCDate(tempDate.getUTCDate() + 1); if (tempDate <= currentTickDate) { break; } currentTickDate = tempDate; safety++; }

        // Y Axis Labels (Updated)
        const yLabels = [
            { y: opY + baseRowHeight / 2, text: 'OPs' },
            { y: antibioticStartY + totalAntibioticHeight / 2 - (antibioticRowCount > 1 ? 5 : 0), text: 'Antibiotika' },
            { y: probeY + textRowHeight / 2, text: 'Probenentnahme' },
            { y: laborY + textRowHeight / 2, text: 'Labor' }
        ];
        yLabels.forEach(label => { const textElement = document.createElementNS(SVG_NS, "text"); textElement.setAttribute('x', -10); textElement.setAttribute('y', label.y); textElement.setAttribute('class', 'axis-label'); textElement.setAttribute('dominant-baseline', 'middle'); textElement.textContent = label.text; chartGroup.appendChild(textElement); });

        // --- Draw Events (Simplified, Text-Based) ---
        try {
            // Draw Antibiotic Bars (Multi-Row, same logic as before)
            const barHeight = antibioticRowHeight * 0.6;
            assignedPeriods.forEach(period => { const xStart = xScale(period.startDate); const xEnd = xScale(period.endDate ? period.endDate : maxDate); const barWidth = Math.max(1, xEnd - xStart); const rowY = antibioticStartY + period.row * antibioticRowHeight; const barY = rowY - barHeight / 2; if (barWidth > 0 && xStart < width) { const rect = document.createElementNS(SVG_NS, "rect"); rect.setAttribute('x', xStart); rect.setAttribute('y', barY); rect.setAttribute('width', barWidth); rect.setAttribute('height', barHeight); rect.setAttribute('class', 'antibiotic-bar'); rect.setAttribute('rx', 2); rect.setAttribute('ry', 2); chartGroup.appendChild(rect); const label = document.createElementNS(SVG_NS, "text"); label.setAttribute('x', xStart + 5); label.setAttribute('y', rowY); label.setAttribute('class', 'bar-text-label'); label.textContent = period.details.split(' ')[0] || '(Unbekannt)'; chartGroup.appendChild(label); } });

            // Draw OPs, Probes, Labs as Text Labels
            const textPositions = {}; // Track text positions to offset overlaps: key = "yValue,dateString"
            validEvents.forEach(event => {
                const date = new Date(event.date); if (isNaN(date.getTime())) return;
                const x = xScale(date);
                let y, labelClass, labelText = '';
                const dateString = event.date; // Use date string for simple key

                switch (event.type) {
                    case 'OP':
                        y = opY + baseRowHeight / 2; // Center in OP row
                        labelClass = 'op-label';
                        // Add OP diamond marker for visual cue
                         const markerSize = 6;
                         const opMarker = document.createElementNS(SVG_NS, "rect");
                         opMarker.setAttribute('x', x - markerSize / 2);
                         opMarker.setAttribute('y', y - markerSize / 2);
                         opMarker.setAttribute('width', markerSize);
                         opMarker.setAttribute('height', markerSize);
                         opMarker.setAttribute('class', 'op-marker marker-base');
                         opMarker.setAttribute('transform', `rotate(45 ${x} ${y})`);
                         chartGroup.appendChild(opMarker);
                         // Position label next to marker
                         labelText = event.details.length > 30 ? event.details.substring(0, 27) + '...' : event.details;
                         break;

                    case 'Probenentnahme':
                        y = probeY + textRowHeight / 2;
                        labelClass = 'probe-label';
                        labelText = `${event.sampleType || '?'} (${event.germ || '?'})`;
                        labelText = labelText.length > 35 ? labelText.substring(0, 32) + '...' : labelText;
                        break;

                    case 'Labor CRP':
                        y = laborY + textRowHeight / 2;
                        labelClass = 'labor-label';
                        labelText = `CRP: ${event.details}`;
                        break;

                    case 'Labor Lc':
                        y = laborY + textRowHeight / 2;
                        labelClass = 'labor-label';
                        labelText = `Lc: ${event.details}`;
                        break;

                    // Ignore AB Start/End for direct labeling
                    case 'Antibiotika Start':
                    case 'Antibiotika Ende':
                        return;
                }

                if (labelText) {
                    // Simple vertical offset for multiple items on the same day in the same row
                     let yOffset = 0;
                     const posKey = `${Math.round(y)},${dateString}`;
                     if (textPositions[posKey]) {
                         yOffset = textPositions[posKey] * 10; // Offset by 10px vertically
                         textPositions[posKey]++;
                     } else {
                         textPositions[posKey] = 1;
                     }
                     const finalY = y + yOffset;

                    const label = document.createElementNS(SVG_NS, "text");
                     // For OP, start text after marker, others start at date point
                     label.setAttribute('x', event.type === 'OP' ? x + 8 : x + 3);
                    label.setAttribute('y', finalY);
                    label.setAttribute('class', `timeline-text-label ${labelClass}`);
                    label.textContent = labelText;
                    chartGroup.appendChild(label);
                }
            });

        } catch (e) { console.error("Fehler beim Zeichnen der Timeline-Elemente:", e); }

    } // End of renderTimeline


     // --- Helper: Calculate Antibiotic Periods (Identical) ---
     function calculateAntibioticPeriods(allEvents) { /* same as before */
        const starts = allEvents.filter(e => e.type === 'Antibiotika Start' && e.date).map(e => ({...e, dateObj: new Date(e.date)})).filter(e => !isNaN(e.dateObj.getTime())).sort((a, b) => a.dateObj - b.dateObj); const ends = allEvents.filter(e => e.type === 'Antibiotika Ende' && e.date).map(e => ({...e, dateObj: new Date(e.date)})).filter(e => !isNaN(e.dateObj.getTime())).sort((a, b) => a.dateObj - b.dateObj); const periods = []; let usedEndIndices = new Set(); starts.forEach(start => { const startDrugName = start.details ? start.details.split(' ')[0].trim().toLowerCase() : null; let matchedEnd = null; const potentialEnds = ends.map((end, index) => ({ ...end, index })).filter(end => !usedEndIndices.has(end.index) && end.dateObj >= start.dateObj).sort((a, b) => { const dateDiff = a.dateObj - b.dateObj; if (dateDiff !== 0) return dateDiff; const aIsSpecific = a.details && startDrugName && a.details.toLowerCase().includes(startDrugName); const bIsSpecific = b.details && startDrugName && b.details.toLowerCase().includes(startDrugName); if (aIsSpecific && !bIsSpecific) return -1; if (!aIsSpecific && bIsSpecific) return 1; if (!a.details && b.details) return -1; if (a.details && !b.details) return 1; return 0; }); for (const end of potentialEnds) { const endDrugName = end.details ? end.details.split(' ')[0].trim().toLowerCase() : null; if (!endDrugName || (startDrugName && endDrugName === startDrugName) || !startDrugName) { matchedEnd = end; usedEndIndices.add(end.index); break; } } periods.push({ startDate: start.dateObj, endDate: matchedEnd ? matchedEnd.dateObj : null, details: start.details || '' }); }); return periods;
     }

    // --- Helper: Assign Antibiotic Rows (Identical) ---
    function assignAntibioticRows(periods) { /* same as before */
         const assignedPeriods = []; let maxRows = 0; periods.sort((a, b) => { const startDiff = a.startDate - b.startDate; if (startDiff !== 0) return startDiff; const endA = a.endDate ? a.endDate.getTime() : Infinity; const endB = b.endDate ? b.endDate.getTime() : Infinity; return endA - endB; }); const rowEnds = []; for (const period of periods) { let assignedRow = -1; for (let i = 0; i < rowEnds.length; i++) { if (period.startDate >= rowEnds[i]) { assignedRow = i; rowEnds[i] = period.endDate ? period.endDate.getTime() : Infinity; break; } } if (assignedRow === -1) { assignedRow = rowEnds.length; rowEnds.push(period.endDate ? period.endDate.getTime() : Infinity); } assignedPeriods.push({ ...period, row: assignedRow }); maxRows = Math.max(maxRows, assignedRow + 1); } return { assignedPeriods, maxRows };
     }

    // --- Timeline Axis Helper Functions (Identical) ---
    function calculateTickInterval(timeRangeMs, widthPx) { /* same as before */ const maxTicks = Math.max(5, Math.floor(widthPx / 80)); const msPerDay = 86400000; const days = timeRangeMs / msPerDay; if (days <= 0) return { unit: 'day', step: 1 }; if (days <= maxTicks * 1.5) return { unit: 'day', step: 1 }; if (days <= maxTicks * 4) return { unit: 'day', step: 2 }; if (days <= maxTicks * 10) return { unit: 'day', step: Math.ceil(days / maxTicks) }; if (days <= maxTicks * 20) return { unit: 'week', step: 1 }; if (days <= maxTicks * 50) return { unit: 'week', step: 2 }; if (days <= maxTicks * 150) return { unit: 'month', step: 1 }; if (days <= maxTicks * 400) return { unit: 'month', step: 3 }; return { unit: 'month', step: 6 }; }
    function getFirstTickDate(minDate, unit) { /* same as before */ const firstTick = new Date(minDate); firstTick.setUTCHours(0, 0, 0, 0); switch (unit) { case 'day': break; case 'week': const dayOfWeek = (firstTick.getUTCDay() + 6) % 7; if (dayOfWeek > 0) { firstTick.setUTCDate(firstTick.getUTCDate() + (7 - dayOfWeek));} if (firstTick < minDate) { firstTick.setUTCDate(firstTick.getUTCDate() + 7); } break; case 'month': firstTick.setUTCDate(1); if (firstTick < minDate) { firstTick.setUTCMonth(firstTick.getUTCMonth() + 1); } break; default: break; } while (firstTick < minDate) { if (unit === 'day') firstTick.setUTCDate(firstTick.getUTCDate() + 1); else if (unit === 'week') firstTick.setUTCDate(firstTick.getUTCDate() + 7); else if (unit === 'month') firstTick.setUTCMonth(firstTick.getUTCMonth() + 1); else break; } return firstTick; }
    function formatTickDate(date, unit) { /* same as before */ if (!(date instanceof Date) || isNaN(date.getTime())) return ''; try { switch (unit) { case 'day': return date.toLocaleDateString(lang, dayMonthFormatOptions); case 'week': return date.toLocaleDateString(lang, dayMonthFormatOptions); case 'month': if (date.getUTCDate() === 1) { return date.toLocaleDateString(lang, monthYearFormatOptions); } else { return date.toLocaleDateString(lang, dayMonthFormatOptions); } default: return date.toLocaleDateString(lang, dateFormatOptions); } } catch (e) { console.error("Error formatting tick date:", date, unit, e); return ''; } }


    // --- Clipboard Functions (Updated for Probes) ---
    function copyPatientDataToClipboard() { /* same as before */ const name = patientNameInput.value.trim() || 'N/A'; const dobFormatted = dateLocaleFormat(patientDobInput.value); const diagnosis = patientDiagnosisInput.value.trim() || 'N/A'; const team = patientTeamInput.value.trim() || 'N/A'; const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein'; const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein'; const orthoOption = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]; const ortho = orthoOption ? orthoOption.text : 'N/A'; const text = `Patient: ${name}\nGeburtsdatum: ${dobFormatted}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`; const html = `<p><b>Patient:</b> ${escapeHtml(name)}<br><b>Geburtsdatum:</b> ${dobFormatted}<br><b>Diagnose:</b> ${escapeHtml(diagnosis).replace(/\n/g, '<br>')}<br><b>Orthopädie Team:</b> ${escapeHtml(ortho)}<br><b>Zust. ext. Team/Arzt:</b> ${escapeHtml(team)}<br><b>Infektiologie involviert:</b> ${infektio}<br><b>PLWC involviert:</b> ${plwc}</p>`; copyToClipboard(text, html, copyPatientDataButton); }

    function copySummaryToClipboard(listId, title, headers, buttonElement) {
        const listElement = document.getElementById(listId);
        if (!listElement || listElement.children.length === 0 || (listElement.children.length === 1 && listElement.firstElementChild.textContent.includes('Keine'))) { showCopyFeedback(buttonElement, 'Nichts zu kopieren', false); return; }

        let plainText = `${title}:\n`;
        let tableHtml = `<table class="clipboard-table"><caption>${escapeHtml(title)}</caption><thead><tr>`;
        headers.forEach(header => { tableHtml += `<th>${escapeHtml(header)}</th>`; });
        tableHtml += `</tr></thead><tbody>`;

        Array.from(listElement.children).forEach(li => {
            const dateSpan = li.querySelector('.date');
            const dateText = dateSpan ? dateSpan.textContent.replace(':', '').trim() : '';
            const detailsText = (dateSpan ? li.textContent.replace(dateSpan.textContent, '') : li.textContent).trim();

            // Special handling for Probe summary to extract columns
            if (listId === 'probeList') {
                 const typeMatch = detailsText.match(/Art: (.*?)(?: - Keim:|$)/);
                 const germMatch = detailsText.match(/Keim: (.*?)(?: \((.*)\)|$)/); // Captures optional detail in brackets
                 const extraDetailsMatch = detailsText.match(/\((.*)\)$/);

                 const probeType = typeMatch ? typeMatch[1].trim() : '?';
                 const probeGerm = germMatch ? germMatch[1].trim() : '?';
                 const probeExtra = extraDetailsMatch ? extraDetailsMatch[1].trim() : '';

                 plainText += `- ${dateText}: Art=${probeType}, Keim=${probeGerm}${probeExtra ? ', Details=' + probeExtra : ''}\n`;
                 tableHtml += `<tr><td>${escapeHtml(dateText)}</td><td>${escapeHtml(probeType)}</td><td>${escapeHtml(probeGerm)}</td><td>${escapeHtml(probeExtra)}</td></tr>`;

            } else { // For OP and ABs
                plainText += `- ${dateText}: ${detailsText}\n`;
                // Assume 2 columns for others (Date/Zeitraum, Details)
                 tableHtml += `<tr><td>${escapeHtml(dateText)}</td><td>${escapeHtml(detailsText)}</td></tr>`;
            }
        });

        tableHtml += `</tbody></table>`;
        copyToClipboard(plainText, tableHtml, buttonElement);
    }
    function copyToClipboard(plainText, htmlText, buttonElement) { /* same as before */ if (!navigator.clipboard || !navigator.clipboard.write) { try { const textArea = document.createElement("textarea"); textArea.value = plainText; textArea.style.position = "fixed"; textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.opacity = "0"; document.body.appendChild(textArea); textArea.focus(); textArea.select(); const successful = document.execCommand('copy'); document.body.removeChild(textArea); showCopyFeedback(buttonElement, successful ? 'Kopiert!' : 'Fehler (Fallback)', successful); } catch (err) { console.error('Fallback Copy Fehler: ', err); showCopyFeedback(buttonElement, 'Fehler', false); } return; } navigator.clipboard.write([ new ClipboardItem({ "text/plain": new Blob([plainText], { type: "text/plain" }), "text/html": new Blob([htmlText], { type: "text/html" }) }) ]).then(() => { showCopyFeedback(buttonElement, 'Kopiert!', true); }).catch(err => { console.error('Async Copy Fehler: ', err); navigator.clipboard.writeText(plainText).then(() => { showCopyFeedback(buttonElement, 'Kopiert (Text)!', true); }).catch(err2 => { console.error('Async Copy Text Fehler: ', err2); showCopyFeedback(buttonElement, 'Fehler', false); }); }); }
    function showCopyFeedback(buttonElement, message, success) { /* same as before */ const originalText = buttonElement.textContent; buttonElement.textContent = message; buttonElement.disabled = true; buttonElement.style.backgroundColor = success ? '#2ecc71' : '#e74c3c'; setTimeout(() => { buttonElement.textContent = originalText; buttonElement.disabled = false; buttonElement.style.backgroundColor = ''; }, 1500); }
    function escapeHtml(unsafe) { /* same as before */ if (unsafe === null || unsafe === undefined) return ''; return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

    // --- Initial Load ---
    loadData();
    handleEventTypeChange(); // Set initial state of conditional fields

}); // End DOMContentLoaded
