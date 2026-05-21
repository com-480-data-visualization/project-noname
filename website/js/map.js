/* map.js — single Leaflet map, zoom-based transition between oblast and world views */

'use strict'; // segnala errori di sintassi e altre problematiche potenzialmente pericolose

// // ── Zoom threshold ──────────────────────────────────────────────────────────
// // Below ZOOM_WORLD: world choropleth (aid). At/above ZOOM_OBLAST: oblast view (conflict).
// const ZOOM_WORLD  = 4;   // world layer fully visible
// const ZOOM_OBLAST = 5;   // oblast layer fully visible
// // Between the two values opacity fades smoothly

// ── Map init ────────────────────────────────────────────────────────────────
const map = L.map('map', {
    scrollWheelZoom: true,
    zoomControl: true,
    minZoom: 2,
    maxBounds: [[-90, -360], [90, 360]],
    maxBoundsViscosity: 1.0,
}).setView([48.37, 31.16], 5);   // centred on Ukraine

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
    opacity: 0.8,
}).addTo(map);

console.log("map.js loaded");
let updateBattlefrontMap = null;
let battlefrontLayer = null;
let battlefrontHeatLayer = null;
let playbackTimer = null;
let isPlaying = false;
let activeHeatLayer = null;

// ── Custom panes (enable CSS opacity transitions) ───────────────────────────
// panes are like lucid layers that sit on top of the base map; we can control their z-index and opacity independently
const worldPane = map.createPane('worldPane');
worldPane.style.zIndex = 400;
worldPane.style.transition = 'opacity 0.55s ease'; // takes 0.55s to fade and does it smoothly (ease)

const oblastPane = map.createPane('oblastPane');
oblastPane.style.zIndex = 410;
oblastPane.style.transition = 'opacity 0.55s ease';

const battlefrontPane = map.createPane('battlefrontPane');
battlefrontPane.style.zIndex = 420;
battlefrontPane.style.transition = 'opacity 0.55s ease';

worldPane.style.opacity = 0;
oblastPane.style.opacity = 0;
battlefrontPane.style.opacity = 0;


// ── Colour helpers ──────────────────────────────────────────────────────────
const AID_COLORS = [
    '#f0f4ff', '#c5d8f5', '#91b8ea', '#5e9adf',
    '#2e7ab5', '#1a5a8a', '#0d3d62',
];

function aidColor(total) {
    if (!total || total === 0) return '#1e2d3d';
    const scale = d3.scaleLog() // creates log function
        .domain([1e7, 5e11]) // its domain
        .range([0, AID_COLORS.length - 1]) // its image
        .clamp(true); // if value is outside the domain, it will be clamped to the nearest limit (instead of extrapolating the log function)
    return AID_COLORS[Math.round(scale(total))]; // applies it to total and rounds to nearest integer to get the index of the color in the AID_COLORS array
}

const CONFLICT_COLORS = ['#fffde7', '#ffeb3b', '#ff9800', '#f44336', '#7f0000'];

function conflictColor(events) {
    if (!events || events === 0) return 'rgba(255,255,255,0.05)';
    const scale = d3.scaleLog()
        .domain([10, 10000])
        .range([0, CONFLICT_COLORS.length - 1])
        .clamp(true);
    return CONFLICT_COLORS[Math.round(scale(events))];
}

const EVENT_TYPE_COLORS = {
    'Battles': '#e74c3c',
    'Explosions/Remote violence': '#f39c12',
    'Violence against civilians': '#9b59b6',
    'Strategic developments': '#3498db',
};

// ── Tooltip ─────────────────────────────────────────────────────────────────
// take elements created in index.html
const tooltip = document.getElementById('map-tooltip');
const ttName = document.getElementById('tt-name'); // tt stands for tooltip
const ttValue = document.getElementById('tt-value');
const ttHint = document.getElementById('tt-hint');

// hide and show tooltip (says css to make it visible or not)
function showTooltip(name, value, hint) {
    ttName.textContent = name;
    ttValue.textContent = value;
    ttHint.textContent = hint || '';
    tooltip.classList.add('visible');
}
function hideTooltip() { tooltip.classList.remove('visible'); }

