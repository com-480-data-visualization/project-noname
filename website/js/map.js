/* map.js — Leaflet world map with choropleth + oblast drill-down */

'use strict';

// ── Leaflet map init ────────────────────────────────────────────────────────
const map = L.map('map', {
  center: [50, 20],
  zoom: 4,
  minZoom: 2,
  maxZoom: 12,
  zoomControl: true,
});

L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenTopoMap contributors',
  maxZoom: 17,
  opacity: 0.85,
}).addTo(map);

// ── Colour helpers ──────────────────────────────────────────────────────────
const AID_COLORS = [
  '#f0f4ff', '#c5d8f5', '#91b8ea', '#5e9adf',
  '#2e7ab5', '#1a5a8a', '#0d3d62',
];

function aidColor(total) {
  if (!total || total === 0) return '#1e2d3d';   // no-data grey-blue
  const scale = d3.scaleLog()
    .domain([1e8, 5e11])                           // 100M → 500B EUR
    .range([0, AID_COLORS.length - 1])
    .clamp(true);
  return AID_COLORS[Math.round(scale(total))];
}

// Event-density colours for oblasts (yellow → red)
const CONFLICT_COLORS = ['#fffde7','#ffeb3b','#ff9800','#f44336','#7f0000'];

function conflictColor(events) {
  if (!events || events === 0) return 'rgba(255,255,255,0.05)';
  const scale = d3.scaleLog()
    .domain([10, 10000])
    .range([0, CONFLICT_COLORS.length - 1])
    .clamp(true);
  return CONFLICT_COLORS[Math.round(scale(events))];
}

// ── Tooltip helper ──────────────────────────────────────────────────────────
const tooltip = document.getElementById('map-tooltip');
const ttName  = document.getElementById('tt-name');
const ttValue = document.getElementById('tt-value');
const ttHint  = document.getElementById('tt-hint');

function showTooltip(name, value, hint) {
  ttName.textContent  = name;
  ttValue.textContent = value;
  ttHint.textContent  = hint || '';
  tooltip.classList.add('visible');
}
function hideTooltip() { tooltip.classList.remove('visible'); }

// ── Number formatters ───────────────────────────────────────────────────────
function fmtEur(v) {
  if (v >= 1e12) return '€' + (v / 1e12).toFixed(1) + ' T';
  if (v >= 1e9)  return '€' + (v / 1e9).toFixed(1) + ' B';
  if (v >= 1e6)  return '€' + (v / 1e6).toFixed(0) + ' M';
  return '€' + v.toFixed(0);
}

function fmtNum(v) {
  return v.toLocaleString('en-US');
}

// ── Country name normalisation (GeoJSON ADMIN → aid_by_country key) ─────────
const COUNTRY_NAME_FIXES = {
  'United States of America': 'United States',
  'Czech Republic':           'Czech Republic',
  'Czechia':                  'Czech Republic',
  'Republic of Korea':        'South Korea',
  'Korea':                    'South Korea',
  'Russian Federation':       'Russia',
  'Slovak Republic':          'Slovakia',
  'Republic of Ireland':      'Ireland',
  'Republic of Moldova':      'Moldova',
  'North Macedonia':          'North Macedonia',
  'The Bahamas':              'Bahamas',
};

function normaliseCountry(name) {
  return COUNTRY_NAME_FIXES[name] || name;
}

// ── Oblast name normalisation ───────────────────────────────────────────────
// Map GeoJSON feature name → ACLED admin1 name

// Ukraine: geoBoundaries uses "Kharkiv Oblast", ACLED uses "Kharkiv"
const UA_NAME_FIXES = {
  'Autonomous Republic of Crimea': 'Crimea',
  'Kyiv':                          'Kyiv City',   // city
  'Odessa Oblast':                 'Odesa',
  'Sevastopol':                    'Sevastopol',
};

function normaliseUkraineOblast(shapeName) {
  if (UA_NAME_FIXES[shapeName]) return UA_NAME_FIXES[shapeName];
  // Strip " Oblast" suffix
  return shapeName.replace(' Oblast', '').trim();
}

