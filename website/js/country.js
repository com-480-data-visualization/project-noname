/* country.js — D3 charts for the country aid detail page */

'use strict';

const COLORS = {
  Military:     '#5c7148',
  Financial:    '#d4900a',
  Humanitarian: '#2e7ab5',
};

const TYPES = ['Military', 'Financial', 'Humanitarian'];

// ── URL params ─────────────────────────────────────────────────────────────
const params  = new URLSearchParams(window.location.search);
const country = params.get('country') || 'Unknown';

document.title = country + ' — Ukraine Aid Dashboard';
document.getElementById('country-name').textContent = country;

// ── Load data ──────────────────────────────────────────────────────────────
fetch('data/aid_by_country.json')
  .then(r => r.json())
  .then(data => {
    const entry = data[country];

    if (!entry) {
      document.getElementById('no-data').style.display = 'block';
      document.getElementById('data-section').style.display = 'none';
      document.getElementById('country-sub').textContent = 'No aid data in the Ukraine Support Tracker dataset.';
      return;
    }

    // Sub-heading
    document.getElementById('country-sub').textContent =
      `Aid to Ukraine — Ukraine Support Tracker (Kiel Institute)`;

    // Stats
    document.getElementById('stat-total').textContent = fmtEur(entry.total_eur);
    document.getElementById('stat-n').textContent     = entry.n_packages.toLocaleString('en-US');
    const topType = Object.entries(entry.by_type).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-top').textContent   = topType ? topType[0] : '–';

    // Charts
    drawDonut(entry);
    drawBarChart(entry);
  });

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtEur(v) {
  if (v >= 1e12) return '€' + (v / 1e12).toFixed(2) + ' T';
  if (v >= 1e9)  return '€' + (v / 1e9).toFixed(1)  + ' B';
  if (v >= 1e6)  return '€' + (v / 1e6).toFixed(0)  + ' M';
  return '€' + Math.round(v).toLocaleString('en-US');
}

// ── Donut chart ────────────────────────────────────────────────────────────
function drawDonut(entry) {
  const W = 300, H = 260;
  const R = Math.min(W, H) / 2 - 20;
  const Ri = R * 0.55;

  const pieData = TYPES.map(t => ({ type: t, value: entry.by_type[t] || 0 }))
    .filter(d => d.value > 0);

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(Ri).outerRadius(R);
  const arcHover = d3.arc().innerRadius(Ri).outerRadius(R + 8);

  const svg = d3.select('#donut-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${W / 2}, ${H / 2})`);

  // Centre label
  const centreVal = g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('y', -8)
    .attr('fill', '#ffd700')
    .attr('font-size', '18px')
    .attr('font-weight', '700')
    .text(fmtEur(entry.total_eur));

  const centreLabel = g.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('y', 12)
    .attr('fill', '#8a9ab0')
    .attr('font-size', '11px')
    .text('total');

  // Slices
  g.selectAll('path')
    .data(pie(pieData))
    .join('path')
    .attr('d', arc)
    .attr('fill', d => COLORS[d.data.type] || '#555')
    .attr('stroke', '#0d1520')
    .attr('stroke-width', 2)
    .on('mouseover', function (event, d) {
      d3.select(this).transition().duration(150).attr('d', arcHover);
      centreVal.text(fmtEur(d.data.value));
      centreLabel.text(d.data.type);
    })
    .on('mouseout', function (event, d) {
      d3.select(this).transition().duration(150).attr('d', arc);
      centreVal.text(fmtEur(entry.total_eur));
      centreLabel.text('total');
    });

  // Legend
  const legend = d3.select('#donut-legend');
  pieData.forEach(d => {
    const pct = (d.value / entry.total_eur * 100).toFixed(1);
    legend.append('div').attr('class', 'legend-item').html(
      `<span class="legend-dot" style="background:${COLORS[d.type]}"></span>
       <span>${d.type} <span style="color:#8a9ab0">${pct}%</span></span>`
    );
  });
}

// ── Stacked bar chart ──────────────────────────────────────────────────────
function drawBarChart(entry) {
  const container = document.getElementById('bar-chart');
  const fullW = container.clientWidth || 500;
  const margin = { top: 10, right: 20, bottom: 50, left: 70 };
  const W = fullW - margin.left - margin.right;
  const H = 220 - margin.top - margin.bottom;

  const monthly = entry.monthly;
  if (!monthly || monthly.length === 0) {
    container.innerHTML = '<p style="color:#8a9ab0;font-size:0.82rem;padding:20px">No monthly breakdown available.</p>';
    return;
  }

  // Build stacked data
  const stack = d3.stack().keys(TYPES);
  const stackedData = stack(monthly.map(m => ({
    month: m.month,
    Military:     m.Military     || 0,
    Financial:    m.Financial    || 0,
    Humanitarian: m.Humanitarian || 0,
  })));

  const x = d3.scaleBand()
    .domain(monthly.map(m => m.month))
    .range([0, W])
    .padding(0.25);

  const maxVal = d3.max(monthly, m =>
    (m.Military || 0) + (m.Financial || 0) + (m.Humanitarian || 0));

  const y = d3.scaleLinear()
    .domain([0, maxVal * 1.05])
    .range([H, 0]);

  const svg = d3.select('#bar-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${fullW} ${H + margin.top + margin.bottom}`)
    .attr('width', '100%');

  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

  // Grid
  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).tickSize(-W).tickFormat('').ticks(4));

  // Axes
  // X: show only every 3rd label to avoid clutter
  const xTicks = monthly.map(m => m.month).filter((_, i) => i % 3 === 0);
  g.append('g').attr('class', 'axis').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).tickValues(xTicks).tickFormat(d => {
      const [y, mo] = d.split('-');
      return `${mo}/${y.slice(2)}`;
    }))
    .selectAll('text').attr('transform', 'rotate(-45)').attr('text-anchor', 'end').attr('dx', '-4px');

  g.append('g').attr('class', 'axis')
    .call(d3.axisLeft(y).ticks(4).tickFormat(v => {
      if (v >= 1e9) return '€' + (v / 1e9).toFixed(0) + 'B';
      if (v >= 1e6) return '€' + (v / 1e6).toFixed(0) + 'M';
      return '€' + v;
    }));

  // Bars
  g.selectAll('.bar-group')
    .data(stackedData)
    .join('g')
    .attr('fill', d => COLORS[d.key] || '#555')
    .selectAll('rect')
    .data(d => d)
    .join('rect')
    .attr('x', d => x(d.data.month))
    .attr('y', d => y(d[1]))
    .attr('height', d => Math.max(0, y(d[0]) - y(d[1])))
    .attr('width', x.bandwidth())
    .attr('opacity', 0.85)
    .on('mouseover', function (event, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#fff').attr('stroke-width', 1);
    })
    .on('mouseout', function () {
      d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
    });

  // Y-axis label
  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -(H / 2 + margin.top))
    .attr('y', 14)
    .attr('text-anchor', 'middle')
    .attr('fill', '#8a9ab0')
    .attr('font-size', '10px')
    .text('EUR pledged');
}
