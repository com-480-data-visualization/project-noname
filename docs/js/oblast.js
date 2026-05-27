/* oblast.js — D3 charts for the oblast conflict events detail page */

'use strict';

const EVENT_COLORS = {
  'Battles':                 '#e74c3c',
  'Explosions/Remote violence': '#e67e22',
  'Violence against civilians': '#9b59b6',
  'Strategic developments':     '#3498db',
  'Protests':                   '#1abc9c',
  'Riots':                      '#f39c12',
};

function eventColor(type) {
  return EVENT_COLORS[type] || '#8a9ab0';
}

// ── URL params ─────────────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const country = params.get('country') || 'Ukraine';
const oblast  = params.get('oblast')  || 'Unknown';

document.title = oblast + ' — Conflict Events';
document.getElementById('oblast-name').textContent = oblast;
document.getElementById('oblast-sub').textContent  =
  `${country} · ACLED conflict data`;

// ── Load data ──────────────────────────────────────────────────────────────
fetch('data/acled_by_oblast.json')
  .then(r => r.json())
  .then(data => {
    const countryData = data[country];
    const entry = countryData ? countryData[oblast] : null;

    if (!entry || entry.total_events === 0) {
      document.getElementById('no-data').style.display = 'block';
      document.getElementById('data-section').style.display = 'none';
      return;
    }

    // Stats
    document.getElementById('stat-events').textContent =
      entry.total_events.toLocaleString('en-US');
    document.getElementById('stat-fatalities').textContent = (entry.fatalities || 0).toLocaleString('en-US');
    const topType = Object.entries(entry.by_type).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-top-type').textContent =
      topType ? topType[0] : '–';

    drawTypeChart(entry);
    drawTimeChart(entry);

    // Inject civilian fatality pictogram
    renderTotalFatalitiesPictograms(entry.fatalities || 0);

    // Inject ranking table
    renderOblastRankingTable(data);

    // Dynamic mapping for metric toggle
    d3.selectAll("#oblast-metric-toggle .toggle-btn").on("click", function() {
        // Reset styles for all buttons
        d3.selectAll("#oblast-metric-toggle .toggle-btn")
          .style("background", "rgba(255,255,255,0.05)")
          .style("border-color", "rgba(255,255,255,0.15)")
          .style("color", "#8a9ab0")
          .style("font-weight", "normal");

        // Apply active style to clicked button
        d3.select(this)
          .style("background", "var(--accent-yellow)")
          .style("border-color", "var(--accent-yellow)")
          .style("color", "#1a1a1a")
          .style("font-weight", "bold");

        // Re-render table based on selected metric
        const selectedMetric = d3.select(this).attr("data-metric");
        renderOblastRankingTable(data, selectedMetric);
    });
  });