// ── Number formatters ───────────────────────────────────────────────────────
function fmtEur(v) { // fromats numbers as euros, adding T,B,M for trillions, billions and millions to avoid long numbers
    if (v >= 1e12) return '€' + (v / 1e12).toFixed(1) + ' T';
    if (v >= 1e9) return '€' + (v / 1e9).toFixed(1) + ' B';
    if (v >= 1e6) return '€' + (v / 1e6).toFixed(0) + ' M';
    return '€' + v.toFixed(0);
}
function fmtNum(v) { return v.toLocaleString('en-US'); } // introduces commas as thousand separators

// ── Navigation to detail pages ──────────────────────────────────────────────
function goToCountry(name) {
    window.location.href = 'country.html?country=' + encodeURIComponent(name); // encodeURIComponent is used to make sure that the country name is properly encoded for use in a URL, handling spaces and special characters
}

function goToOblast(country, oblast) {
    window.location.href = 'oblast.html?country=' + encodeURIComponent(country) +
        '&oblast=' + encodeURIComponent(oblast);
}

// ── Name normalisers ────────────────────────────────────────────────────────
// Three functions to normalize oblast or country names between the different datasets
const COUNTRY_NAME_FIXES = {
    'United States of America': 'United States',
    'Republic of Korea': 'South Korea',
    'Korea': 'South Korea',
    'Russian Federation': 'Russia',
    'Slovak Republic': 'Slovakia',
    'Republic of Ireland': 'Ireland',
    'Republic of Moldova': 'Moldova',
    'North Macedonia': 'North Macedonia',
    'The Bahamas': 'Bahamas',
};
function normaliseCountry(name) { return COUNTRY_NAME_FIXES[name] || name; } // replaces name with that in country_name_fixes if it is in there, otherwise keeps it the same

const UA_NAME_FIXES = {
    'Autonomous Republic of Crimea': 'Crimea',
    'Kyiv': 'Kyiv City',
    'Odessa Oblast': 'Odesa',
    'Sevastopol': 'Sevastopol',
};
function normaliseUkraineOblast(shapeName) {
    if (UA_NAME_FIXES[shapeName]) return UA_NAME_FIXES[shapeName]; // for those in the dictionary, return the fixed name
    return shapeName.replace(' Oblast', '').trim(); // for hte others removes the word "Oblast" and any extra spaces at the beginning or end of the name
}

const RU_NAME_FIXES = {
    'Chechen Republic': 'Republic of Chechnya',
    'Altai Republic': 'Republic of Altai',
    'Altai Krai': 'Altai',
    'Krasnoyarsk Krai': 'Krasnoyarsk',
    'Khabarovsk Krai': 'Khabarovsk',
    'Primorsky Krai': 'Primorskiy',
    'Perm Krai': 'Perm',
    'Kamchatka Krai': 'Kamchatka',
    'Zabaykalsky Krai': 'Zabaykalskiy',
    'Stavropol Krai': 'Stavropol',
    'Krasnodar Krai': 'Krasnodar',
    'Tyumen Oblast': 'Tyumen',
    'Leningrad Oblast': 'Leningrad',
    'Moscow Oblast': 'Moscow Oblast',
    'Moscow': 'Moscow',
    'Saint Petersburg': 'Saint Petersburg',
    'Nenets Autonomous Okrug': 'Nenets',
    'Yamalo-Nenets Autonomous Okrug': 'Yamalo-Nenets',
    'Khanty-Mansi Autonomous Okrug': 'Khanty-Mansi',
    'Chuvash Republic': 'Republic of Chuvash',
    'Republic of Tatarstan': 'Republic of Tatarstan',
    'Republic of Bashkortostan': 'Republic of Bashkortostan',
    'Republic of Buryatia': 'Republic of Buryatia',
    'Republic of Sakha (Yakutia)': 'Republic of Sakha',
    'Tuva Republic': 'Republic of Tuva',
    'Republic of Khakassia': 'Republic of Khakassia',
    'Republic of Komi': 'Republic of Komi',
    'Republic of Mari El': 'Republic of Mari El',
    'Republic of Mordovia': 'Republic of Mordovia',
    'Republic of Ingushetia': 'Republic of Ingushetia',
    'Karachay-Cherkess Republic': 'Republic of Karachay-Cherkessia',
    'Republic of Kabardino-Balkaria': 'Republic of Kabardino-Balkaria',
    'Republic of North Ossetia - Alania': 'Republic of North Ossetia-Alania',
    'Republic of Dagestan': 'Republic of Dagestan',
    'Republic of Adygea': 'Republic of Adygea',
    'Republic of Kalmykia': 'Republic of Kalmykia',
    'Republic of Karelia': 'Republic of Karelia',
    'Udmurt Republic': 'Udmurt Republic',
};
function normaliseRussiaOblast(nameLatin) {
    if (!nameLatin) return null;
    if (RU_NAME_FIXES[nameLatin]) return RU_NAME_FIXES[nameLatin];
    return nameLatin.replace(' Oblast', '').trim();
}

