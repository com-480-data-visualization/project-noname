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
