/**
 * Ukraine Conflict Visualization - Overall Statistics Final Logic
 */

let currentEventMode = 'type';
let globalOblastsData = null;
let activeEventType = null;
window.eventArc = null;
window.eventArcHover = null;

document.addEventListener('DOMContentLoaded', async () => {
    const DATA_PATHS = {
        acled: 'data/acled_by_oblast.json',
        aid: 'data/aid_by_country.json',
        timeline: 'data/timeline_events.json',
        gdp: 'data/gdp_by_country.json',
        drone: 'data/drone_by_month.json',
    };

    try {
        const [acledRaw, aidRaw, timelineRaw, gdpRaw, droneRaw] = await Promise.all([
            d3.json(DATA_PATHS.acled),
            d3.json(DATA_PATHS.aid),
            d3.json(DATA_PATHS.timeline),
            d3.json(DATA_PATHS.gdp),
            d3.json(DATA_PATHS.drone),
        ]);

        // 1. Data Structure Normalization 
        const oblastsArray = Object.values(acledRaw).flatMap(country => Object.values(country));
        const countriesArray = Object.entries(aidRaw).map(([name, data]) => ({
            country: name,
            ...data
        }));
        const timelineArray = Array.isArray(timelineRaw) ? timelineRaw : [];

        // 2. Display Charts
        updateSummaryCards(oblastsArray, countriesArray);

        renderEventTypeDonut(oblastsArray);
        renderEventTimeSeries(oblastsArray);

        renderCombinedAidDashboard(countriesArray);

        renderAidDonut(countriesArray);
        renderRankingTable(countriesArray, gdpRaw);
        renderDeathTimeSeries(acledRaw);
        renderDroneTimeSeries(droneRaw);


    } catch (err) {
        console.error("Error loading or processing data:", err);
    }
});

function safeClassName(name) {
    return name.replace(/[^a-zA-Z0-9]/g, '');
}

function toggleEventHighlight(label) {
    const safeName = label.replace(/\s+/g, '');
    const donutSelector = ".event-slice";
    const lineSelector = ".event-line";
    const legendSelector = ".event-legend-item";

    if (activeEventType === label) {
        activeEventType = null;
        d3.selectAll(donutSelector).transition().duration(250).attr("d", window.eventArc).style("opacity", 1);
        d3.selectAll(lineSelector).transition().duration(250).style("opacity", 1).style("stroke-width", "2px");
        d3.selectAll(legendSelector).style("opacity", 1).classed("active", false);

        // reset center text
        const centerText = d3.select("#event-type-center-text");
        centerText.selectAll("*").remove();
        centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("BY TYPE");
    } else {
        activeEventType = label;

        // 1. Donut piece pop-up
        d3.selectAll(donutSelector).transition().duration(250).attr("d", window.eventArc).style("opacity", 0.15);
        d3.select(`.slice-${safeName}`).transition().duration(300).attr("d", window.eventArcHover).style("opacity", 1);

        // 2. Highlight line graph (Class matching)
        d3.selectAll(lineSelector).transition().duration(250).style("opacity", 0.1);
        d3.select(`.line-${safeName}`).transition().duration(300).style("opacity", 1).style("stroke-width", "4px");

        // 3. Highlight bottom legend
        d3.selectAll(legendSelector).style("opacity", 0.3).classed("active", false);
        d3.select(`#event-legend-${safeName}`).style("opacity", 1).classed("active", true);


    }
}




/**
 * Aggregates conflict statistics and updates the macro summary dashboard cards.
 */
function updateSummaryCards(oblastsArray, countriesArray) {
    let totalCasualties = 0;
    let battlesCount = 0;
    let explosionsCount = 0;
    let civilianAttacksCount = 0;

    oblastsArray.forEach(oblast => {
        if (!oblast) return;

        totalCasualties += (+oblast.fatalities || 0);

        // 2. Aggregate counts by conflict type (handles both aggregated object and raw arrays)
        if (oblast.by_type) {
            battlesCount += (oblast.by_type["Battles"] || oblast.by_type["battles"] || 0);

            explosionsCount += (oblast.by_type["Explosions"] ||
                oblast.by_type["Explosions/Remote violence"] ||
                oblast.by_type["explosions"] || 0);

            civilianAttacksCount += (oblast.by_type["Violence against civilians"] ||
                oblast.by_type["Civilian violence"] ||
                oblast.by_type["civilian_violence"] || 0);
        } else if (oblast.events && Array.isArray(oblast.events)) {
            oblast.events.forEach(ev => {
                if (ev.event_type === "Battles") battlesCount++;
                else if (ev.event_type === "Explosions" || ev.event_type === "Explosions/Remote violence") explosionsCount++;
                else if (ev.event_type === "Violence against civilians") civilianAttacksCount++;
            });
        }
    });

    // 3. Calculate total financial and military support
    const totalAidEur = countriesArray.reduce((sum, c) => sum + (c.total_eur || 0), 0);

    // 4. Bind finalized metrics directly to the DOM interface
    d3.select("#total-casualties").text(totalCasualties.toLocaleString());
    d3.select("#total-money").text("€" + (totalAidEur / 1000000000).toFixed(1) + "B");

    d3.select("#explosions-attacks").text(explosionsCount.toLocaleString());
    d3.select("#battles-attacks").text(battlesCount.toLocaleString());
    d3.select("#civilian-attacks").text(civilianAttacksCount.toLocaleString());

    d3.select("#civilian-casualties").text(`${civilianAttacksCount.toLocaleString()} Incidents Total`);
}