// Russia: click_that_hood uses name_latin like "Voronezh Oblast"
const RU_NAME_FIXES = {
  'Chechen Republic':            'Republic of Chechnya',
  'Altai Republic':              'Republic of Altai',
  'Altai Krai':                  'Altai',
  'Krasnoyarsk Krai':            'Krasnoyarsk',
  'Khabarovsk Krai':             'Khabarovsk',
  'Primorsky Krai':              'Primorskiy',
  'Perm Krai':                   'Perm',
  'Kamchatka Krai':              'Kamchatka',
  'Zabaykalsky Krai':            'Zabaykalskiy',
  'Stavropol Krai':              'Stavropol',
  'Krasnodar Krai':              'Krasnodar',
  'Tyumen Oblast':               'Tyumen',
  'Leningrad Oblast':            'Leningrad',
  'Moscow Oblast':               'Moscow Oblast',
  'Moscow':                      'Moscow',
  'Saint Petersburg':            'Saint Petersburg',
  'Nenets Autonomous Okrug':     'Nenets',
  'Yamalo-Nenets Autonomous Okrug': 'Yamalo-Nenets',
  'Khanty-Mansi Autonomous Okrug':  'Khanty-Mansi',
  'Chuvash Republic':            'Republic of Chuvash',
  'Republic of Tatarstan':       'Republic of Tatarstan',
  'Republic of Bashkortostan':   'Republic of Bashkortostan',
  'Republic of Buryatia':        'Republic of Buryatia',
  'Republic of Sakha (Yakutia)': 'Republic of Sakha',
  'Tuva Republic':               'Republic of Tuva',
  'Republic of Khakassia':       'Republic of Khakassia',
  'Republic of Komi':            'Republic of Komi',
  'Republic of Mari El':         'Republic of Mari El',
  'Republic of Mordovia':        'Republic of Mordovia',
  'Republic of Ingushetia':      'Republic of Ingushetia',
  'Karachay-Cherkess Republic':  'Republic of Karachay-Cherkessia',
  'Republic of Kabardino-Balkaria': 'Republic of Kabardino-Balkaria',
  'Republic of North Ossetia - Alania': 'Republic of North Ossetia-Alania',
  'Republic of Dagestan':        'Republic of Dagestan',
  'Republic of Adygea':          'Republic of Adygea',
  'Republic of Kalmykia':        'Republic of Kalmykia',
  'Republic of Karelia':         'Republic of Karelia',
  'Udmurt Republic':             'Udmurt Republic',
};

function normaliseRussiaOblast(nameLatin) {
  if (!nameLatin) return null;
  if (RU_NAME_FIXES[nameLatin]) return RU_NAME_FIXES[nameLatin];
  // Strip " Oblast" suffix for simple cases
  return nameLatin.replace(' Oblast', '').trim();
}

