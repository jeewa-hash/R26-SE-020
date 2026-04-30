import pandas as pd
import numpy as np
from datetime import datetime, timedelta

# 1. මූලික සැකසුම් (Basic Configurations)
start_date = datetime(2023, 1, 1)
end_date = datetime(2025, 12, 31)
date_range = pd.date_range(start_date, end_date)

# සේවා කාණ්ඩ 16 සහ සපයන්නන් ප්‍රමාණය
categories = {
    "Electrical repairs": 8, "Plumbing": 8, "Furniture repair": 7,
    "Roofing": 18, "Painting": 18, "House cleaning": 10,
    "Post-construction cleaning": 6, "Move-in / move-out cleaning": 6,
    "Sofa, carpet & curtain cleaning": 7, "Grass cutting": 18,
    "Watering": 5, "Landscaping": 6, "Planting": 6,
    "Child care": 8, "Pet care": 7, "Personal assistance": 7
}

cities = ["Colombo", "Gampaha", "Kandy", "Galle", "Kurunegala"]
data_rows = []
sunny_days_counter = 0

print("Generating specialized research data (R26-SE-020)... Please wait.")

# 2. දත්ත ජනනය කිරීමේ ප්‍රධාන ලූපය
for current_date in date_range:
    month = current_date.month
    is_weekend = current_date.weekday() >= 5
    
    # කාලගුණික තත්ත්වය තීරණය කිරීම
    rainy_months = [5, 6, 10, 11]
    if month in rainy_months:
        rainfall_level = "High" if np.random.random() > 0.4 else "Low"
    else:
        rainfall_level = "High" if np.random.random() > 0.8 else "Low"
        
    if rainfall_level == "Low":
        sunny_days_counter += 1
    else:
        sunny_days_counter = 0

    is_holiday = 1 if (month == 4 and 12 <= current_date.day <= 15) or \
                      (month == 12 and current_date.day == 25) else 0
    event = "Avurudu" if month == 4 else ("Christmas" if month == 12 else "None")

    for cat_name, provider_count in categories.items():
        for p_id in range(1, provider_count + 1):
            # Base random noise
            demand = np.random.randint(0, 3)
            
            # --- 1. උත්සව කාලසීමාවන් (Seasonal Spikes) ---
            if month == 4 or month == 12:
                if cat_name in ["Painting", "House cleaning", "Furniture repair", "Sofa, carpet & curtain cleaning"]:
                    demand += np.random.randint(5, 10)
            
            # --- 2. සාමාන්‍ය කාලගුණික බලපෑම (Roofing/Plumbing) ---
            if rainfall_level == "High" and cat_name in ["Roofing", "Plumbing"]:
                demand += np.random.randint(4, 8)

            # --- 3. Grass Cutting විශේෂිත තර්කනය (Updated) ---
            if cat_name == "Grass cutting":
                if rainfall_level == "High":
                    demand = np.random.randint(0, 2) # වහිනකොට ඉල්ලුම ඉතා අඩුයි
                else:
                    # සාමාන්‍ය පායන දවසක ඉල්ලුම (Baseline demand on a sunny day)
                    demand = np.random.randint(2, 5) 
                    
                    # වැස්සට පස්සේ දවස් 5ක් දිගටම පෑයුවොත් ඉල්ලුම වැඩිවීම (Post-rain Surge)
                    if sunny_days_counter >= 5:
                        demand += np.random.randint(6, 12)
            
            # --- 4. සති/සති අන්ත විශේෂිත තර්කනය (Care vs. Other Services) ---
            care_services = ["Child care", "Pet care", "Personal assistance"]
            
            if cat_name in care_services:
                if not is_weekend:
                    demand += np.random.randint(5, 9) # සතියේ දිනවල ඉල්ලුම වැඩියි
                else:
                    demand += np.random.randint(0, 2)
            else:
                # Grass cutting හැර අනෙකුත් සේවාවලට සති අන්තයේ අමතර ඉල්ලුමක්
                if is_weekend and cat_name != "Grass cutting":
                    demand += np.random.randint(2, 5)

            data_rows.append({
                "Date": current_date.strftime('%Y-%m-%d'),
                "Category": cat_name,
                "Provider_ID": f"PRO-{cat_name[:3].upper()}-{p_id:02d}",
                "City": np.random.choice(cities),
                "Demand_Count": max(0, demand),
                "Is_Holiday": is_holiday,
                "Event_Type": event,
                "Rainfall_Level": rainfall_level,
                "Sunny_Days_Consecutive": sunny_days_counter
            })

# 3. CSV ගොනුවක් ලෙස සුරැකීම
df = pd.DataFrame(data_rows)
df.to_csv("SL_MicroEntrepreneur_Demand_Data_v3.csv", index=False)
print(f"Success! Saved {len(df)} rows to SL_MicroEntrepreneur_Demand_Data_v3.csv")