/**
 * Events by Party / Type 
 */

function switchEventView(mode) {
    currentEventMode = mode;


    d3.selectAll(".toggle-btn").classed("active", false);
    d3.select(`#btn-${mode}`).classed("active", true);


    if (globalOblastsData) {
        renderEventTimeSeries(globalOblastsData);
    }
}

function renderEventTimeSeries(rawData) {
    const selector = "#ts-events";
    const container = d3.select(selector);
    if (container.empty()) return;

    container.selectAll("*").remove();

    // 1. Data justicifation & mapping
    const typeMapping = {
        "Battles": "Battles",
        "Explosions/Remote violence": "Explosions",
        "Violence against civilians": "Civilian Violence"
    };
    const eventTypes = Object.keys(typeMapping);
    const ukraineData = rawData.Ukraine || rawData;
    const parseTime = d3.timeParse("%Y-%m");


    if (!window.eventVisibility) {
        window.eventVisibility = {
            "Battles": true,
            "Explosions/Remote violence": true,
            "Violence against civilians": true
        };
    }

    // 3. data processing logic
    const typeDataMap = eventTypes.map(type => {
        const monthlyMap = {};
        Object.values(ukraineData).forEach(ob => {
            if (ob.monthly && ob.by_type) {
                const ratio = (ob.by_type[type] || 0) / (ob.total_events || 1);
                Object.entries(ob.monthly).forEach(([month, count]) => {
                    monthlyMap[month] = (monthlyMap[month] || 0) + (count * ratio);
                });
            }
        });
        return {
            typeName: type,
            displayName: typeMapping[type],
            values: Object.entries(monthlyMap)
                .map(([m, v]) => ({ date: parseTime(m), value: v }))
                .filter(d => d.date !== null)
                .sort((a, b) => a.date - b.date)
        };
    });

    // 4. Set layout
    const margin = { top: 30, right: 140, bottom: 40, left: 50 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(typeDataMap[0].values, d => d.date)).range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(typeDataMap, t => d3.max(t.values, v => v.value)) * 1.1])
        .range([height, 0]);

    const color = d3.scaleOrdinal().domain(eventTypes).range(["#e74c3c", "#f39c12", "#9b59b6"]);

    // axis & grid
    svg.append("g").attr("class", "axis grid").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("20%y")).tickSize(-height));
    svg.append("g").attr("class", "axis grid").call(d3.axisLeft(y).ticks(5).tickSize(-width));

    const lineGenerator = d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX);


    // 1. Tooltip set
    let tooltip = d3.select(".chart-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "chart-tooltip").style("opacity", 0);
    }

    // 2. Vertical guidelines and overlay for mouse detection
    const mouseG = svg.append("g").attr("class", "mouse-over-effects");

    const mouseLine = mouseG.append("line")
        .attr("class", "mouse-line")
        .attr("y1", 0)
        .attr("y2", height)
        .style("opacity", 0);

    mouseG.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
            mouseLine.style("opacity", 0);
        })
        .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const date = x.invert(mouseX);
            const bisect = d3.bisector(d => d.date).left;

            let tooltipContent = `<span class="tooltip-date">${d3.timeFormat("%Y/%m")(date)}</span>`;
            let foundAny = false;

            typeDataMap.forEach(t => {
                if (window.eventVisibility[t.typeName]) {
                    const idx = bisect(t.values, date);
                    const d = t.values[idx];
                    if (d) {
                        foundAny = true;
                        tooltipContent += `<div><span style="color:${color(t.typeName)}">●</span> ${t.displayName}: <strong>${Math.round(d.value).toLocaleString()}</strong></div>`;
                    }
                }
            });

            if (foundAny) {
                mouseLine.attr("x1", mouseX).attr("x2", mouseX).style("opacity", 1);
                tooltip.style("opacity", 1)
                    .html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        });

    // 5. Line drawing and update functions
    function updateCharts() {
        const lines = svg.selectAll(".event-line")
            .data(typeDataMap.filter(t => window.eventVisibility[t.typeName]), d => d.typeName);

        lines.exit().transition().duration(300).style("opacity", 0).remove();

        lines.enter()
            .append("path")
            .attr("class", d => `event-line line-${d.typeName.replace(/[^a-zA-Z]/g, '')}`)
            .attr("fill", "none")
            .attr("stroke", d => color(d.typeName))
            .attr("stroke-width", 2)
            .attr("d", d => lineGenerator(d.values))
            .style("opacity", 0)
            .transition().duration(300)
            .style("opacity", 1);

        eventTypes.forEach(type => {
            const safeName = type.replace(/[^a-zA-Z]/g, '');
            const isActive = window.eventVisibility[type];
            d3.select(`.legend-item-${safeName}`)
                .style("opacity", isActive ? 1 : 0.3)
                .select("circle")
                .attr("fill", isActive ? color(type) : "#444");
        });
    }


    updateCharts();

    // 6. generate legends
    const legendSpacing = 25;
    const legendYOffset = (height - (eventTypes.length - 1) * legendSpacing) / 2;
    const legend = svg.append("g").attr("transform", `translate(${width + 15}, ${legendYOffset})`);

    typeDataMap.forEach((t, i) => {
        const safeName = t.typeName.replace(/[^a-zA-Z]/g, '');
        const legendRow = legend.append("g")
            .attr("class", `legend-group legend-item-${safeName}`)
            .attr("transform", `translate(0, ${i * legendSpacing})`)
            .style("cursor", "pointer")
            .on("click", () => {
                window.eventVisibility[t.typeName] = !window.eventVisibility[t.typeName];
                updateCharts();
            });

        legendRow.append("circle").attr("r", 6);
        legendRow.append("text")
            .attr("x", 15).attr("y", 5).attr("fill", color(t.typeName))
            .style("font-size", "11px").style("font-weight", "600")
            .text(t.displayName);
    });


}


