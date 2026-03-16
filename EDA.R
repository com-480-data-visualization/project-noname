library(readr)
library(dplyr)
library(tidyr)
library(ggplot2)
library(stringr)
library(zoo)

acled_data <- read_csv("data/ACLED Data_2026-03-10 (1).csv")
# View(acled_data)

acled_data$actor1_simple <- ifelse(acled_data$actor1 %in% c("Military Forces of Russia (2000-)", "Military Forces of Russia (2000-) Air Force", "Wagner Group", "Unidentified Armed Group (Russia)"), "Military forces of Russia",
                                   ifelse(acled_data$actor1 %in% c("Melitopol Communal Militia (Ukraine)", "Military Forces of Ukraine (2019-)", "Military Forces of Ukraine (2019-) Air Force", "Military Forces of Ukraine (2019-) Marines", "Military Forces of Ukraine (2019-) Navy", "Unidentified Armed Group (Ukraine)"), "Military forces of Ukraine", acled_data$actor1))

acled_data <- acled_data %>%
  mutate(actor1_simple = case_when(
    str_detect(actor1_simple, "Military Forces of Russia") ~ "Military forces of Russia",
    str_detect(actor1_simple, "Communal Militia \\(Ukraine\\)") ~ "Military forces of Ukraine",
    str_detect(actor1_simple, "Military Forces of Ukraine") ~ "Military forces of Ukraine",
    TRUE ~ actor1_simple
  ))


time_series_data <- acled_data %>%
  subset(disorder_type != "Strategic developments") %>%
  count(event_date, actor1_simple, name = "number_events") %>%
  complete(event_date, actor1_simple, fill = list(number_events = 0))

top_actors <- time_series_data %>%
  group_by(actor1_simple) %>%
  summarise(tot_events = sum(number_events)) %>%
  slice_max(order_by = tot_events, n = 2) %>% 
  pull(actor1_simple)

Sys.setlocale("LC_TIME", "C")

plot_data <- time_series_data %>%
  filter(actor1_simple %in% top_actors) %>%
  group_by(actor1_simple) %>%
  arrange(event_date) %>%
  # Calculate 10-day rolling average (align="right" means it uses the past 10 days)
  mutate(rolling_avg = zoo::rollmean(number_events, k = 10, fill = NA, align = "right")) %>%
  ungroup()

last_points <- plot_data %>%
  group_by(actor1_simple) %>%
  filter(!is.na(rolling_avg)) %>%
  filter(event_date == max(event_date)) %>%
  ungroup()

time_series_plot <- ggplot(plot_data, aes(x = event_date, color = actor1_simple)) +
  geom_line(aes(y = number_events), alpha = 0.25, linewidth = 0.4) +
  geom_line(aes(y = rolling_avg), linewidth = 1.2) +
  scale_color_manual(values = c("Military forces of Russia" = "#b22222", 
                                "Military forces of Ukraine" = "#005bb5")) +
  scale_x_date(date_labels = "%b %Y", date_breaks = "3 months") + 
  theme_minimal(base_size = 14) +
  labs(
    title = "Daily Violent Events: Russia vs. Ukraine",
    subtitle = "10-day moving average of events (faded lines show raw daily counts)",
    x = "Date",
    y = "Number of events",
    color = "Actors" 
  ) +
  theme(
    legend.position = "bottom", 
    legend.title = element_text(face = "bold"),
    plot.title = element_text(face = "bold", size = 16),
    axis.text.x = element_text(angle = 45, hjust = 1),
    panel.grid.minor = element_blank()
  )


print(time_series_plot)

table(acled_data$actor1)[as.numeric(table(acled_data$actor1)) > 50]


russia_drones <- acled_data %>%
  filter(actor1_simple == "Military forces of Russia", sub_event_type == "Air/drone strike") %>%
  count(event_date, name = "number_dronestrikes") %>%
  complete(event_date, fill = list(number_dronestrikes = 0)) %>%
  arrange(event_date) %>%
  mutate(rolling_avg = zoo::rollmean(number_dronestrikes, k = 10, fill = NA, align = "right"))

