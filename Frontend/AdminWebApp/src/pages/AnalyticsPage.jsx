import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { FiFilter, FiMap, FiActivity, FiCalendar, FiSearch, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { DISTRICT_METADATA, generateMockData, generatePerformanceMockData } from '../data/mockAnalyticsData';
import { API_BASE_URL } from '../config';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('demand-supply');
  const [performanceTab, setPerformanceTab] = useState('user-growth'); // 'user-growth', 'booking-growth', 'revenue-growth'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [districtData, setDistrictData] = useState([]);
  const [totalOverview, setTotalOverview] = useState([]);
  const [performanceData, setPerformanceData] = useState({ userData: [], bookingData: [], revenueData: [] });

  // Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'percentage', direction: 'asc' });

  // Memoize handleFilter to avoid infinite loops
  const handleFilter = useCallback(async () => {
    // Filter District Data (Demand-Supply)
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

    // Fetch Real User Growth Data from Backend
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/user-growth`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const realUserData = response.data;
      
      // Filter Performance Data (Merge real user data with mock bookings/revenue)
      const mockPerfData = generatePerformanceMockData();
      let perfData = {
        ...mockPerfData,
        userData: realUserData
      };
      
      if (startDate || endDate) {
        const filterByDate = (data) => data.filter(item => {
          const itemDate = new Date(item.date);
          const start = startDate ? new Date(startDate) : new Date('2000-01-01');
          const end = endDate ? new Date(endDate) : new Date('2100-01-01');
          return itemDate >= start && itemDate <= end;
        });

        perfData = {
          userData: filterByDate(perfData.userData),
          bookingData: filterByDate(perfData.bookingData),
          revenueData: filterByDate(perfData.revenueData)
        };
      }
      
      setPerformanceData(perfData);
    } catch (err) {
      console.error('Failed to fetch real user growth data', err);
      // Fallback to mock data if API fails
      let perfData = generatePerformanceMockData();
      if (startDate || endDate) {
        const filterByDate = (data) => data.filter(item => {
          const itemDate = new Date(item.date);
          const start = startDate ? new Date(startDate) : new Date('2000-01-01');
          const end = endDate ? new Date(endDate) : new Date('2100-01-01');
          return itemDate >= start && itemDate <= end;
        });

        perfData = {
          userData: filterByDate(perfData.userData),
          bookingData: filterByDate(perfData.bookingData),
          revenueData: filterByDate(perfData.revenueData)
        };
      }
      setPerformanceData(perfData);
    }
  }, [startDate, endDate]);

  // Initial load
  useEffect(() => {
    handleFilter();
  }, [handleFilter]);

  // Create Cloud Icon Helper
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

  // Table Sorting Helper
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Memoize Filtered and Sorted Data
  const filteredAndSortedData = useMemo(() => {
    let sortableData = [...districtData];
    
    if (searchTerm) {
      sortableData = sortableData.filter(item => 
        item.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      sortableData = sortableData.filter(item => {
        const isCritical = item.percentage < 75;
        return statusFilter === 'Critical' ? isCritical : !isCritical;
      });
    }

    sortableData.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortableData;
  }, [districtData, searchTerm, statusFilter, sortConfig]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FiChevronUp className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />;
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
        <div className="space-y-6">
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

          <div className="table-section">
            <div className="table-header-controls">
              <h3>District Breakdown</h3>
              <div className="table-filters">
                <div className="status-filter-group">
                  <label>Status:</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-select"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Critical">Critical Only</option>
                    <option value="Stable">Stable Only</option>
                  </select>
                </div>
                <div className="search-container">
                  <FiSearch />
                  <input 
                    type="text" 
                    placeholder="Search district..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => requestSort('district')}>
                      <div className="th-content">District Name {getSortIcon('district')}</div>
                    </th>
                    <th onClick={() => requestSort('demand')}>
                      <div className="th-content">Total Demand {getSortIcon('demand')}</div>
                    </th>
                    <th onClick={() => requestSort('supply')}>
                      <div className="th-content">Total Supply {getSortIcon('supply')}</div>
                    </th>
                    <th onClick={() => requestSort('percentage')}>
                      <div className="th-content">Ratio (%) {getSortIcon('percentage')}</div>
                    </th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedData.length > 0 ? (
                    filteredAndSortedData.map((item) => (
                      <tr key={item.district}>
                        <td>{item.district}</td>
                        <td>{item.demand}</td>
                        <td>{item.supply}</td>
                        <td className={item.percentage < 75 ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
                          {item.percentage.toFixed(2)}%
                        </td>
                        <td>
                          <span className={`status-badge ${item.percentage < 75 ? 'critical' : 'stable'}`}>
                            {item.percentage < 75 ? 'Critical' : 'Stable'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">
                        No data found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="performance-view space-y-6">
          <div className="performance-tabs">
            <button 
              className={`perf-tab-btn ${performanceTab === 'user-growth' ? 'active' : ''}`}
              onClick={() => setPerformanceTab('user-growth')}
            >
              User Growth
            </button>
            <button 
              className={`perf-tab-btn ${performanceTab === 'booking-growth' ? 'active' : ''}`}
              onClick={() => setPerformanceTab('booking-growth')}
            >
              Service Booking Growth
            </button>
            <button 
              className={`perf-tab-btn ${performanceTab === 'revenue-growth' ? 'active' : ''}`}
              onClick={() => setPerformanceTab('revenue-growth')}
            >
              Revenue Growth
            </button>
          </div>

          <div className="performance-content">
            {performanceTab === 'user-growth' && (
              <div className="performance-card">
                <div className="card-header">
                  <h3>User Growth</h3>
                  <div className="summary-stat">
                    <span className="label">Total Users:</span>
                    <span className="value">
                      {performanceData.userData.length > 0 
                        ? (performanceData.userData[performanceData.userData.length - 1].seekers + 
                           performanceData.userData[performanceData.userData.length - 1].providers).toLocaleString() 
                        : 0}
                    </span>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={performanceData.userData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Line 
                        type="monotone" 
                        dataKey="seekers" 
                        stroke="#8b5cf6" 
                        strokeWidth={3} 
                        dot={{ r: 6 }} 
                        activeDot={{ r: 8 }} 
                        name="Service Seekers" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="providers" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        dot={{ r: 6 }} 
                        activeDot={{ r: 8 }} 
                        name="Service Providers" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {performanceTab === 'booking-growth' && (
              <div className="performance-card">
                <div className="card-header">
                  <h3>Service Booking Growth</h3>
                  <div className="summary-stat">
                    <span className="label">Total Bookings:</span>
                    <span className="value">
                      {performanceData.bookingData.reduce((sum, d) => sum + d.bookings, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={performanceData.bookingData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Completed Bookings" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {performanceTab === 'revenue-growth' && (
              <div className="performance-card">
                <div className="card-header">
                  <h3>Revenue Growth</h3>
                  <div className="summary-stat">
                    <span className="label">Total Revenue:</span>
                    <span className="value">
                      Rs. {performanceData.revenueData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={performanceData.revenueData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <RechartsTooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} name="Revenue (Rs.)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