/**
 * Cumulative Aid
 */
function renderAidLineForCombined(chartData, commonColor) {
    const selector = "#ts-aid-cumulative";
    const container = d3.select(selector);
    if (container.empty()) return;
    container.selectAll("*").remove();

    // 1. Data preprocessing
    const allMonths = new Set();
    chartData.forEach(c => {
        if (c.monthly) {
            c.monthly.forEach(m => {
                if (m.month && m.month >= "2022-01") allMonths.add(m.month);
            });
        }
    });
    const sortedMonths = Array.from(allMonths).sort();
    const parseTime = d3.timeParse("%Y-%m");

    const multiChartData = chartData.map(c => {
        let cumulative = 0;
        const monthlyMap = {};
        if (c.monthly) {
            c.monthly.forEach(m => monthlyMap[m.month] = m.total_eur || 0);
        }
        return {
            country: c.country,
            values: sortedMonths.map(month => {
                cumulative += (monthlyMap[month] || 0);
                return { date: parseTime(month), value: cumulative / 1000000000 };
            })
        };
    });

    // 2. State management
    let selectedCountries = new Set();

    // 3. Layout Settings
    const margin = { top: 30, right: 30, bottom: 40, left: 50 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(sortedMonths.map(m => parseTime(m)))).range([0, width]);

    // Y scale definition
    const y = d3.scaleLinear().range([height, 0]);

    svg.append("g").attr("class", "axis grid").attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%Y")).tickSize(-height));

    // Add specific class 'y-axis' for dynamic updates
    const yAxisGroup = svg.append("g").attr("class", "axis grid y-axis");

    // 4. Draw lines
    const lineGenerator = d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX);

    multiChartData.forEach(d => {
        const safeName = d.country.replace(/\s+/g, '');
        svg.append("path")
            .datum(d)
            .attr("class", `aid-line line-${safeName}`)
            .attr("fill", "none")
            .attr("stroke", commonColor(d.country))
            .attr("stroke-width", 2)
            .attr("d", d => lineGenerator(d.values));
    });

    // 5. Legend Rendering
    const legendContainer = d3.select("#central-legend");
    legendContainer.selectAll("*").remove();

    chartData.forEach(d => {
        const item = legendContainer.append("div")
            .attr("class", "legend-item")
            .style("cursor", "pointer")
            .style("padding", "5px")
            .on("click", () => {
                if (selectedCountries.has(d.country)) selectedCountries.delete(d.country);
                else selectedCountries.add(d.country);
                updateLineStyles();
            });
        item.append("div").attr("class", "legend-dot").style("background-color", commonColor(d.country));
        item.append("span").text(d.country);
    });

    function updateLineStyles() {
        const isNone = selectedCountries.size === 0;

        const activeData = isNone ? multiChartData : multiChartData.filter(d => selectedCountries.has(d.country));
        const newMax = d3.max(activeData, c => d3.max(c.values, v => v.value)) || 1;
        y.domain([0, newMax * 1.1]);

        yAxisGroup.transition().duration(500).call(d3.axisLeft(y).ticks(5).tickSize(-width));

        d3.selectAll(".aid-line").transition().duration(500)
            .style("opacity", d => (isNone || selectedCountries.has(d.country)) ? 1 : 0.05)
            .style("stroke-width", d => (isNone || selectedCountries.has(d.country)) ? "4px" : "1px")
            .attr("d", d => lineGenerator(d.values)); // 라인 재계산

        if (window.updateCombinedAidDonutSelection) {
            window.updateCombinedAidDonutSelection(selectedCountries);
        }
        d3.selectAll(".legend-item").style("opacity", function (d, i) {
            const countryName = chartData[i].country;
            return (isNone || selectedCountries.has(countryName)) ? 1 : 0.3;
        });

    }

    updateLineStyles();

    // 7. Tooltip
    let tooltip = d3.select(".chart-tooltip");
    if (tooltip.empty()) tooltip = d3.select("body").append("div").attr("class", "chart-tooltip").style("opacity", 0);

    const mouseG = svg.append("g").attr("class", "mouse-over-effects");
    mouseG.append("rect")
        .attr("width", width).attr("height", height).attr("fill", "none").attr("pointer-events", "all")
        .on("mouseout", () => tooltip.style("opacity", 0))
        .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const date = x.invert(mouseX);
            const bisect = d3.bisector(d => d.date).left;
            let tooltipContent = `<span class="tooltip-date">${d3.timeFormat("%Y/%m")(date)}</span>`;
            let hasData = false;

            multiChartData.forEach(d => {
                if (selectedCountries.size === 0 || selectedCountries.has(d.country)) {
                    const idx = bisect(d.values, date);
                    const dataPoint = d.values[idx];
                    if (dataPoint) {
                        hasData = true;
                        tooltipContent += `<div><span style="color:${commonColor(d.country)}">●</span> ${d.country}: <strong>€${dataPoint.value.toFixed(2)}B</strong></div>`;
                    }
                }
            });

            if (hasData) {
                tooltip.style("opacity", 1)
                    .html(tooltipContent)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        });
}

