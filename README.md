# 🌍 Ukraine Conflict Data Dashboard

Project for the **COM-480 Data Visualization** course at EPFL.

## 👨‍👩‍👧‍👦 Students

* **Daniele Giuli**
* **Chaewon Yoon**
* **Ali Shenaskhosh**

## ✅ Live Prototype

The final live prototype can be found here:

👉 **[Go to website](https://com-480-data-visualization.github.io/project-noname/)**

## 📘 Final Deliverables

* 📄 **Process Book:** [Read the process book](INSERT_PROCESS_BOOK_LINK_HERE)
* 🎥 **Screencast:** [Watch the screencast](INSERT_SCREENCAST_LINK_HERE)
* 🌐 **Website:** [Go to website](INSERT_WEBSITE_LINK_HERE)

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

## 🛠️ Technologies Used

* **HTML5 / CSS3 / JavaScript**
* **D3.js v7**
* **Leaflet.js v1.9.4**
* **Leaflet.heat**
* **Turf.js**
* **html2canvas**
* **R / Python** for exploratory data analysis and preprocessing

## 🚀 Project Structure

```text
project-root/
├── .github/workflows/       # GitHub workflow files
├── data/                    # Data files used by the website
├── docs/                    # Website files for deployment
├── figures/                 # Figures used in reports or milestones
├── EDA.R                    # Exploratory data analysis script
├── Milestone1.md            # Milestone 1 report
├── Milestone2.md            # Milestone 2 report
├── guidebook.md             # Additional documentation
├── plan.docx                # Project planning document
├── preprocess.py            # Data preprocessing script
└── README.md                # Project documentation
```

## 🧑‍💻 Running the Website Locally

Because the website loads local `.json` and `.geojson` files, it should be run through a local web server rather than opened directly with `file://`.

### Option 1: VS Code Live Server

1. Clone the repository.
2. Open the project folder in VS Code.
3. Install the **Live Server** extension.
4. Open the website entry file, usually `index.html`.
5. Right-click and select **Open with Live Server**.

### Option 2: Python Local Server

From the repository root, run:

```bash
python -m http.server 5500
```

Then open:

```text
http://127.0.0.1:5500/
```

If the website is located inside the `docs/` folder, open:

```text
http://127.0.0.1:5500/docs/
```

### Option 3: Node.js Local Server

If Node.js is installed, run:

```bash
npx http-server -p 5500
```

Then open the corresponding local URL in your browser.

## 🔄 Data Preprocessing

The repository includes preprocessing and exploratory analysis scripts used to transform raw datasets into website-ready files.

* `EDA.R` contains exploratory data analysis work.
* `preprocess.py` contains preprocessing logic for generating structured data files.
* Processed outputs are stored in the `data/` folder and loaded directly by the website.

If the data is updated, the processed files in the `data/` folder should be regenerated or replaced while preserving the filenames expected by the website.

## 📍 Milestones

### Milestone 1: Proposal

👉 **[View Milestone 1](./Milestone1.md)**

### Milestone 2: Prototype

👉 **[View Milestone 2](./Milestone2.md)**

### Milestone 3: Final Project

* 🌐 **Website:** [Go to website](INSERT_WEBSITE_LINK_HERE)
* 📄 **Process Book:** [Read the process book](INSERT_PROCESS_BOOK_LINK_HERE)
* 🎥 **Screencast:** [Watch the screencast](INSERT_SCREENCAST_LINK_HERE)

## 🤝 Authors

* **Chaewon Yoon**
* **Daniele**
* **Ali**

## 📌 Notes

Before running or deploying the project, make sure that:

1. the `data/` folder is included in the repository;
2. all required `.json` and `.geojson` files are available;
3. the website is served through a local or hosted web server;
4. relative paths between the website files and the `data/` folder are consistent;
5. placeholder links in this README are replaced with the final website, process book, and screencast links.
