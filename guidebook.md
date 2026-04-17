# GUIDEBOOK

## Data Sources

| Link | Description |
|------|-------------|
| `data/ACLED Data_2026-03-10 (1).csv` | Georeferenced conflict events (battles, strikes, explosions) |
| `data/assistance_main_data.xlsx` | Ukraine Support Tracker — international aid pledges by country and type |
| `data/ukraine_support_tracker_codebook.xlsx` | Column definitions for the aid dataset |
| https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson | World countries geospatial data |
| https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson | Ukrainian oblasts geospatial data | 
| https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/russia.geojson | Russian oblasts geospatial data |

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

preprocess.py — run once to generate website/data/*.json and download the GeoJSON boundary files.
