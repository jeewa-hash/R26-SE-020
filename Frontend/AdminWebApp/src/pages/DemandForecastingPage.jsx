import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, ADMIN_SERVICE_URL } from '../config';
import { FiRefreshCw, FiTrendingUp, FiCalendar, FiMapPin, FiLayers, FiAlertCircle, FiX } from 'react-icons/fi';
import './DemandForecastingPage.css';

const DemandForecastingPage = () => {
  // Selections
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedTimeframe, setSelectedTimeframe] = useState('Tomorrow');

  // Results
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState(null);
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([
    "Electrical repairs", "Plumbing", "Furniture repair",
    "Roofing", "Painting", "House cleaning",
    "Post-construction cleaning", "Move-in / move-out cleaning",
    "Sofa, carpet & curtain cleaning", "Grass cutting",
    "Watering", "Landscaping", "Planting",
    "Child care", "Pet care", "Personal assistance"
  ]);

  const generateDates = (timeframe) => {
    const dates = [];
    const today = new Date();

    if (timeframe === 'Tomorrow') {
      const d = new Date();
      d.setDate(today.getDate() + 1);
      dates.push(d.toISOString().slice(0, 10));
    } else if (timeframe === 'Next 2 Weeks') {
      for (let i = 1; i <= 14; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
    } else if (timeframe === 'Next Month') {
      for (let i = 1; i <= 30; i++) {
        const d = new Date();
        d.setDate(today.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
    }
    return dates;
  };

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setPredictions([]);

    try {
      // Determine array of districts
      const districts = selectedDistrict === 'All Districts'
        ? ['Colombo', 'Gampaha']
        : [selectedDistrict];

      // Determine array of categories
      let cats = [];
      if (selectedCategory === 'All Categories') {
        cats = [...categories];
      } else {
        cats = [selectedCategory];
      }

      // Safeguard if categories are empty
      if (cats.length === 0 && selectedCategory === 'All Categories') {
        setError("No categories loaded to predict. Please try again.");
        setLoading(false);
        return;
      }

      const dates = generateDates(selectedTimeframe);

      // Using API_BASE_URL mapped to apiGateway/admin which forwards to adminService
      // Wait, get-prediction is in adminService -> /api/get-prediction or /admin/get-prediction?
      // Previously user said: post http://localhost:4000/api/get-prediction
      // Let's use ADMIN_SERVICE_URL which maps to http://localhost:4000/api
      const response = await axios.post(`${ADMIN_SERVICE_URL}/get-prediction-batch`, {
        districts,
        categories: cats,
        dates
      });

      const rawPredictions = response.data.predictions || [];

      // Aggregate by Category and District
      const aggregated = {};

      rawPredictions.forEach(p => {
        if (!p) return;

        const key = `${p.District}_${p.Category}`;
        if (!aggregated[key]) {
          aggregated[key] = {
            District: p.District,
            Category: p.Category,
            Total_Demand: 0,
            Confidences: [],
            days: 0,
            dailyData: []
          };
        }
        aggregated[key].Total_Demand += p.Predicted_Demand || 0;

        // Parse "85.2%" -> 85.2
        const confValue = parseFloat((p.Confidence || "0").replace('%', ''));
        if (!isNaN(confValue)) {
          aggregated[key].Confidences.push(confValue);
        }
        aggregated[key].days += 1;

        // Store daily data for the table
        aggregated[key].dailyData.push({
          Date: p.Date,
          Demand: p.Predicted_Demand || 0,
          Confidence: p.Confidence || "0%"
        });
      });

      // Calculate averages and sort dailyData by date
      const finalResults = Object.values(aggregated).map(item => {
        const avgConf = item.Confidences.length > 0
          ? (item.Confidences.reduce((a, b) => a + b, 0) / item.Confidences.length).toFixed(1)
          : 0;

        const avgDemand = item.days > 0 ? Math.round(item.Total_Demand / item.days) : 0;

        // Sort by date ascending
        item.dailyData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

        return {
          ...item,
          Average_Demand: avgDemand,
          Average_Confidence: avgConf + '%'
        };
      });

      setPredictions(finalResults);

      // Auto-trigger High Demand Alerts
      const token = localStorage.getItem('adminToken');
      if (token) {
        for (const res of finalResults) {
          const confValue = parseFloat(res.Average_Confidence.replace('%', ''));
          if (res.Average_Demand >= 8 && confValue >= 90) {
            try {
              await axios.post(`${API_BASE_URL}/notify-high-demand`, {
                category: res.Category,
                district: res.District,
                timeframe: selectedTimeframe,
                avgDemand: res.Average_Demand,
                confidence: confValue
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (alertErr) {
              console.warn(`Failed to dispatch alert for ${res.Category}:`, alertErr.response?.data?.message || alertErr.message);
            }
          }
        }
      }

      // Audit Log for Prediction
      try {
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const adminId = adminUser.id || adminUser._id;
        if (adminId) {
          await axios.post(`${API_BASE_URL}/audit-logs/internal`, {
            action: 'Generated Demand Forecast',
            category: 'Demand Forecasting',
            adminId: adminId,
            target: { name: `Forecast for ${selectedDistrict} - ${selectedCategory}`, type: 'FORECAST' },
            metadata: {
              district: selectedDistrict,
              category: selectedCategory,
              timeframe: selectedTimeframe
            }
          });
        }
      } catch (logErr) {
        console.warn('Failed to log prediction action:', logErr.message);
      }

    } catch (err) {
      console.error(err);
      setError("Prediction failed. " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    let successStatus = false;
    try {
      const response = await axios.post(`${ADMIN_SERVICE_URL}/retrain`);
      setRetrainResult({
        success: true,
        message: response.data.message || "Model retrained successfully!",
        details: response.data.details
      });
      successStatus = true;
    } catch (err) {
      setRetrainResult({
        success: false,
        message: err.response?.data?.error || "Failed to retrain model",
        details: err.response?.data?.details || err.message
      });
    } finally {
      setRetraining(false);
      
      // Audit Log for Retraining
      try {
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const adminId = adminUser.id || adminUser._id;
        if (adminId) {
          await axios.post(`${API_BASE_URL}/audit-logs/internal`, {
            action: successStatus ? 'Model Retrained Successfully' : 'Model Retraining Failed',
            category: 'Demand Forecasting',
            adminId: adminId,
            target: { name: 'Demand Forecasting ML Model', type: 'RETRAIN' },
            metadata: {
              status: successStatus ? 'Success' : 'Failed'
            }
          });
        }
      } catch (logErr) {
        console.warn('Failed to log retrain action:', logErr.message);
      }
    }
  };

  return (
    <div className="demand-page animate-fade-in">
      <div className="demand-header">
        <div className="header-left">
          <h1>Demand Forecasting</h1>
          <p>Predict future service demand based on historical data and weather patterns.</p>
        </div>
        <div className="header-right">
          <button
            className={`retrain-btn ${retraining ? 'loading' : ''}`}
            onClick={handleRetrain}
            disabled={retraining}
          >
            {retraining ? (
              <> <FiRefreshCw className="spin" /> Retraining... </>
            ) : (
              <> <FiRefreshCw /> Retrain Model </>
            )}
          </button>
        </div>
      </div>

      {retrainResult && (
        <div className={`retrain-result-card ${retrainResult.success ? 'success' : 'error'}`}>
          <div className="retrain-result-header">
            <h4>{retrainResult.success ? 'Retraining Complete' : 'Retraining Failed'}</h4>
            <button className="close-log-btn" onClick={() => setRetrainResult(null)}>
              <FiX />
            </button>
          </div>
          <p>{retrainResult.message}</p>
          {retrainResult.details && <pre className="retrain-details">{retrainResult.details}</pre>}
        </div>
      )}

      <div className="demand-controls-card">
        <div className="control-group">
          <label><FiMapPin /> District</label>
          <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
            <option value="All Districts">All Districts</option>
            <option value="Colombo">Colombo</option>
            <option value="Gampaha">Gampaha</option>
          </select>
        </div>

        <div className="control-group">
          <label><FiLayers /> Category</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="All Categories">All Categories</option>
            {categories.map((catName, idx) => (
              <option key={idx} value={catName}>{catName}</option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label><FiCalendar /> Time Frame</label>
          <select value={selectedTimeframe} onChange={(e) => setSelectedTimeframe(e.target.value)}>
            <option value="Tomorrow">Tomorrow</option>
            <option value="Next 2 Weeks">Next 2 Weeks</option>
            <option value="Next Month">Next Month</option>
          </select>
        </div>

        <div className="control-button-group">
          <button className="predict-btn" onClick={handlePredict} disabled={loading}>
            {loading ? 'Predicting...' : 'Predict Demand'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <FiAlertCircle /> {error}
        </div>
      )}

      {loading && (
        <div className="loading-spinner-container">
          <FiRefreshCw className="spin large-spin" />
          <p>Predicting Demand... This may take a few seconds.</p>
        </div>
      )}

      <div className="predictions-grid">
        {!loading && predictions.map((pred, index) => (
          <div key={index} className="prediction-card">
            <div className="pred-card-header">
              <span className="pred-category">{pred.Category}</span>
              <span className="pred-district"><FiMapPin size={12} /> {pred.District}</span>
            </div>

            <div className="pred-card-body table-body">
              <table className="daily-pred-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Demand</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {pred.dailyData.map((d, i) => (
                    <tr key={i}>
                      <td>{d.Date}</td>
                      <td><strong>{d.Demand}</strong></td>
                      <td className="conf-col">{d.Confidence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pred-card-footer">
              <div className="avg-demand-row">
                <span className="avg-label">Average Predicted Demand</span>
                <span className="avg-value">{pred.Average_Demand} <span className="avg-unit">/ day</span></span>
              </div>
              <div className="conf-bar-wrapper">
                <div className="conf-bar">
                  <div className="conf-fill" style={{ width: pred.Average_Confidence }}></div>
                </div>
                <span className="conf-text">Avg Confidence: {pred.Average_Confidence}</span>
              </div>
            </div>
          </div>
        ))}

        {!loading && predictions.length === 0 && !error && (
          <div className="empty-predictions">
            Select your filters and click Predict Demand to see results.
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandForecastingPage;
