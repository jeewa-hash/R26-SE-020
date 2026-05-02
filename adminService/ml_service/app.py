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

if __name__ == '__main__':
    print("----------------------------------------------")
    print("🚀 R26-SE-020 Demand Forecasting Microservice")
    print("🚀 Status: Running on http://localhost:5000")
    print("🚀 Server: Waitress Production WSGI")
    print("----------------------------------------------")
    
    serve(app, host='0.0.0.0', port=5000)