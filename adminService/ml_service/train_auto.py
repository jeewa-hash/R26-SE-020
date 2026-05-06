import pandas as pd
from pymongo import MongoClient
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib
import os
import sys

# CSV සහ Model paths
CSV_PATH = 'data/SL_MicroEntrepreneur_Final_API_Data.csv' 
MODEL_PATH = 'models/demand_model.pkl'
ENCODER_PATH = 'models/encoders.pkl'

def fetch_new_records():
    try:
        print("Connecting to MongoDB Atlas...")
        uri = "mongodb+srv://nethmiumayapc:abc@financemanagement.riuyx.mongodb.net/?appName=FinanceManagement"
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)

        client.admin.command('ping')
        print("[OK] MongoDB Atlas Connection Successful!")

        db = client["test"]
        collection = db["service_data_for_csvs"]

        query = {
            '$or': [
                {'isRetrained': False},
                {'isRetrained': {'$exists': False}}
            ]
        }

        docs = list(collection.find(query))
        if not docs:
            print("[INFO] No new unsynced records found in MongoDB Atlas.")
            return pd.DataFrame(), [], collection

        ids = [doc['_id'] for doc in docs if '_id' in doc]
        new_df = pd.DataFrame(docs).drop(columns=['_id'], errors='ignore')

        print(f"[INFO] Fetched {len(new_df)} new records from MongoDB Atlas.")
        return new_df, ids, collection

    except Exception as e:
        print(f"[ERROR] MongoDB Atlas Error (Continuing with synthetic data only): {e}")
        return pd.DataFrame(), [], None

print("--- R26-SE-020 Auto-Retraining Process Started ---")

# 1. දත්ත පරීක්ෂා කිරීම
if not os.path.exists(CSV_PATH):
    print(f"[ERROR] Error: {CSV_PATH} not found at {os.path.abspath(CSV_PATH)}")
    sys.exit(1)

synthetic_df = pd.read_csv(CSV_PATH)
new_records_df, new_record_ids, collection = fetch_new_records()

# 2. දත්ත එකතු කිරීම සහ CSV එකට append කිරීම
if not new_records_df.empty:
    csv_columns = list(synthetic_df.columns)
    new_records_df = new_records_df.reindex(columns=csv_columns)
    new_records_df.to_csv(CSV_PATH, mode='a', header=False, index=False)

    combined_df = pd.concat([synthetic_df, new_records_df], ignore_index=True)
    print(f"[OK] Appended {len(new_records_df)} new records to CSV and merged for training.")
else:
    combined_df = synthetic_df
    print("[INFO] No new records to append; training on existing CSV only.")

# 3. Feature Engineering - Extract date features
combined_df['Date'] = pd.to_datetime(combined_df['Date'])
combined_df['Month'] = combined_df['Date'].dt.month
combined_df['Day'] = combined_df['Date'].dt.day
combined_df['DayOfWeek'] = combined_df['Date'].dt.dayofweek

# 4. Processing & Training
try:
    le_cat = LabelEncoder()
    combined_df['Category_Encoded'] = le_cat.fit_transform(combined_df['Category'])

    if 'District' not in combined_df.columns:
        raise ValueError('District column is required in the CSV for training.')

    le_dist = LabelEncoder()
    combined_df['District_Encoded'] = le_dist.fit_transform(combined_df['District'])

    # ML Model එකට අවශ්‍ය Features 12
    features = [
        'Category_Encoded', 'Month', 'Day', 'DayOfWeek', 'Is_Holiday', 
        'Is_Long_Weekend', 'Is_Rainy', 'Is_Sunny', 'Sunny_Days_Consecutive', 
        'Rainy_Days_Consecutive', 'Special_Event', 'District_Encoded'
    ]

    # දත්ත පිරිසිදු කිරීම (Null අගයන් ඉවත් කිරීම)
    combined_df = combined_df.dropna(subset=features + ['Demand_Count'])

    X = combined_df[features]
    y = combined_df['Demand_Count']

    print(f"[TRAINING] Training Random Forest Regressor on {len(combined_df)} total records...")
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)

    # 5. Model එක Save කිරීම
    if not os.path.exists('models'): 
        os.makedirs('models')
        
    joblib.dump(model, MODEL_PATH)
    joblib.dump({'Category': le_cat, 'District': le_dist}, ENCODER_PATH)

    print("--- [SUCCESS] Model Successfully Retrained and Saved! ---")

    if collection is not None and new_record_ids:
        update_result = collection.update_many(
            {'_id': {'$in': new_record_ids}},
            {'$set': {'isRetrained': True}}
        )
        print(f"[OK] Marked {update_result.modified_count} MongoDB records as retrained.")
    
except Exception as e:
    print(f"[ERROR] Training Error: {e}")
    sys.exit(1)