document.addEventListener('DOMContentLoaded', () => {
    // Element References
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

    // Patient Data Inputs
    const patientNameInput = document.getElementById('patientName');
    const patientDobInput = document.getElementById('patientDob');
    const patientDiagnosisInput = document.getElementById('patientDiagnosis'); // Textarea now
    const patientTeamInput = document.getElementById('patientTeam');
    const infektioInvolviertCheckbox = document.getElementById('infektioInvolviert');
    const plwcInvolviertCheckbox = document.getElementById('plwcInvolviert');
    const orthoTeamSelect = document.getElementById('orthoTeam');


    let events = [];
    // Load events and patient data on startup
    loadData();


    // --- Localization ---
    const lang = 'de-DE';
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateLocaleFormat = (dateStr) => {
        if (!dateStr) return '';
        try {
            // Ensure input is treated as UTC to avoid timezone shifts from YYYY-MM-DD
            const [year, month, day] = dateStr.split('-');
            if (!year || !month || !day) return dateStr; // Invalid format
            const date = new Date(Date.UTC(year, month - 1, day));
             if (isNaN(date.getTime())) return dateStr; // Invalid date object
            return date.toLocaleDateString(lang, dateFormatOptions);
        } catch (e) {
             console.error("Error formatting date:", dateStr, e);
            return dateStr;
        }
    };

    // --- Event Handling ---

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEvent = {
            id: Date.now(),
            date: document.getElementById('eventDate').value,
            type: document.getElementById('eventType').value,
            details: document.getElementById('eventDetails').value.trim()
        };

        if (newEvent.date && newEvent.type && (newEvent.details || ['Antibiotika Ende'].includes(newEvent.type)) ) { // Allow empty details for AB end
             if (!newEvent.details && !['Antibiotika Ende'].includes(newEvent.type)) {
                alert('Bitte Details / Wert eingeben.');
                return;
             }
            events.push(newEvent);
            events.sort((a, b) => new Date(a.date) - new Date(b.date));
            saveData();
            render();
            eventForm.reset(); // Reset only event form
        } else {
            alert('Bitte Datum und Typ auswählen (Details optional für Antibiotika Ende).');
        }
    });

    clearAllButton.addEventListener('click', () => {
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            events = [];
            saveData(); // Save empty events
            render();
        }
    });

    // Save patient data when it changes
    [patientNameInput, patientDobInput, patientDiagnosisInput, patientTeamInput, infektioInvolviertCheckbox, plwcInvolviertCheckbox, orthoTeamSelect].forEach(element => {
        element.addEventListener('change', saveData);
    });

    // Clipboard Button Listeners
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs', ['Datum', 'Details'], copyOpsButton));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)', ['Datum', 'Details'], copyGermsButton));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika', ['Zeitraum', 'Details'], copyAntibioticsButton));


    function handleDelete(eventId) {
        events = events.filter(event => event.id !== eventId);
        saveData();
        render();
    }

    // --- Local Storage ---

    function saveData() {
        // Save events
        localStorage.setItem('patientTimelineEvents_v2', JSON.stringify(events));
        // Save patient data
        const patientData = {
            name: patientNameInput.value,
            dob: patientDobInput.value,
            diagnosis: patientDiagnosisInput.value,
            team: patientTeamInput.value,
            infektio: infektioInvolviertCheckbox.checked,
            plwc: plwcInvolviertCheckbox.checked,
            ortho: orthoTeamSelect.value
        };
        localStorage.setItem('patientTimelinePatientData_v2', JSON.stringify(patientData));
         // console.log("Data saved.");
    }

    function loadData() {
        const storedEvents = localStorage.getItem('patientTimelineEvents_v2');
        if (storedEvents) {
            events = JSON.parse(storedEvents);
        } else {
            events = []; // Initialize if nothing is stored
        }

        const storedPatientData = localStorage.getItem('patientTimelinePatientData_v2');
        if (storedPatientData) {
            const data = JSON.parse(storedPatientData);
            patientNameInput.value = data.name || '';
            patientDobInput.value = data.dob || '';
            patientDiagnosisInput.value = data.diagnosis || '';
            patientTeamInput.value = data.team || '';
            infektioInvolviertCheckbox.checked = data.infektio || false;
            plwcInvolviertCheckbox.checked = data.plwc || false;
            orthoTeamSelect.value = data.ortho || '';
        }
         // console.log("Data loaded.");
        render(); // Render after loading
    }


    // --- Rendering ---

    function render() {
        try {
            renderEventList();
            renderSummaries();
            renderTimeline();
        } catch (error) {
            console.error("Fehler beim Rendern:", error);
            timelineStatus.textContent = "Fehler beim Rendern der Daten. Prüfen Sie die Konsole.";
            timelineStatus.style.display = 'block';
            timelineStatus.style.color = 'red';
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
            'OP': 'Operation (OP)', 'Antibiotika Start': 'Antibiotika Start', 'Antibiotika Ende': 'Antibiotika Ende',
            'Mikrobiologie': 'Mikrobiologie (Keim)', 'Labor CRP': 'Labor: CRP (mg/l)', 'Labor Lc': 'Labor: Lc (G/l)',
            'Klinisches Ereignis': 'Klinisches Ereignis', 'Notiz': 'Notiz'
          };

        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            const displayType = typeMap[event.type] || event.type;
            // Display date using locale format
            textSpan.textContent = `${dateLocaleFormat(event.date)} - ${displayType}: ${event.details || ''}`;
            li.appendChild(textSpan);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Löschen';
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => handleDelete(event.id);
            li.appendChild(deleteButton);

            eventListElement.appendChild(li);
        });
    }

    function renderSummaries() {
        opListElement.innerHTML = '';
        germListElement.innerHTML = '';
        antibioticListElement.innerHTML = '';

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
        const antibiotics = [];
        let usedEndIds = new Set(); // FIX: Initialize Set here

        antibioticStarts.forEach(start => {
            const startDrugName = start.details.split(' ')[0].toLowerCase();
            let matchedEnd = null;
            const potentialEnds = antibioticEnds
                .filter(end => !usedEndIds.has(end.id) && (end.details.toLowerCase().includes(startDrugName) || end.details === '') && new Date(end.date) >= new Date(start.date))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (potentialEnds.length > 0) {
                matchedEnd = potentialEnds[0];
                usedEndIds.add(matchedEnd.id);
            }
             antibiotics.push({
                start: start.date,
                end: matchedEnd ? matchedEnd.date : 'Laufend',
                details: start.details
            });
        });

        if (antibiotics.length === 0) {
            antibioticListElement.innerHTML = '<li>Keine Antibiotika eingegeben.</li>';
        } else {
            antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => {
                const endDateFormatted = ab.end === 'Laufend' ? ab.end : dateLocaleFormat(ab.end);
                // Handle potential empty details for start event? (Should not happen with validation)
                const detailsDisplay = ab.details || '(Details fehlen)';
                antibioticListElement.innerHTML += `<li><span class="date">${dateLocaleFormat(ab.start)} bis ${endDateFormatted}:</span> ${detailsDisplay}</li>`;
            });
         }
    }

    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear SVG

        if (events.length === 0) {
             timelineStatus.textContent = "Ereignisse eingeben, um die Timeline zu generieren."; // Reset status text
             timelineStatus.style.color = 'inherit'; // Reset color
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none';
            return;
        }
         timelineStatus.style.display = 'none';
         timelineSvgWrapper.style.display = 'block';

        // --- Timeline Setup ---
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth);
        const svgHeight = 450;
        const margin = { top: 40, right: 30, bottom: 60, left: 90 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        let tooltip = document.querySelector('.tooltip');
        if (!tooltip) {
             tooltip = document.createElement('div');
             tooltip.classList.add('tooltip');
             document.body.appendChild(tooltip);
         }
        function showTooltip(event, content) { /* ... */ }
        function hideTooltip() { /* ... */ }


        // --- SVG Canvas ---
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);

        // --- Data Prep ---
        const dates = events.map(e => new Date(e.date));
        let minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
        let maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

        // Padding
        const datePaddingMs = Math.max((maxDate - minDate) * 0.02, 86400000 * 2); // Min 2 days padding
        minDate = new Date(minDate.getTime() - datePaddingMs);
        maxDate = new Date(maxDate.getTime() + datePaddingMs);

        // Lab data filtering (added check for valid details)
        const crpData = events.filter(e => e.type === 'Labor CRP' && e.details && !isNaN(parseFloat(e.details))).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));
        const lcData = events.filter(e => e.type === 'Labor Lc' && e.details && !isNaN(parseFloat(e.details))).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));

        // --- Scales ---
        const xScale = (date) => { /* ... as before ... */ };
        const rowHeight = 20; const opY = 0; const eventY = rowHeight * 1.5; const antibioticY = rowHeight * 3; const germY = rowHeight * 4.5; const labPlotAreaY = rowHeight * 6;
        const labPlotAreaHeight = Math.max(50, height - labPlotAreaY);
        const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value), 1) : 1;
        const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value), 1) : 1;
        const crpYScale = (value) => labPlotAreaY + labPlotAreaHeight - Math.max(0,(value / maxCrpValue)) * labPlotAreaHeight * 0.45; // Ensure value >= 0
        const lcYScale = (value) => labPlotAreaY + (labPlotAreaHeight * 0.5) - Math.max(0,(value / maxLcValue)) * labPlotAreaHeight * 0.45; // Ensure value >= 0

        // --- Draw Axes ---
        const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line"); /* ... */ chartGroup.appendChild(xAxisLine);
        // X Ticks (Loop using helper functions)
        const timeRange = maxDate.getTime() - minDate.getTime();
        if (timeRange > 0) { // Avoid errors if only one date
            const tickInterval = calculateTickInterval(timeRange, width);
            let currentTickDate = getFirstTickDate(minDate, tickInterval.unit);
             while (currentTickDate <= maxDate) { /* ... draw ticks and labels ... */
                  const xPos = xScale(currentTickDate);
                   if (xPos >= 0 && xPos <= width) {
                     const tickMark = document.createElementNS("http://www.w3.org/2000/svg", "line"); tickMark.setAttribute('x1', xPos); tickMark.setAttribute('y1', height); tickMark.setAttribute('x2', xPos); tickMark.setAttribute('y2', height + 5); tickMark.setAttribute('class', 'axis-tick'); chartGroup.appendChild(tickMark);
                     const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text"); tickLabel.setAttribute('x', xPos); tickLabel.setAttribute('y', height + 20); tickLabel.setAttribute('class', 'axis-tick'); tickLabel.textContent = formatTickDate(currentTickDate, tickInterval.unit); chartGroup.appendChild(tickLabel);
                   }
                   // Increment date carefully
                    const tempDate = new Date(currentTickDate); // Avoid modifying directly in loop condition check
                    if (tickInterval.unit === 'day') tempDate.setDate(tempDate.getDate() + tickInterval.step);
                    else if (tickInterval.unit === 'week') tempDate.setDate(tempDate.getDate() + 7 * tickInterval.step);
                    else if (tickInterval.unit === 'month') tempDate.setMonth(tempDate.getMonth() + tickInterval.step);
                    else tempDate.setDate(tempDate.getDate() + 1); // Fallback if interval calc fails
                     // Prevent infinite loop if date doesn't advance
                    if (tempDate <= currentTickDate) { break; }
                    currentTickDate = tempDate;
             }
        }
        // Y Labels
        const yLabels = [ /* ... German labels ... */ ];
         yLabels.forEach(label => { /* ... create and append labels ... */
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute('x', -10); text.setAttribute('y', label.y); text.setAttribute('dy', '0.35em');
            text.setAttribute('text-anchor', 'end'); text.setAttribute('class', 'axis-label'); text.textContent = label.text;
            chartGroup.appendChild(text);
         });

        // --- Draw Events ---
        // Plot Labs
        function plotLabData(data, yScale, className, unit) { /* ... as before ... */ }
        plotLabData(crpData, crpYScale, 'crp', 'mg/l');
        plotLabData(lcData, lcYScale, 'lc', 'G/l');

        // Draw Antibiotic Bars
        const antibioticPeriods = [];
        const starts = events.filter(e => e.type === 'Antibiotika Start');
        const ends = events.filter(e => e.type === 'Antibiotika Ende');
        let usedEndIds_timeline = new Set(); // FIX: Initialize Set here

        starts.forEach(start => {
            const startDrugName = start.details ? start.details.split(' ')[0].toLowerCase() : ''; // Handle potential missing details
            let matchedEnd = null;
            const potentialEnds = ends
                .filter(end => !usedEndIds_timeline.has(end.id) && ( (end.details && end.details.toLowerCase().includes(startDrugName)) || end.details === '') && new Date(end.date) >= new Date(start.date))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (potentialEnds.length > 0) {
                matchedEnd = potentialEnds[0];
                usedEndIds_timeline.add(matchedEnd.id);
            }
             antibioticPeriods.push({
                 start: new Date(start.date),
                 end: matchedEnd ? new Date(matchedEnd.date) : maxDate,
                 details: start.details || '',
                 endDateActual: matchedEnd ? new Date(matchedEnd.date) : null
             });
        });

        antibioticPeriods.forEach(period => { /* ... draw rect and label, add tooltips ... */
             const x1 = xScale(period.start);
             const x2 = xScale(period.end);
             const barWidth = Math.max(2, x2 - x1);

             const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
             rect.setAttribute('x', x1); rect.setAttribute('y', antibioticY); rect.setAttribute('width', barWidth); rect.setAttribute('height', rowHeight); rect.setAttribute('class', 'antibiotic-bar');
             chartGroup.appendChild(rect);

             const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
             label.setAttribute('x', x1 + barWidth / 2); label.setAttribute('y', antibioticY + rowHeight / 2); label.setAttribute('dy', '0.35em'); label.setAttribute('class', 'bar-label');
             label.textContent = period.details.split(' ')[0]; // Show drug name

             // Hide label if bar too small (check required elements exist)
             if (timelineSvg.appendChild && timelineSvg.removeChild && label.cloneNode && label.getComputedTextLength) {
                 try {
                    const tempText = label.cloneNode(true);
                    timelineSvg.appendChild(tempText);
                    const textLength = tempText.getComputedTextLength();
                    timelineSvg.removeChild(tempText);
                    if (textLength > barWidth - 6) { label.textContent = ''; }
                 } catch(e) { label.textContent = ''; } // Hide on error
             } else { label.textContent = '';} // Hide if functions missing

             chartGroup.appendChild(label);

              const endDateText = period.endDateActual ? dateLocaleFormat(period.endDateActual.toISOString().split('T')[0]) : 'Laufend';
              rect.addEventListener('mouseover', (e) => showTooltip(e, `<b>Antibiotikum:</b> ${period.details}<br><b>Start:</b> ${dateLocaleFormat(period.start.toISOString().split('T')[0])}<br><b>Ende:</b> ${endDateText}`));
              rect.addEventListener('mouseout', hideTooltip);
        });

        // Draw Germ Markers
        const germEvents = events.filter(e => e.type === 'Mikrobiologie');
        germEvents.forEach(event => { /* ... draw polygon marker, add tooltip ... */
               const x = xScale(new Date(event.date));
               const markerSize = 5;
               const points = `${x},${germY} ${x - markerSize},${germY + markerSize * 1.5} ${x + markerSize},${germY + markerSize * 1.5}`;
               const marker = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
               marker.setAttribute('points', points); marker.setAttribute('class', 'germ-marker');
               chartGroup.appendChild(marker);
               marker.addEventListener('mouseover', (e) => showTooltip(e, `<b>Keim (${dateLocaleFormat(event.date)}):</b><br>${event.details}`));
               marker.addEventListener('mouseout', hideTooltip);
        });

        // Draw Point Markers (OPs, Events, Notes)
        events.forEach(event => { /* ... draw polygon/circle markers, add tooltips ... */
            const date = new Date(event.date);
            if (isNaN(date.getTime())) return; // Skip if date is invalid
            const x = xScale(date);
            let y, markerClass, markerSymbol;
            const markerSize = 6;

            switch (event.type) {
                case 'OP': y = opY; markerClass = 'op-marker'; markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "polygon"); markerSymbol.setAttribute('points', `${x},${y + markerSize * 1.5} ${x - markerSize},${y} ${x + markerSize},${y}`); break;
                case 'Klinisches Ereignis': y = eventY; markerClass = 'event-marker'; markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "polygon"); markerSymbol.setAttribute('points', `${x},${y - markerSize} ${x + markerSize},${y} ${x},${y + markerSize} ${x - markerSize},${y}`); break;
                case 'Notiz': y = eventY; markerClass = 'note-marker'; markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "circle"); markerSymbol.setAttribute('cx', x); markerSymbol.setAttribute('cy', y + markerSize * 0.75 ); markerSymbol.setAttribute('r', markerSize * 0.7); break;
                default: return;
            }
             if (markerSymbol) {
                 markerSymbol.setAttribute('class', markerClass); chartGroup.appendChild(markerSymbol);
                 const tooltipContent = `<b>${event.type} (${dateLocaleFormat(event.date)})</b><br>${event.details}`;
                 markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                 markerSymbol.addEventListener('mouseout', hideTooltip);
             }
        });

    } // End of renderTimeline


    // --- Timeline Axis Helper Functions ---
    function calculateTickInterval(timeRangeMs, widthPx) { /* ... as before ... */ }
    function getFirstTickDate(minDate, unit) { /* ... as before ... */ }
    function formatTickDate(date, unit) { /* ... as before ... */ }


    // --- Clipboard Functions ---

    function copyPatientDataToClipboard() {
        const name = patientNameInput.value || 'N/A';
        const dob = patientDobInput.value ? dateLocaleFormat(patientDobInput.value) : 'N/A';
        const diagnosis = patientDiagnosisInput.value || 'N/A';
        const team = patientTeamInput.value || 'N/A';
        const infektio = infektioInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const plwc = plwcInvolviertCheckbox.checked ? 'Ja' : 'Nein';
        const ortho = orthoTeamSelect.options[orthoTeamSelect.selectedIndex]?.text || 'N/A'; // Get selected text

        const text = `Patient: ${name}\nGeburtsdatum: ${dob}\nDiagnose: ${diagnosis}\nOrthopädie Team: ${ortho}\nZust. ext. Team/Arzt: ${team}\nInfektiologie involviert: ${infektio}\nPLWC involviert: ${plwc}`;

        // Simple HTML version for patient data
        const html = `
            <p><b>Patient:</b> ${name}<br>
               <b>Geburtsdatum:</b> ${dob}<br>
               <b>Diagnose:</b> ${diagnosis.replace(/\n/g, '<br>')}<br> <b>Orthopädie Team:</b> ${ortho}<br>
               <b>Zust. ext. Team/Arzt:</b> ${team}<br>
               <b>Infektiologie involviert:</b> ${infektio}<br>
               <b>PLWC involviert:</b> ${plwc}</p>`;

        copyToClipboard(text, html, copyPatientDataButton);
    }


    function copySummaryToClipboard(listId, title, headers, buttonElement) {
        const listContainer = document.getElementById(`${listId}Container`); // Target container div
        if (!listContainer) return;
        const listItems = listContainer.querySelectorAll('ul > li'); // Select LIs directly under UL

        if (!listItems || listItems.length === 0 || listItems[0].textContent.startsWith('Keine')) {
            alert(`Keine Daten zum Kopieren für "${title}" vorhanden.`);
            return;
        }

        let tableHtml = `<table class="clipboard-table"><caption>${title}</caption><thead><tr><th>${headers[0]}</th><th>${headers[1]}</th></tr></thead><tbody>`;
        let plainText = `${title}\n${headers[0]}\t${headers[1]}\n`;

        listItems.forEach(item => {
            const dateElement = item.querySelector('.date');
            let col1Text = '';
            let col2Text = '';

            if (dateElement) {
                 col1Text = dateElement.textContent.replace(':', '').trim();
                 // Extract details - handles text nodes correctly
                 col2Text = Array.from(item.childNodes)
                               .filter(node => node !== dateElement) // Exclude the date span itself
                               .map(node => node.textContent.trim())
                               .join(' ')
                               .trim();

                 // Adjust for antibiotics "bis" format in first column
                 if (listId === 'antibioticList') {
                     const dateParts = dateElement.textContent.split('bis');
                     col1Text = dateParts[0].trim() + (dateParts[1] ? ' bis ' + dateParts[1].replace(':', '').trim() : '');
                 }
            } else {
                col2Text = item.textContent.trim(); // Fallback if no .date span
            }

            tableHtml += `<tr><td>${col1Text}</td><td>${col2Text.replace(/\n/g, '<br>')}</td></tr>`; // Handle potential newlines
            plainText += `${col1Text}\t${col2Text}\n`;
        });

        tableHtml += `</tbody></table>`;

        // Check if buttonElement is valid before proceeding
         if (!buttonElement) {
             console.error(`Button element not found for copying ${title}`);
             alert(`Fehler: Kopier-Button für ${title} nicht gefunden.`);
             return;
         }

        copyToClipboard(plainText, tableHtml, buttonElement);
    }

    // Universal Copy Function (with added checks)
    function copyToClipboard(plainText, htmlText, buttonElement) {
         // Check if buttonElement is valid at the start
         if (!buttonElement || !buttonElement.textContent) {
             console.error("Copy button element is invalid.");
            //  alert("Fehler: Kopier-Button ist ungültig."); // Avoid alert flood if called often
             return;
         }

         if (!navigator.clipboard || !navigator.clipboard.write) {
            alert('Kopieren in die Zwischenablage wird von diesem Browser nicht vollständig unterstützt oder erfordert eine sichere Verbindung (HTTPS).');
            return;
         }

          // Temporarily store original text in a data attribute
         const originalText = buttonElement.textContent;
         buttonElement.setAttribute('data-original-text', originalText);


         navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': new Blob([plainText], { type: 'text/plain' }),
                'text/html': new Blob([htmlText], { type: 'text/html' })
            })
         ]).then(() => {
             // FIX: Check buttonElement still exists before updating
              const currentButton = document.getElementById(buttonElement.id); // Re-fetch by ID
              if (currentButton) {
                  currentButton.textContent = 'Kopiert!';
                  currentButton.disabled = true;
                  setTimeout(() => {
                     const finalButton = document.getElementById(buttonElement.id); // Re-fetch again inside timeout
                     if (finalButton) {
                        finalButton.textContent = finalButton.getAttribute('data-original-text') || originalText; // Use original text
                        finalButton.disabled = false;
                     }
                  }, 2000);
              }
         }).catch(err => {
             console.error('Fehler beim Kopieren: ', err);
             alert('Fehler beim Kopieren in die Zwischenablage. Siehe Konsole für Details.');
             // Reset button text even on error
             const currentButton = document.getElementById(buttonElement.id);
             if (currentButton) {
                 currentButton.textContent = currentButton.getAttribute('data-original-text') || originalText;
                 currentButton.disabled = false;
             }
         });
    }


    // --- Initial Load ---
    // loadData(); // Already called at the top after variable definitions
    // render(); // Render is called by loadData

}); // End DOMContentLoaded
