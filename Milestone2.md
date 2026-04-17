## Project Overview

Understanding the Ukraine conflict requires more than raw statistics: it requires spatial, temporal, and geopolitical context. Our website is built around this idea. The homepage presents the user with two tightly coupled components — a **scrollable timeline of key events** and a **multi-purpose interactive map** — that together anchor the story of the war. The map serves a dual purpose: zoomed in on Ukraine and Russia, it shows the intensity of fighting at the oblast level and the individual violent events; zoomed out, it shows each country's contribution to the international aid effort. From the map, clicking any oblast or country opens a dedicated detail page with in-depth statistics. A separate **general statistics page** collects aggregate war metrics that do not depend on any specific territory.

The overall design enhances the storytelling. Interacting with the data amplifies cognition, and the temporal narrative of the timeline frames the conflict as a story with identifiable turning points, giving the user both emotional and analytical access to the data.

---

## Core Visualizations — Minimal Viable Product

### 1. Timeline

A horizontal scrollable strip displaying key war events as clickable point marks on a D3 time axis. The user drags or scrolls to pan through time; clicking an event opens a detail card with date, title, and description.

The topics used are JavaScript in Lectures 2 and 3, D3 from Lecture 4.2 for the SVG axis and time scale, and Lecture 5 for the interactive drag and click behaviour. Lecture 6.2 (Marks and Channels) is relevant as well — events are 0D point marks positioned on a 1D time axis, and position is the most effective channel for conveying temporal order. Lecture 12 (Storytelling) will be particularly useful here: the timeline is the key narrative device of the whole site.

A sketch of it can be already seen on the website.

### 2. Interactive Map

A Leaflet tiled web map with GeoJSON overlays. Oblast and country polygons are area marks coloured by a sequential magnitude channel on a log scale — total aid in EUR for the world view, conflict event count for the oblast view. The two layers cross-fade on zoom via CSS transitions on custom Leaflet panes. Clicking an oblast or country opens a page for detailed drill-down without losing spatial context.

At the high zoom level, a button allows to switch from the oblast visualization to the warfare. The timeline and the map are designed to work together: in this visualization, events occurred at the selected time will appear on the map indicated by different icons according with the event type, allowing users to dynamically observe how conflict evolved over the course of the war. This is the central interactive feature of the site and the one that most directly realises the storytelling intention.

The core tools are Leaflet.js for the tiled map (Web GIS as introduced in Lecture 8.2), D3 and lecture 5 and 8: choropleth design, spatial data, interaction and Interactive D3 — event listeners, linked views, real-time synchronisation across components.

### 4. Oblast Statistics Page

Clicking on an oblast opens a per-oblast breakdown of ACLED data: total violent events (excluding strategic developments), breakdown by event type, monthly time series, fatality count, and ranking among all oblasts.

The charts — bar charts, line charts, and stat cards — are all D3 work (Lecture 4.2) combined with the interaction techniques from Lecture 5. Lecture 11 (Tabular Data) might be central here. Lectures 7.1 and 7.2 on design will guide the visual hierarchy.

![Oblast events timeline sketch](figures/milestone%202/ve_timeline.png)

### 5. Country Statistics Page

Clicking on a country opens a per-country breakdown of Ukraine Support Tracker data: total aid in EUR, aid split by category (military, financial, humanitarian), monthly time series, number of aid packages, and aid normalised by GDP.

The visualisations include a donut chart for aid composition, a stacked bar chart for the monthly time series, and summary stat cards — all in D3 (Lecture 4.2). Lecture 6 is also key for this visualization. Lecture 11 will again be relevant for the time series and ranking charts.

![Country in-depth panel](figures/milestone%202/country.png)
### 6. General Statistics Page

Aggregate war statistics not tied to any specific region: global time series of conflict events and fatalities, ranking of donor countries by total aid and by aid/GDP, a pie chart of event types, total casualties, and a scatterplot of monthly attack intensity versus prior-month international aid.

As above, the key topics are covered in lectures 4, 6, and 11.

![Event types sketch](figures/milestone%202/ve_prop.png)
---

## Extra Ideas — Enhancements

- Instead of having the map views switch automatically on zoom or a button for the two visualizations at high zoom level, we are considering keeping two separate maps.

- **Pictogram casualties.** Replace raw fatality numbers with isotype-style arrays of human-shaped pictograms in the detail oblast panel to communicate the human cost more viscerally. 

- **Comparison of oblasts/countries.** Allow the user to select two oblasts or two countries simultaneously and display a side-by-side panel comparing their statistics over time. This requires linked views and brushing (Lecture 5.1) and builds on the map's ability to compare location-bound attributes (Lecture 8.1).

- **Battlefront inference.** Cluster "Battle"-type ACLED events geographically over time to approximate the evolving front line and render it as a contour overlay on the map. Goes beyond standard course content but builds on Lectures 8.1 and 8.2.

- **Attack–aid correlation scatterplot.** For each month, plot the number of attacks against total aid received the prior month, separately for Ukraine and Russia, to probe whether aid volumes correlate with offensive activity.

---

## Implementation Breakdown

The main development steps, each independently implementable:

1. **Data processing and normalisation** — aligning ACLED and Kiel Institute data with GeoJSON boundaries.
2. **Timeline**.
3. **Dual-map layout and navigation** — constructing the zoom-based interface with both the countries and oblasts views.
4. **Event level map** — constructing the warfare visualization and connecting it with the timeline.
5. **Overall numbers and plots** — creating the page with aggregated statistics over all the countries and oblasts.
6. **Interactive side panel** — developing the detailed pages for oblast and country drill-down. The two are independent but very similar.
7. **Dynamic UI synchronisation** — implementing event listeners to sync hover, click, and time-filtering across the timeline, maps, and detail panel.

---

## Functional Prototype

A working prototype is already available. To run it:

```bash
# 1. Generate data files (run once)
cd com-480-project-noname
python preprocess.py

# 2. Start the local HTTP server
cd website
python -m http.server 8080
```

Open `http://localhost:8080` in Chrome (the page will not work if opened directly as a file).

**Currently implemented:** the D3 timeline (scrollable, clickable events) and the zoom-based dual-layer Leaflet map (world choropleth + oblast choropleth) are both functional. Individual event scatter points and timeline–map synchronisation are the primary next steps.

See `com-480-project-noname/codebook.md` for the full file tree and data source descriptions.