// ── Legend builder ──────────────────────────────────────────────────────────
function buildLegend(mode) {
    const title = document.getElementById('legend-title');
    const body = document.getElementById('legend-body');
    body.innerHTML = '';

    if (mode === 'conflict') {
        title.textContent = 'Conflict events';
        [
            { label: 'None', color: 'rgba(255,255,255,0.15)' },
            { label: '< 100', color: CONFLICT_COLORS[1] },
            { label: '100–1k', color: CONFLICT_COLORS[2] },
            { label: '1k–10k', color: CONFLICT_COLORS[3] },
            { label: '> 10k', color: CONFLICT_COLORS[4] },
        ].forEach(b => {
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `<span class="legend-swatch" style="background:${b.color}"></span>${b.label}`;
            body.appendChild(row);
        });
    } else if (mode === 'battlefront') {
        title.textContent = 'Event types';
        [
            { label: 'Battles', color: '#e74c3c' },
            { label: 'Explosions', color: '#f39c12' },
            { label: 'Violence against civilians', color: '#9b59b6' },
            { label: 'Strategic developments', color: '#3498db' },
        ].forEach(b => {
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `
      <span class="legend-swatch" style="background:${b.color}"></span>
      ${b.label}
    `;
            body.appendChild(row);
        });
    } else {
        title.textContent = 'Aid to Ukraine (log scale)';
        [
            { label: 'No data', color: '#1e2d3d' },
            { label: '< €1B', color: AID_COLORS[1] },
            { label: '€1B – €10B', color: AID_COLORS[3] },
            { label: '€10B – €50B', color: AID_COLORS[5] },
            { label: '> €50B', color: AID_COLORS[6] },
        ].forEach(b => {
            const row = document.createElement('div');
            row.className = 'legend-row';
            row.innerHTML = `<span class="legend-swatch" style="background:${b.color}"></span>${b.label}`;
            body.appendChild(row);
        });
    }
}

// ── View mode switcher ───────────────────────────────────────────────────────
let currentMode = null;

