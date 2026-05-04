# Project of Data Visualization (COM-480)

| Student's name  | SCIPER |
|-----------------|--------|
| Daniele Giuli   | 395832 |
| Chaewon Yoon    | 423059 |
| Ali Shenaskhosh | 389834 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

The conflict in Ukraine represents a critical geopolitical crisis with a vast but often fragmented landscape of information. This project aims to bridge the gap between raw data and public understanding by developing an interactive, data-driven platform that provides a multi-faceted analysis of the war.

Our goal is to move beyond static reporting, offering a comprehensive visualization of the conflict’s evolution through two main pillars:

Military Dynamics: Visualizing the tactical engagements over time and tracking casualties and the humanitarian cost of the escalation.

Financial & Material Support: Mapping the flow of international aid and military equipment, potentially casting light on diplomatic shifts and alliances surrounding the crisis.

### Dataset

To provide a multi-dimensional analysis of the Ukraine conflict, we have selected two authoritative and standardized datasets that cover military, humanitarian, and economic aspects:

-   ACLED (Armed Conflict Location & Event Data Project) : Provides georeferenced data on specific military actions, battles, and explosions. https://acleddata.com/conflict-data/download-data-files

-   Ukraine Support Tracker (Kiel Institute) : Tracks financial, humanitarian, and military aid pledged by various countries. https://www.ifw-kiel.de/publications/ukraine-support-tracker-data-6453/

Data Quality Assessment

These datasets are widely recognized as "gold standards" in political science and conflict research. ACLED provides rigorous, cross-verified event logs, while the Kiel Institute’s tracker is the most comprehensive source for aid transparency. Their high data quality significantly reduces the risk of misinformation typically associated with active conflict reporting. 
The Ukraine Support Tracker covers the period up to the end of 2025, while the ACLED dataset includes events through March 2025.

Preprocessing & Data Cleaning

While the Ukraine Support Tracker records international aid values in their original currencies and has many missing values in the dedicated Euro conversion column, these figures can be easily calculated using the historical exchange rates applicable at the time of each transaction. Otherwise, the data are exceptionally clean.

### Problematic

The Russian invasion of Ukraine, which escalated on February 24, 2022, has had profound global implications, drawing significant involvement from international allies. Given the extensive coverage and global impact of the war, our goal is to move beyond static reporting. By leveraging high-quality, event-based conflict data (ACLED) and international aid records (Ukraine Support Tracker), we aim to offer a comprehensive visualization of the conflict’s evolution across three main pillars:

#### Military Dynamics

At the core of our analysis is the spatiotemporal evolution of the war. Using event-level data, we will visualize the shifting intensity of the conflict, mapping tactical engagements, and remote violence (such as shelling and airstrikes) over time.
This visual approach will allow us to track the progression of the war—identifying regional hotspots, shifts in territorial control, and the conflict's transition into attrition warfare in specific areas.

#### Human Impact

The humanitarian toll of the conflict has been devastating. While we cannot track demographic specifics or displacement within this scope, we will rely on rigorous event data to visualize the direct loss of life.
Our focus will be on mapping total fatality trends and, crucially, isolating events of direct violence against civilians. This will provide a clear, data-driven picture of how the human cost has evolved spatially and temporally throughout the war.

#### Financial & Material Support

Since the onset of the war, Ukraine's defense and economic stability have relied heavily on international backing, particularly from the US and the EU.
We will analyze and visualize the influx of foreign support, categorizing the data to show both the origin of the aid and its primary purpose (military, financial, or humanitarian). This will highlight how international commitment has fluctuated in response to the changing dynamics on the ground.

### Exploratory Data Analysis

We present an initial exploratory analysis of the available data, utilizing foundational visualizations to highlight key statistics across our project's core pillars.

#### Military Dynamics and Event Distribution

![Figure 1. Evolution of violent events initiated by each side](figures/timeseries_events.png)
![Figure 4. Evolution of Russian Air and Drone Strikes](figures/drone_strikes.png)

As shown in **Figure 1**, Russian-initiated events consistently outnumber Ukrainian ones. This gap widened in early 2024: Ukrainian operations decreased while Russian attacks peaked at ~100 daily events (double their previous average). **Figure 4** confirms this surge was driven by record-high Russian aerial and drone strikes, indicating an aggressive offensive while Ukraine shifted to a defensive posture.

![Figure 2. Distribution of violent events by region](figures/regions_pie.png)
![Figure 3. Distribution of event types](figures/grafico_event_types.png)

Geographically (**Figure 2**), fighting is heavily concentrated in the Donetsk Oblast (~50% of all events). Conversely, under 15% occur on Russian soil or in fully occupied territories. By event type (**Figure 3**), frontline battles account for roughly 50% of recorded violence, closely followed by remote violence (explosions, artillery, drone strikes) at 40%.

#### Human Impact and Casualties

![Figure 5. Number of Casualties on each side during the war](figures/fatalities_hist.png)

Fatality trends shifted notably (**Figure 5**). While Ukraine caused higher average casualties initially, Russian killings spiked significantly from mid-2024. These high casualty rates are well explained by the surge in Russian drone attacks.

#### International Support and Aid Allocation

![Figure 6. Contribution of countries to Ukraine](figures/aid_pie.png)
![Figure 7. Timeline of the assistance given by EU and US](figures/eu_v_usa_ts.png)
![Figure 8. Aid given to Ukraine by type](figures/aid_type.png)

The US is the primary benefactor, contributing ~60% of total aid, with the EU and its members providing most of the rest (**Figure 6**). **Figure 7** tracks these temporal fluctuations. Regarding resource allocation (**Figure 8**), support is strictly prioritized toward military aid (60%), followed by humanitarian (30%) and financial assistance for civilian administration (10%).

### Related work

Since the war is an ongoing conflict and due to its importance on a global scale, a large number of analysis has been done on the gathered data about the war. Some of the sources for chosen datasets also provide visualization of their data ([ACLED Ukraine Conflict Monitor](https://acleddata.com/monitor/ukraine-conflict-monitor)). For instance, there are visualizations available for the map of the battlefront ([DeepStateMap](https://deepstatemap.live/#6/45.9893289/27.5537109)) and its evolution, and for the aid given to Ukraine ([Ukraine Support Tracker](https://www.kielinstitut.de/topics/war-against-ukraine/ukraine-support-tracker/)).

But while there are visualizations available on the data, there is a lack of an analysis which unifies all these different aspects and reports their related data together. Our main objective in this project is to connect different aspects of the Ukraine war in a logical way and present the available data at one place.

For this reason we have chosen various datasets that cover the mentioned points of interest and we will use them to visualize and report a story about different sides of the war. This helps interested individuals to have a better understanding of the conflict as a whole and be able to access the data related to every feature of the war at one place. Using our intended visualization, one can use a comprehensive summary to better understand the war.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**

## Milestone 3 (29th May, 5pm)

**80% of the final grade**

## Late policy

-   \< 24h: 80% of the grade for the milestone
-   \< 48h: 70% of the grade for the milestone