// ── Horizontal bar chart by event type ────────────────────────────────────
function drawTypeChart(entry) {
  const byType = Object.entries(entry.by_type)
    .filter(([type, count]) => type !== 'Violence against civilians')
    .sort((a, b) => b[1] - a[1]);

  const fullH = Math.max(180, byType.length * 36 + 20);
  const margin = { top: 10, right: 60, bottom: 10, left: 200 };
  const W = 300 - margin.left - margin.right;
  const H = fullH - margin.top - margin.bottom;

  const x = d3.scaleLinear()
    .domain([0, d3.max(byType, d => d[1]) * 1.05])
    .range([0, W]);

  const y = d3.scaleBand()
    .domain(byType.map(d => d[0]))
    .range([0, H])
    .padding(0.3);

  const svg = d3.select('#type-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W + margin.left + margin.right} ${H + margin.top + margin.bottom}`)
    .attr('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Bars
  g.selectAll('rect')
    .data(byType)
    .join('rect')
    .attr('x', 0)
    .attr('y', d => y(d[0]))
    .attr('width', d => x(d[1]))
    .attr('height', y.bandwidth())
    .attr('fill', d => eventColor(d[0]))
    .attr('rx', 3)
    .attr('opacity', 0.85)
    .on('mouseover', function () { d3.select(this).attr('opacity', 1); })
    .on('mouseout',  function () { d3.select(this).attr('opacity', 0.85); });

  // Value labels
  g.selectAll('.val-label')
    .data(byType)
    .join('text')
    .attr('class', 'val-label')
    .attr('x', d => x(d[1]) + 6)
    .attr('y', d => y(d[0]) + y.bandwidth() / 2)
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#8a9ab0')
    .attr('font-size', '11px')
    .attr('font-family', 'system-ui, sans-serif')
    .text(d => d[1].toLocaleString('en-US'));

  // Y-axis (type labels)
  g.append('g')
    .attr('class', 'axis')
    .call(d3.axisLeft(y).tickSize(0))
    .call(ax => ax.select('.domain').remove())
    .selectAll('text')
    .attr('fill', '#e8ecf0')
    .attr('font-size', '11px');
}

// ── Line chart: monthly events ──────────────────────────────────────────────
function drawTimeChart(entry) {
  const container = document.getElementById('time-chart');
  const fullW = container.clientWidth || 500;
  const margin = { top: 10, right: 20, bottom: 46, left: 56 };
  const W = fullW - margin.left - margin.right;
  const H = 200 - margin.top - margin.bottom;

  const monthly = Object.entries(entry.monthly)
    .map(([month, count]) => ({ date: new Date(month + '-01'), count }))
    .sort((a, b) => a.date - b.date);

  if (monthly.length === 0) return;

  const x = d3.scaleTime()
    .domain(d3.extent(monthly, d => d.date))
    .range([0, W]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(monthly, d => d.count) * 1.1])
    .range([H, 0]);

  const svg = d3.select('#time-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${fullW} ${H + margin.top + margin.bottom}`)
    .attr('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Grid
  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-W).tickFormat('').ticks(4));

  // Area fill
  const area = d3.area()
    .x(d => x(d.date))
    .y0(H)
    .y1(d => y(d.count))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(monthly)
    .attr('fill', '#c0392b')
    .attr('fill-opacity', 0.15)
    .attr('d', area);

  // Line
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.count))
    .curve(d3.curveMonotoneX);

  g.append('path')
    .datum(monthly)
    .attr('fill', 'none')
    .attr('stroke', '#e74c3c')
    .attr('stroke-width', 2)
    .attr('d', line);

  // Axes
  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(6)).tickFormat(d3.timeFormat('%b %y')))
    .selectAll('text').attr('transform', 'rotate(-40)').attr('text-anchor', 'end');

  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(',d')));

  // Hover interaction
  const bisect = d3.bisector(d => d.date).left;
  const dot = g.append('circle').attr('r', 4)
    .attr('fill', '#ffffff').attr('stroke', '#e74c3c').attr('stroke-width', 2)
    .style('display', 'none');

  const tooltip = g.append('text')
    .attr('fill', '#ffd700').attr('font-size', '11px')
    .style('display', 'none');

  svg.on('mousemove', function (event) {
    const [mx] = d3.pointer(event, g.node());
    const xDate = x.invert(mx);
    const i = bisect(monthly, xDate, 1);
    const d = i < monthly.length ? monthly[i] : monthly[i - 1];
    if (!d) return;
    dot.style('display', null).attr('cx', x(d.date)).attr('cy', y(d.count));
    tooltip.style('display', null)
      .attr('x', x(d.date) + 8).attr('y', y(d.count) - 6)
      .text(`${d3.timeFormat('%b %Y')(d.date)}: ${d.count.toLocaleString('en-US')}`);
  }).on('mouseleave', () => {
    dot.style('display', 'none');
    tooltip.style('display', 'none');
  });
}

/**
 * Render full-body fatality pictogram with Reference Scale
 */