function setMapMode(mode) {
    const previousMode = currentMode;
    currentMode = mode;
    sessionStorage.setItem('mapView', mode);

    const legend = document.getElementById('map-legend');
    if (legend) {
        legend.classList.toggle('hidden', mode === 'battlefront');
    }

    // Show battlefront controls only in battlefront mode
    const bfControls = document.getElementById('battlefront-controls');
    if (bfControls) {
        bfControls.classList.toggle('visible', mode === 'battlefront');
    }

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === mode);
    });


    if (mode === 'states') {
        worldPane.style.opacity = 1;
        oblastPane.style.opacity = 0;
        battlefrontPane.style.opacity = 0;

        if (battlefrontLayer) map.removeLayer(battlefrontLayer);

        map.flyTo([20, 0], 2, {
            duration: 2.0,
            easeLinearity: 0.9
        });

        buildLegend('aid');

    } else if (mode === 'oblasts') {
        battlefrontPane.style.opacity = 0;

        if (battlefrontLayer) map.removeLayer(battlefrontLayer);

        if (previousMode === 'states') {
            worldPane.style.opacity = 1;
            oblastPane.style.opacity = 0;

            map.flyTo([48.37, 31.16], 5, {
                duration: 0.8,
                easeLinearity: 0.25
            });

            setTimeout(() => {
                worldPane.style.opacity = 0;
                oblastPane.style.opacity = 1;
            }, 700);

        } else {
            worldPane.style.opacity = 0;
            oblastPane.style.opacity = 1;

            map.flyTo([48.37, 31.16], 5, {
                duration: 0.8,
                easeLinearity: 0.25
            });
        }

        buildLegend('conflict');

    } else if (mode === 'battlefront') {

        if (previousMode === 'states') {
            worldPane.style.opacity = 1;
            oblastPane.style.opacity = 0;
            battlefrontPane.style.opacity = 0;

            map.flyTo([48.37, 31.16], 6, {
                duration: 0.8,
                easeLinearity: 0.25
            });

            setTimeout(() => {
                worldPane.style.opacity = 0;
                battlefrontPane.style.opacity = 1;

                if (battlefrontLayer && !map.hasLayer(battlefrontLayer)) {
                    battlefrontLayer.addTo(map);
                }

                if (updateBattlefrontMap) {
                    updateBattlefrontMap();
                }
            }, 700);

        } else {
            worldPane.style.opacity = 0;
            oblastPane.style.opacity = 0;
            battlefrontPane.style.opacity = 1;

            if (battlefrontLayer && !map.hasLayer(battlefrontLayer)) {
                battlefrontLayer.addTo(map);
            }

            map.flyTo([48.37, 31.16], 6, {
                duration: 0.8,
                easeLinearity: 0.25
            });

            if (updateBattlefrontMap) {
                updateBattlefrontMap();
            }
        }
    }
}

document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        e.stopPropagation();
        setMapMode(btn.dataset.view);
    });
});


// ── Reset ─────────────────────────────────────────────────────────
document.getElementById('map-reset').addEventListener('click', () => {
    if (currentMode === 'states') {
        map.flyTo([20, 0], 2, {
            duration: 1.2,
            easeLinearity: 0.9
        });
    } else if (currentMode === 'oblasts') {
        map.flyTo([48.37, 31.16], 5, {
            duration: 1.0,
            easeLinearity: 0.8
        });
    } else if (currentMode === 'battlefront') {
        map.flyTo([48.37, 31.16], 6, {
            duration: 1.0,
            easeLinearity: 0.8
        });
    }
});

