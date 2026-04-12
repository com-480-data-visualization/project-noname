/* timeline.js — D3 horizontal draggable timeline */

'use strict';

(async function () {
  const events = await fetch('data/timeline_events.json').then(r => r.json());

  const container = document.getElementById('timeline-section');
  const svg       = d3.select('#timeline-svg');
  const card      = document.getElementById('event-card');

  // Close button
  document.getElementById('ec-close').addEventListener('click', () => {
    card.classList.remove('visible');
  });

  // ── Dimensions ────────────────────────────────────────────────────────────
  const H = container.clientHeight;
  const W = container.clientWidth;

  const PAD_TOP    = 34;   // space for header label
  const PAD_BOTTOM = 28;
  const LINE_Y     = PAD_TOP + (H - PAD_TOP - PAD_BOTTOM) * 0.55; // axis Y

  // ── Time scale ────────────────────────────────────────────────────────────
  const dates     = events.map(e => new Date(e.date));
  const dateMin   = new Date('2022-01-01');
  const dateMax   = new Date('2025-06-01');
  const TOTAL_W   = Math.max(W, W * 2.2);   // wider than viewport → allows scroll

  const timeScale = d3.scaleTime()
    .domain([dateMin, dateMax])
    .range([60, TOTAL_W - 60]);

  // ── SVG dimensions ────────────────────────────────────────────────────────
  svg.attr('width', TOTAL_W).attr('height', H);

  // Root group that we pan
  const g = svg.append('g').attr('class', 'tl-root');

  // ── Axis line ─────────────────────────────────────────────────────────────
  g.append('line')
    .attr('class', 'tl-axis')
    .attr('x1', 40).attr('x2', TOTAL_W - 40)
    .attr('y1', LINE_Y).attr('y2', LINE_Y)
    .attr('stroke', 'rgba(255,255,255,0.2)')
    .attr('stroke-width', 1.5);

  // Year ticks
  const yearAxis = d3.axisBottom(timeScale)
    .ticks(d3.timeMonth.every(3))
    .tickSize(6)
    .tickFormat(d3.timeFormat('%b %y'));

  g.append('g')
    .attr('class', 'axis tl-year-axis')
    .attr('transform', `translate(0, ${LINE_Y})`)
    .call(yearAxis)
    .call(ax => ax.select('.domain').remove());

  // ── Events ────────────────────────────────────────────────────────────────
  const fmt = d3.timeFormat('%d %b %Y');

  events.forEach((ev, i) => {
    const x      = timeScale(new Date(ev.date));
    const above  = (i % 2 === 0);
    const labelY = above ? LINE_Y - 18 : LINE_Y + 32;
    const lineY1 = above ? LINE_Y - 6  : LINE_Y + 6;
    const lineY2 = above ? LINE_Y - 14 : LINE_Y + 22;

    const grp = g.append('g')
      .attr('class', 'tl-event')
      .style('cursor', 'pointer')
      .on('click', function () {
        // Show card
        document.getElementById('ec-date').textContent  = fmt(new Date(ev.date));
        document.getElementById('ec-title').textContent = ev.title;
        document.getElementById('ec-desc').textContent  = ev.description;
        card.classList.add('visible');

        // Highlight
        svg.selectAll('.tl-dot').attr('r', 5).attr('fill', '#ffd700');
        d3.select(this).select('.tl-dot').attr('r', 8).attr('fill', '#ffffff');
      });

    // Tick line
    grp.append('line')
      .attr('x1', x).attr('x2', x)
      .attr('y1', lineY1).attr('y2', lineY2)
      .attr('stroke', 'rgba(255,215,0,0.5)')
      .attr('stroke-width', 1.5);

    // Dot
    grp.append('circle')
      .attr('class', 'tl-dot')
      .attr('cx', x).attr('cy', LINE_Y)
      .attr('r', 5)
      .attr('fill', '#ffd700')
      .attr('stroke', '#0d1520')
      .attr('stroke-width', 1.5);

    // Label
    const labelGrp = grp.append('g').attr('transform', `translate(${x}, ${labelY})`);

    // Background rect (drawn first, sized after text)
    const rect = labelGrp.append('rect')
      .attr('fill', 'rgba(13,21,32,0.85)')
      .attr('rx', 3);

    const txt = labelGrp.append('text')
      .attr('text-anchor', 'middle')
      .attr('fill', '#e8ecf0')
      .attr('font-size', '10px')
      .attr('font-family', 'system-ui, sans-serif')
      .text(ev.title.length > 28 ? ev.title.slice(0, 26) + '…' : ev.title);

    // Size rect to text
    try {
      const bb = txt.node().getBBox();
      rect.attr('x', bb.x - 4).attr('y', bb.y - 2)
          .attr('width', bb.width + 8).attr('height', bb.height + 4);
    } catch (_) { /* getBBox may fail before render */ }

    // Hover effects
    grp.on('mouseover', function () {
      d3.select(this).select('.tl-dot').transition().duration(150).attr('r', 7);
      d3.select(this).select('text').attr('fill', '#ffd700');
    }).on('mouseout', function () {
      d3.select(this).select('.tl-dot').transition().duration(150).attr('r', 5);
      d3.select(this).select('text').attr('fill', '#e8ecf0');
    });
  });

  // ── Drag to pan ───────────────────────────────────────────────────────────
  let startX = 0;
  let startTranslate = 0;
  let currentTranslate = 0;
  const MAX_TRANSLATE = 0;
  const MIN_TRANSLATE = -(TOTAL_W - W);

  svg.call(
    d3.drag()
      .on('start', event => {
        startX = event.x;
        startTranslate = currentTranslate;
      })
      .on('drag', event => {
        const dx = event.x - startX;
        currentTranslate = Math.max(MIN_TRANSLATE, Math.min(MAX_TRANSLATE, startTranslate + dx));
        g.attr('transform', `translate(${currentTranslate}, 0)`);
      })
  );

  // Scroll wheel support
  document.getElementById('timeline-section').addEventListener('wheel', e => {
    e.preventDefault();
    currentTranslate = Math.max(MIN_TRANSLATE, Math.min(MAX_TRANSLATE, currentTranslate - e.deltaY * 1.5));
    g.attr('transform', `translate(${currentTranslate}, 0)`);
  }, { passive: false });

  // ── Position so invasion (first event) is visible at start ───────────────
  const firstX = timeScale(new Date(events[0].date));
  currentTranslate = Math.max(MIN_TRANSLATE, Math.min(MAX_TRANSLATE, W * 0.15 - firstX));
  g.attr('transform', `translate(${currentTranslate}, 0)`);

})();