/**
 * Donut Chart
 */
function renderAidDonut(countriesArray) {
    const selector = "#aid-type-donut";
    const container = d3.select(selector);
    if (container.empty()) return;

    container.selectAll("*").remove();

    // 1. Data processing and total calculation
    let totals = { Military: 0, Financial: 0, Humanitarian: 0 };
    countriesArray.forEach(d => {
        if (d.by_type) {
            totals.Military += (+d.by_type.Military || 0);
            totals.Financial += (+d.by_type.Financial || 0);
            totals.Humanitarian += (+d.by_type.Humanitarian || 0);
        }
    });

    const totalSum = totals.Military + totals.Financial + totals.Humanitarian;
    const chartData = [
        { type: "Military", value: totals.Military, color: "#e74c3c" },
        { type: "Financial", value: totals.Financial, color: "#3498db" },
        { type: "Humanitarian", value: totals.Humanitarian, color: "#2ecc71" }
    ].map(d => ({
        ...d,
        percentage: totalSum > 0 ? ((d.value / totalSum) * 100).toFixed(1) : "0.0"
    }));

    // 2. Layout and Arc settings
    const rect = container.node().getBoundingClientRect();
    const width = rect.width;
    const height = 480;

    const radius = Math.min(width / 2.1, height / 2.8) - 15;

    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.6).outerRadius(radius + 15);

    const svg = container.append("svg")
        .attr("width", "100%").attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2.8})`);

    const pie = d3.pie().value(d => d.value).sort(null);

    let activeAidType = null;

    // --- Key: Selection Logic Integration Function ---
    function handleAidTypeSelection(type, element) {
        const centerText = d3.select("#aid-type-center-text");
        const safeClassName = `.aid-slice-${type}`;

        if (activeAidType === type) {
            activeAidType = null;
            d3.selectAll(".aid-type-slice").transition().duration(250).attr("d", arc).style("opacity", 1);
            d3.selectAll(".aid-legend-item").style("opacity", 1);
            centerText.selectAll("*").remove();
            centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("SELECT TYPE");
        } else {
            activeAidType = type;
            const data = chartData.find(d => d.type === type);
            const amountFormatted = data.value >= 1000000000
                ? `€${(data.value / 1000000000).toFixed(2)}B`
                : `€${Math.round(data.value / 1000000).toLocaleString()}M`;

            // 1. Donut Animation
            d3.selectAll(".aid-type-slice").transition().duration(250).attr("d", arc).style("opacity", 0.1);
            d3.select(safeClassName).transition().duration(300).attr("d", arcHover).style("opacity", 1);

            // 2. Legend highlight effect
            d3.selectAll(".aid-legend-item").style("opacity", 0.3);
            d3.select(`#aid-legend-${type}`).style("opacity", 1);

            // 3. Central text update (3-column layout)
            centerText.selectAll("*").remove();
            centerText.append("tspan").attr("x", 0).attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#94a3b8").text(type.toUpperCase());
            centerText.append("tspan").attr("x", 0).attr("dy", "1.4em").style("font-size", "18px").style("fill", data.color).style("font-weight", "700").text(amountFormatted);
            centerText.append("tspan").attr("x", 0).attr("dy", "1.4em").style("font-size", "12px").style("fill", "#ffd700").text(`(${data.percentage}% Share)`);
        }
    }

    // 3. Donut slice rendering
    svg.selectAll("path")
        .data(pie(chartData))
        .enter()
        .append("path")
        .attr("class", d => `aid-type-slice aid-slice-${d.data.type}`)
        .attr("d", arc)
        .attr("fill", d => d.data.color)
        .attr("stroke", "#1a2634")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")
        .on("mouseover", function (e, d) {
            if (activeAidType !== d.data.type) handleAidTypeSelection(d.data.type, this);
        })
        .on("mouseout", function (e, d) {
            if (activeAidType === d.data.type) handleAidTypeSelection(d.data.type, this);
        });

    // 4. central text container
    const centerText = svg.append("text")
        .attr("id", "aid-type-center-text")
        .attr("text-anchor", "middle").style("fill", "#ecf0f1").style("font-weight", "600");
    centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("SELECT TYPE");

    // 5. Create bottom button legend
    const legendHeight = chartData.length * 25;
    const legend = svg.append("g")
        .attr("transform", `translate(-40, ${radius + 40})`);

    chartData.forEach((d, i) => {
        const g = legend.append("g")
            .attr("class", "aid-legend-item")
            .attr("id", `aid-legend-${d.type}`)
            .attr("transform", `translate(0, ${i * 25})`)
            .style("cursor", "pointer")
            .on("click", () => handleAidTypeSelection(d.type));

        g.append("circle")
            .attr("r", 5)
            .attr("fill", d.color);

        g.append("text")
            .attr("x", 15)
            .attr("y", 5)
            .style("fill", "#94a3b8")
            .style("font-size", "12px")
            .style("font-weight", "500")
            .text(d.type);
    });
}

