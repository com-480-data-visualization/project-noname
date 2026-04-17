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

## Website Structure

```
website/
├── index.html          # main page (map + timeline)
├── oblast.html         # oblast detail page (drill-down)
├── css/
│   └── style.css       # all styling for both pages
└── js/
    ├── map.js          # Leaflet map
    └── timeline.js     # D3 horizontal draggable timeline
```