drones_plot <- ggplot(russia_drones, aes(x = event_date)) +
  geom_line(aes(y = number_dronestrikes, color = "Raw daily counts"), alpha = 0.25, linewidth = 0.4) +
  geom_line(aes(y = rolling_avg, color = "10-day moving avg"), linewidth = 1.2) +
  scale_color_manual(values = c("Raw daily counts" = "#556", 
                                "10-day moving avg" = "#556b2f")) +
  scale_x_date(date_labels = "%b %Y", date_breaks = "3 months") +
  theme_minimal(base_size = 14) +
  labs(
    title = "Russian Air and Drone Strikes",
    subtitle = "10-day moving average of events",
    x = "Date",
    y = "Number of strikes",
    color = "Trend"
  ) +
  theme(
    legend.position = "none",
    legend.title = element_text(face = "bold"),
    plot.title = element_text(face = "bold", size = 16),
    axis.text.x = element_text(angle = 45, hjust = 1),
    panel.grid.minor = element_blank()
  )

print(drones_plot)
  
table(acled_data$sub_event_type)
table(acled_data$actor1_simple)[as.numeric(table(acled_data$actor1_simple)) > 50]


library(tidyverse)
library(scales)
library(ggrepel) # Required for labels with connecting lines

pie_data <- acled_data %>%
  filter(str_detect(event_id_cnty, "^(UKR|RUS)")) %>%
  mutate(event_type_clean = fct_lump_prop(event_type, prop = 0.03, other_level = "Other")) %>%
  count(event_type_clean) %>%
  mutate(perc = n / sum(n)) %>%
  mutate(event_type_clean = fct_reorder(event_type_clean, perc)) %>%
  mutate(event_type_clean = fct_relevel(event_type_clean, "Other", after = 0)) %>%
  arrange(desc(event_type_clean)) %>%
  mutate(ypos = cumsum(perc) - 0.5 * perc)

institutional_palette <- c("#1A365D", "#742A2A", "#7B7A1E", "#2C7A7B")

# Assign colors dynamically based on the number of categories
cat_names <- levels(pie_data$event_type_clean)
cat_colors <- setNames(rep(institutional_palette, length.out = length(cat_names)), cat_names)
cat_colors["Other"] <- "#A0AEC0" # Neutral, professional grey for "Other"

pie_plot <- ggplot(pie_data, aes(x = 1, y = perc, fill = event_type_clean)) +
  geom_col(width = 1, color = "white", linewidth = 0.5) +
  coord_polar(theta = "y") +
  geom_text_repel(aes(y = ypos, label = paste0(event_type_clean, "\n", percent(perc, accuracy = 0.1))),
                  nudge_x = 1.5, 
                  min.segment.length = 0, 
                  segment.size = 0.5,
                  segment.color = "grey40",
                  show.legend = FALSE,
                  fontface = "bold",
                  size = 4.2) +
  
  scale_fill_manual(values = cat_colors) +
  expand_limits(x = c(-1, 3)) + 
  
  theme_void(base_size = 14) +
  labs(title = "Proportion of Event Types") +
  theme(
    legend.position = "none",
    plot.title = element_text(face = "bold", size = 16, hjust = 0.5),
    plot.margin = margin(20, 20, 20, 20) # Adds breathing room around the chart
  )

ggsave("grafico_event_types.png", plot = pie_plot, width = 10, height = 8, dpi = 300)

# Prepare data (fixed the 'amdin1' typo)
location_data <- acled_data %>%
  filter(str_detect(event_id_cnty, "^(UKR|RUS)")) %>%
  mutate(admin1_clean = fct_lump_prop(admin1, prop = 0.03, other_level = "Other")) %>%
  count(admin1_clean) %>%
  mutate(perc = n / sum(n)) %>%
  mutate(admin1_clean = fct_reorder(admin1_clean, perc)) %>%
  mutate(admin1_clean = fct_relevel(admin1_clean, "Other", after = 0)) %>%
  arrange(desc(admin1_clean)) %>%
  mutate(ypos = cumsum(perc) - 0.5 * perc)

