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
    const patientDiagnosisInput = document.getElementById('patientDiagnosis');
    const patientTeamInput = document.getElementById('patientTeam');


    let events = JSON.parse(localStorage.getItem('patientTimelineEvents')) || [];

    // --- Localization ---
    const lang = 'de-DE'; // Set language for date formatting
    const dateFormatOptions = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const dateLocaleFormat = (dateStr) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString(lang, dateFormatOptions);
        } catch (e) {
            return dateStr; // Fallback if date is invalid
        }
    };

    // --- Event Handling ---

    eventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newEvent = {
            id: Date.now(), // Simple unique ID
            date: document.getElementById('eventDate').value,
            type: document.getElementById('eventType').value,
            details: document.getElementById('eventDetails').value.trim()
        };

        if (newEvent.date && newEvent.type && newEvent.details) {
            events.push(newEvent);
            events.sort((a, b) => new Date(a.date) - new Date(b.date)); // Keep sorted
            saveEvents();
            render();
            eventForm.reset();
        } else {
            alert('Bitte alle Ereignisfelder ausfüllen.');
        }
    });

    clearAllButton.addEventListener('click', () => {
        if (confirm('Sind Sie sicher, dass Sie alle eingegebenen Ereignisse löschen möchten? Dies kann nicht rückgängig gemacht werden.')) {
            events = [];
            saveEvents();
            render();
             // Clear patient data as well? Optional.
            // patientNameInput.value = ''; patientDobInput.value = ''; patientDiagnosisInput.value = ''; patientTeamInput.value = '';
        }
    });

    // Clipboard Button Listeners
    copyPatientDataButton.addEventListener('click', copyPatientDataToClipboard);
    copyOpsButton.addEventListener('click', () => copySummaryToClipboard('opList', 'Übersicht OPs'));
    copyGermsButton.addEventListener('click', () => copySummaryToClipboard('germList', 'Übersicht Keim(e)'));
    copyAntibioticsButton.addEventListener('click', () => copySummaryToClipboard('antibioticList', 'Übersicht Antibiotika'));


    // Function to handle deleting an event
    function handleDelete(eventId) {
        events = events.filter(event => event.id !== eventId);
        saveEvents();
        render();
    }

    // --- Local Storage ---

    function saveEvents() {
        localStorage.setItem('patientTimelineEvents', JSON.stringify(events));
        // Save patient data too?
        /* localStorage.setItem('patientTimelinePatientData', JSON.stringify({
            name: patientNameInput.value, dob: patientDobInput.value, dx: patientDiagnosisInput.value, team: patientTeamInput.value
        })); */
    }

    function loadPatientData() {
        /* const data = JSON.parse(localStorage.getItem('patientTimelinePatientData'));
        if (data) {
            patientNameInput.value = data.name || '';
            patientDobInput.value = data.dob || '';
            patientDiagnosisInput.value = data.dx || '';
            patientTeamInput.value = data.team || '';
        } */
         // Simple load for events only for now
    }


    // --- Rendering ---

    function render() {
        renderEventList();
        renderSummaries();
        renderTimeline();
    }

    function renderEventList() {
        eventListElement.innerHTML = ''; // Clear list
        if (events.length === 0) {
            eventListElement.innerHTML = '<li>Noch keine Ereignisse hinzugefügt.</li>';
            return;
        }

        // Get German type names if needed (can map here or use directly)
         const typeMap = { // If internal values differ from display
            'OP': 'Operation (OP)',
            'Antibiotika Start': 'Antibiotika Start',
            'Antibiotika Ende': 'Antibiotika Ende',
            'Mikrobiologie': 'Mikrobiologie (Keim)',
            'Labor CRP': 'Labor: CRP (mg/l)',
            'Labor Lc': 'Labor: Lc (G/l)',
            'Klinisches Ereignis': 'Klinisches Ereignis',
            'Notiz': 'Notiz'
          };


        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            const displayType = typeMap[event.type] || event.type; // Use mapped name
            textSpan.textContent = `${dateLocaleFormat(event.date)} - ${displayType}: ${event.details}`;
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
        const germs = events.filter(e => e.type === 'Mikrobiologie'); // Changed type name
        const antibioticStarts = events.filter(e => e.type === 'Antibiotika Start');
        const antibioticEnds = events.filter(e => e.type === 'Antibiotika Ende');

        // Render OPs
        if (ops.length === 0) {
            opListElement.innerHTML = '<li>Keine OPs eingegeben.</li>';
        } else {
            ops.forEach(op => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="date">${dateLocaleFormat(op.date)}:</span> ${op.details}`;
                opListElement.appendChild(li);
            });
        }

        // Render Germs
        if (germs.length === 0) {
            germListElement.innerHTML = '<li>Keine Mikrobiologie eingegeben.</li>';
        } else {
            germs.forEach(germ => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="date">${dateLocaleFormat(germ.date)}:</span> ${germ.details}`; // Example: "Keim XY, Resistenzen: ..."
                germListElement.appendChild(li);
            });
        }

        // Render Antibiotics
        const antibiotics = [];
        let usedEndIds = new Set(); // Track used end events to avoid reuse

        antibioticStarts.forEach(start => {
            const startDrugName = start.details.split(' ')[0].toLowerCase();
            let matchedEnd = null;

            const potentialEnds = ends
                .filter(end => !usedEndIds.has(end.id) && end.details.toLowerCase().includes(startDrugName) && new Date(end.date) >= new Date(start.date))
                .sort((a, b) => new Date(a.date) - new Date(b.date)); // Find earliest matching end

            if (potentialEnds.length > 0) {
                matchedEnd = potentialEnds[0];
                usedEndIds.add(matchedEnd.id); // Mark this end event as used
            }

             antibiotics.push({
                start: start.date,
                end: matchedEnd ? matchedEnd.date : 'Laufend', // Use German "Laufend"
                details: start.details
            });
        });

         if (antibiotics.length === 0) {
            antibioticListElement.innerHTML = '<li>Keine Antibiotika eingegeben.</li>';
        } else {
            // Sort final list by start date before rendering
            antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => {
                const li = document.createElement('li');
                const endDateFormatted = ab.end === 'Laufend' ? ab.end : dateLocaleFormat(ab.end);
                li.innerHTML = `<span class="date">${dateLocaleFormat(ab.start)} bis ${endDateFormatted}:</span> ${ab.details}`;
                antibioticListElement.appendChild(li);
            });
         }
    }

    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear SVG

        if (events.length === 0) {
             timelineStatus.style.display = 'block';
             timelineSvgWrapper.style.display = 'none'; // Hide wrapper
            return;
        }
         timelineStatus.style.display = 'none';
         timelineSvgWrapper.style.display = 'block'; // Show wrapper


        // --- Timeline Setup ---
        const svgWidth = Math.max(800, timelineSvgWrapper.clientWidth); // Use wrapper width or min width
        const svgHeight = 450; // Fixed height from HTML
        // INCREASED LEFT MARGIN for labels
        const margin = { top: 40, right: 30, bottom: 60, left: 90 }; // Increased left margin
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

         // --- Tooltip Setup ---
         let tooltip = document.querySelector('.tooltip');
         if (!tooltip) { // Create if not exists
             tooltip = document.createElement('div');
             tooltip.classList.add('tooltip');
             document.body.appendChild(tooltip);
         }

         function showTooltip(event, content) {
            tooltip.style.opacity = 1;
            tooltip.innerHTML = content;
            tooltip.style.left = (event.pageX + 15) + 'px'; // Position slightly offset
            tooltip.style.top = (event.pageY + 15) + 'px';
         }
         function hideTooltip() {
            tooltip.style.opacity = 0;
            tooltip.style.left = '-9999px'; // Move off-screen immediately
         }


        // --- Create SVG Canvas ---
        // Set attributes directly on the existing SVG element
        timelineSvg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
        timelineSvg.setAttribute('preserveAspectRatio', 'xMinYMin meet'); // Adjust scaling if needed

        const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        // Apply margin translation
        chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        timelineSvg.appendChild(chartGroup);


        // --- Data Preparation ---
        const dates = events.map(e => new Date(e.date));
        let minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
        let maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

        // Add padding to date range (e.g., 2% of range before and after)
        const datePaddingMs = Math.max((maxDate - minDate) * 0.02, 86400000); // Min 1 day padding
        minDate = new Date(minDate.getTime() - datePaddingMs);
        maxDate = new Date(maxDate.getTime() + datePaddingMs);

        const crpData = events.filter(e => e.type === 'Labor CRP' && !isNaN(parseFloat(e.details))).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));
        const lcData = events.filter(e => e.type === 'Labor Lc' && !isNaN(parseFloat(e.details))).map(e => ({ date: new Date(e.date), value: parseFloat(e.details), details: e.details }));


        // --- Scales ---
        const xScale = (date) => {
            const timeDiff = date - minDate;
            const totalTime = maxDate - minDate;
            return totalTime === 0 ? 0 : (timeDiff / totalTime) * width;
        };

        const rowHeight = 20;
        const opY = 0;
        const eventY = rowHeight * 1.5;
        const antibioticY = rowHeight * 3;
        const germY = rowHeight * 4.5;
        const labPlotAreaY = rowHeight * 6;
        const labPlotAreaHeight = Math.max(50, height - labPlotAreaY); // Ensure minimum plot height

        const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value), 1) : 1; // Include 1 to avoid 0 max
        const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value), 1) : 1;
        const crpYScale = (value) => labPlotAreaY + labPlotAreaHeight - (value / maxCrpValue) * labPlotAreaHeight * 0.45;
        const lcYScale = (value) => labPlotAreaY + (labPlotAreaHeight * 0.5) - (value / maxLcValue) * labPlotAreaHeight * 0.45;


        // --- Draw Axes ---
        const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xAxisLine.setAttribute('x1', 0);
        xAxisLine.setAttribute('y1', height);
        xAxisLine.setAttribute('x2', width);
        xAxisLine.setAttribute('y2', height);
        xAxisLine.setAttribute('class', 'axis-line');
        chartGroup.appendChild(xAxisLine);

         // X Axis Ticks (Improved logic for date ticks)
         const timeRange = maxDate.getTime() - minDate.getTime();
         const tickInterval = calculateTickInterval(timeRange, width); // Calculate appropriate interval (days, weeks, months)
         let currentTickDate = getFirstTickDate(minDate, tickInterval.unit);

         while (currentTickDate <= maxDate) {
             const xPos = xScale(currentTickDate);
             if (xPos >= 0 && xPos <= width) { // Only draw ticks within bounds
                 const tickMark = document.createElementNS("http://www.w3.org/2000/svg", "line");
                 tickMark.setAttribute('x1', xPos);
                 tickMark.setAttribute('y1', height);
                 tickMark.setAttribute('x2', xPos);
                 tickMark.setAttribute('y2', height + 5);
                 tickMark.setAttribute('class', 'axis-tick');
                 chartGroup.appendChild(tickMark);

                 const tickLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
                 tickLabel.setAttribute('x', xPos);
                 tickLabel.setAttribute('y', height + 20);
                 tickLabel.setAttribute('class', 'axis-tick');
                 tickLabel.textContent = formatTickDate(currentTickDate, tickInterval.unit);
                 chartGroup.appendChild(tickLabel);
             }
             // Increment date by interval
             if (tickInterval.unit === 'day') currentTickDate.setDate(currentTickDate.getDate() + tickInterval.step);
             else if (tickInterval.unit === 'week') currentTickDate.setDate(currentTickDate.getDate() + 7 * tickInterval.step);
             else if (tickInterval.unit === 'month') currentTickDate.setMonth(currentTickDate.getMonth() + tickInterval.step);
             else currentTickDate.setDate(currentTickDate.getDate() + tickInterval.step); // Fallback
         }


        // Y Axis Labels
        const yLabels = [
            { y: opY + rowHeight / 2, text: 'OPs' },
            { y: eventY + rowHeight / 2, text: 'Ereignisse' }, // German
            { y: antibioticY + rowHeight / 2, text: 'Antibiotika' }, // German
            { y: germY + rowHeight / 2, text: 'Keim(e)' }, // German
            { y: labPlotAreaY + labPlotAreaHeight * 0.25, text: `Lc (G/l)` }, // German
            { y: labPlotAreaY + labPlotAreaHeight * 0.75, text: `CRP (mg/l)` } // German
        ];
         yLabels.forEach(label => {
             const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
             text.setAttribute('x', -10); // Position left of the chart area (relative to chartGroup)
             text.setAttribute('y', label.y);
             text.setAttribute('dy', '0.35em');
             text.setAttribute('text-anchor', 'end'); // Anchor text to the end (right side)
             text.setAttribute('class', 'axis-label');
             text.textContent = label.text;
             chartGroup.appendChild(text);
         });


        // --- Draw Events ---

         function plotLabData(data, yScale, className, unit) {
             if (data.length < 1) return;
             data.sort((a, b) => a.date - b.date);

              if (data.length > 1) {
                const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                let d = `M ${xScale(data[0].date)} ${yScale(data[0].value)}`;
                for (let i = 1; i < data.length; i++) {
                    d += ` L ${xScale(data[i].date)} ${yScale(data[i].value)}`;
                }
                linePath.setAttribute('d', d);
                linePath.setAttribute('class', `${className}-plot`);
                chartGroup.appendChild(linePath);
              }

             data.forEach(d => {
                 const x = xScale(d.date);
                 const y = yScale(d.value);
                 const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                 point.setAttribute('cx', x);
                 point.setAttribute('cy', y);
                 point.setAttribute('r', 3);
                 point.setAttribute('class', `${className}-point`);
                 chartGroup.appendChild(point);

                 const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                 label.setAttribute('x', x);
                 label.setAttribute('y', y - 7);
                 label.setAttribute('class', 'lab-value-label');
                 label.textContent = d.value;
                 chartGroup.appendChild(label);

                 point.addEventListener('mouseover', (e) => showTooltip(e, `${dateLocaleFormat(d.date.toISOString().split('T')[0])}<br>${className.toUpperCase()}: ${d.value} ${unit}`));
                 point.addEventListener('mouseout', hideTooltip);
                 label.addEventListener('mouseover', (e) => showTooltip(e, `${dateLocaleFormat(d.date.toISOString().split('T')[0])}<br>${className.toUpperCase()}: ${d.value} ${unit}`));
                 label.addEventListener('mouseout', hideTooltip);
             });
         }
         plotLabData(crpData, crpYScale, 'crp', 'mg/l');
         plotLabData(lcData, lcYScale, 'lc', 'G/l');


         // Draw Bars (Antibiotics)
         const antibioticPeriods = [];
         const starts = events.filter(e => e.type === 'Antibiotika Start');
         const ends = events.filter(e => e.type === 'Antibiotika Ende');
         let usedEndIds_timeline = new Set();

         starts.forEach(start => {
            const startDrugName = start.details.split(' ')[0].toLowerCase();
            let matchedEnd = null;
            const potentialEnds = ends
                .filter(end => !usedEndIds_timeline.has(end.id) && end.details.toLowerCase().includes(startDrugName) && new Date(end.date) >= new Date(start.date))
                .sort((a, b) => new Date(a.date) - new Date(b.date));

            if (potentialEnds.length > 0) {
                matchedEnd = potentialEnds[0];
                usedEndIds_timeline.add(matchedEnd.id);
            }
             antibioticPeriods.push({
                 start: new Date(start.date),
                 end: matchedEnd ? new Date(matchedEnd.date) : maxDate, // Ends at maxDate if no match
                 details: start.details,
                 endDateActual: matchedEnd ? new Date(matchedEnd.date) : null // Store actual end date if found
             });
         });

         antibioticPeriods.forEach(period => {
             const x1 = xScale(period.start);
             const x2 = xScale(period.end);
             const barWidth = Math.max(2, x2 - x1);

             const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
             rect.setAttribute('x', x1);
             rect.setAttribute('y', antibioticY);
             rect.setAttribute('width', barWidth);
             rect.setAttribute('height', rowHeight);
             rect.setAttribute('class', 'antibiotic-bar');
             chartGroup.appendChild(rect);

             const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
             label.setAttribute('x', x1 + barWidth / 2);
             label.setAttribute('y', antibioticY + rowHeight / 2);
             label.setAttribute('dy', '0.35em');
             label.setAttribute('class', 'bar-label');
             label.textContent = period.details.split(' ')[0]; // Show drug name

             try { // Wrap text length calculation in try-catch
                const tempText = label.cloneNode(true);
                timelineSvg.appendChild(tempText); // Append temporary text to the actual SVG for calculation
                const textLength = tempText.getComputedTextLength();
                timelineSvg.removeChild(tempText); // Remove immediately

                if (textLength > barWidth - 6) { // Allow some padding
                    label.textContent = ''; // Hide label if too small
                }
             } catch(e) {
                 console.error("Error calculating text length:", e);
                 label.textContent = ''; // Hide label on error
             }

             chartGroup.appendChild(label);

              const endDateText = period.endDateActual ? dateLocaleFormat(period.endDateActual.toISOString().split('T')[0]) : 'Laufend';
              rect.addEventListener('mouseover', (e) => showTooltip(e, `<b>Antibiotikum:</b> ${period.details}<br><b>Start:</b> ${dateLocaleFormat(period.start.toISOString().split('T')[0])}<br><b>Ende:</b> ${endDateText}`));
              rect.addEventListener('mouseout', hideTooltip);
          });

           // Draw Germ Markers
           const germEvents = events.filter(e => e.type === 'Mikrobiologie');
           germEvents.forEach(event => {
               const x = xScale(new Date(event.date));
               const markerSize = 5;
               // Triangle pointing down
               const points = `${x},${germY} ${x - markerSize},${germY + markerSize * 1.5} ${x + markerSize},${germY + markerSize * 1.5}`;

               const marker = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
               marker.setAttribute('points', points);
               marker.setAttribute('class', 'germ-marker'); // Use specific class
               chartGroup.appendChild(marker);

               marker.addEventListener('mouseover', (e) => showTooltip(e, `<b>Keim (${dateLocaleFormat(event.date)}):</b><br>${event.details}`));
               marker.addEventListener('mouseout', hideTooltip);
           });


        // Draw Point Markers (OPs, Events, Notes) - Draw last
        events.forEach(event => {
            const date = new Date(event.date);
            const x = xScale(date);
            let y, markerClass, markerSymbol;
            const markerSize = 6;

            switch (event.type) {
                case 'OP':
                    y = opY;
                    markerClass = 'op-marker';
                    markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    markerSymbol.setAttribute('points', `${x},${y + markerSize * 1.5} ${x - markerSize},${y} ${x + markerSize},${y}`); // Triangle down
                    break;
                case 'Klinisches Ereignis':
                     y = eventY;
                     markerClass = 'event-marker';
                     markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                     markerSymbol.setAttribute('points', `${x},${y - markerSize} ${x + markerSize},${y} ${x},${y + markerSize} ${x - markerSize},${y}`); // Diamond
                    break;
                 case 'Notiz':
                     y = eventY;
                     markerClass = 'note-marker';
                     markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                     markerSymbol.setAttribute('cx', x);
                     markerSymbol.setAttribute('cy', y + markerSize * 0.75 ); // Center circle vertically
                     markerSymbol.setAttribute('r', markerSize * 0.7);
                    break;
                default:
                    return;
            }

             if (markerSymbol) {
                 markerSymbol.setAttribute('class', markerClass);
                 chartGroup.appendChild(markerSymbol);

                 // Tooltip for markers
                  const tooltipContent = `<b>${event.type} (${dateLocaleFormat(event.date)})</b><br>${event.details}`;
                  markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, tooltipContent));
                  markerSymbol.addEventListener('mouseout', hideTooltip);
             }
        });

    } // End of renderTimeline


     // --- Timeline Axis Helper Functions ---
     function calculateTickInterval(timeRangeMs, widthPx) {
        const maxTicks = Math.max(5, Math.floor(widthPx / 100)); // Aim for ticks every 100px
        const msPerDay = 86400000;
        const days = timeRangeMs / msPerDay;

        if (days <= maxTicks * 2) return { unit: 'day', step: 1 }; // Every day
        if (days <= maxTicks * 7) return { unit: 'day', step: Math.ceil(days / maxTicks) }; // Every few days
        if (days <= maxTicks * 14) return { unit: 'week', step: 1 }; // Every week
        if (days <= maxTicks * 35) return { unit: 'week', step: Math.ceil(days / (maxTicks * 7)) }; // Every few weeks
        if (days <= maxTicks * 90) return { unit: 'month', step: 1 }; // Every month
        return { unit: 'month', step: Math.ceil(days / (maxTicks * 30)) }; // Every few months
     }

     function getFirstTickDate(minDate, unit) {
        const date = new Date(minDate);
        date.setHours(0, 0, 0, 0); // Start of the day
        if (unit === 'week') {
            date.setDate(date.getDate() - date.getDay() + 1); // Start of the week (Monday)
        } else if (unit === 'month') {
            date.setDate(1); // Start of the month
        }
        // Adjust if first tick is before minDate
        while(date < minDate) {
             if (unit === 'day') date.setDate(date.getDate() + 1);
             else if (unit === 'week') date.setDate(date.getDate() + 7);
             else if (unit === 'month') date.setMonth(date.getMonth() + 1);
             else date.setDate(date.getDate() + 1); // fallback
        }
        return date;
     }

     function formatTickDate(date, unit) {
         const optionsDay = { month: 'short', day: 'numeric' };
         const optionsMonth = { month: 'short', year: 'numeric' };
         if (unit === 'month') {
             // Show month/year only if it's the first day of the month
             return date.getDate() === 1 ? date.toLocaleDateString(lang, optionsMonth) : date.toLocaleDateString(lang, optionsDay);
         }
         return date.toLocaleDateString(lang, optionsDay);
     }


    // --- Clipboard Functions ---

    function copyPatientDataToClipboard() {
        const name = patientNameInput.value;
        const dob = patientDobInput.value ? dateLocaleFormat(patientDobInput.value) : 'N/A';
        const diagnosis = patientDiagnosisInput.value || 'N/A';
        const team = patientTeamInput.value || 'N/A';

        const text = `Patient: ${name}\nGeburtsdatum: ${dob}\nDiagnose: ${diagnosis}\nZuständiges Team: ${team}`;

        copyToClipboard(text, text, copyPatientDataButton); // Pass text for both plain and HTML (simple case)
    }


    function copySummaryToClipboard(listId, title) {
        const listElement = document.getElementById(listId);
        const listItems = listElement.querySelectorAll('li');
        const button = document.getElementById(`copy${listId.replace('List','')}Button`); // e.g., copyOpsButton

        if (!listItems || listItems.length === 0 || listItems[0].textContent.startsWith('Keine')) {
            alert(`Keine Daten zum Kopieren für "${title}" vorhanden.`);
            return;
        }

        let tableHtml = `<table class="clipboard-table"><thead><tr><th>Datum</th><th>Details</th></tr></thead><tbody>`;
        let plainText = `${title}\nDatum\tDetails\n`; // Header for plain text

        listItems.forEach(item => {
            const dateElement = item.querySelector('.date');
            let dateText = '';
            let detailsText = '';

            if (dateElement) {
                dateText = dateElement.textContent.replace(':', '').trim();
                // Extract details - assumes details are the rest of the text node after the span
                 detailsText = Array.from(item.childNodes)
                                   .filter(node => node.nodeType === Node.TEXT_NODE)
                                   .map(node => node.textContent.trim())
                                   .join(' ')
                                   .trim();
                // Special handling for antibiotics which have "bis" in the date span
                if (listId === 'antibioticList') {
                   const dateParts = dateElement.textContent.split('bis');
                   dateText = dateParts[0].trim() + (dateParts[1] ? ' bis ' + dateParts[1].replace(':', '').trim() : '');
                }

            } else {
                // Fallback if structure is just text
                detailsText = item.textContent.trim();
            }


            tableHtml += `<tr><td>${dateText}</td><td>${detailsText}</td></tr>`;
            plainText += `${dateText}\t${detailsText}\n`;
        });

        tableHtml += `</tbody></table>`;

        copyToClipboard(plainText, tableHtml, button);
    }

    // Universal Copy Function
    function copyToClipboard(plainText, htmlText, buttonElement) {
         if (!navigator.clipboard || !navigator.clipboard.write) {
            alert('Kopieren in die Zwischenablage wird von diesem Browser nicht vollständig unterstützt oder erfordert eine sichere Verbindung (HTTPS).');
             // Add fallback using execCommand if needed, but it's deprecated
             // fallbackCopyTextToClipboard(plainText);
            return;
         }

         navigator.clipboard.write([
            new ClipboardItem({
                'text/plain': new Blob([plainText], { type: 'text/plain' }),
                'text/html': new Blob([htmlText], { type: 'text/html' })
            })
         ]).then(() => {
             // Success feedback
             const originalText = buttonElement.textContent;
             buttonElement.textContent = 'Kopiert!';
             buttonElement.disabled = true;
             setTimeout(() => {
                 buttonElement.textContent = originalText;
                 buttonElement.disabled = false;
             }, 2000); // Reset after 2 seconds
         }).catch(err => {
             console.error('Fehler beim Kopieren: ', err);
             alert('Fehler beim Kopieren in die Zwischenablage. Siehe Konsole für Details.');
             // Optional: Fallback for specific errors
             // fallbackCopyTextToClipboard(plainText);
         });
    }

    // --- Initial Load ---
    // loadPatientData(); // Optional: Load saved patient data
    render(); // Initial render of events from storage

}); // End DOMContentLoaded
