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

In this section we will make an initial analysis of some of the available data and create some simple visualization to demonstrate basic statistics of the data regarding some of the mentioned aspects of our project.

![Figure 1. Evolution of violent events initiated by each side](figures/timeseries_events.png)

As shown in Fig. 1, overall through the course of war, the number of violent events caused by Russian military was higher than Ukraine. Moreover, since beginning of 2024, there has been a decrease in the number of operations of the Ukraine. Meanwhile, the Russians have intensified their attacks in that time, reaching a peak of about 100 daily events caused by them. This number is more than double the average of operations done by Russian military in the period before.

![Figure 2. Distribution of violent events by region](figures/regions_pie.png)

The above pie chart shows what percentage of the violent events happened in each impacted region. Kursk is a Russian Oblast, Luhansk is completely occupied by Russia, Kharkiv was occupied at the beginning and was later liberated, and the rest are currently partially occupied by Russia. Nearly half of the events happen at Dontesk Oblast showing that this region is where the fighting is most intense. On the other hand less than 15 percent of the events happen at the regions completely controlled by Russia Suggesting there are much fewer events directed toward Russian soil.

![Figure 3. Distribution of event types](figures/grafico_event_types.png)

Figure 3 demonstrates how much share each category of events has. Nearly half of the violent events were battles meaning they happened on the frontlines of the war. On the other hand, about 40 percent were explosions or remote violence. This includes aerial bombing, artillery shelling, missile attack, use of drones, planting bombs and other similar methods.

![Figure 4. Evolution of Russian Air and Drone Strikes](figures/drone_strikes.png)

From figure 4. we can see the number of the aerial and drone strikes done by the Russian military has intensified since the later part of 2024 and reached its all time high towards the end of the year. This data alongside figure 1 shows that the Russian military heavily intensified its attacks in 2024, tying to achieve a breakthrough. On the other hand, the Ukranian Army has been in a more defensive position since then and the number of violent events initiated by it has been reduced significantly.

The humanitarian toll of war was another aspects that we are interested in analyzing. One of the first steps is to analyze the casualties suffered by each side during the war. The following histogram shows the number fatalities on each side from the beginning of war.

![Figure 5. Number of Casualties on each side during the war ](figures/fatalities_hist.png)

For most of the war, the Ukranian military suffered more casualties on average. But since the middle of 2024, the Russian military has suffered a much higher number of deaths than Ukraine and than it's average before. This is line with the analysis we made earlier and what the other data also show: During 2024 Russian military intensified its attacks in order to achieve a breakthrough and the Ukranian military has been mostly on defensive. The high rate of casualties coupled with the fact that most of the violent events were initiated by the Russian military, suggests that the Russians were mostly unsuccessful in their operations. Although for more accuracy the battlefront map should be analyzed.

We also want to analyze the aid and support given to countries. The following pie chart shows share of the each country of the total aid given to Ukraine.

![Figure 6. Contribution of countries to Ukraine](figures/aid_pie.png)

As the chart demonstrates, United States is by far the largest donor to Ukraine, contributing about 60 percent of the total amount. Most of the remaining aid is given by EU or its member countries individually. In figure 7 we can see how the aid given by EU and US has changed over time:

![Figure 7. Timeline of the assistance given by EU and US](figures/eu_v_usa_ts.png)

Finally, We are interested in the type of aid that Ukraine has received. Using figure 8 we can see that the largest portion is dedicated to military aid, constituting 60 percent of the aid received by Ukraine. Next, 30 percent of the total aid is humanitarian aid, and just 10 percent of the aid is financial which goes toward the civilian administration of the country.

![Figure 8. Aid given to Ukraine by type](figures/aid_type.png)

### Related work

> -   What others have already done with the data?
> -   Why is your approach original?
> -   What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> -   In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

Since the war is an ongoing conflict and due to its important on a global scale, a large number of analysis has been done on the gathered data about the war. Some of the sources for chosen datasets also provide visualization of their data. for instance there are visualization available for the map of the battlefront and its evolution and for the aid given to Ukraine.

But while there are visualization available on the data, there is a lack of an analysis which unifies all these different aspects and reports their related data together. Our main objective in this project is to connect different aspects of the Ukraine war in a logical way and present the available data at one place.

For this reason we have chosen various datasets that cover the mentioned points of interest and we will use them to visualize and report an story about different sides of the war. This helps interested individuals to have a better understanding of the conflict as a whole and be able to access the data related to every feature of the war at one place. Using our intended visualization, one can use a comprehensive summary to better understand the war.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**

## Milestone 3 (29th May, 5pm)

**80% of the final grade**

## Late policy

-   \< 24h: 80% of the grade for the milestone
-   \< 48h: 70% of the grade for the milestone