institutional_palette <- c("#1A365D", "#2B6CB0", "#319795", "#742A2A", "#7B7A1E", 
                           "#553C9A", "#2C7A7B", "#C53030", "#2F855A", "#B7791F")

cat_names <- levels(location_data$admin1_clean)
cat_colors <- setNames(rep(institutional_palette, length.out = length(cat_names)), cat_names)
cat_colors["Other"] <- "#A0AEC0"

location_pie <- ggplot(location_data, aes(x = "", y = perc, fill = admin1_clean)) +
  geom_col(width = 1, color = "white") +
  coord_polar(theta = "y") +
  geom_text(aes(y = ypos, label = ifelse(perc > 0.03, percent(perc, accuracy = 0.1), "")), 
            color = "white", fontface = "bold", size = 4) +
  scale_fill_manual(values = cat_colors, na.translate = FALSE) + 
  theme_void(base_size = 14) +
  labs(
    title = "Event Distribution by Region",
    fill = "Region"
  ) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5, margin = margin(b = 15)),
    legend.position = "right"
  )

print(location_pie)


library(tidyverse)
library(lubridate)
library(scales)

# 1. Prepare data grouped by month and actor
monthly_fatalities_actors <- acled_data %>%
  filter(actor1_simple %in% c("Military forces of Russia", "Military forces of Ukraine")) %>%
  mutate(month_year = floor_date(event_date, "month")) %>%
  group_by(month_year, actor1_simple) %>%
  summarise(total_fatalities = sum(fatalities, na.rm = TRUE), .groups = "drop")

# 2. Build the stacked bar plot
fatalities_actor_plot <- ggplot(monthly_fatalities_actors, aes(x = month_year, y = total_fatalities, fill = actor1_simple)) +
  # geom_col di default impila le barre (position = "stack")
  geom_col(width = 25) + 
  
  scale_fill_manual(values = c("Military forces of Russia" = "#b22222", 
                               "Military forces of Ukraine" = "#005bb5")) +
  
  scale_x_date(date_labels = "%b %Y", date_breaks = "3 months") +
  scale_y_continuous(labels = comma) + 
  
  theme_minimal(base_size = 14) +
  labs(
    title = "Monthly Fatalities by Actor",
    subtitle = "Reported deaths attributed to Russian vs. Ukrainian forces",
    x = "Month",
    y = "Total Fatalities",
    fill = "Actor"
  ) +
  theme(
    legend.position = "bottom",
    legend.title = element_text(face = "bold"),
    plot.title = element_text(face = "bold", size = 16),
    axis.text.x = element_text(angle = 45, hjust = 1),
    panel.grid.minor = element_blank(),
    panel.grid.major.x = element_blank() # Rimuove le linee verticali
  )

print(fatalities_actor_plot)

"--------------------------------"
#### UCDP ####
"--------------------------------"
# I did not find anything relevant, definately not in the actors dataset


"--------------------------------"
#### UKRAINE WAR AND SANCTIONS ####
"--------------------------------"
targets_uws <- read_csv("data/targets.simple.csv")
View(targets_uws)
# who are the tagets of the sanctions

library(jsonlite)
senzing_uws <- stream_in(file("data/senzing.json"), flatten = TRUE)
dim(senzing_uws)
View(senzing_uws)
# useless this too

entities_uws <- stream_in(file("data/entities.ftm.json"), flatten = TRUE)
View(entities_uws)
# same


"--------------------------------"
#### UKRAINE SUPPORT TRACKER ####
"--------------------------------"
library(readxl)
library(lubridate)
library(janitor)

assistance_main_data <- read_excel("data/assistance_main_data.xlsx")

assistance_main_data <- assistance_main_data %>%
  mutate(
    data_da_excel = excel_numeric_to_date(as.numeric(announcement_date)),
    data_da_testo = as.Date(parse_date_time(announcement_date, orders = c("dmy", "mdy", "ymd", "my", "d b y", "d B Y", "Ymd", "dbY"))),
    date = coalesce(data_da_excel, data_da_testo)
  )

