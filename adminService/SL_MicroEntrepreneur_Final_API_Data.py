import pandas as pd
import numpy as np
import requests
from datetime import datetime, timedelta

# 1. Configurations
START_DATE = "2023-01-01"
END_DATE = "2025-12-31"
LAT, LON = 6.9271, 79.8612  # Colombo Coordinates
API_KEY_CALENDARIFIC = 'miym2tkkEJmfOBLwiuzTlabtwhIhEPrn'
DISTRICTS = ['Colombo', 'Gampaha']
np.random.seed(42)

# --- STEP 1: Fetch Weather Data (Open-Meteo API) ---
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
            'Rainfall_Value': w_data['daily']['precipitation_sum']
        })
        weather_df.set_index('Date', inplace=True)
        print("Successfully fetched weather data!")
    else:
        weather_df = pd.DataFrame()
except Exception:
    weather_df = pd.DataFrame()

if weather_df.empty:
    weather_df = pd.DataFrame(index=pd.date_range(START_DATE, END_DATE))
    weather_df['Rainfall_Value'] = np.random.choice([0, 0, 10, 0, 15], len(weather_df))

# --- STEP 2: Fetch Holiday Data (Calendarific API) ---
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
                    iso_date_only = h['date']['iso'][:10]
                    holidays_list.append(datetime.strptime(iso_date_only, "%Y-%m-%d").date())
    except Exception:
        pass

# --- STEP 3: Logic Integration & Data Generation ---
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
rainy_days_counter = 0 
prev_was_rainy = False # To detect rain-to-sun transition
date_range = pd.date_range(START_DATE, END_DATE)

print("Applying Behavioral Logic with Dynamic Spikes & Ramping Factors...")

for current_date in date_range:
    curr_d = current_date.date()
    date_str = current_date.strftime('%Y-%m-%d')
    is_weekend = current_date.weekday() >= 5
    is_holiday = 1 if curr_d in holidays_list else 0
    
    # Weather Detection
    actual_rainfall = weather_df.loc[current_date, 'Rainfall_Value'] if current_date in weather_df.index else 0
    is_rainy = 1 if actual_rainfall > 5 else 0
    is_sunny = 1 if actual_rainfall <= 5 else 0
    
    # Consecutive Day Counters
    if is_rainy:
        rainy_days_counter += 1
        sunny_days_counter = 0
    else:
        sunny_days_counter += 1
        # Track transition from long rain to sunny
        rain_to_sun_transition = True if rainy_days_counter >= 2 else False
        rainy_days_counter = 0

    # Long Weekend Detector
    is_long_weekend = 0
    check_dates = [curr_d, curr_d + timedelta(days=1), curr_d + timedelta(days=2)]
    non_working_days = sum(1 for d in check_dates if d.weekday() >= 5 or d in holidays_list)
    if non_working_days >= 3: is_long_weekend = 1

    # Ramping Event Logic (3 weeks lead-up)
    days_until_event = 999
    event_month = 0
    for h_date in holidays_list:
        if h_date.month in [1, 4, 12]:
            diff = (h_date - curr_d).days
            if 0 <= diff <= 21:
                days_until_event = diff
                event_month = h_date.month
                break

    for cat_name, provider_count in categories.items():
        for p_id in range(1, provider_count + 1):
            demand = np.random.randint(0, 3) 

            # 1. Cleaning Services (Post-construction & Move-in/out)
            if cat_name in ["Post-construction cleaning", "Move-in / move-out cleaning"]:
                if is_holiday or is_long_weekend: demand += np.random.randint(8, 15)
                if is_sunny: demand += 5
                if sunny_days_counter >= 3: demand += 10

            # 2. Festival Prep Services (Sofa, Painting, House cleaning)
            cleaning_painting = ["Painting", "House cleaning", "Sofa, carpet & curtain cleaning"]
            if cat_name in cleaning_painting:
                # Ramp up logic
                if 15 <= days_until_event <= 21: demand += 10  # Week 3
                elif 8 <= days_until_event <= 14: demand += 20 # Week 2
                elif 1 <= days_until_event <= 7: demand += 35  # Week 1
                elif days_until_event == 0: demand = 1        # Event day drop
                
                # April 13, 14 drop
                if curr_d.month == 4 and curr_d.day in [13, 14]: demand = 0
                
                if is_holiday or is_long_weekend: demand += 15
                if is_sunny: demand += 5
                if sunny_days_counter >= 3: demand += 15

            # 3. Electrical repairs
            if cat_name == "Electrical repairs":
                if is_weekend: demand += 5
                if is_rainy: demand += 10 # Short circuits

            # 4. Plumbing
            if cat_name == "Plumbing":
                if is_rainy and is_weekend: demand += 15
                if rain_to_sun_transition: demand += 25 # Immediate fix after rain stops

            # 5. Furniture repair
            if cat_name == "Furniture repair":
                if is_weekend: demand += 5
                if event_month in [4, 12] and 1 <= days_until_event <= 21: demand += 20

            # 6. Roofing
            if cat_name == "Roofing":
                if is_rainy:
                    demand += 15 # Baseline rain demand
                    # Progressive increase: Demand goes up even more the longer it rains
                    if rainy_days_counter == 2:
                        demand += 15 # Day 2 spike
                    elif rainy_days_counter >= 3:
                        demand += 30 # Day 3+ heavy spike (urgent leaks)
                
                if is_sunny and rain_to_sun_transition:
                    demand += 20 # Repairing when sun comes out
                elif is_sunny:
                    demand = np.random.randint(0, 2) # Normal sunny day low demand

            # 7. Grass cutting
            if cat_name == "Grass cutting":
                if is_rainy: demand = 0
                elif sunny_days_counter >= 5: demand += 15
                # High demand for 10 days if sun follows rain (simulated via high counter check)
                if is_sunny and rain_to_sun_transition: demand += 25

            # 8. Watering
            if cat_name == "Watering":
                if is_rainy: demand = 2
                if rainy_days_counter >= 2: demand = 0
                if is_sunny: demand += 5
                if sunny_days_counter >= 5: demand += 20

            # 9. Landscaping & Planting
            if cat_name == "Landscaping" and (is_weekend or is_sunny): demand += 10
            if cat_name == "Planting" and is_sunny and rain_to_sun_transition: demand += 15

            # 10. Child care
            if cat_name == "Child care":
                if not is_weekend and not is_holiday: demand += 10
                if curr_d.month in [8, 12]: demand += 25

            # 11. Pet care
            if cat_name == "Pet care" and is_long_weekend: demand += 25

            # 12. Personal assistance
            if cat_name == "Personal assistance" and not is_weekend: demand += 8

            data_rows.append({
                "Date": date_str,
                "Category": cat_name,
                "District": np.random.choice(DISTRICTS),
                "Provider_ID": f"PRO-{cat_name[:3].upper()}-{p_id:02d}",
                "Demand_Count": max(0, demand),
                "Rainfall_Level": "High" if is_rainy else "Low",
                "Is_Rainy": is_rainy,
                "Is_Sunny": is_sunny,
                "Is_Holiday": is_holiday,
                "Is_Long_Weekend": is_long_weekend,
                "Special_Event": 1 if days_until_event <= 21 else 0,
                "Sunny_Days_Consecutive": sunny_days_counter,
                "Rainy_Days_Consecutive": rainy_days_counter
            })

# 4. Save CSV
df = pd.DataFrame(data_rows)
df.to_csv("SL_MicroEntrepreneur_Final_API_Data.csv", index=False)
print(f"Success! Enhanced Dataset with roofing logic updated.")