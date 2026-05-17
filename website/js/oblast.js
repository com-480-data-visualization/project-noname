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
    const civilianDeathsValue = entry.by_type["Violence against civilians"] || 0;
    document.getElementById('stat-fatalities').textContent =
      civilianDeathsValue.toLocaleString('en-US');
    const topType = Object.entries(entry.by_type).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-top-type').textContent =
      topType ? topType[0] : '–';

    drawTypeChart(entry);
    drawTimeChart(entry);

    // 1. 민간인 사망자 픽토그램 주입 (데이터 파일 내 필드가 없을 시 0 처리)
    renderTotalFatalitiesPictograms(entry.fatalities || 0);

    // 2. 주별 종합 피해 랭킹 테이블 주입 (전체 파일 데이터 전달)
    renderOblastRankingTable(data);

    // ── [추가] 랭킹 지표 제어용 토글 이벤트 동적 매핑 ────────────────────────
    d3.selectAll("#oblast-metric-toggle .toggle-btn").on("click", function() {
        // 기존 버튼 스타일들 전부 오프셋 초기화
        d3.selectAll("#oblast-metric-toggle .toggle-btn")
          .style("background", "rgba(255,255,255,0.05)")
          .style("border-color", "rgba(255,255,255,0.15)")
          .style("color", "#8a9ab0")
          .style("font-weight", "normal");

        // 클릭된 타깃 활성화 스타일 강제 오버라이딩
        d3.select(this)
          .style("background", "var(--accent-yellow)")
          .style("border-color", "var(--accent-yellow)")
          .style("color", "#1a1a1a")
          .style("font-weight", "bold");

        // 선택된 메트릭 문자열(deaths 또는 events)을 추출하여 리렌더링 분기 처리
        const selectedMetric = d3.select(this).attr("data-metric");
        renderOblastRankingTable(data, selectedMetric);
    });
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

/**
 * [💡 FIX] HTML 그릇 구조에 정확히 맵핑되도록 수정한 전신 픽토그램 함수
 */
function renderTotalFatalitiesPictograms(totalFatalities) {
    // HTML에 파여진 실제 ID 구조를 명확히 조준합니다.
    const container = d3.select("#oblast-civilian-deaths");
    if (container.empty()) return;

    container.selectAll("*").remove();

    if (totalFatalities === 0) {
        container.html(`
            <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">
                🕊️ 0 fatalities recorded in this area.
            </div>
        `);
        return;
    }

    const SCALE_FACTOR = 10000;
    const exactIcons = totalFatalities / SCALE_FACTOR; 
    const fullIconsCount = Math.floor(exactIcons);
    const remainder = exactIcons % 1; 

    const iconPath = `M12 2a3 3 0 1 0 3 3 3 3 0 0 0-3-3zm5.7 6.4a1 1 0 0 0-1.4 0L14 10.7V17a1 1 0 0 1-2 0v-4h-0.1a1 1 0 0 1-1.9 0V17a1 1 0 0 1-2 0v-6.3L5.7 8.4a1 1 0 0 0-1.4 1.4l3.7 3.7V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6.5l3.7-3.7a1 1 0 0 0 0-1.4z`;

    // [💡 Size & Layout Upgrade] 크기를 75px x 100px로 파격적으로 확대하고 스크롤 영역 확보
    let htmlContent = `<div style="display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-content: center; min-height: 110px; margin-bottom: 16px; padding: 10px 0;">`;

    // 1. Full Icons
    for (let i = 0; i < fullIconsCount; i++) {
        htmlContent += `
            <svg class="fatalities-icon" viewBox="0 0 24 24" style="width: 75px; height: 100px; fill: #ff9999; opacity: 0.95; transition: transform 0.2s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                <path d="${iconPath}"/>
            </svg>
        `;
    }

    // 2. [💡 1.5명 반토막 FIX] 남은 부분 색상을 transparent로 밀어버려 완벽하게 잘린 몸을 구현
    if (remainder > 0 || fullIconsCount === 0) {
        const displayPercent = Math.round(remainder * 100);
        const gradientId = `fat-grad-${Math.round(remainder * 10000)}`;

        htmlContent += `
            <svg class="fatalities-icon" viewBox="0 0 24 24" style="width: 75px; height: 100px; transition: transform 0.2s ease;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                <defs>
                    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="${displayPercent}%" stop-color="#ff9999" stop-opacity="0.95"/>
                        <stop offset="${displayPercent}%" stop-color="transparent" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="${iconPath}" fill="url(#${gradientId})"/>
            </svg>
        `;
    }

    htmlContent += `</div>`;

    htmlContent += `
        <div style="text-align: center; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
            This region accounts for <span style="color: #ff9999; font-weight:700; font-size: 0.95rem;">${totalFatalities.toLocaleString()}</span> recorded fatalities.
            <br><span style="font-size: 0.75rem; color: rgba(255,255,255,0.45);">
                (Visualized precisely as <span style="font-weight: 700; color: #fff;">${exactIcons.toFixed(2)}</span> full-body units; 1 full icon ≈ ${SCALE_FACTOR.toLocaleString()} people)
            </span>
        </div>
    `;

    container.html(htmlContent);
}

/**
 * Renders the top 10 oblasts ranking table dynamically.
 * Highlights the currently selected oblast with a specific background and text style.
 */
function renderOblastRankingTable(acledRaw, metric = 'deaths') {
    const container = document.getElementById('oblast-ranking-table');
    if (!container || !acledRaw) return;

    const targetCountry = country || 'Ukraine';
    
    const oblastsArray = Object.entries(acledRaw[targetCountry] || {}).map(([name, data]) => ({
        name: name,
        value: metric === 'deaths' ? (data.fatalities || 0) : (data.total_events || 0)
    }));

    const sortedOblasts = oblastsArray
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    let html = `<table style="width:100%; border-collapse: collapse; table-layout: fixed;">`;
    sortedOblasts.forEach((d, i) => {
        const unitText = metric === 'deaths' ? 'Deaths' : 'Events';
        
        // ── [💡 핵심 하이라이트 판별] 현재 대시보드 주 이름과 테이블 행의 이름이 일치하는지 검사
        const isCurrentOblast = (d.name === oblast);
        
        // ── [🎨 스타일 분기] 일치하면 배경을 앰버 투명 레이어로 깔고, 핀 아이콘을 붙여줍니다.
        const rowStyle = isCurrentOblast 
            ? `background: rgba(255, 215, 0, 0.08); font-weight: bold; border-left: 3px solid var(--accent-yellow);` 
            : '';
        const nameColor = isCurrentOblast 
            ? `color: var(--accent-yellow); font-weight: 700;` 
            : `color: var(--text-muted);`;
        
        html += `<tr style="border-bottom: 1px solid var(--border); ${rowStyle}">
            <td style="padding: 8px 6px; ${nameColor} font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${i+1}. ${d.name} ${isCurrentOblast ? ' <span style="font-size:0.65rem;">📌</span>' : ''}
            </td>
            <td style="padding: 8px 6px; text-align: right; color: var(--accent-yellow); font-weight: 700; font-size: 0.82rem;">
                ${d.value.value ? d.value.value.toLocaleString() : d.value.toLocaleString()} ${unitText}
            </td>
        </tr>`;
    });
    container.innerHTML = html + '</table>';
}