function renderTotalFatalitiesPictograms(totalFatalities) {
    const container = d3.select("#oblast-civilian-deaths");
    if (container.empty()) return;

    container.selectAll("*").remove();

    // 1. Main Icon Logic
    const config = getScaleConfig(totalFatalities);
    const SCALE_FACTOR = config.factor;
    const iconSize = config.size; 
    const cleanIconPath = "M12 2a3 3 0 1 0 3 3 3 3 0 0 0-3-3zm4 7h-8a2 2 0 0 0-2 2v5a1 1 0 0 0 2 0v-4h1v7a1 1 0 0 0 2 0v-5h2v5a1 1 0 0 0 2 0v-7h1v4a1 1 0 0 0 2 0v-5a2 2 0 0 0-2-2z";

    // Main Container (Background removed as requested)
    const mainContent = container.append('div')
        .style("display", "flex").style("flex-wrap", "wrap")
        .style("gap", "0px").style("justify-content", "center")
        .style("align-items", "center").style("margin-bottom", "15px");

    if (totalFatalities === 0) {
        mainContent.html(`<div style="color: var(--text-muted); padding: 10px;">🕊️ 0 fatalities recorded.</div>`);
    } else {
        const totalIcons = totalFatalities / SCALE_FACTOR;
        for (let i = 0; i < Math.floor(totalIcons); i++) {
            mainContent.append('svg').attr("width", iconSize).attr("height", iconSize)
                .attr("viewBox", "0 0 24 24").attr("fill", "#ff6b6b").style("margin-right", "-2px")
                .html(`<path d="${cleanIconPath}"/>`);
        }
        if (totalIcons % 1 > 0) {
            mainContent.append('svg').attr("width", iconSize).attr("height", iconSize)
                .attr("viewBox", "0 0 24 24").attr("fill", "#ff6b6b").style("opacity", totalIcons % 1).style("margin-right", "-2px")
                .html(`<path d="${cleanIconPath}"/>`);
        }
    }

    // 2. Reference Legend Section
    const referenceConfigs = [
        { factor: 5000, size: 80, label: "5k" },
        { factor: 2000, size: 60, label: "2k" },
        { factor: 500,  size: 40, label: "0.5k" },
        { factor: 100,  size: 20, label: "0.1k" }
    ];

    const legendDiv = container.append('div')
        .style("border-top", "1px solid #444").style("padding-top", "15px").style("margin-top", "5px");
    
    legendDiv.append('div').style("text-align", "center").style("font-size", "0.7rem").style("color", "#888")
        .text("Reference Scale (deaths/icon)");

    const legendIcons = legendDiv.append('div')
        .style("display", "flex").style("justify-content", "space-around").style("align-items", "flex-end").style("margin-top", "10px");

    referenceConfigs.forEach(cfg => {
        const item = legendIcons.append('div').style("display", "flex").style("flex-direction", "column").style("align-items", "center");
        item.append('svg').attr("width", cfg.size).attr("height", cfg.size)
            .attr("viewBox", "0 0 24 24").attr("fill", "#ff6b6b") 
            .html(`<path d="${cleanIconPath}"/>`);
        item.append('span').style("font-size", "0.65rem").style("color", "#777").text(cfg.label);
    });
}

/**
 * Determine scale factor and icon size based on fatality count
 */
function getScaleConfig(totalFatalities) {
    if (totalFatalities > 50000) return { factor: 5000, size: 80 }; 
    if (totalFatalities > 10000) return { factor: 2000, size: 60 }; 
    if (totalFatalities > 1000)  return { factor: 500,  size: 40 }; 
    return { factor: 100, size: 20 };
}

/**
 * Render dynamic ranking table, keeping selected oblast in view
 */
function renderOblastRankingTable(acledRaw, metric = 'deaths') {
    const container = document.getElementById('oblast-ranking-table');
    if (!container || !acledRaw) return;

    const targetCountry = country || 'Ukraine';
    const oblastsArray = Object.entries(acledRaw[targetCountry] || {}).map(([name, data]) => ({
        name: name,
        value: metric === 'deaths' ? (data.fatalities || 0) : (data.total_events || 0)
    }));

    // Sort by values descending
    oblastsArray.sort((a, b) => b.value - a.value);

    // Find current index
    const currentIndex = oblastsArray.findIndex(d => d.name === oblast);

    // Build display list (Top 10)
    let displayList = oblastsArray.slice(0, 10);

    // If current oblast is outside top 10, add it at the end
    if (currentIndex >= 10) {
        displayList.push({ isSeparator: true }); 
        displayList.push(oblastsArray[currentIndex]);
    }

    let html = `<table style="width:100%; border-collapse: collapse; table-layout: fixed;">`;
    
    displayList.forEach((d, i) => {
        if (d.isSeparator) {
            html += `<tr><td colspan="2" style="text-align:center; padding: 4px; color: rgba(255,255,255,0.2);">...</td></tr>`;
            return;
        }

        const actualRank = (d.name === oblast && currentIndex >= 10) ? currentIndex + 1 : i + 1;
        const unitText = metric === 'deaths' ? 'Deaths' : 'Events';
        const isCurrentOblast = (d.name === oblast);
        
        const rowStyle = isCurrentOblast 
            ? `background: rgba(255, 215, 0, 0.08); font-weight: bold; border-left: 3px solid var(--accent-yellow);` 
            : '';
        const nameColor = isCurrentOblast 
            ? `color: var(--accent-yellow); font-weight: 700;` 
            : `color: var(--text-muted);`;
        
        html += `<tr style="border-bottom: 1px solid var(--border); ${rowStyle}">
            <td style="padding: 8px 6px; ${nameColor} font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${actualRank}. ${d.name} ${isCurrentOblast ? ' <span style="font-size:0.65rem;">📌</span>' : ''}
            </td>
            <td style="padding: 8px 6px; text-align: right; color: var(--accent-yellow); font-weight: 700; font-size: 0.82rem;">
                ${d.value.toLocaleString()} ${unitText}
            </td>
        </tr>`;
    });
    container.innerHTML = html + '</table>';
}