/**
 * Common line graph rendering tool
 */
function renderLineChart(selector, data, color) {
    const container = d3.select(selector);
    container.selectAll("*").remove();

    const margin = { top: 10, right: 20, bottom: 30, left: 40 };
    const width = container.node().clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).range([height, 0]);

    svg.append("g").attr("class", "axis grid").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).ticks(5));
    svg.append("g").attr("class", "axis grid").call(d3.axisLeft(y).ticks(5));

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)));
}

function drawDonut(selector, data) {
    const container = d3.select(selector);
    container.selectAll("*").remove();
    const width = 180, height = 180, radius = 70;
    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = container.append("svg").attr("width", width).attr("height", height)
        .append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie().value(d => d.value);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);

    svg.selectAll('path').data(pie(data)).enter().append('path')
        .attr('d', arc).attr('fill', (d, i) => colors(i))
        .attr('stroke', 'var(--bg-panel)').style('stroke-width', '2px');
}


/**
 * Aid/GDP Ranking Table Using World Bank Real-time Data
 */
function renderRankingTable(countries, gdpRaw) {
    const container = document.getElementById('ranking-table');
    if (!container || !gdpRaw) return;


    // 1. Color map dedicated to the top 10 Aid countries overall 
    const aidColorMap = {
        "United States": "#5b84b1",
        "European Union": "#f39c12",
        "Germany": "#e74c3c",
        "Sweden": "#76c7c0",
        "United Kingdom": "#5cb85c",
        "Denmark": "#f1c40f",
        "Norway": "#9b59b6",
        "Japan": "#ff9999",
        "Canada": "#8b5a2b",
        "Poland": "#d3d3d3"
    };

    // 1. World Bank data parsing (USD -> EUR exchange rate applied)
    const gdpLookup = {};
    const dataArray = gdpRaw[1];
    const USD_TO_EUR = 0.92;  // Apply 2024 average exchange rate

    if (dataArray) {
        dataArray.forEach(item => {
            // Extract valid figures for 2024 or 2023
            if (item.value && (item.date === "2024" || item.date === "2023")) {
                const countryName = item.country.value;
                // Prioritize mapping the latest data (2024)
                if (!gdpLookup[countryName] || item.date === "2024") {
                    gdpLookup[countryName] = item.value * USD_TO_EUR;
                }
            }
        });
    }

    // 2. Country Name Mapping (Resolving Name Differences Between Datasets)
    const nameMap = {
        "United States": "United States",
        "Slovakia": "Slovak Republic",
        "South Korea": "Korea, Rep.",
        "Czechia": "Czech Republic",
        "European Union": "European Union"
    };

    // 3. Ratio Calculation and Sorting
    const dataWithRatio = countries.map(d => {
        const officialName = nameMap[d.country] || d.country;
        const gdpEur = gdpLookup[officialName] || 0;

        const ratio = gdpEur > 0 ? ((d.total_eur / gdpEur) * 100) : 0;
        return { ...d, ratio };
    });

    const sorted = dataWithRatio
        .filter(d => d.ratio > 0)
        .sort((a, b) => b.ratio - a.ratio)
        .slice(0, 10);

    // 4. Table Rendering (UI Optimization)
    let html = `<table style="width:100%; border-collapse: collapse; table-layout: fixed;">`;
    sorted.forEach((d, i) => {
        // If in the top 10 colormap, apply the corresponding color; otherwise, apply gray.
        const nameColor = aidColorMap[d.country] || "var(--text-muted)";
        const displayName = d.country.length > 15 ? d.country.substring(0, 13) + '..' : d.country;

        html += `<tr style="border-bottom: 1px solid var(--border);">
            <td style="padding: 10px 4px; color: ${nameColor}; font-size: 0.72rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${i + 1}. ${displayName}
            </td>
            <td style="padding: 10px 4px; text-align: right; color: var(--accent-yellow); font-weight: 700; font-size: 0.82rem;">
                ${d.ratio.toFixed(3)}%
            </td>
        </tr>`;
    });
    container.innerHTML = html + '</table>';
}


