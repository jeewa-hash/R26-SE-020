import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta

# 1. මූලික සැකසුම් (Configurations)
START_DATE = "2023-01-01"
END_DATE = "2025-12-31"
LAT, LON = 6.9271, 79.8612  # Colombo Coordinates
API_KEY_CALENDARIFIC = 'miym2tkkEJmfOBLwiuzTlabtwhIhEPrn' 

# --- STEP 1: කාලගුණ දත්ත ලබා ගැනීම (Open-Meteo API) ---
print("Fetching real weather data from Open-Meteo...")
weather_url = (
    f"https://archive-api.open-meteo.com/v1/archive?"
    f"latitude={LAT}&longitude={LON}&start_date={START_DATE}&end_date={END_DATE}"
    f"&daily=precipitation_sum&timezone=auto"
)

try:
    response = requests.get(weather_url)
    if response.status_code == 200:
        w_data = response.json()
        weather_df = pd.DataFrame({
            'Date': pd.to_datetime(w_data['daily']['time']),
            'Rainfall_Level': ["High" if p > 5 else "Low" for p in w_data['daily']['precipitation_sum']]
        })
        weather_df.set_index('Date', inplace=True)
        print("Successfully fetched weather data via Open-Meteo!")
    else:
        print(f"Weather API Error: Status {response.status_code}")
        weather_df = pd.DataFrame()
except Exception as e:
    print(f"Weather Fetch Error: {e}")
    weather_df = pd.DataFrame()

# Fallback in case Open-Meteo fails
if weather_df.empty:
    print("Warning: Weather API failed. Using simulated weather logic...")
    weather_df = pd.DataFrame(index=pd.date_range(START_DATE, END_DATE))
    weather_df['Rainfall_Level'] = np.where(np.random.rand(len(weather_df)) > 0.7, "High", "Low")

# --- STEP 2: නිවාඩු දින දත්ත ලබා ගැනීම (Calendarific API) ---
print("Fetching holiday data from Calendarific...")
holidays_list = []
for year in [2023, 2024, 2025]:
    try:
        url = f"https://calendarific.com/api/v2/holidays?&api_key={API_KEY_CALENDARIFIC}&country=LK&year={year}"
        res = requests.get(url)
        if res.status_code == 200:
            data = res.json()
            if 'response' in data and 'holidays' in data['response']:
                for h in data['response']['holidays']:
                    # ISO string එකෙන් YYYY-MM-DD කොටස පමණක් ලබා ගැනීම
                    iso_date_only = h['date']['iso'][:10]
                    holidays_list.append(datetime.strptime(iso_date_only, "%Y-%m-%d").date())
                print(f"Fetched holidays for {year}!")
    except Exception as e:
        print(f"Holiday Error for {year}: {e}")

# --- STEP 3: දත්ත ජනනය සහ තර්කනය (Logic Integration) ---
categories = {
    "Electrical repairs": 8, "Plumbing": 8, "Furniture repair": 7,
    "Roofing": 18, "Painting": 18, "House cleaning": 10,
    "Post-construction cleaning": 6, "Move-in / move-out cleaning": 6,
    "Sofa, carpet & curtain cleaning": 7, "Grass cutting": 18,
    "Watering": 5, "Landscaping": 6, "Planting": 6,
    "Child care": 8, "Pet care": 7, "Personal assistance": 7
}

data_rows = []
sunny_days_counter = 0
date_range = pd.date_range(START_DATE, END_DATE)

print("Applying Behavioral Logic with Research Insights...")

for current_date in date_range:
    curr_d = current_date.date()
    date_str = current_date.strftime('%Y-%m-%d')
    is_weekend = current_date.weekday() >= 5
    rainfall = weather_df.loc[current_date, 'Rainfall_Level'] if current_date in weather_df.index else "Low"
    
    # Grass Cutting Logic (අඛණ්ඩව අව්ව පෑයූ දින)
    if rainfall == "Low":
        sunny_days_counter += 1
    else:
        sunny_days_counter = 0

    # Logic 1: Pre-Holiday Spike (උත්සවවලට සති 1-3 කලින් එන ඉල්ලුම)
    is_pre_holiday_surge = False
    for h_date in holidays_list:
        if h_date.month in [4, 12, 1]:
            days_diff = (h_date - curr_d).days
            if 7 <= days_diff <= 21: 
                is_pre_holiday_surge = True

    # Logic 2: Long Weekend Detector (දින 3ක් හෝ ඊට වැඩි දිගු නිවාඩු)
    is_long_weekend = False
    check_dates = [curr_d, curr_d + timedelta(days=1), curr_d + timedelta(days=2)]
    non_working_days = 0
    for d in check_dates:
        if d.weekday() >= 5 or d in holidays_list:
            non_working_days += 1
    if non_working_days >= 3:
        is_long_weekend = True

    for cat_name, provider_count in categories.items():
        for p_id in range(1, provider_count + 1):
            demand = np.random.randint(0, 3) # Baseline demand

            # A. Maintenance & Construction (Weekend Boost + Weather)
            maint_repair = ["Electrical repairs", "Plumbing", "Furniture repair", "Roofing", "Grass cutting", "Landscaping", "Watering"]
            if cat_name in maint_repair:
                if is_weekend: demand += np.random.randint(3, 7)
                if rainfall == "High" and cat_name in ["Roofing", "Plumbing"]: demand += np.random.randint(5, 10)
                if cat_name == "Grass cutting":
                    if rainfall == "High": demand = 0
                    elif sunny_days_counter >= 5: demand += np.random.randint(8, 15)

            # B. Seasonal Lead-Time (Painting/Cleaning)
            if is_pre_holiday_surge and cat_name in ["Painting", "House cleaning", "Sofa, carpet & curtain cleaning"]:
                demand += np.random.randint(8, 15)

            # C. Work-Life Care (Weekday Boost)
            if cat_name in ["Child care", "Personal assistance"]:
                if not is_weekend and curr_d not in holidays_list: demand += np.random.randint(6, 11)
                else: demand = np.random.randint(0, 2)

            # D. Travel Surge (Long Weekend Pet Care)
            if cat_name == "Pet care":
                if is_long_weekend: demand += np.random.randint(10, 18)
                elif not is_weekend: demand += np.random.randint(4, 7)

            data_rows.append({
                "Date": date_str,
                "Category": cat_name,
                "Provider_ID": f"PRO-{cat_name[:3].upper()}-{p_id:02d}",
                "Demand_Count": max(0, demand),
                "Rainfall": rainfall,
                "Is_Holiday": 1 if curr_d in holidays_list else 0,
                "Is_Long_Weekend": 1 if is_long_weekend else 0,
                "Sunny_Days_Consecutive": sunny_days_counter
            })

# 4. CSV ගොනුව සුරැකීම
df = pd.DataFrame(data_rows)
df.to_csv("SL_MicroEntrepreneur_Final_API_Data.csv", index=False)
print(f"\nSuccess! Final Dataset with {len(df)} rows saved to SL_MicroEntrepreneur_Final_API_Data.csv")