mode(assistance_main_data$date)
range(assistance_main_data$date)
class(assistance_main_data$date)

st_data <- assistance_main_data %>%
  select(colnames(assistance_main_data)[sapply(assistance_main_data, function(x) mean(is.na(x))) < 0.30]) %>%
  mutate(donor = ifelse(assistance_main_data$donor %in% c("European Investment Bank", "European Peace Facility", "EU (Commission and Council)"), "EU", assistance_main_data$donor))

tassi_medi <- data.frame(
  reporting_currency = c("EUR", "USD", "CAD", "SEK", "DKK", "NOK", "GBP", "CZK", 
                         "CHF", "AUD", "ISK", "NZD", "JPY", "PLN", "BGN", "HUF", 
                         "HRK", "RON", "CNY", "KRW"),
  tasso_cambio = c(1.0000, 0.9200, 0.6800, 0.0880, 0.1340, 0.0880, 1.1600, 0.0410, 
                   1.0300, 0.6100, 0.0067, 0.5600, 0.0064, 0.2200, 0.5100, 0.0026, 
                   0.1327, 0.2000, 0.1300, 0.0007)
)

data_nations <- st_data %>%
  mutate(source_reported_value = as.numeric(source_reported_value)) %>%
  filter(!is.na(reporting_currency) & !is.na(source_reported_value)) %>%
  left_join(tassi_medi, by = "reporting_currency") %>%
  mutate(value_eur = source_reported_value * tasso_cambio) %>%
  group_by(donor) %>%
  summarise(tot_aid_eur = sum(value_eur, na.rm = TRUE)) %>%
  arrange(desc(tot_aid_eur))

data_pie <- data_nations %>%
  mutate(donor_10 = if_else(row_number() <= 10, donor, "Others")) %>%
  group_by(donor_10) %>%
  summarise(tot_aid_eur = sum(tot_aid_eur)) %>%
  arrange(donor_10 == "Others", desc(tot_aid_eur)) %>%
  mutate(percentuale = tot_aid_eur / sum(tot_aid_eur) * 100)

colori_nazioni <- c(
  "United States"               = "#b82940",
  "EU" = "#283c87", # Blu istituzionale UE
  "Germany"                     = "#000000", # Giallo/Oro bandiera tedesca (il nero sembrerebbe un buco)
  "United Kingdom"              = "#f8f8f8", # Blu scuro della Union Jack
  "Denmark"                     = "#C60C30", # Rosso scuro Danimarca
  "Japan"                       = "#FFB7C5", # Rosa ciliegio (Sakura) per distinguerlo dagli altri rossi
  "France"                      = "#1b2d59", # Azzurro/Ciano per non confonderlo con i blu di UE e UK
  "Norway"                      = "#93cbcb", 
  "Canada"                      = "#d1612a", # Rosso acceso della foglia d'acero
  "Poland"                      = "#DC143C", # Rosso cremisi Polonia
  "Sweden"                      = "#f2d44b",
  "Others"                      = "grey"  # Grigio neutro per raggruppare gli altri
)

totale_miliardi <- sum(data_pie$tot_aid_eur) / 1e9
testo_sottotitolo <- paste0("Total Aid: € ", round(totale_miliardi, 2), " Billion")
ggplot(data_pie, aes(x = "", y = tot_aid_eur, fill = reorder(donor_10, -tot_aid_eur))) +
  geom_bar(stat = "identity", width = 1, color = "white", linewidth = 0.5) + 
  geom_text(
    aes(label = if_else(percentuale > 5, paste0(round(percentuale, 1), "%"), "")), 
    position = position_stack(vjust = 0.5), 
    color = "white",                        
    fontface = "bold", 
    size = 6
  ) +
  
  coord_polar("y", start = 0) +
  theme_void() +
  scale_fill_manual(values = colori_nazioni) +  
  labs(
    title = "Total aids by donor country",
    subtitle = testo_sottotitolo,           # <-- Inserito il sottotitolo calcolato
    fill = "Donating country"
  ) +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold", size = 16, margin = margin(b = 5)),
    plot.subtitle = element_text(hjust = 0.5, size = 13, margin = margin(b = 15), color = "#333333"),
    legend.position = "right",
    legend.title = element_text(face = "bold")
  )

