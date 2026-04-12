/* oblast.js — D3 charts for the oblast conflict events detail page */

'use strict';

const EVENT_COLORS = {
  'Battles':                    '#e74c3c',
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
    document.getElementById('stat-fatalities').textContent =
      entry.fatalities.toLocaleString('en-US');
    const topType = Object.entries(entry.by_type).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-top-type').textContent =
      topType ? topType[0] : '–';

    drawTypeChart(entry);
    drawTimeChart(entry);
  });

// ── Horizontal bar chart by event type ────────────────────────────────────
function drawTypeChart(entry) {
  const byType = Object.entries(entry.by_type)
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

  // Y axis (type labels)
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

  // Hover dots
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
