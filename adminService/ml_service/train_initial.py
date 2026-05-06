import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
import joblib
import os

# Create models directory if it doesn't exist
if not os.path.exists('models'): 
    os.makedirs('models')

print("Loading dataset for training...")
# Load the generated CSV with complex seasonal behaviors
df = pd.read_csv('data/SL_MicroEntrepreneur_Final_API_Data.csv')

# Extract temporal features from Date column
df['Date'] = pd.to_datetime(df['Date'])
df['Month'] = df['Date'].dt.month
df['Day'] = df['Date'].dt.day
df['DayOfWeek'] = df['Date'].dt.dayofweek

# Encode categorical service names and district labels into numerical values
le_cat = LabelEncoder()
df['Category_Encoded'] = le_cat.fit_transform(df['Category'])

if 'District' not in df.columns:
    raise ValueError('District column is required in the CSV for initial training.')

le_dist = LabelEncoder()
df['District_Encoded'] = le_dist.fit_transform(df['District'])

# Define the 12 real-world features for R26-SE-020 research
features = [
    'Category_Encoded', 'Month', 'Day', 'DayOfWeek', 
    'Is_Holiday', 'Is_Long_Weekend', 'Is_Rainy', 'Is_Sunny', 
    'Sunny_Days_Consecutive', 'Rainy_Days_Consecutive', 'Special_Event',
    'District_Encoded'
]

X = df[features]
y = df['Demand_Count']

# Split data for evaluation
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train the Random Forest Regressor
print(f"Training model with {len(features)} features...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)
print(f"Model Accuracy (R2 Score): {round(r2_score(y_test, y_pred) * 100, 2)}%")
print(f"Mean Absolute Error: {round(mean_absolute_error(y_test, y_pred), 2)}")

# Save the trained model and label encoders
joblib.dump(model, 'models/demand_model.pkl')
joblib.dump({'Category': le_cat, 'District': le_dist}, 'models/encoders.pkl')

print("--- Success: Enhanced model saved in 'models/' folder! ---")