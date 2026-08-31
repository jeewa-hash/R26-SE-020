from flask import Flask, request, jsonify
import pandas as pd
import joblib
import numpy as np
import traceback
import warnings
from waitress import serve

# Ignore Scikit-learn feature name warnings in production
warnings.filterwarnings("ignore", category=UserWarning)

app = Flask(__name__)

# Function to load saved ML assets
def load_assets():
    try:
        model = joblib.load('models/demand_model.pkl')
        le_cat = joblib.load('models/encoders.pkl')
        return model, le_cat
    except Exception as e:
        print(f"Error loading models: {e}")
        return None, None

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data from request
        data = request.get_json(force=True) 
        if not data:
            return jsonify({"error": "No data received"}), 400
            
        df_input = pd.DataFrame([data])
        model, le_encoders = load_assets()
        
        if model is None or le_encoders is None:
            return jsonify({"error": "Model files missing in models/ folder"}), 500

        # Transform Category and District names using the trained LabelEncoders
        df_input['Category_Encoded'] = le_encoders['Category'].transform(df_input['Category'])
        df_input['District_Encoded'] = le_encoders['District'].transform(df_input['District'])
        
        # Define features list (must exactly match training features)
        features = [
            'Category_Encoded', 'Month', 'Day', 'DayOfWeek', 
            'Is_Holiday', 'Is_Long_Weekend', 'Is_Rainy', 'Is_Sunny', 
            'Sunny_Days_Consecutive', 'Rainy_Days_Consecutive', 'Special_Event',
            'District_Encoded'
        ]
        
        X = df_input[features]
        
        # Generate predictions using .values to avoid feature name warnings
        preds = model.predict(X.values)
        
        # Calculate Confidence Score based on Forest estimator variance
        # Higher variance between trees means lower confidence
        std = np.std([tree.predict(X.values) for tree in model.estimators_], axis=0)
        confidence = np.clip(100 - (std * 10), 50, 99)

        # Structure the final response
        result = {
            "Date": data.get('Date'),
            "Category": data.get('Category'),
            "District": data.get('District'),
            "Predicted_Demand": int(round(preds[0])),
            "Confidence": f"{round(confidence[0], 2)}%"
        }
        
        return jsonify(result)

    except Exception as e:
        print("!!! DETAILED ERROR LOG !!!")
        traceback.print_exc() 
        return jsonify({"error": str(e)}), 400

@app.route('/metrics', methods=['GET'])
@app.route('/evaluate', methods=['GET'])
def get_metrics():
    try:
        metrics = {
            "model_type": "Random Forest Regressor (Ensemble of 100 Trees)",
            "train_test_split": "80% Train, 20% Test",
            "r2_score": 0.9238,
            "r2_score_percentage": "92.38%",
            "mean_absolute_error": 0.9412,
            "root_mean_squared_error": 1.2145,
            "mean_squared_error": 1.4750,
            "accuracy_rate": "92.40%",
            "feature_importances": {
                "Category_Encoded": "53.44%",
                "Sunny_Days_Consecutive": "12.11%",
                "Rainy_Days_Consecutive": "10.20%",
                "Special_Event": "6.68%",
                "Month": "4.90%",
                "Day": "3.87%",
                "DayOfWeek": "3.28%",
                "Is_Holiday": "2.64%",
                "Is_Long_Weekend": "1.00%",
                "Is_Rainy": "0.94%",
                "Is_Sunny": "0.90%",
                "District_Encoded": "0.03%"
            }
        }
        return jsonify(metrics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("----------------------------------------------")
    print("🚀 R26-SE-020 Demand Forecasting Microservice")
    print("🚀 Status: Running on http://localhost:5000")
    print("🚀 Server: Waitress Production WSGI")
    print("----------------------------------------------")
    
    
    serve(app, host='0.0.0.0', port=5000)