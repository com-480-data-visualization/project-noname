"""
preprocess.py — run once from com-480-project-noname/ to generate website/data/*.json
and download the GeoJSON boundary files.

Usage:
    python preprocess.py
"""

import json
import os
import sys
import csv
from datetime import datetime
from collections import defaultdict

import requests
import pandas as pd

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_DIR  = os.path.join(BASE_DIR, "docs", "data")
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. GeoJSON downloads
# ---------------------------------------------------------------------------

GEOJSON_SOURCES = {
    "world_countries.geojson": [
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson",
    ],
    "ukraine_oblasts.geojson": [
        # geoBoundaries — 27 ADM1 features, shapeName = "Kharkiv Oblast" etc.
        "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/UKR/ADM1/geoBoundaries-UKR-ADM1.geojson",
    ],
    "russia_oblasts.geojson": [
        # click_that_hood — 83 features, name_latin = "Voronezh Oblast" etc.
        "https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/russia.geojson",
    ],
}


def download_geojson():
    for filename, urls in GEOJSON_SOURCES.items():
        out_path = os.path.join(OUT_DIR, filename)
        if os.path.exists(out_path):
            print(f"  [skip] {filename} already exists")
            continue
        for url in urls:
            try:
                print(f"  Downloading {filename} ...")
                r = requests.get(url, timeout=60)
                r.raise_for_status()
                data = r.json()
                if data.get("type") != "FeatureCollection":
                    features = data.get("features", [])
                    data = {"type": "FeatureCollection", "features": features}
                with open(out_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False)
                print(f"  [ok] {filename} ({len(data['features'])} features)")
                break
            except Exception as e:
                print(f"  [warn] {url[:70]} failed: {e}")
        else:
            print(f"  [ERROR] Could not download {filename}")


# ---------------------------------------------------------------------------
# 2. ACLED -> acled_by_oblast.json
# ---------------------------------------------------------------------------

ACLED_FILE = os.path.join(DATA_DIR, "ACLED Data_2026-03-10 (1).csv")


