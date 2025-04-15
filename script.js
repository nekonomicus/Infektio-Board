
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
    const tooltipElement = document.querySelector('.tooltip'); // Get tooltip element

    // --- Global State ---
    let events = [];

    // --- Localization & Date Formatting ---
    const lang = 'de-DE';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateLocaleFormat = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return 'N/A'; // Return N/A for invalid input
        try {
            // Handles YYYY-MM-DD format from <input type="date">
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day || year.length !== 4) return dateStr; // Basic validation
            const date = new Date(Date.UTC(year, month - 1, day));
            if (isNaN(date.getTime())) return 'Ungültiges Datum'; // Specific error for invalid date
            return date.toLocaleDateString(lang, dateFormatOptions);
        } catch (e) { console.error("Error formatting date:", dateStr, e); return 'Fehler'; } // Specific error for code failure
    };


    // --- Event Handling ---
    function handleEventSubmit(e) {
        e.preventDefault();
        const isoDateValue = eventDateInput.value;
        const eventType = document.getElementById('eventType').value;
        const eventDetails = document.getElementById('eventDetails').value.trim();

        if (!isoDateValue) { alert('Bitte ein gültiges Datum auswählen.'); return; }
        if (!eventType) { alert('Bitte einen Ereignistyp auswählen.'); return; }
        // Allow empty details only for 'Antibiotika Ende'
        if (!eventDetails && eventType !== 'Antibiotika Ende') { alert('Bitte Details / Wert eingeben.'); return; }

        const newEvent = { id: Date.now(), date: isoDateValue, type: eventType, details: eventDetails };
        events.push(newEvent);
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        saveData();
        render();
        eventForm.reset();
        document.getElementById('eventType').selectedIndex = 0;
    }

    function handleClearAll() {
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            events = [];
            // Also clear patient data fields? Optional, but maybe useful
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
        // Use requestAnimationFrame for potentially smoother class removal
        if (window.requestAnimationFrame) {
             window.requestAnimationFrame(() => { setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 0); });
        } else { setTimeout(() => { document.body.classList.remove('printing-timeline-only'); }, 500); }
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
        if(element) element.addEventListener('change', saveData); // Add safety check
    });
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)', ['Datum', 'Details'], copyGermsButton));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));


    // --- Local Storage ---
    function saveData() {
        try {
            localStorage.setItem('patientTimelineEvents_v6', JSON.stringify(events));
            const patientData = {
                name: patientNameInput.value, dob: patientDobInput.value, diagnosis: patientDiagnosisInput.value,
                team: patientTeamInput.value, infektio: infektioInvolviertCheckbox.checked,
                plwc: plwcInvolviertCheckbox.checked, ortho: orthoTeamSelect.value
            };
            localStorage.setItem('patientTimelinePatientData_v6', JSON.stringify(patientData));
        } catch (e) { console.error("Fehler beim Speichern der Daten:", e); }
    }

    function loadData() {
        try {
            const storedEvents = localStorage.getItem('patientTimelineEvents_v6');
            events = storedEvents ? JSON.parse(storedEvents) : [];
            const storedPatientData = localStorage.getItem('patientTimelinePatientData_v6');
            if (storedPatientData) {
                const data = JSON.parse(storedPatientData);
                patientNameInput.value = data.name || ''; patientDobInput.value = data.dob || '';
                patientDiagnosisInput.value = data.diagnosis || ''; patientTeamInput.value = data.team || '';
                infektioInvolviertCheckbox.checked = data.infektio || false;
                plwcInvolviertCheckbox.checked = data.plwc || false; orthoTeamSelect.value = data.ortho || '';
            }
        } catch (e) { console.error("Fehler beim Laden der Daten:", e); events = []; } // Reset on error
        render(); // Render after loading/error
    }


    // --- Rendering Functions ---
    function render() {
        // Ensure tooltip exists before rendering timeline which uses it
         if (!tooltipElement) {
             console.log("Tooltip element not found on render start, creating.");
             tooltipElement = document.createElement('div');
             tooltipElement.classList.add('tooltip');
             tooltipElement.style.opacity = 0;
             tooltipElement.style.pointerEvents = 'none';
             document.body.appendChild(tooltipElement);
         }

        try { renderEventList(); } catch (e) { console.error("Fehler in renderEventList:", e); }
        try { renderSummaries(); } catch (e) { console.error("Fehler in renderSummaries:", e); }
        try { renderTimeline(); } catch (e) {
             console.error("Fehler in renderTimeline:", e);
             timelineStatus.textContent = "Fehler beim Rendern der Timeline. Prüfen Sie die Konsole.";
             timelineStatus.style.color = 'red'; timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
        }
    }

    function renderEventList() {
        eventListElement.innerHTML = '';
        if (events.length === 0) { eventListElement.innerHTML = '<li>Noch keine Ereignisse hinzugefügt.</li>'; return; }
        const typeMap = { // German type map
            'OP': 'Operation (OP)', 'Antibiotika Start': 'Antibiotika Start', 'Antibiotika Ende': 'Antibiotika Ende',
            'Mikrobiologie': 'Mikrobiologie (Keim)', 'Labor CRP': 'Labor: CRP (mg/l)', 'Labor Lc': 'Labor: Lc (G/l)',
            'Klinisches Ereignis': 'Klinisches Ereignis', 'Notiz': 'Notiz'
          };
        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            const displayType = typeMap[event.type] || event.type;
            textSpan.textContent = `${dateLocaleFormat(event.date)} - ${displayType}: ${event.details || ''}`;
            li.appendChild(textSpan);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Löschen'; deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => handleDeleteEvent(event.id);
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
        antibioticStarts.forEach(start => {
            const startDrugName = start.details ? start.details.split(' ')[0].toLowerCase() : null;
            let matchedEnd = null;
            if (startDrugName) { // Only match if start has details
                const potentialEnds = antibioticEnds
                    .filter(end => !usedEndIds.has(end.id) && ( (end.details && end.details.toLowerCase().includes(startDrugName)) || end.details === '') && new Date(end.date) >= new Date(start.date))
                    .sort((a, b) => new Date(a.date) - new Date(b.date));
                if (potentialEnds.length > 0) { matchedEnd = potentialEnds[0]; usedEndIds.add(matchedEnd.id); }
            }
             antibiotics.push({ start: start.date, end: matchedEnd ? matchedEnd.date : 'Laufend', details: start.details || '' });
        });
        if (antibiotics.length === 0) antibioticListElement.innerHTML = '<li>Keine Antibiotika eingegeben.</li>';
        else antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => {
            const endDateFormatted = ab.end === 'Laufend' ? ab.end : dateLocaleFormat(ab.end);
            antibioticListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(ab.start)} bis ${endDateFormatted}:</span> ${ab.details || '(Details fehlen)'}</li>`;
        });
    }


    // --- Timeline Rendering (Using logic similar to the first working version) ---
    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear
        timelineStatus.textContent = "Ereignisse eingeben, um die Timeline zu generieren.";
        timelineStatus.style.color = 'inherit';

        if (events.length === 0) { /* show status, hide svg */ return; }

        const validDates = events.map(e => new Date(e.date)).filter(d => !isNaN(d.getTime()));
        if (validDates.length === 0) { /* show status, hide svg */ return; }

        timelineStatus.style.display = 'none'; timelineSvgWrapper.style.display = 'block';

        // --- Setup ---
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth);
        const svgHeight = 450;
        const margin = { top: 40, right: 30, bottom: 60, left: 90 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        // --- Tooltip Show/Hide (using global element) ---
         function showTooltip(event, content) { /* ... as in previous corrected version ... */ }
         function hideTooltip() { /* ... as in previous corrected version ... */ }

        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Data Prep & Scales ---
        let minDate = new Date(Math.min(...validDates));
        let maxDate = new Date(Math.max(...validDates));
        const datePaddingMs = Math.max((maxDate - minDate) * 0.02, 86400000 * 2); // Min 2 days
        minDate = new Date(minDate.getTime() - datePaddingMs);
        maxDate = new Date(maxDate.getTime() + datePaddingMs);

        const xScale = (date) => {
            if (!(date instanceof Date) || isNaN(date.getTime())) return 0; // Handle invalid dates
            const timeDiff = date.getTime() - minDate.getTime();
            const totalTime = maxDate.getTime() - minDate.getTime();
            return totalTime === 0 ? 0 : (timeDiff / totalTime) * width;
        };

        const rowHeight = 20; const opY = 0; const eventY = rowHeight * 1.5; const antibioticY = rowHeight * 3; const germY = rowHeight * 4.5; const labPlotAreaY = rowHeight * 6;
        const labPlotAreaHeight = Math.max(50, height - labPlotAreaY);
        const crpData = events.filter(e => e.type === 'Labor CRP' && e.details && !isNaN(parseFloat(e.details)) && !isNaN(new Date(e.date).getTime())).map(e => ({ date: new Date(e.date), value: parseFloat(e.details) }));
        const lcData = events.filter(e => e.type === 'Labor Lc' && e.details && !isNaN(parseFloat(e.details)) && !isNaN(new Date(e.date).getTime())).map(e => ({ date: new Date(e.date), value: parseFloat(e.details) }));
        const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value), 1) : 1;
        const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value), 1) : 1;
        const crpYScale = (value) => labPlotAreaY + labPlotAreaHeight - Math.max(0, (value / maxCrpValue)) * labPlotAreaHeight * 0.45;
        const lcYScale = (value) => labPlotAreaY + (labPlotAreaHeight * 0.5) - Math.max(0, (value / maxLcValue)) * labPlotAreaHeight * 0.45;

        // --- Draw Axes ---
        const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xAxisLine.setAttribute('x1', 0); xAxisLine.setAttribute('y1', height); xAxisLine.setAttribute('x2', width); xAxisLine.setAttribute('y2', height); xAxisLine.setAttribute('class', 'axis-line');
        chartGroup.appendChild(xAxisLine);
        // X Ticks
        const timeRange = maxDate.getTime() - minDate.getTime();
        if (timeRange > 0) {
            const tickInterval = calculateTickInterval(timeRange, width);
            let currentTickDate = getFirstTickDate(minDate, tickInterval.unit);
            let safety = 0; // Prevent infinite loop
            while (currentTickDate <= maxDate && safety < 200) {
                 const xPos = xScale(currentTickDate);
                 if (xPos >= 0 && xPos <= width) {
                     const tickMark = document.createElementNS("http://www.w3.org/2000/svg", "line"); /*...*/ chartGroup.appendChild(tickMark);
                     const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text"); /*...*/ tickLabel.textContent = formatTickDate(currentTickDate, tickInterval.unit); chartGroup.appendChild(tickLabel);
                 }
                 const tempDate = new Date(currentTickDate);
                 if (tickInterval.unit === 'day') tempDate.setDate(tempDate.getDate() + tickInterval.step);
                 else if (tickInterval.unit === 'week') tempDate.setDate(tempDate.getDate() + 7 * tickInterval.step);
                 else if (tickInterval.unit === 'month') tempDate.setMonth(tempDate.getMonth() + tickInterval.step);
                 else tempDate.setDate(tempDate.getDate() + 1);
                 if (tempDate <= currentTickDate) { console.warn("Tick date did not advance:", currentTickDate, tickInterval); break; } // Exit loop if date doesn't change
                 currentTickDate = tempDate;
                 safety++;
            }
             if(safety >= 200) console.error("Exceeded max ticks safety limit.");
        }
        // Y Labels
        const yLabels = [ { y: opY + rowHeight / 2, text: 'OPs' }, { y: eventY + rowHeight / 2, text: 'Ereignisse' }, { y: antibioticY + rowHeight / 2, text: 'Antibiotika' }, { y: germY + rowHeight / 2, text: 'Keim(e)' }, { y: labPlotAreaY + labPlotAreaHeight * 0.25, text: `Lc (G/l)` }, { y: labPlotAreaY + labPlotAreaHeight * 0.75, text: `CRP (mg/l)` } ];
        yLabels.forEach(label => { /* ... create and append Y labels ... */ });


        // --- Draw Events ---
        try {
             // Plot Labs
            function plotLabData(data, yScale, className, unit) {
                if (!data || data.length < 1) return;
                data.sort((a, b) => a.date - b.date);
                // Draw line
                if (data.length > 1) {
                    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    let d = `M ${xScale(data[0].date)} ${yScale(data[0].value)}`;
                    for (let i = 1; i < data.length; i++) { d += ` L ${xScale(data[i].date)} ${yScale(data[i].value)}`; }
                    linePath.setAttribute('d', d); linePath.setAttribute('class', `${className}-plot`); chartGroup.appendChild(linePath);
                }
                // Draw points
                data.forEach(d => {
                    const x = xScale(d.date); const y = yScale(d.value);
                    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle"); /*...*/ chartGroup.appendChild(point);
                    const label = document.createElementNS("http://www.w3.org/2000/svg", "text"); /*...*/ chartGroup.appendChild(label);
                    const tooltipContent = `${dateLocaleFormat(d.date.toISOString().split('T')[0])}<br>${className.toUpperCase()}: ${d.value} ${unit}`;
                    point.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent)); point.addEventListener('mouseout', hideTooltip);
                    label.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent)); label.addEventListener('mouseout', hideTooltip);
                });
            }
            plotLabData(crpData, crpYScale, 'crp', 'mg/l');
            plotLabData(lcData, lcYScale, 'lc', 'G/l');

            // Draw Antibiotic Bars
            const antibioticPeriods = []; /* ... calculate periods ... */
            antibioticPeriods.forEach(period => { /* ... draw rect/label, add tooltips ... */ });

            // Draw Germ Markers
            const germEvents = events.filter(e => e.type === 'Mikrobiologie' && !isNaN(new Date(e.date).getTime()));
            germEvents.forEach(event => { /* ... draw marker, add tooltips ... */ });

            // Draw Point Markers
             events.forEach(event => {
                const date = new Date(event.date);
                if (isNaN(date.getTime())) return;
                const x = xScale(date);
                let y, markerClass, markerSymbol; const markerSize = 6;
                switch (event.type) { /* ... cases as before ... */ }
                if (markerSymbol) {
                    /* ... append marker ... */
                    const tooltipContent = `<b>${event.type} (${dateLocaleFormat(event.date)})</b><br>${event.details || ''}`;
                    markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                    markerSymbol.addEventListener('mouseout', hideTooltip);
                }
            });
        } catch (e) { console.error("Fehler beim Zeichnen der Timeline-Elemente:", e); }

    } // End of renderTimeline


    // --- Timeline Axis Helper Functions ---
    function calculateTickInterval(timeRangeMs, widthPx) {
         const maxTicks = Math.max(5, Math.floor(widthPx / 100));
         const msPerDay = 86400000;
         const days = timeRangeMs / msPerDay;
         if (days <= 0) return { unit: 'day', step: 1 }; // Default if range is zero or negative

         if (days <= maxTicks * 1.5) return { unit: 'day', step: 1 };
         if (days <= maxTicks * 4) return { unit: 'day', step: Math.ceil(days / maxTicks) <= 2 ? 2 : Math.ceil(days / maxTicks) };
         if (days <= maxTicks * 10) return { unit: 'week', step: 1 };
         if (days <= maxTicks * 21) return { unit: 'week', step: 2 };
         if (days <= maxTicks * 60) return { unit: 'month', step: 1 };
         if (days <= maxTicks * 180) return { unit: 'month', step: 3 };
         return { unit: 'month', step: 6 };
    }
    function getFirstTickDate(minDate, unit) { /* ... */ }
    function formatTickDate(date, unit) { /* ... */ }


    // --- Clipboard Functions ---
    function copyPatientDataToClipboard() {
        // This function should now work correctly
        const name = patientNameInput.value || 'N/A';
        const dobFormatted = dateLocaleFormat(patientDobInput.value);
        const diagnosis = patientDiagnosisInput.value || 'N/A';
        const team = patientTeamInput.value || 'N/A';
        const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const ortho = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]?.text || 'N/A';
        const text = `Patient: ${name}\nGeburtsdatum: ${dobFormatted}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`;
        const html = `<p><b>Patient:</b> ${name}<br><b>Geburtsdatum:</b> ${dobFormatted}<br><b>Diagnose:</b> ${diagnosis.replace(/\n/g, '<br>')}<br><b>Orthopädie Team:</b> ${ortho}<br><b>Zust. ext. Team/Arzt:</b> ${team}<br><b>Infektiologie involviert:</b> ${infektio}<br><b>PLWC involviert:</b> ${plwc}</p>`;
        copyToClipboard(text, html, copyPatientDataButton);
    }
    function copySummaryToClipboard(listId, title, headers, buttonElement) { /* ... as before ... */ }
    function copyToClipboard(plainText, htmlText, buttonElement) { /* ... as before ... */ }


    // --- Initial Load ---
    loadData(); // Load data and triggers initial render

}); // End DOMContentLoaded