// ── Export ─────────────────────────────────────────────────────────
document.getElementById('map-export').addEventListener('click', () => {
    const target = document.getElementById('map-container');

    html2canvas(target, {
        backgroundColor: null,
        useCORS: true,
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'ukraine-conflict-dashboard.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

// ── Load data ───────────────────────────────────────────────────────────────
Promise.all([
    fetch('data/world_countries.geojson').then(r => r.json()),
    fetch('data/ukraine_oblasts.geojson').then(r => r.json()),
    fetch('data/russia_oblasts.geojson').then(r => r.json()),
    fetch('data/aid_by_country.json').then(r => r.json()),
    fetch('data/acled_by_oblast.json').then(r => r.json()),
    fetch('data/events_by_month.json').then(r => r.json()),
]).then(([worldGeo, uaGeo, ruGeo, aidData, acledData, eventsByMonth]) => {

    // ── 1. World countries choropleth (worldPane) ───────────────────────────
    const countriesLayer = L.geoJSON(worldGeo, {
        pane: 'worldPane',
        style: feature => {
            const name = normaliseCountry(feature.properties.ADMIN || feature.properties.name || '');
            const entry = aidData[name];
            const total = entry ? entry.total_eur : 0;
            return {
                pane: 'worldPane',
                fillColor: aidColor(total),
                fillOpacity: 0.75,
                color: '#2a3a4a',
                weight: 0.8,
                opacity: 1,
            };
        },
        onEachFeature: (feature, layer) => {
            const rawName = feature.properties.ADMIN || feature.properties.name || 'Unknown';
            const name = normaliseCountry(rawName);
            const entry = aidData[name];

            layer.on('mouseover', () => {
                if (currentMode !== 'states') return;
                layer.setStyle({ weight: 2, color: '#ffd700', opacity: 1 });
                layer.bringToFront();
                if (entry) {
                    showTooltip(rawName, fmtEur(entry.total_eur) + ' pledged', 'Click for details');
                } else {
                    showTooltip(rawName, 'No aid data', '');
                }
            });

            layer.on('mouseout', () => {
                countriesLayer.resetStyle(layer);
                hideTooltip();
            });

            layer.on('click', () => {
                if (currentMode !== 'states') return;

                if (name === 'Ukraine') {
                    map.flyToBounds(layer.getBounds(), {
                        duration: 1.8,
                        easeLinearity: 0.15
                    });
                } else if (name === 'Russia') {
                    map.flyToBounds(layer.getBounds(), {
                        duration: 1.8,
                        easeLinearity: 0.15
                    });
                } else {
                    goToCountry(name);
                }
            });
        },
    }).addTo(map);

    // ── 2. Ukraine oblasts (oblastPane) ────────────────────────────────────
    function uaLayerStyle(feature) {
        const geoName = feature.properties.shapeName || '';
        const acledKey = normaliseUkraineOblast(geoName);
        const events = acledData.Ukraine && acledData.Ukraine[acledKey]
            ? acledData.Ukraine[acledKey].total_events : 0;
        return {
            pane: 'oblastPane',
            fillColor: conflictColor(events),
            fillOpacity: 0.60,
            color: '#ffd700',
            weight: 1.5,
            opacity: 0.9,
        };
    }

    const uaLayer = L.geoJSON(uaGeo, {
        pane: 'oblastPane',
        style: uaLayerStyle,
        onEachFeature: (feature, layer) => {
            const geoName = feature.properties.shapeName || 'Unknown';
            const acledKey = normaliseUkraineOblast(geoName);
            const data = acledData.Ukraine && acledData.Ukraine[acledKey];

            layer.on('mouseover', () => {
                if (currentMode !== 'oblasts') return;
                layer.setStyle({ weight: 3, color: '#ffffff', opacity: 1 });
                layer.bringToFront();
                showTooltip(
                    geoName,
                    data ? fmtNum(data.total_events) + ' events recorded' : 'No events data',
                    'Click for details'
                );
            });
            layer.on('mouseout', () => { uaLayer.resetStyle(layer); hideTooltip(); });
            layer.on('click', e => {
                if (currentMode !== 'oblasts') return;

                L.DomEvent.stopPropagation(e);
                goToOblast('Ukraine', acledKey);
            });
        },
    }).addTo(map);

    // ── 3. Russia oblasts (oblastPane) ──────────────────────────────────────
    const ruLayer = L.geoJSON(ruGeo, {
        pane: 'oblastPane',
        style: feature => {
            const nameLatin = feature.properties.name_latin || '';
            const acledKey = normaliseRussiaOblast(nameLatin);
            const events = acledData.Russia && acledKey && acledData.Russia[acledKey]
                ? acledData.Russia[acledKey].total_events : 0;
            return {
                pane: 'oblastPane',
                fillColor: conflictColor(events),
                fillOpacity: 0.45,
                color: '#c0392b',
                weight: 1,
                opacity: 0.7,
            };
        },
        onEachFeature: (feature, layer) => {
            const nameLatin = feature.properties.name_latin || feature.properties.name || 'Unknown';
            const acledKey = normaliseRussiaOblast(nameLatin);
            const data = acledData.Russia && acledKey && acledData.Russia[acledKey];

            layer.on('mouseover', () => {
                if (currentMode !== 'oblasts') return;
                layer.setStyle({ weight: 2.5, color: '#ffffff', opacity: 1 });
                layer.bringToFront();
                showTooltip(
                    nameLatin,
                    data ? fmtNum(data.total_events) + ' events recorded' : 'No events data',
                    'Click for details'
                );
            });
            layer.on('mouseout', () => { ruLayer.resetStyle(layer); hideTooltip(); });
            layer.on('click', e => {
                if (currentMode !== 'oblasts') return;

                L.DomEvent.stopPropagation(e);
                goToOblast('Russia', acledKey);
            });
        },
    }).addTo(map);

    // ── 3. BattlefrontPane ──────────────────────────────────────
    const canvasRenderer = L.canvas({ padding: 0.5 });

    battlefrontLayer = L.layerGroup([], {
        pane: 'battlefrontPane'
    });

    const months = Object.keys(eventsByMonth).sort();
    const monthInput = document.getElementById('bf-month');

    if (monthInput && months.length > 0) {
        monthInput.min = months[0];
        monthInput.max = months[months.length - 1];

        if (!monthInput.value) {
            monthInput.value = months[0];
        }
    }

    const compareToggle = document.getElementById('bf-compare-toggle');
    const compareMonthInput = document.getElementById('bf-month-compare');
    const compareMonthRow = document.getElementById('bf-compare-month-row');

    if (compareMonthInput && months.length > 0) {
        compareMonthInput.min = months[0];
        compareMonthInput.max = months[months.length - 1];
        compareMonthInput.value = months[Math.min(1, months.length - 1)];
    }

    compareToggle.addEventListener('change', () => {
        compareMonthRow.style.display = compareToggle.checked ? 'flex' : 'none';
        updateBattlefrontMap();
    });

    compareMonthInput.addEventListener('change', updateBattlefrontMap);

    function getBattlefrontMarkerRadius(isComparison = false) {
        const z = map.getZoom();
        let r;
        if (z <= 4) r = 1.6;
        else if (z <= 6) r = 2.5;
        else if (z <= 8) r = 3.5;
        else r = 5;
        return isComparison ? r + 0.8 : r;
    }

    updateBattlefrontMap = function () {
        battlefrontLayer.clearLayers();
        const renderMode =
            document.querySelector('input[name="bf-render-mode"]:checked')?.value || 'points';
        if (renderMode !== 'density' && activeHeatLayer && map.hasLayer(activeHeatLayer)) {
            map.removeLayer(activeHeatLayer);
            activeHeatLayer = null;
        }

        const monthInput = document.getElementById('bf-month');
        if (!monthInput) return;
        const selectedMonth = monthInput.value;

        const selectedTypes = Array.from(
            document.querySelectorAll('.bf-type:checked')
        ).map(cb => cb.value);
        if (selectedTypes.length === 0) return;

        function drawEvents(events, isComparison = false) {
            if (renderMode === 'density') {
                const heatPoints = events
                    .filter(e => e.lat && e.lon)
                    .map(e => [e.lat, e.lon, 0.4]);

                const newHeatLayer = L.heatLayer(heatPoints, {
                    pane: 'battlefrontPane',
                    radius: 15,
                    blur: 15,
                    maxZoom: 8,
                    minOpacity: 0.2,
                    gradient: {
                        0.25: 'rgba(59,130,246,0.35)',
                        0.50: 'rgba(250,204,21,0.65)',
                        0.75: 'rgba(249,115,22,0.85)',
                        1.00: 'rgba(239,68,68,1)'
                    }
                }).addTo(map);

                const newCanvas = newHeatLayer._canvas;
                if (newCanvas) {
                    newCanvas.style.opacity = 0;
                    newCanvas.style.transition = 'opacity 0.5s ease';

                    requestAnimationFrame(() => {
                        newCanvas.style.opacity = 1;
                    });
                }

                if (activeHeatLayer) {
                    const oldLayer = activeHeatLayer;
                    const oldCanvas = oldLayer._canvas;

                    if (oldCanvas) {
                        oldCanvas.style.transition = 'opacity 0.5s ease';
                        oldCanvas.style.opacity = 0;

                        setTimeout(() => {
                            if (map.hasLayer(oldLayer)) {
                                map.removeLayer(oldLayer);
                            }
                        }, 550);
                    } else {
                        map.removeLayer(oldLayer);
                    }
                }

                activeHeatLayer = newHeatLayer;
                return;
            }

            events.forEach(e => {
                if (!e.lat || !e.lon) return;

                const marker = L.circleMarker([e.lat, e.lon], {
                    pane: 'battlefrontPane',
                    renderer: canvasRenderer,
                    radius: getBattlefrontMarkerRadius(isComparison),
                    stroke: isComparison,
                    color: '#ffffff',
                    weight: isComparison ? 0.8 : 0,
                    fillColor: EVENT_TYPE_COLORS[e.type] || '#ffffff',
                    fillOpacity: 0,
                }).addTo(battlefrontLayer);

                setTimeout(() => {
                    marker.setStyle({
                        fillOpacity: isComparison ? 0.25 : 0.55
                    });
                }, 10);
            });
        }

        const events = eventsByMonth[selectedMonth] || [];
        const filtered = events.filter(e => selectedTypes.includes(e.type));

        drawEvents(filtered, false);

        const statsBox = document.getElementById('bf-stats');

        if (statsBox) {
            statsBox.innerHTML = `
            <div class="bf-stat-line">
                <span class="bf-stat-label">Selected:</span>
                <span>${selectedMonth} — ${filtered.length.toLocaleString()} events</span>
            </div>
        `;
        }

        if (compareToggle && compareToggle.checked) {
            if (renderMode === 'density') return;

            const compareMonth = compareMonthInput.value;
            const compareEvents = eventsByMonth[compareMonth] || [];

            const compareFiltered = compareEvents.filter(e =>
                selectedTypes.includes(e.type)
            );

            drawEvents(compareFiltered, true);

            if (statsBox) {
                statsBox.innerHTML += `
                <div class="bf-stat-line">
                    <span class="bf-stat-label">Comparison:</span>
                    <span>${compareMonth} — ${compareFiltered.length.toLocaleString()} events</span>
                </div>
            `;
            }
        }

        console.log(`Battlefront: ${filtered.length} events`);
    };

    compareMonthInput.addEventListener('change', updateBattlefrontMap);

    document.getElementById('bf-month')
        .addEventListener('change', updateBattlefrontMap);

    document.querySelectorAll('.bf-type')
        .forEach(cb => cb.addEventListener('change', updateBattlefrontMap));

    document.querySelectorAll('input[name="bf-render-mode"]')
        .forEach(r => r.addEventListener('change', updateBattlefrontMap));

    document.getElementById('bf-frontline-toggle')
        ?.addEventListener('change', updateBattlefrontMap);

    const playBtn = document.getElementById('bf-play');

    function startPlaybackTimer() {
        clearInterval(playbackTimer);

        playbackTimer = setInterval(() => {
            const currentIndex = months.indexOf(monthInput.value);
            const nextIndex = currentIndex + 1;

            if (nextIndex >= months.length) {
                clearInterval(playbackTimer);
                playbackTimer = null;
                isPlaying = false;
                playBtn.textContent = 'Play';
                return;
            }

            monthInput.value = months[nextIndex];
            updateBattlefrontMap();

        }, Number(document.getElementById('bf-speed').value));
    }

    if (playBtn && monthInput) {
        playBtn.addEventListener('click', () => {
            if (isPlaying) {
                clearInterval(playbackTimer);
                playbackTimer = null;
                isPlaying = false;
                playBtn.textContent = 'Play';
                return;
            }

            isPlaying = true;
            playBtn.textContent = 'Pause';

            startPlaybackTimer();
        });
        document.getElementById('bf-speed').addEventListener('change', () => {
            if (isPlaying) {
                startPlaybackTimer();
            }
        });
    }

    map.on('zoomend', () => {
        if (currentMode === 'battlefront') {
            updateBattlefrontMap();
        }
    });

    // ── Initial mode ─────────────────────────────────────────────────────────
    setMapMode(sessionStorage.getItem('mapView') || 'states');

}).catch(err => {
    console.error('Failed to load map data:', err);
});