def process_acled():
    print("  Processing ACLED data ...")
    result = defaultdict(lambda: defaultdict(lambda: {
        "total_events": 0,
        "fatalities": 0,
        "by_type": defaultdict(int),
        "monthly": defaultdict(int),
    }))

    with open(ACLED_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            country = row["country"].strip()
            oblast  = row["admin1"].strip()
            if not country or not oblast:
                continue
            if country not in ("Ukraine", "Russia"):
                continue
            if row["disorder_type"].strip() == "Strategic developments":
                continue

            bucket = result[country][oblast]
            bucket["total_events"] += 1
            try:
                bucket["fatalities"] += int(row["fatalities"] or 0)
            except ValueError:
                pass

            event_type = row["event_type"].strip()
            bucket["by_type"][event_type] += 1

            date_str = row["event_date"].strip()
            try:
                month = datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m")
            except ValueError:
                month = date_str[:7]
            bucket["monthly"][month] += 1

    out = {}
    for country, oblasts in result.items():
        out[country] = {}
        for oblast, data in oblasts.items():
            out[country][oblast] = {
                "total_events": data["total_events"],
                "fatalities": data["fatalities"],
                "by_type": dict(data["by_type"]),
                "monthly": dict(sorted(data["monthly"].items())),
            }

    out_path = os.path.join(OUT_DIR, "acled_by_oblast.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    total = sum(sum(o["total_events"] for o in cs.values()) for cs in out.values())
    print(f"  [ok] acled_by_oblast.json  ({total:,} events across {sum(len(v) for v in out.values())} oblasts)")


# ---------------------------------------------------------------------------
# 3. ACLED -> drone_by_month.json
# ---------------------------------------------------------------------------

def process_drone_strikes():
    print("  Processing drone strikes ...")
    monthly = defaultdict(int)

    with open(ACLED_FILE, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["sub_event_type"].strip() != "Air/drone strike":
                continue
            if row["country"].strip() not in ("Ukraine", "Russia"):
                continue
            date_str = row["event_date"].strip()
            try:
                month = datetime.strptime(date_str, "%Y-%m-%d").strftime("%Y-%m")
            except ValueError:
                month = date_str[:7]
            monthly[month] += 1

    out = dict(sorted(monthly.items()))
    out_path = os.path.join(OUT_DIR, "drone_by_month.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"  [ok] drone_by_month.json ({sum(out.values())} events across {len(out)} months)")


# ---------------------------------------------------------------------------
# 4. Ukraine Support Tracker -> aid_by_country.json
# ---------------------------------------------------------------------------

ASSISTANCE_FILE = os.path.join(DATA_DIR, "assistance_main_data.xlsx")

# Exchange rates to EUR (from EDA.R)
EXCHANGE_RATES = {
    "EUR": 1.0000, "USD": 0.9200, "CAD": 0.6800, "SEK": 0.0880,
    "DKK": 0.1340, "NOK": 0.0880, "GBP": 1.1600, "CZK": 0.0410,
    "CHF": 1.0300, "AUD": 0.6100, "ISK": 0.0067, "NZD": 0.5600,
    "JPY": 0.0064, "PLN": 0.2200, "BGN": 0.5100, "HUF": 0.0026,
    "HRK": 0.1327, "RON": 0.2000, "CNY": 0.1300, "KRW": 0.0007,
}

# EU donor normalisation (same as EDA.R)
EU_DONORS = {"European Investment Bank", "European Peace Facility", "EU (Commission and Council)"}


def normalise_donor(donor):
    if not isinstance(donor, str):
        return None
    donor = donor.strip()
    return "European Union" if donor in EU_DONORS else donor


def parse_month(val):
    """Return 'YYYY-MM' or None."""
    if pd.isna(val):
        return None
    if isinstance(val, (int, float)):
        try:
            ts = pd.Timestamp("1899-12-30") + pd.Timedelta(days=int(val))
            return ts.strftime("%Y-%m")
        except Exception:
            return None
    s = str(val).strip()
    for fmt in ("%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y",
                "%B %d, %Y", "%d %B %Y", "%d-%b-%Y", "%b-%Y", "%m/%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m")
        except ValueError:
            pass
    try:
        return pd.to_datetime(s, dayfirst=True, errors="coerce").strftime("%Y-%m")
    except Exception:
        return None


def process_assistance():
    print("  Processing Ukraine Support Tracker ...")
    df = pd.read_excel(ASSISTANCE_FILE, engine="openpyxl")

    # Use exact known column names from the dataset
    donor_col    = "donor"
    aid_type_col = "aid_type_general"
    value_col    = "source_reported_value"
    currency_col = "reporting_currency"
    date_col     = "announcement_date"

    df["_donor"]    = df[donor_col].apply(normalise_donor)
    df["_value"]    = pd.to_numeric(df[value_col], errors="coerce")
    df["_currency"] = df[currency_col].astype(str).str.strip().str.upper()
    df["_rate"]     = df["_currency"].map(EXCHANGE_RATES)
    df["_eur"]      = df["_value"] * df["_rate"]
    df["_aid_type"] = df[aid_type_col].astype(str).str.strip()
    df["_month"]    = df[date_col].apply(parse_month)

    df = df.dropna(subset=["_donor", "_eur"])
    df = df[df["_aid_type"].isin(["Military", "Financial", "Humanitarian"])]

    result = {}
    for donor, grp in df.groupby("_donor"):
        if not donor or donor == "nan":
            continue
        by_type = grp.groupby("_aid_type")["_eur"].sum().to_dict()
        monthly_rows = []
        month_grp = grp[grp["_month"].notna()].groupby("_month")
        for month, mg in month_grp:
            row = {"month": month, "total_eur": float(mg["_eur"].sum())}
            for at, ag in mg.groupby("_aid_type"):
                row[at] = float(ag["_eur"].sum())
            monthly_rows.append(row)
        monthly_rows.sort(key=lambda r: r["month"])

        result[donor] = {
            "total_eur":  float(grp["_eur"].sum()),
            "n_packages": int(len(grp)),
            "by_type":    {k: float(v) for k, v in by_type.items()},
            "monthly":    monthly_rows,
        }

    out_path = os.path.join(OUT_DIR, "aid_by_country.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    total_eur = sum(v["total_eur"] for v in result.values())
    print(f"  [ok] aid_by_country.json  ({len(result)} donors, EUR {total_eur/1e9:.1f}B total)")


# ---------------------------------------------------------------------------
# 4. Timeline events -> timeline_events.json
# ---------------------------------------------------------------------------

TIMELINE_EVENTS = [
    {"date": "2022-02-24", "title": "Full-scale invasion begins",
     "description": "Russia launches a full-scale invasion of Ukraine across multiple axes: north toward Kyiv, east from Donbas, and south from Crimea. The largest land war in Europe since WWII."},
    {"date": "2022-02-25", "title": "Battle of Kyiv starts",
     "description": "Russian armored columns advance on the Ukrainian capital. Fierce resistance around Hostomel airport and Kyiv suburbs stalls Russian progress."},
    {"date": "2022-03-28", "title": "Russia withdraws from Kyiv",
     "description": "After a failed attempt to capture the capital, Russian forces redeploy to focus on eastern and southern Ukraine."},
    {"date": "2022-04-02", "title": "Bucha massacre discovered",
     "description": "Ukrainian forces retaking Bucha find hundreds of civilians killed, triggering international outrage and calls for war crime investigations."},
    {"date": "2022-05-20", "title": "Azovstal surrender – Mariupol",
     "description": "The last Ukrainian defenders of the Azovstal steel plant in Mariupol surrender after weeks of siege, ending organized resistance in the city."},
    {"date": "2022-09-06", "title": "Kharkiv counteroffensive",
     "description": "Ukraine launches a rapid offensive in Kharkiv region, liberating over 6,000 km² in just days and forcing a major Russian retreat eastward."},
    {"date": "2022-09-21", "title": "Russia announces mobilization",
     "description": "Putin orders the first partial mobilization since World War II, calling up 300,000 reservists amid severe military setbacks."},
    {"date": "2022-09-30", "title": "Russia annexes 4 oblasts",
     "description": "Russia illegally annexes Donetsk, Luhansk, Zaporizhia, and Kherson oblasts following sham referenda, despite not fully controlling any of them."},
    {"date": "2022-11-11", "title": "Kherson liberated",
     "description": "Ukrainian forces enter Kherson city after Russian troops withdraw across the Dnipro River — the only regional capital Russia had captured."},
    {"date": "2023-06-04", "title": "Ukrainian summer counteroffensive",
     "description": "Ukraine begins its long-anticipated counteroffensive in the south and east, aiming to breach Russian defensive lines toward Melitopol and Berdiansk."},
    {"date": "2023-06-06", "title": "Kakhovka dam destroyed",
     "description": "The Nova Kakhovka dam on the Dnipro River is destroyed, flooding vast areas of southern Ukraine and causing a catastrophic humanitarian disaster."},
    {"date": "2024-02-17", "title": "Fall of Avdiivka",
     "description": "After months of intense fighting and heavy losses on both sides, Russia captures Avdiivka in Donetsk — a key Ukrainian stronghold since 2014."},
    {"date": "2024-08-06", "title": "Ukraine incursion into Kursk",
     "description": "Ukrainian forces launch a surprise cross-border incursion into Russia's Kursk Oblast, seizing territory and opening an entirely new front inside Russia."},
    {"date": "2025-01-20", "title": "Trump returns to power",
     "description": "Donald Trump is inaugurated as US President; his administration signals potential shifts in American military aid policy toward Ukraine."},
    {"date": "2025-03-11", "title": "US pauses military aid",
     "description": "The Trump administration temporarily suspends military assistance to Ukraine pending diplomatic negotiations, sending shockwaves through European capitals."},
]


def write_timeline():
    out_path = os.path.join(OUT_DIR, "timeline_events.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(TIMELINE_EVENTS, f, ensure_ascii=False, indent=2)
    print(f"  [ok] timeline_events.json  ({len(TIMELINE_EVENTS)} events)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("\n=== Step 1: Download GeoJSON ===")
    download_geojson()

    print("\n=== Step 2: Process ACLED data ===")
    process_acled()

    print("\n=== Step 3: Process drone strikes ===")
    process_drone_strikes()

    print("\n=== Step 4: Process aid data ===")
    process_assistance()

    print("\n=== Step 5: Write timeline events ===")
    write_timeline()

    print("\nDone! Files in docs/data/")
    print("Start the site:  cd docs && python -m http.server 8000")