function renderDeathTimeSeries(acledRaw) {
    const selector = "#ts-deaths";
    const container = d3.select(selector);
    if (container.empty()) return;

    container.selectAll("*").remove();

    // 1. Data Aggregation
    const monthlyTotal = {};
    const ukraineData = acledRaw.Ukraine || acledRaw;
    Object.values(ukraineData).forEach(oblast => {
        if (oblast && oblast.monthly) {
            Object.entries(oblast.monthly).forEach(([month, count]) => {
                monthlyTotal[month] = (monthlyTotal[month] || 0) + count;
            });
        }
    });

    const parseTime = d3.timeParse("%Y-%m");
    const chartData = Object.entries(monthlyTotal)
        .map(([month, value]) => ({ date: parseTime(month), value: +value }))
        .filter(d => d.date !== null)
        .sort((a, b) => a.date - b.date);

    if (chartData.length === 0) return;

    // 2. Layout settings
    const margin = { top: 40, right: 30, bottom: 60, left: 70 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 420 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // 3. Scale Setting
    const x = d3.scaleTime().domain(d3.extent(chartData, d => d.date)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value) * 1.1]).range([height, 0]);

    // 4. Axis and grid rendering
    svg.append("g")
        .attr("class", "axis grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%Y/%m")).tickSize(-height));

    svg.append("g")
        .attr("class", "axis grid")
        .call(d3.axisLeft(y).ticks(6).tickSize(-width));

    // 5. Add line graph and data points
    svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "var(--red)")
        .attr("stroke-width", 3)
        .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX));

    svg.selectAll(".dot")
        .data(chartData)
        .enter().append("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 4.5)
        .attr("fill", "var(--red)");

    // 1. Select common tooltip element (create if none)
    let tooltip = d3.select(".chart-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "chart-tooltip").style("opacity", 0);
    }

    // 2. Create vertical guidelines
    const mouseG = svg.append("g").attr("class", "mouse-over-effects");
    const mouseLine = mouseG.append("line")
        .attr("class", "mouse-line")
        .attr("y1", 0)
        .attr("y2", height)
        .style("opacity", 0);

    mouseG.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
            mouseLine.style("opacity", 0);
        })
        .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const date = x.invert(mouseX);

            const bisectDate = d3.bisector(d => d.date).left;

            const i = bisectDate(chartData, date, 1);
            const d0 = chartData[i - 1];
            const d1 = chartData[i];

            const d = d1 && (date - d0.date > d1.date - date) ? d1 : d0;

            if (d) {
                mouseLine.attr("x1", x(d.date)).attr("x2", x(d.date)).style("opacity", 1);

                tooltip.style("opacity", 1)
                    .html(`
                        <span class="tooltip-date">${d3.timeFormat("%Y/%m")(d.date)}</span>
                        <div><span style="color:#e74c3c">●</span> Fatalities: <strong>${Math.round(d.value).toLocaleString()} people</strong></div>
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 28) + "px");
            }
        });

    // 5. Line graph
    svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "var(--red)")
        .attr("stroke-width", 2.5)
        .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX));

    // 6. Add dots
    svg.selectAll(".dot")
        .data(chartData)
        .enter().append("circle")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .attr("fill", "var(--red)");
}

function renderDroneTimeSeries(droneRaw) {
    const container = d3.select("#ts-drone-strikes");
    container.selectAll("*").remove();

    const parseTime = d3.timeParse("%Y-%m");
    const chartData = Object.entries(droneRaw)
        .map(([month, count]) => ({ date: parseTime(month), value: +count }))
        .filter(d => d.date !== null)
        .sort((a, b) => a.date - b.date);

    if (chartData.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 50, left: 55 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 260 - margin.top - margin.bottom;

    const svg = container.append("svg")
        .attr("width", "100%")
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime().domain(d3.extent(chartData, d => d.date)).range([0, width]);
    const y = d3.scaleLinear().domain([0, d3.max(chartData, d => d.value) * 1.1]).range([height, 0]);

    svg.append("g")
        .attr("class", "axis grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%Y/%m")).tickSize(-height));

    svg.append("g")
        .attr("class", "axis grid")
        .call(d3.axisLeft(y).ticks(5).tickSize(-width));

    // Area fill
    svg.append("path")
        .datum(chartData)
        .attr("fill", "rgba(52, 152, 219, 0.15)")
        .attr("d", d3.area().x(d => x(d.date)).y0(height).y1(d => y(d.value)).curve(d3.curveMonotoneX));

    svg.append("path")
        .datum(chartData)
        .attr("fill", "none")
        .attr("stroke", "#3498db")
        .attr("stroke-width", 2.5)
        .attr("d", d3.line().x(d => x(d.date)).y(d => y(d.value)).curve(d3.curveMonotoneX));

    let tooltip = d3.select(".chart-tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div").attr("class", "chart-tooltip").style("opacity", 0);
    }

    const mouseLine = svg.append("line")
        .attr("y1", 0).attr("y2", height)
        .attr("stroke", "#aaa").attr("stroke-width", 1).attr("stroke-dasharray", "4")
        .style("opacity", 0);

    svg.append("rect")
        .attr("width", width).attr("height", height)
        .attr("fill", "none").attr("pointer-events", "all")
        .on("mouseout", () => { tooltip.style("opacity", 0); mouseLine.style("opacity", 0); })
        .on("mousemove", function (event) {
            const bisect = d3.bisector(d => d.date).left;
            const date = x.invert(d3.pointer(event)[0]);
            const i = bisect(chartData, date, 1);
            const d0 = chartData[i - 1], d1 = chartData[i];
            const d = d1 && (date - d0.date > d1.date - date) ? d1 : d0;
            if (!d) return;
            mouseLine.attr("x1", x(d.date)).attr("x2", x(d.date)).style("opacity", 1);
            tooltip.style("opacity", 1)
                .html(`<span class="tooltip-date">${d3.timeFormat("%Y/%m")(d.date)}</span>
                       <div><span style="color:#3498db">●</span> Strikes: <strong>${d.value.toLocaleString()}</strong></div>`)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        });
}


function renderCombinedAidDashboard(countriesArray) {
    const totalGlobalEur = d3.sum(countriesArray, d => d.total_eur || 0);

    const sortedAll = [...countriesArray].sort((a, b) => (b.total_eur || 0) - (a.total_eur || 0));
    const top10Raw = sortedAll.slice(0, 10);
    const othersRaw = sortedAll.slice(10);

    const othersTotalEur = d3.sum(othersRaw, d => d.total_eur || 0);
    const othersMonthlyMap = {};
    othersRaw.forEach(c => {
        if (c.monthly) {
            c.monthly.forEach(m => {
                othersMonthlyMap[m.month] = (othersMonthlyMap[m.month] || 0) + (m.total_eur || 0);
            });
        }
    });
    const othersMonthly = Object.entries(othersMonthlyMap).map(([month, total_eur]) => ({ month, total_eur }));

    const chartDataWithOthers = [
        ...top10Raw,
        { country: "Others", total_eur: othersTotalEur, monthly: othersMonthly, isOthers: true }
    ];

    const color = d3.scaleOrdinal()
        .domain(chartDataWithOthers.map(d => d.country))
        .range([...d3.schemeTableau10, "#7f8c8d"]);

    // 1. Donut chart independent rendering (hover text only, without click/linking)
    renderAidDonutForCombined(chartDataWithOthers, color, totalGlobalEur);

    // 2. Line graph independent rendering (linked with legend)
    renderAidLineForCombined(chartDataWithOthers, color);
}

/**
 * Top Donut Chart Rendering 
 */
function renderAidDonutForCombined(chartData, commonColor, totalGlobalEur) {
    const selector = "#aid-donut";
    const container = d3.select(selector);
    container.selectAll("*").remove();

    const rect = container.node().getBoundingClientRect();
    const width = rect.width || 300;
    const height = 300;
    const radius = Math.min(width / 2, height / 2) - 40;

    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.6).outerRadius(radius + 15);
    const pie = d3.pie().value(d => d.total_eur).sort(null);

    const svg = container.append("svg")
        .attr("width", "100%").attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Central Text Container
    const centerText = svg.append("text")
        .attr("id", "donut-center-text")
        .attr("text-anchor", "middle")
        .style("fill", "#ecf0f1").style("font-weight", "600");

    centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("SELECT COUNTRY");

    function updateCenterText(label, value, colorValue) {
        centerText.selectAll("tspan").remove();
        if (!label) {
            centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("SELECT COUNTRY");
            return;
        }
        const percent = ((value / totalGlobalEur) * 100).toFixed(1);
        centerText.append("tspan").attr("x", 0).attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#94a3b8").text(label.toUpperCase());
        centerText.append("tspan").attr("x", 0).attr("dy", "1.4em").style("font-size", "18px").style("fill", colorValue).text(`€${(value / 1e9).toFixed(2)}B`);
        centerText.append("tspan").attr("x", 0).attr("dy", "1.4em").style("font-size", "12px").style("fill", "#ffd700").text(`(${percent}% Share)`);
    }

    svg.selectAll("path")
        .data(pie(chartData))
        .enter().append("path")
        .attr("class", d => `donut-slice slice-${safeClassName(d.data.country)}`)
        .attr("d", arc)
        .attr("fill", d => commonColor(d.data.country))
        .attr("stroke", "#1a2634").style("stroke-width", "2px")
        .style("cursor", "pointer")
        .on("mouseover", function (e, d) {
            d3.select(this).transition().duration(200).attr("d", arcHover);
            updateCenterText(d.data.country, d.data.total_eur, commonColor(d.data.country));
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(200).attr("d", arc);
            updateCenterText(null);
        });

    window.updateCombinedAidDonutSelection = function (selectedCountries) {
        const isNone = selectedCountries.size === 0;

        svg.selectAll(".donut-slice")
            .transition()
            .duration(250)
            .attr("d", arc)
            .style("opacity", isNone ? 1 : 0.1);

        if (!isNone) {
            selectedCountries.forEach(country => {
                svg.select(`.slice-${safeClassName(country)}`)
                    .transition()
                    .duration(300)
                    .attr("d", arcHover)
                    .style("opacity", 1);
            });
        }
    };
}


/**
 * Distribution chart by event type
 */
function renderEventTypeDonut(oblastsArray) {
    const selector = "#donut-event-type";
    const container = d3.select(selector);
    if (container.empty()) return;

    container.selectAll("*").remove();

    // 1. Data aggregation and processing
    let eventTotals = {};
    oblastsArray.forEach(d => {
        if (d.by_type) {
            Object.entries(d.by_type).forEach(([type, count]) => {
                const label = type === "Explosions/Remote violence" ? "Explosions" :
                    type === "Violence against civilians" ? "Civilian Violence" : type;
                eventTotals[label] = (eventTotals[label] || 0) + count;
            });
        }
    });

    const totalEventsSum = d3.sum(Object.values(eventTotals));
    const chartData = Object.entries(eventTotals).map(([label, value]) => ({
        label,
        value,
        percent: ((value / totalEventsSum) * 100).toFixed(1)
    })).sort((a, b) => b.value - a.value);

    // 2. Layout and Arc settings
    const rect = container.node().getBoundingClientRect();
    const width = rect.width || 300;
    const height = 300;
    const radius = Math.min(width / 2, height / 2) - 50;

    const color = d3.scaleOrdinal()
        .domain(chartData.map(d => d.label))
        .range(["#e74c3c", "#f39c12", "#9b59b6", "#34495e", "#95a5a6"]);

    const svg = container.append("svg")
        .attr("width", "100%").attr("height", height)
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const pie = d3.pie().value(d => d.value).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius);
    const arcHover = d3.arc().innerRadius(radius * 0.6).outerRadius(radius + 15);

    let activeType = null;

    // --- Key: Selection Logic Integration Function ---
    function handleTypeSelection(label) {
        const centerText = d3.select("#event-type-center-text");
        const safeClassName = `.slice-${label.replace(/\s+/g, '')}`;

        if (activeType === label) {
            activeType = null;
            d3.selectAll(".event-slice").transition().duration(250).attr("d", arc).style("opacity", 1);
            d3.selectAll(".event-legend-item").style("opacity", 1);
            centerText.selectAll("*").remove();
            centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("SELECT TYPE");
        } else {
            activeType = label;
            const data = chartData.find(d => d.label === label);

            // 1. Donut animation
            d3.selectAll(".event-slice").transition().duration(250).attr("d", arc).style("opacity", 0.1);
            d3.select(safeClassName).transition().duration(300).attr("d", arcHover).style("opacity", 1);

            // 2. Legend emphasis effect
            d3.selectAll(".event-legend-item").style("opacity", 0.3);
            d3.select(`#event-legend-${label.replace(/\s+/g, '')}`).style("opacity", 1);

            // 3. Update central text (3 columns)
            centerText.selectAll("*").remove();
            centerText.append("tspan").attr("x", 0).attr("dy", "-0.8em").style("font-size", "11px").style("fill", "#94a3b8").text(label.toUpperCase());
            centerText.append("tspan").attr("x", 0).attr("dy", "1.4em").style("font-size", "18px").style("fill", color(label)).style("font-weight", "700").text(`${data.value.toLocaleString()} Events`);
            centerText.append("tspan").attr("x", 0).attr("dy", "1.4em").style("font-size", "12px").style("fill", "#ffd700").text(`(${data.percent}% Share)`);
        }
    }

    // 3. Rendering a donut slice
    svg.selectAll("path")
        .data(pie(chartData))
        .enter()
        .append("path")
        .attr("class", d => `event-slice slice-${d.data.label.replace(/\s+/g, '')}`)
        .attr("d", arc)
        .attr("fill", d => color(d.data.label))
        .attr("stroke", "#1a2634")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")
        .on("mouseover", (e, d) => {
            if (activeType !== d.data.label) handleTypeSelection(d.data.label);
        })
        .on("mouseout", (e, d) => {
            if (activeType === d.data.label) handleTypeSelection(d.data.label);
        });

    // 4. Central Text Initial Settings
    const centerText = svg.append("text")
        .attr("id", "event-type-center-text")
        .attr("text-anchor", "middle")
        .style("fill", "#ecf0f1").style("font-weight", "600");

    centerText.append("tspan").attr("x", 0).attr("dy", "0.35em").style("font-size", "14px").text("SELECT TYPE");

    // 5. Create bottom button-type legend 
    const legend = svg.append("g").attr("transform", `translate(0, ${radius + 35})`);
    const itemWidth = 100;
    const totalW = chartData.length * itemWidth;

    chartData.forEach((d, i) => {
        const xOff = (i * itemWidth) - (totalW / 2) + 10;
        const g = legend.append("g")
            .attr("class", "event-legend-item")
            .attr("id", `event-legend-${d.label.replace(/\s+/g, '')}`)
            .attr("transform", `translate(${xOff}, 0)`)
            .style("cursor", "pointer")
            .on("click", () => handleTypeSelection(d.label));

        g.append("circle").attr("r", 5).attr("fill", color(d.label));
        g.append("text")
            .attr("x", 12).attr("y", 5)
            .style("fill", "#94a3b8").style("font-size", "11px")
            .text(d.label);
    });
}




