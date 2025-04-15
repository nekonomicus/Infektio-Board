document.addEventListener('DOMContentLoaded', () => {
    const eventForm = document.getElementById('eventForm');
    const eventListElement = document.getElementById('eventList');
    const timelineSvg = document.getElementById('timelineSvg');
    const opListElement = document.getElementById('opList');
    const germListElement = document.getElementById('germList');
    const antibioticListElement = document.getElementById('antibioticList');
    const timelineStatus = document.getElementById('timelineStatus');
    const clearAllButton = document.getElementById('clearAllButton');
    const printButton = document.getElementById('printButton');

    let events = JSON.parse(localStorage.getItem('patientTimelineEvents')) || [];

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
            alert('Please fill in all event fields.');
        }
    });

    clearAllButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all entered events? This cannot be undone.')) {
            events = [];
            saveEvents();
            render();
        }
    });

     printButton.addEventListener('click', () => {
        window.print();
    });

    // Function to handle deleting an event
    function handleDelete(eventId) {
        events = events.filter(event => event.id !== eventId);
        saveEvents();
        render();
    }

    // --- Local Storage ---

    function saveEvents() {
        localStorage.setItem('patientTimelineEvents', JSON.stringify(events));
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
            eventListElement.innerHTML = '<li>No events added yet.</li>';
            return;
        }

        events.forEach(event => {
            const li = document.createElement('li');
            const textSpan = document.createElement('span');
            textSpan.textContent = `${event.date} - ${event.type}: ${event.details}`;
            li.appendChild(textSpan);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-button');
            deleteButton.onclick = () => handleDelete(event.id);
            li.appendChild(deleteButton);

            eventListElement.appendChild(li);
        });
    }

    function renderSummaries() {
        // Clear previous summaries
        opListElement.innerHTML = '';
        germListElement.innerHTML = '';
        antibioticListElement.innerHTML = '';

        // Filter events
        const ops = events.filter(e => e.type === 'OP');
        const germs = events.filter(e => e.type === 'Germ Culture');
        const antibioticStarts = events.filter(e => e.type === 'Antibiotic Start');
        const antibioticEnds = events.filter(e => e.type === 'Antibiotic End');

        // Render OPs
        if (ops.length === 0) {
            opListElement.innerHTML = '<li>No OPs entered.</li>';
        } else {
            ops.forEach(op => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="date">${op.date}:</span> ${op.details}`;
                opListElement.appendChild(li);
            });
        }

        // Render Germs
        if (germs.length === 0) {
            germListElement.innerHTML = '<li>No Germ Cultures entered.</li>';
        } else {
            germs.forEach(germ => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="date">${germ.date}:</span> ${germ.details}`;
                germListElement.appendChild(li);
            });
        }

        // Render Antibiotics (match start and end)
        const antibiotics = [];
        antibioticStarts.forEach(start => {
            // Find the *first* matching end event *after* the start date
            const end = antibioticEnds.find(e =>
                e.details.toLowerCase().includes(start.details.split(' ')[0].toLowerCase()) && // Basic name match
                new Date(e.date) >= new Date(start.date)
            );
             antibiotics.push({
                start: start.date,
                end: end ? end.date : 'Ongoing',
                details: start.details
            });
             // Optional: remove matched end event to prevent reuse if multiple courses of same drug
             // if(end) antibioticEnds.splice(antibioticEnds.indexOf(end), 1);
        });

         if (antibiotics.length === 0) {
            antibioticListElement.innerHTML = '<li>No Antibiotics entered.</li>';
        } else {
            antibiotics.sort((a,b) => new Date(a.start) - new Date(b.start)).forEach(ab => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="date">${ab.start} to ${ab.end}:</span> ${ab.details}`;
                antibioticListElement.appendChild(li);
            });
         }
    }

    function renderTimeline() {
        timelineSvg.innerHTML = ''; // Clear previous SVG content

        if (events.length === 0) {
             timelineStatus.style.display = 'block';
             timelineSvg.style.display = 'none';
            return;
        }
         timelineStatus.style.display = 'none';
         timelineSvg.style.display = 'block';


        // --- Timeline Setup ---
        const svgWidth = timelineSvg.clientWidth;
        const svgHeight = parseInt(timelineSvg.getAttribute('height')); // Use the height attribute
        const margin = { top: 40, right: 30, bottom: 60, left: 50 }; // Increased bottom margin for labels
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        // --- Tooltip Setup ---
         const tooltip = document.createElement('div');
         tooltip.classList.add('tooltip');
         document.body.appendChild(tooltip); // Append tooltip to body for positioning

         function showTooltip(event, content) {
             tooltip.style.opacity = 1;
             tooltip.innerHTML = content;
              // Position tooltip relative to the mouse cursor
             tooltip.style.left = (event.pageX + 10) + 'px';
             tooltip.style.top = (event.pageY - 20) + 'px';
         }

         function hideTooltip() {
             tooltip.style.opacity = 0;
             tooltip.style.left = '-9999px'; // Move off-screen
         }


        // --- Create SVG Canvas ---
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
         svg.setAttribute('width', svgWidth);
         svg.setAttribute('height', svgHeight);
         timelineSvg.appendChild(svg);

         const chartGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
         chartGroup.setAttribute('transform', `translate(${margin.left},${margin.top})`);
         svg.appendChild(chartGroup);


        // --- Data Preparation ---
        const dates = events.map(e => new Date(e.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // Add padding to date range (e.g., 1 day before and after)
        minDate.setDate(minDate.getDate() - 1);
        maxDate.setDate(maxDate.getDate() + 1);

        // Filter lab data
        const crpData = events.filter(e => e.type === 'Lab CRP' && !isNaN(parseFloat(e.details))).map(e => ({ date: new Date(e.date), value: parseFloat(e.details) }));
        const lcData = events.filter(e => e.type === 'Lab Lc' && !isNaN(parseFloat(e.details))).map(e => ({ date: new Date(e.date), value: parseFloat(e.details) }));


        // --- Scales ---
        const xScale = (date) => {
            const timeDiff = date - minDate;
            const totalTime = maxDate - minDate;
            return totalTime === 0 ? 0 : (timeDiff / totalTime) * width; // Avoid division by zero if only one date
        };

        // Simple categorical Y scale for bars/markers
        const rowHeight = 20; // Height for each bar/marker row
        const opY = 0;
        const eventY = rowHeight * 1.5;
        const antibioticY = rowHeight * 3;
        const germY = rowHeight * 4.5; // Or plot as markers
        const labPlotAreaY = rowHeight * 6;
        const labPlotAreaHeight = height - labPlotAreaY;

         // Y Scale for Lab Values (simple linear scale within their area)
         const maxCrpValue = crpData.length > 0 ? Math.max(...crpData.map(d => d.value)) : 1; // Avoid 0 max
         const maxLcValue = lcData.length > 0 ? Math.max(...lcData.map(d => d.value)) : 1;
         const crpYScale = (value) => labPlotAreaY + labPlotAreaHeight - (value / maxCrpValue) * labPlotAreaHeight * 0.45; // Use bottom half for CRP
         const lcYScale = (value) => labPlotAreaY + (labPlotAreaHeight * 0.5) - (value / maxLcValue) * labPlotAreaHeight * 0.45; // Use top half for Lc


        // --- Draw Axes ---
        // X Axis Line
        const xAxisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        xAxisLine.setAttribute('x1', 0);
        xAxisLine.setAttribute('y1', height);
        xAxisLine.setAttribute('x2', width);
        xAxisLine.setAttribute('y2', height);
        xAxisLine.setAttribute('class', 'axis-line');
        chartGroup.appendChild(xAxisLine);

        // X Axis Ticks and Labels (simplified: start, end, maybe middle)
         const numTicks = Math.min(10, Math.floor(width / 80)); // Adjust number of ticks based on width
         const timeRange = maxDate.getTime() - minDate.getTime();
         for (let i = 0; i <= numTicks; i++) {
             const tickDate = new Date(minDate.getTime() + (timeRange * i / numTicks));
             const xPos = xScale(tickDate);

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
             tickLabel.setAttribute('text-anchor', 'middle');
             tickLabel.setAttribute('class', 'axis-tick');
             tickLabel.textContent = tickDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); // Format date
             chartGroup.appendChild(tickLabel);
         }

        // Y Axis Labels (for rows)
        const yLabels = [
            { y: opY + rowHeight / 2, text: 'OPs', class: 'op-marker'},
            { y: eventY + rowHeight / 2, text: 'Events', class: 'event-marker'},
            { y: antibioticY + rowHeight / 2, text: 'Antibiotics', class: 'antibiotic-bar'},
            { y: germY + rowHeight / 2, text: 'Germs', class: 'germ-bar'},
            { y: labPlotAreaY + labPlotAreaHeight * 0.25, text: 'Lc (G/l)', class: 'lc-plot'},
            { y: labPlotAreaY + labPlotAreaHeight * 0.75, text: 'CRP (mg/l)', class: 'crp-plot'}
        ];
         yLabels.forEach(label => {
             const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
             text.setAttribute('x', -margin.left + 5); // Position left of the chart area
             text.setAttribute('y', label.y);
             text.setAttribute('dy', '0.35em'); // Vertical alignment
             text.setAttribute('text-anchor', 'start');
             text.setAttribute('class', 'axis-label');
              text.setAttribute('fill', getComputedStyle(document.documentElement).getPropertyValue('--' + label.class.split('-')[0] + '-color') || '#333'); // Use CSS variable or default
              // Extract base color name if possible for styling axis label
              if(label.class.includes('plot')) text.style.fill = label.class.includes('crp') ? '#3498db' : '#9b59b6';
              else if(label.class.includes('op')) text.style.fill = '#e74c3c';
              else if(label.class.includes('event')) text.style.fill = '#f1c40f';
              else if(label.class.includes('antibiotic')) text.style.fill = '#2ecc71';
              else if(label.class.includes('germ')) text.style.fill = '#f39c12';
              else text.style.fill = '#bdc3c7';


             text.textContent = label.text;
             chartGroup.appendChild(text);
         });


        // --- Draw Events ---

         // Plot Lab Values (Lines and Points)
         function plotLabData(data, yScale, className) {
             if (data.length < 1) return; // Need at least 1 point

             // Sort data by date for line drawing
             data.sort((a, b) => a.date - b.date);

             // Draw line
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

             // Draw points and labels
             data.forEach(d => {
                 const x = xScale(d.date);
                 const y = yScale(d.value);

                 const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                 point.setAttribute('cx', x);
                 point.setAttribute('cy', y);
                 point.setAttribute('r', 3); // Point radius
                 point.setAttribute('class', `${className}-point`);
                 chartGroup.appendChild(point);

                 const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                 label.setAttribute('x', x);
                 label.setAttribute('y', y - 7); // Position label above point
                 label.setAttribute('class', 'lab-value-label');
                 label.textContent = d.value;
                 chartGroup.appendChild(label);

                  // Add tooltip to point
                 point.addEventListener('mouseover', (e) => showTooltip(e, `${d.date.toLocaleDateString()}<br>${className.toUpperCase()}: ${d.value}`));
                 point.addEventListener('mouseout', hideTooltip);
                 label.addEventListener('mouseover', (e) => showTooltip(e, `${d.date.toLocaleDateString()}<br>${className.toUpperCase()}: ${d.value}`));
                 label.addEventListener('mouseout', hideTooltip);
             });
         }
         plotLabData(crpData, crpYScale, 'crp');
         plotLabData(lcData, lcYScale, 'lc');


         // Draw Bars (Antibiotics, Germs if desired)
         const antibioticEvents = events.filter(e => e.type === 'Antibiotic Start' || e.type === 'Antibiotic End');
         const germEvents = events.filter(e => e.type === 'Germ Culture');

         // Process Antibiotics
         const antibioticPeriods = [];
         const starts = antibioticEvents.filter(e => e.type === 'Antibiotic Start');
         const ends = antibioticEvents.filter(e => e.type === 'Antibiotic End');

         starts.forEach(start => {
            // Very basic name matching (first word) - might need improvement
            const drugName = start.details.split(' ')[0].toLowerCase();
            // Find the *earliest* end date for the same drug *after* the start date
            let matchedEnd = null;
             const potentialEnds = ends
                 .filter(end => end.details.toLowerCase().includes(drugName) && new Date(end.date) >= new Date(start.date))
                 .sort((a, b) => new Date(a.date) - new Date(b.date));

             if (potentialEnds.length > 0) {
                 matchedEnd = potentialEnds[0];
                 // Optional: Remove the matched end to avoid reusing it for another start of the same drug
                 // ends.splice(ends.indexOf(matchedEnd), 1);
             }

             antibioticPeriods.push({
                 start: new Date(start.date),
                 // If no specific end found, assume it ends at the next antibiotic start or maxDate
                 end: matchedEnd ? new Date(matchedEnd.date) : maxDate, // Default end if no match
                 details: start.details
             });
         });

         // Draw Antibiotic Bars
          antibioticPeriods.forEach((period, index) => {
             const x1 = xScale(period.start);
             const x2 = xScale(period.end);
             const barWidth = Math.max(2, x2 - x1); // Ensure minimum width for visibility

             const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
             rect.setAttribute('x', x1);
             rect.setAttribute('y', antibioticY);
             rect.setAttribute('width', barWidth);
             rect.setAttribute('height', rowHeight);
             rect.setAttribute('class', 'antibiotic-bar');
             chartGroup.appendChild(rect);

             // Add Label to Bar
             const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
             label.setAttribute('x', x1 + barWidth / 2);
             label.setAttribute('y', antibioticY + rowHeight / 2);
             label.setAttribute('dy', '0.35em'); // Center text vertically
             label.setAttribute('class', 'bar-label'); // Use white text
              label.textContent = period.details.split(' ')[0]; // Show first word (drug name)
               // Check text width against bar width
                const tempSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                tempSvg.style.visibility = 'hidden';
                tempSvg.style.position = 'absolute';
                document.body.appendChild(tempSvg);
                const tempText = label.cloneNode(true);
                tempSvg.appendChild(tempText);
                const textLength = tempText.getComputedTextLength();
                document.body.removeChild(tempSvg);

                if (textLength > barWidth - 4) { // If text wider than bar (minus padding)
                    label.textContent = '...'; // Abbreviate or remove
                }


             chartGroup.appendChild(label);

              // Add tooltip to bar
              rect.addEventListener('mouseover', (e) => showTooltip(e, `Antibiotic: ${period.details}<br>Start: ${period.start.toLocaleDateString()}<br>End: ${period.end === maxDate ? 'Ongoing or TBD' : period.end.toLocaleDateString()}`));
              rect.addEventListener('mouseout', hideTooltip);
          });

           // Draw Germ Markers (using triangles like OPs but different color/position)
           germEvents.forEach(event => {
               const x = xScale(new Date(event.date));
               const markerSize = 5;
               const points = `${x},${germY} ${x - markerSize},${germY + markerSize * 1.5} ${x + markerSize},${germY + markerSize * 1.5}`; // Triangle points down

               const marker = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
               marker.setAttribute('points', points);
               marker.setAttribute('class', 'germ-bar'); // Use germ color, maybe rename class later
               chartGroup.appendChild(marker);

                // Add tooltip
               marker.addEventListener('mouseover', (e) => showTooltip(e, `Germ Culture (${event.date}):<br>${event.details}`));
               marker.addEventListener('mouseout', hideTooltip);
           });


        // Draw Markers (OPs, Clinical Events, Notes) - Draw last to be on top
        events.forEach(event => {
            const x = xScale(new Date(event.date));
            let y, markerClass, markerSymbol;
            const markerSize = 6; // Size of the marker base/diameter

            switch (event.type) {
                case 'OP':
                    y = opY;
                    markerClass = 'op-marker';
                    // Triangle pointing down
                    markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                    markerSymbol.setAttribute('points', `${x},${y + markerSize * 1.5} ${x - markerSize},${y} ${x + markerSize},${y}`);
                    break;
                case 'Clinical Event':
                     y = eventY;
                     markerClass = 'event-marker';
                     // Diamond
                     markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                     markerSymbol.setAttribute('points', `${x},${y - markerSize} ${x + markerSize},${y} ${x},${y + markerSize} ${x - markerSize},${y}`);
                    break;
                 case 'Other Note':
                     y = eventY; // Can share row with Clinical Events or have its own
                     markerClass = 'note-marker';
                     // Circle
                     markerSymbol = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                     markerSymbol.setAttribute('cx', x);
                     markerSymbol.setAttribute('cy', y);
                     markerSymbol.setAttribute('r', markerSize * 0.7);
                    break;
                default:
                    return; // Skip other types for markers
            }

             if (markerSymbol) {
                 markerSymbol.setAttribute('class', markerClass);
                 chartGroup.appendChild(markerSymbol);

                 // Add Marker Label (e.g., 'OP', 'Event') - Optional
                  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                  label.setAttribute('x', x);
                  label.setAttribute('y', y - markerSize - 2); // Position above marker
                  label.setAttribute('class', 'marker-label');
                  label.textContent = event.type === 'OP' ? 'OP' : ''; // Only label OPs for less clutter?
                  // chartGroup.appendChild(label);

                 // Add tooltip to marker
                  markerSymbol.addEventListener('mouseover', (e) => showTooltip(e, `<b>${event.type} (${event.date})</b><br>${event.details}`));
                  markerSymbol.addEventListener('mouseout', hideTooltip);
             }
        });


    } // End of renderTimeline


    // --- Initial Load ---
    render();

}); // End DOMContentLoaded
