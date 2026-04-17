# CODEBOOK

## Data Sources

| File / URL | Description |
|---|---|
| `data/ACLED Data_2026-03-10 (1).csv` | Georeferenced conflict events (battles, strikes, explosions) |
| `data/assistance_main_data.xlsx` | Ukraine Support Tracker — international aid pledges by country and type |
| `data/ukraine_support_tracker_codebook.xlsx` | Column definitions for the aid dataset |
| `https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson` | World countries geospatial data |
| `https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson` | Ukrainian oblasts geospatial data |
| `https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/russia.geojson` | Russian oblasts geospatial data |

The aid dataset stores values in the donor's original currency (`source_reported_value` + `reporting_currency`). `EDA.R` converts to EUR using a hardcoded exchange-rate table (`tassi_medi`).

## Running the EDA

The EDA is a single script; run it from the project root in RStudio or via Rscript:

```bash
cd com-480-project-noname
Rscript EDA.R
```

Required R packages: `readr`, `dplyr`, `tidyr`, `ggplot2`, `stringr`, `zoo`, `tidyverse`, `scales`, `ggrepel`, `lubridate`, `janitor`, `readxl`, `jsonlite`.

Figures are saved to `figures/`.

## Preprocessing

Run `preprocess.py` once before launching the website. It generates the JSON data files and downloads the GeoJSON boundary files:

```bash
cd com-480-project-noname
python preprocess.py
```

Output files written to `website/data/`:

| File | Description |
|---|---|
| `acled_by_oblast.json` | Conflict event counts aggregated per Ukrainian oblast |
| `aid_by_country.json` | Aid totals aggregated by donor country |
| `timeline_events.json` | Key war events with date, title, and description |
| `ukraine_oblasts.geojson` | Ukrainian oblast boundaries (downloaded) |
| `russia_oblasts.geojson` | Russian oblast boundaries (downloaded) |
| `world_countries.geojson` | World country boundaries (downloaded) |

## Running the Website

After preprocessing, serve the website with Python's built-in HTTP server (required because browsers block local `fetch()` calls):

```bash
cd com-480-project-noname/website
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## Website Structure

```
website/
├── index.html          # main page (map + timeline)
├── oblast.html         # oblast detail page (drill-down)
├── css/
│   └── style.css       # all styling for both pages
└── js/
    ├── map.js          # Leaflet map with zoom-based layer switching
    └── timeline.js     # D3 horizontal draggable timeline
```

### HTML pages

- **`index.html`** — entry point. Contains the timeline section (`#timeline-section`) and the map container (`#map`). Loads Leaflet and D3 from CDN, then `map.js` and `timeline.js` with `defer`.
- **`oblast.html`** — detail view for a single Ukrainian oblast; linked from the map on click.

### CSS (`css/style.css`)

Single stylesheet covering both pages. Key selectors:

| Selector | Purpose |
|---|---|
| `.page-home` | Body class on `index.html` for page-specific overrides |
| `.site-header` / `.header-nav` | Top navigation bar |
| `#timeline-section` | Full-width timeline strip |
| `#map-container` / `#map` | Map wrapper and Leaflet map div |
| `.map-legend` | Floating legend overlay inside the map |
| `#event-card` | Popup card shown when a timeline event is clicked |

### JavaScript (`js/map.js`)

Implements a single Leaflet map with two overlapping GeoJSON layers that cross-fade based on zoom level:

- **World layer** (zoom < 4) — country choropleth coloured by total aid pledged.
- **Oblast layer** (zoom ≥ 5) — Ukrainian oblasts coloured by conflict event count.

Between zoom levels 4 and 5 the layers fade smoothly using CSS transitions on custom Leaflet panes (`worldPane` / `oblastPane`).

External dependencies: [Leaflet 1.9.4](https://leafletjs.com/), [D3 v7](https://d3js.org/).

### JavaScript (`js/timeline.js`)

Implements a horizontal draggable timeline using D3:

- Fetches `data/timeline_events.json` on load.
- Renders an SVG axis wider than the viewport (`TOTAL_W = viewport × 2.2`) to allow panning.
- Each event is a circle on the axis; clicking opens `#event-card` with date, title, and description.
- The card is dismissed via the `×` close button (`#ec-close`).
