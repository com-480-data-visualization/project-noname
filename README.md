# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Daniele Giuli | 395832 |
| Chaewon Yoon | 423059 |
| | |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

> **10% of the final grade**

> This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
> Please, fill the following sections about your project.

> *(max. 2000 characters per section)*

The conflict in Ukraine represents a critical geopolitical crisis with a vast but often fragmented landscape of information. This project aims to bridge the gap between raw data and public understanding by developing an interactive, data-driven platform that provides a multi-faceted analysis of the war.

Our goal is to move beyond static reporting, offering a comprehensive visualization of the conflict’s evolution through four main pillars:

Military Dynamics: Visualizing the shifting battlefronts and tactical engagements over time.

Human Impact: Tracking casualties and the humanitarian cost of the escalation.

Financial & Material Support: Mapping the flow of international aid and military equipment.

Geopolitical Context: Analyzing the diplomatic shifts and alliances surrounding the crisis.

### Dataset

> Find a dataset (or multiple) that you will explore. Assess the quality of the data it contains and how much preprocessing / data-cleaning it will require before tackling visualization. We recommend using a standard dataset as this course is not about scraping nor data processing.
>
> Hint: some good pointers for finding quality publicly available datasets ([Google dataset search](https://datasetsearch.research.google.com/), [Kaggle](https://www.kaggle.com/datasets), [OpenSwissData](https://opendata.swiss/en/), [SNAP](https://snap.stanford.edu/data/) and [FiveThirtyEight](https://data.fivethirtyeight.com/)).


Dataset 

To provide a multi-dimensional analysis of the Ukraine conflict, we have selected several authoritative and standardized datasets that cover military, humanitarian, and economic aspects:

* Military Dynamics & Casualties
- ACLED (Armed Conflict Location & Event Data Project) : Provides georeferenced data on specific military actions, battles, and explosions.
https://acleddata.com/conflict-data/download-data-files

- UCDP GED (Georeferenced Event Dataset) : Offers high-quality, event-based data to track precise casualty figures and instances of one-sided violence.
https://ucdp.uu.se/downloads/#section-other

* International Support & Sanctions
- Ukraine Support Tracker (Kiel Institute) : Tracks financial, humanitarian, and military aid pledged by various countries.
https://www.ifw-kiel.de/publications/ukraine-support-tracker-data-6453/

- OpenSanctions (Ukraine War Sanctions) : A curated dataset of individuals and entities targeted by international sanctions.
https://www.opensanctions.org/datasets/ua_war_sanctions/

* Economic Impact & Territorial Changes: 
- COW (Correlates of War) Bilateral Trade : Used to assess shifts in global trade patterns and the economic consequences of the war.
https://correlatesofwar.org/data-sets/

- DeepStateMap/ISW Geospatial Data : Open-source data to visualize the temporal shifts of the battlefront and territorial control.
https://t.me/DeepStateUA

Data Quality Assessment

These datasets are widely recognized as "gold standards" in political science and conflict research. ACLED and UCDP provide rigorous, cross-verified event logs, while the Kiel Institute’s tracker is the most comprehensive source for aid transparency. The data quality is high, minimizing the risk of misinformation common in active conflict reporting.

Preprocessing & Data Cleaning

1.  Normalization : Aligning timestamps (daily events vs. monthly/periodic reports) to a unified interactive timeline.
2.  Geospatial Join : Mapping event-based coordinates from ACLED/UCDP onto the territorial polygons derived from DeepStateMap to ensure visual consistency.
3.  Entity Linking: Connecting sanctioned entities from OpenSanctions with economic indicators to visualize the correlation between legal pressure and economic shifts.



### Problematic

> Frame the general topic of your visualization and the main axis that you want to develop.
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

### Exploratory Data Analysis

> Pre-processing of the data set you chose
> - Show some basic statistics and get insights about the data

### Related work


> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