st_data <- st_data %>%
  mutate(source_reported_value = as.numeric(source_reported_value)) %>%
  filter(!is.na(reporting_currency) & !is.na(source_reported_value)) %>%
  left_join(tassi_medi, by = "reporting_currency") %>%
  mutate(value_eur = source_reported_value * tasso_cambio)

st_data_monthly <- st_data %>%
  mutate(
    mese_anno = format(date, "%Y-%m")
  ) %>%
  filter(!is.na(mese_anno)) %>%
  group_by(donor, mese_anno) %>%
  summarise(
    totale_mensile_eur = sum(value_eur, na.rm = TRUE), 
    .groups = "drop" 
  ) %>%
  arrange(mese_anno, desc(totale_mensile_eur))


data_ts <- st_data_monthly %>%
  filter(donor %in% c("United States", "EU")) %>%
  mutate(
    date_plot = as.Date(paste0(mese_anno, "-01")),
    tot_aid_billion = totale_mensile_eur / 1e9
  ) %>%
  complete(donor, date_plot, fill = list(tot_aid_billion = 0, totale_mensile_eur = 0)) %>%
  arrange(donor, date_plot)

colori_ts <- c(
  "United States" = "#b82940",
  "EU"            = "#283c87"
)

library(scales)

ggplot(data_ts, aes(x = date_plot, y = tot_aid_billion, color = donor, group = donor)) +
  geom_line(linewidth = 1.2) +
  geom_point(size = 2.5) +
  scale_color_manual(values = colori_ts) +
  scale_x_date(date_labels = "%b %Y", date_breaks = "3 months") +
  scale_y_continuous(labels = label_dollar(prefix = "€", suffix = " B")) +
  theme_minimal() +
  labs(
    title = "Monthly Aid Pledged to Ukraine over Time",
    subtitle = "United States vs European Union",
    x = "Announcement Date",
    y = "Total Aid (Billion €)",
    color = "Donor"
  ) +
  theme(
    plot.title = element_text(face = "bold", size = 16, margin = margin(b = 8)),
    plot.subtitle = element_text(size = 12, color = "#555555", margin = margin(b = 20)),
    axis.text.x = element_text(angle = 45, hjust = 1, size = 10),
    axis.text.y = element_text(size = 10),
    axis.title = element_text(face = "bold", size = 11, margin = margin(t = 10)),
    legend.position = "top",
    legend.title = element_text(face = "bold"),
    panel.grid.minor = element_blank() 
  )

prop.table(table(st_data$aid_type_general))
data_aid <- as.data.frame(prop.table(table(st_data$aid_type_general)))
colnames(data_aid) <- c("aid_type", "proportion")

colori_categorie <- c(
  "Military"     = "#5C7148", 
  "Financial"    = "#F39C12",  
  "Humanitarian" = "#4A90E2" 
)
ggplot(data_aid, aes(x = reorder(aid_type, -proportion), y = proportion, fill = aid_type)) +
  geom_col(color = "black", linewidth = 0.5, width = 0.7) +
  geom_text(
    aes(label = percent(proportion, accuracy = 0.1)), 
    vjust = -0.5, 
    fontface = "bold", 
    size = 5
  ) +
  scale_y_continuous(labels = label_percent(), expand = expansion(mult = c(0, 0.15))) +
  scale_fill_manual(values = colori_categorie) +
  theme_minimal() +
  labs(
    title = "Proportion of Pledged Aid by Category",
    y = "Percentage (%)"
  ) +
  theme(
    plot.title = element_text(hjust = 0.5, face = "bold", size = 16, margin = margin(b = 15)),
    axis.title.x = element_blank(), 
    axis.text.x = element_text(size = 12, face = "bold"),
    axis.title.y = element_text(face = "bold", margin = margin(r = 10)),
    axis.text.y = element_text(size = 10),
    legend.position = "none", 
    panel.grid.major.x = element_blank() 
  )
