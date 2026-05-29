# 🌍 Ukraine Conflict Data Dashboard

Project for the **COM-480 Data Visualization** course at EPFL.

## 👨‍👩‍👧‍👦 Students

* **Daniele Giuli**
* **Chaewon Yoon**
* **Ali Shenaskhosh**


## 📘 Final Deliverables

* 📄 **Process Book:** [Read the process book](INSERT_PROCESS_BOOK_LINK_HERE)
* 🎥 **Screencast:** [Watch the screencast](INSERT_SCREENCAST_LINK_HERE)
* 🌐 **Website:** [Go to website](https://com-480-data-visualization.github.io/project-noname/)

## 🔴 Abstract

The Ukraine-Russia conflict is a complex crisis involving military activity, humanitarian consequences, and international economic support. This project presents an interactive data visualization dashboard that helps users explore these dimensions through maps, timelines, rankings, and statistical charts.

The dashboard combines conflict event data, regional summaries, international aid commitments, and economic indicators. Users can explore the conflict from multiple perspectives: global aid contributions, regional conflict intensity, battlefront activity over time, and detailed country or oblast profiles.

## 🎯 Target Audience

This project is intended for users interested in understanding the Ukraine-Russia conflict through visual and interactive data exploration, including students, researchers, journalists, analysts, and general users.

No technical background is required to use the website.

## 🌟 Website Overview

The website consists of four main pages:

```text
index.html       # Interactive map, timeline, and battlefront view
statistics.html  # Overall conflict and aid statistics
country.html     # Country-level aid profile
oblast.html      # Oblast-level conflict profile
```

### Main Map

The main page provides an interactive Leaflet map with three views:

* **States View:** global map of aid pledged to Ukraine by donor country.
* **Oblasts View:** regional map of conflict intensity across Ukrainian and Russian oblasts.
* **Battlefront View:** time-based visualization of conflict events with point, density, comparison, and playback controls.

The page also includes a timeline of key events, hover tooltips, map legends, reset controls, and an export function.

### Overall Statistics

The statistics page summarizes the conflict and international support through:

* casualty and event summary cards;
* event distribution charts;
* aid allocation charts;
* cumulative aid trends;
* aid-to-GDP ranking;
* death and event time-series visualizations.

### Country and Oblast Profiles

The detail pages provide focused views for selected countries and regions:

* **Country profiles** show total aid, aid type distribution, aid-to-GDP ratio, ranking position, and monthly aid trends.
* **Oblast profiles** show total events, fatalities, event types, monthly trends, pictograms, and regional rankings.

## 💿 Dataset

The project uses processed data files stored directly in the repository under the `data/` folder.

The main datasets are derived from:

* **ACLED** — conflict event records and geospatial conflict information;
* **Kiel Institute Ukraine Support Tracker** — international aid commitment data;
* **World Bank** — GDP and country-level economic indicators.

The website expects the following files to be available through the `data/` path:

```text
data/
├── world_countries.geojson
├── ukraine_oblasts.geojson
├── russia_oblasts.geojson
├── acled_by_oblast.json
├── aid_by_country.json
├── events_by_month.json
├── gdp_by_country.json
└── timeline_events.json
```

## 📍 Milestones

### Milestone 1: Proposal

👉 **[View Milestone 1](./MIlestone1.md)**

### Milestone 2: Prototype

👉 **[View Milestone 2](./Milestone2.md)**

### Milestone 3: Final Project

* 🌐 **Website:** [Go to website](https://com-480-data-visualization.github.io/project-noname/)
* 📄 **Process Book:** [Read the process book](INSERT_PROCESS_BOOK_LINK_HERE)
* 🎥 **Screencast:** [Watch the screencast](INSERT_SCREENCAST_LINK_HERE)

