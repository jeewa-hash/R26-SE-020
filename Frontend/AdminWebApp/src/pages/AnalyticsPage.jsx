import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { FiFilter, FiMap, FiActivity, FiCalendar } from 'react-icons/fi';
import { DISTRICT_METADATA, generateMockData } from '../data/mockAnalyticsData';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('demand-supply');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [districtData, setDistrictData] = useState([]);
  const [totalOverview, setTotalOverview] = useState([]);
  const [conversionData, setConversionData] = useState([]);

  const handleFilter = useCallback(() => {
    const mockDistricts = generateMockData();
    setDistrictData(mockDistricts);

    const overview = [
      {
        name: 'Total Country',
        Demand: mockDistricts.reduce((sum, d) => sum + d.demand, 0),
        Supply: mockDistricts.reduce((sum, d) => sum + d.supply, 0),
      }
    ];
    setTotalOverview(overview);

    const conversions = [
      { date: '2024-01', rate: 65 },
      { date: '2024-02', rate: 70 },
      { date: '2024-03', rate: 68 },
      { date: '2024-04', rate: 75 },
      { date: '2024-05', rate: 82 },
      { date: '2024-06', rate: 78 },
    ];
    setConversionData(conversions);
  }, []);

  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  const createCloudIcon = (districtName, percentage, sizeFactor) => {
    const color = percentage < 75 ? '#ef4444' : '#3b82f6';
    const width = 60 * sizeFactor;
    const height = 45 * sizeFactor;
    
    const svg = `
      <svg width="${width}" height="${height + 10}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,110 L40,90 L60,90 Z" fill="${color}" opacity="0.9" />
        <rect x="0" y="0" width="100" height="90" rx="20" fill="${color}" opacity="0.8" />
        <text x="50" y="50" font-family="Inter, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${districtName}</text>
      </svg>
    `;

    return L.divIcon({
      html: svg,
      className: 'cloud-marker-icon',
      iconSize: [width, height + 10],
      iconAnchor: [width / 2, height + 10],
    });
  };

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="tab-toggles">
          <button 
            className={`tab-btn ${activeTab === 'demand-supply' ? 'active' : ''}`}
            onClick={() => setActiveTab('demand-supply')}
          >
            <FiMap /> Demand-Supply Maps
          </button>
          <button 
            className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <FiActivity /> Performance Analytics
          </button>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <label><FiCalendar /> Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
            />
          </div>
          <div className="filter-group">
            <label><FiCalendar /> End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
            />
          </div>
          <button className="filter-btn" onClick={handleFilter}>
            <FiFilter /> Filter
          </button>
        </div>
      </div>

      {activeTab === 'demand-supply' ? (
        <div className="analytics-content">
          <div className="map-section">
            <MapContainer 
              center={[7.8731, 80.7718]} 
              zoom={7} 
              style={{ height: '600px', width: '100%', borderRadius: '12px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {districtData.map((data) => {
                const metadata = DISTRICT_METADATA[data.district];
                if (!metadata) return null;

                return (
                  <Marker
                    key={data.district}
                    position={metadata.center}
                    icon={createCloudIcon(data.district, data.percentage, metadata.size_factor)}
                  >
                    <Tooltip sticky>
                      <div className="map-tooltip">
                        <strong style={{ fontSize: '16px', display: 'block', marginBottom: '4px' }}>{data.district}</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>Demand: <b>{data.demand}</b></span>
                          <span>Supply: <b>{data.supply}</b></span>
                          <span style={{ color: data.percentage < 75 ? '#ef4444' : '#3b82f6', fontWeight: 'bold' }}>
                            Percentage: {data.percentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="side-panel">
            <h3>Total Overview</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={totalOverview}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="Demand" fill="#3b82f6" />
                  <Bar dataKey="Supply" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="stats-summary">
              <div className="stat-item">
                <span className="label">Avg. Supply %</span>
                <span className="value">
                  {(districtData.reduce((acc, curr) => acc + curr.percentage, 0) / (districtData.length || 1)).toFixed(2)}%
                </span>
              </div>
              <div className="stat-item">
                <span className="label">Districts Below 75%</span>
                <span className="value text-red-500">
                  {districtData.filter(d => d.percentage < 75).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="performance-view">
          <div className="performance-card">
            <h3>User Conversion Rates</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={conversionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="rate" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="placeholder-text">This section displays conversion rates over time. More metrics coming soon.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