// ── Load data and render ────────────────────────────────────────────────────
Promise.all([
  fetch('data/world_countries.geojson').then(r => r.json()),
  fetch('data/ukraine_oblasts.geojson').then(r => r.json()),
  fetch('data/russia_oblasts.geojson').then(r => r.json()),
  fetch('data/aid_by_country.json').then(r => r.json()),
  fetch('data/acled_by_oblast.json').then(r => r.json()),
]).then(([worldGeo, uaGeo, ruGeo, aidData, acledData]) => {

  // ── 1. World countries choropleth ───────────────────────────────────────
  const countriesLayer = L.geoJSON(worldGeo, {
    style: feature => {
      const name  = normaliseCountry(feature.properties.ADMIN || feature.properties.name || '');
      const entry = aidData[name];
      const total = entry ? entry.total_eur : 0;
      return {
        fillColor:   aidColor(total),
        fillOpacity: 0.75,
        color:       '#2a3a4a',
        weight:      0.8,
        opacity:     1,
      };
    },
    onEachFeature: (feature, layer) => {
      const rawName = feature.properties.ADMIN || feature.properties.name || 'Unknown';
      const name    = normaliseCountry(rawName);
      const entry   = aidData[name];

      // Special handling for Ukraine and Russia — zoom to them instead
      const isSpecial = ['Ukraine', 'Russia'].includes(name);

      layer.on('mouseover', () => {
        layer.setStyle({ weight: 2, color: '#ffd700', opacity: 1 });
        layer.bringToFront();
        if (entry) {
          showTooltip(rawName, fmtEur(entry.total_eur) + ' pledged',
            isSpecial ? 'Click to explore oblasts' : 'Click for details');
        } else {
          showTooltip(rawName,
            isSpecial ? '' : 'No aid data',
            isSpecial ? 'Click to explore oblasts' : '');
        }
      });

      layer.on('mouseout', () => {
        countriesLayer.resetStyle(layer);
        hideTooltip();
      });

      layer.on('click', () => {
        if (name === 'Ukraine') {
          map.flyToBounds(layer.getBounds(), { duration: 1.2 });
          // Make oblasts visible
          uaLayer.setStyle(f => uaLayerStyle(f, acledData));
        } else if (name === 'Russia') {
          map.flyToBounds(layer.getBounds(), { duration: 1.4 });
        } else {
          window.location.href = 'country.html?country=' + encodeURIComponent(name);
        }
      });
    },
  }).addTo(map);

  // ── 2. Ukraine oblasts ──────────────────────────────────────────────────
  function uaLayerStyle(feature, acledData) {
    const geoName = feature.properties.shapeName || '';
    const acledKey = normaliseUkraineOblast(geoName);
    const events = acledData.Ukraine && acledData.Ukraine[acledKey]
      ? acledData.Ukraine[acledKey].total_events : 0;
    return {
      fillColor:   conflictColor(events),
      fillOpacity: 0.55,
      color:       '#ffd700',
      weight:      1.5,
      opacity:     0.9,
    };
  }

  const uaLayer = L.geoJSON(uaGeo, {
    style: f => uaLayerStyle(f, acledData),
    onEachFeature: (feature, layer) => {
      const geoName  = feature.properties.shapeName || 'Unknown';
      const acledKey = normaliseUkraineOblast(geoName);
      const data     = acledData.Ukraine && acledData.Ukraine[acledKey];

      layer.on('mouseover', () => {
        layer.setStyle({ weight: 3, color: '#ffffff', opacity: 1 });
        layer.bringToFront();
        showTooltip(
          geoName,
          data ? fmtNum(data.total_events) + ' events recorded' : 'No events data',
          'Click for details'
        );
      });

      layer.on('mouseout', () => {
        uaLayer.resetStyle(layer);
        hideTooltip();
      });

      layer.on('click', e => {
        L.DomEvent.stopPropagation(e);
        window.location.href = 'oblast.html?country=Ukraine&oblast=' + encodeURIComponent(acledKey);
      });
    },
  }).addTo(map);

  // ── 3. Russia oblasts ───────────────────────────────────────────────────
  const ruLayer = L.geoJSON(ruGeo, {
    style: feature => {
      const nameLatin = feature.properties.name_latin || '';
      const acledKey  = normaliseRussiaOblast(nameLatin);
      const events = acledData.Russia && acledKey && acledData.Russia[acledKey]
        ? acledData.Russia[acledKey].total_events : 0;
      return {
        fillColor:   conflictColor(events),
        fillOpacity: 0.45,
        color:       '#c0392b',
        weight:      1,
        opacity:     0.7,
      };
    },
    onEachFeature: (feature, layer) => {
      const nameLatin = feature.properties.name_latin || feature.properties.name || 'Unknown';
      const acledKey  = normaliseRussiaOblast(nameLatin);
      const data = acledData.Russia && acledKey && acledData.Russia[acledKey];

      layer.on('mouseover', () => {
        layer.setStyle({ weight: 2.5, color: '#ffffff', opacity: 1 });
        layer.bringToFront();
        showTooltip(
          nameLatin,
          data ? fmtNum(data.total_events) + ' events recorded' : 'No events data',
          'Click for details'
        );
      });

      layer.on('mouseout', () => {
        ruLayer.resetStyle(layer);
        hideTooltip();
      });

      layer.on('click', e => {
        L.DomEvent.stopPropagation(e);
        window.location.href = 'oblast.html?country=Russia&oblast=' + encodeURIComponent(acledKey);
      });
    },
  }).addTo(map);

  // ── 4. Legend ───────────────────────────────────────────────────────────
  buildLegend(aidData, acledData);

}).catch(err => {
  console.error('Failed to load map data:', err);
});

// ── Legend builder ──────────────────────────────────────────────────────────
function buildLegend(aidData, acledData) {
  const container = document.getElementById('legend-items');
  const breaks = [
    { label: 'No data',    color: '#1e2d3d' },
    { label: '< €1B',      color: AID_COLORS[1] },
    { label: '€1B – €10B', color: AID_COLORS[3] },
    { label: '€10B – €50B',color: AID_COLORS[5] },
    { label: '> €50B',     color: AID_COLORS[6] },
  ];
  breaks.forEach(b => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `<span class="legend-swatch" style="background:${b.color}"></span>${b.label}`;
    container.appendChild(row);
  });

  const evContainer = document.getElementById('legend-events');
  const evBreaks = [
    { label: 'None',    color: 'rgba(255,255,255,0.05)' },
    { label: '< 100',   color: CONFLICT_COLORS[1] },
    { label: '100–1k',  color: CONFLICT_COLORS[2] },
    { label: '1k–10k',  color: CONFLICT_COLORS[3] },
    { label: '> 10k',   color: CONFLICT_COLORS[4] },
  ];
  evBreaks.forEach(b => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `<span class="legend-swatch" style="background:${b.color}"></span>${b.label}`;
    evContainer.appendChild(row);
  });
}
