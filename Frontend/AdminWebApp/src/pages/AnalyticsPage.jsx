import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';
import {
  FiFilter, FiMap, FiActivity, FiCalendar, FiSearch,
  FiChevronUp, FiChevronDown, FiAlertTriangle, FiCheckCircle,
  FiClock, FiXCircle, FiLayers, FiUsers, FiTrendingUp, FiDollarSign, FiLock, FiMapPin,
  FiZap, FiArrowUpRight, FiPieChart
} from 'react-icons/fi';
import { DISTRICT_METADATA, generatePerformanceMockData } from '../data/mockAnalyticsData';
import { API_BASE_URL, ADMIN_SERVICE_URL, PROVIDER_SERVICE_URL } from '../config';
import './AnalyticsPage.css';

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('analytics_active_tab') || 'demand-supply');
  const [performanceTab, setPerformanceTab] = useState(() => localStorage.getItem('analytics_perf_tab') || 'user-growth');
  const [userTypeFilter, setUserTypeFilter] = useState(() => localStorage.getItem('analytics_user_filter') || 'All');
  const [bookingStatusFilter, setBookingStatusFilter] = useState(() => localStorage.getItem('analytics_booking_filter') || 'ALL');
  const [selectedDistrict, setSelectedDistrict] = useState(() => localStorage.getItem('analytics_district_filter') || localStorage.getItem('admin_default_district') || 'All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [districtData, setDistrictData] = useState([]);
  const [totalOverview, setTotalOverview] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalDemand: 0,
    totalSupply: 0,
    avgSupplyPercentage: 0,
    districtsBelow75: 0,
    activeDistrictsCount: 2,
    totalDistrictsCount: 25,
  });
  const [performanceData, setPerformanceData] = useState({ userData: [], bookingData: [], revenueData: [] });
  const [revenueStreamFilter, setRevenueStreamFilter] = useState(() => localStorage.getItem('analytics_rev_filter') || 'ALL');
  const [revenueStats, setRevenueStats] = useState({
    totalIncomeLkr: 0,
    totalRevenue: 0,
    totalBoostRevenue: 0,
    totalCommissionRevenue: 0,
    totalBookingVolume: 0,
    totalTransactions: 0,
    totalBoostTransactions: 0,
    totalCompletedBookings: 0,
    totalBoostSteps: 0,
    currency: 'LKR',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'percentage', direction: 'asc' });

  // Tab & Filter persistence handlers
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('analytics_active_tab', tab);
  };

  const handleSetPerformanceTab = (tab) => {
    setPerformanceTab(tab);
    localStorage.setItem('analytics_perf_tab', tab);
  };

  const handleSetUserTypeFilter = (filter) => {
    setUserTypeFilter(filter);
    localStorage.setItem('analytics_user_filter', filter);
  };

  const handleSetBookingStatusFilter = (filter) => {
    setBookingStatusFilter(filter);
    localStorage.setItem('analytics_booking_filter', filter);
  };

  const handleSetRevenueStreamFilter = (filter) => {
    setRevenueStreamFilter(filter);
    localStorage.setItem('analytics_rev_filter', filter);
  };

  const handleSetSelectedDistrict = (district) => {
    setSelectedDistrict(district);
    localStorage.setItem('analytics_district_filter', district);
  };

  // Helper to fetch live analytics data with memoized callback
  const handleFilter = useCallback(async () => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (selectedDistrict && selectedDistrict !== 'All') params.district = selectedDistrict;

    // 1. Fetch Real Demand-Supply Analytics Data from Admin Backend
    try {
      const demandRes = await axios.get(`${ADMIN_SERVICE_URL}/api/analytics/demand-supply`, { params });
      if (demandRes.data && demandRes.data.success) {
        setDistrictData(demandRes.data.data);
        setTotalOverview(demandRes.data.totalOverview || []);
        if (demandRes.data.summary) {
          setSummaryStats(demandRes.data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch real demand-supply data:', err);
    }

    // 2. Fetch Real Service Booking Growth Data from Admin Backend
    let realBookingData = [];
    try {
      const bookingRes = await axios.get(`${ADMIN_SERVICE_URL}/api/analytics/booking-growth`, { params });
      if (bookingRes.data && bookingRes.data.success) {
        realBookingData = bookingRes.data.data;
      }
    } catch (bErr) {
      console.error('Failed to fetch real booking growth data:', bErr);
    }

    // 3. Fetch Real Revenue Growth & Total Income Data (Ad Boost + Service Bookings Commission)
    let realRevenueBreakdown = [];
    try {
      let revRes;
      try {
        revRes = await axios.get(`${ADMIN_SERVICE_URL}/api/analytics/revenue-growth`, { params });
      } catch (pErr) {
        revRes = await axios.get(`${PROVIDER_SERVICE_URL}/api/provider/ads/income/total`, { params });
      }

      if (revRes && revRes.data && revRes.data.success) {
        const rData = revRes.data.data;
        setRevenueStats({
          totalIncomeLkr: rData.totalIncomeLkr || 0,
          totalRevenue: rData.totalRevenue || rData.totalIncomeLkr || 0,
          totalBoostRevenue: rData.totalBoostRevenue || 0,
          totalCommissionRevenue: rData.totalCommissionRevenue || 0,
          totalBookingVolume: rData.totalBookingVolume || 0,
          totalTransactions: rData.totalTransactions || 0,
          totalBoostTransactions: rData.totalBoostTransactions || 0,
          totalCompletedBookings: rData.totalCompletedBookings || 0,
          totalBoostSteps: rData.totalBoostSteps || 0,
          currency: rData.currency || 'LKR',
        });
        if (rData.monthlyBreakdown && rData.monthlyBreakdown.length > 0) {
          realRevenueBreakdown = rData.monthlyBreakdown;
        }
      }
    } catch (rErr) {
      console.error('Failed to fetch real revenue growth data:', rErr);
    }

    // 4. Fetch Real User Growth Data from Backend
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/user-growth`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params,
      });

      const realUserData = response.data;

      // Filter Performance Data (Merge real user, booking & revenue data)
      const mockPerfData = generatePerformanceMockData();
      let perfData = {
        ...mockPerfData,
        userData: realUserData,
        bookingData: realBookingData.length > 0 ? realBookingData : mockPerfData.bookingData,
        revenueData: realRevenueBreakdown.length > 0 ? realRevenueBreakdown : mockPerfData.revenueData,
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
      // Fallback to mock user data if API fails, but keep real bookings and revenue
      let perfData = generatePerformanceMockData();
      if (realBookingData.length > 0) {
        perfData.bookingData = realBookingData;
      }
      if (realRevenueBreakdown.length > 0) {
        perfData.revenueData = realRevenueBreakdown;
      }
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
  }, [startDate, endDate, selectedDistrict]);

  // Initial load and auto-polling based on Admin Settings
  useEffect(() => {
    handleFilter();
    
    const refreshSetting = localStorage.getItem('admin_refresh_interval') || '60';
    if (refreshSetting === 'manual') return;

    const refreshSeconds = parseInt(refreshSetting, 10) || 60;
    const interval = setInterval(() => {
      handleFilter();
    }, refreshSeconds * 1000);
    return () => clearInterval(interval);
  }, [handleFilter]);

  // Create Cloud Icon Helper (Red <75%, Blue >=75%, Yellow for Other Districts)
  const createCloudIcon = (districtName, isAvailable, percentage, sizeFactor = 1) => {
    let color = '#eab308'; // Default Yellow for coming soon districts
    if (isAvailable) {
      color = percentage < 75 ? '#ef4444' : '#3b82f6';
    }
    const width = 68 * sizeFactor;
    const height = 48 * sizeFactor;

    const svg = `
      <svg width="${width}" height="${height + 10}" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg">
        <path d="M50,110 L40,90 L60,90 Z" fill="${color}" opacity="0.95" />
        <rect x="0" y="0" width="100" height="90" rx="20" fill="${color}" opacity="0.9" />
        <text x="50" y="50" font-family="Inter, sans-serif" font-size="13" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${districtName}</text>
      </svg>
    `;

    return L.divIcon({
      html: svg,
      className: 'custom-cloud-icon',
      iconSize: [width, height + 10],
      iconAnchor: [width / 2, height + 10],
      popupAnchor: [0, -(height + 10)],
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
        if (statusFilter === 'Critical') return item.isAvailable && item.percentage < 75;
        if (statusFilter === 'Stable') return item.isAvailable && item.percentage >= 75;
        if (statusFilter === 'ComingSoon') return !item.isAvailable;
        return true;
      });
    }

    sortableData.sort((a, b) => {
      // Keep available districts at top by default if sorting by district or percentage
      if (a.isAvailable !== b.isAvailable) {
        return a.isAvailable ? -1 : 1;
      }
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
            className={`tab-btn tab-btn-maps ${activeTab === 'demand-supply' ? 'active' : ''}`}
            onClick={() => handleSetActiveTab('demand-supply')}
          >
            <FiMap className="tab-btn-icon" /> <span>Demand-Supply Maps</span>
          </button>
          <button
            className={`tab-btn tab-btn-perf ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => handleSetActiveTab('performance')}
          >
            <FiActivity className="tab-btn-icon" /> <span>Performance Analytics</span>
          </button>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <label><FiMapPin /> District</label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleSetSelectedDistrict(e.target.value)}
              className="district-filter-select"
            >
              <option value="All">All Districts</option>
              <option value="Colombo">Colombo</option>
              <option value="Gampaha">Gampaha</option>
            </select>
          </div>
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
              <div className="map-legend-bar">
                <div className="legend-item">
                  <span className="legend-dot red"></span> Critical (&lt; 75% Supply)
                </div>
                <div className="legend-item">
                  <span className="legend-dot blue"></span> Stable (&ge; 75% Supply)
                </div>
                <div className="legend-item">
                  <span className="legend-dot yellow"></span> Coming soon...
                </div>
              </div>

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
                      icon={createCloudIcon(data.district, data.isAvailable, data.percentage, metadata.size_factor)}
                    >
                      <Tooltip sticky direction="top" offset={[0, -10]} opacity={1}>
                        {data.isAvailable ? (
                          <div className="map-popup-card">
                            <h4 className="map-popup-title">{data.district}</h4>
                            <div className="map-popup-row">
                              <span className="map-popup-label">Demand:</span>
                              <strong className="map-popup-val">{data.demand}</strong>
                            </div>
                            <div className="map-popup-row">
                              <span className="map-popup-label">Supply:</span>
                              <strong className="map-popup-val">{data.supply}</strong>
                            </div>
                            <div
                              className="map-popup-percentage"
                              style={{ color: data.percentage < 75 ? '#ef4444' : '#3b82f6' }}
                            >
                              Percentage: {data.percentage.toFixed(2)}%
                            </div>
                          </div>
                        ) : (
                          <div className="map-popup-card coming-soon-card">
                            <h4 className="map-popup-title">{data.district}</h4>
                            <div className="map-popup-coming-soon">
                              <span className="coming-soon-badge">Coming soon...</span>
                            </div>
                          </div>
                        )}
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
                    <Bar dataKey="Demand" fill="#3b82f6" name="Demand" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Supply" fill="#10b981" name="Supply" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="stats-summary">
                <div className="stat-item">
                  <span className="label">Avg. Supply %</span>
                  <span className="value">
                    {summaryStats.avgSupplyPercentage.toFixed(2)}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Districts Below 75%</span>
                  <span className="value text-red-500">
                    {summaryStats.districtsBelow75}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Active Coverage</span>
                  <span className="value" style={{ fontSize: '15px', color: '#4f46e5' }}>
                    Colombo &amp; Gampaha
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="table-section">
            <div className="table-header-controls">
              <div>
                <h3>District Breakdown</h3>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>
                  Live service demand &amp; supply fulfillment ratio across Sri Lanka districts.
                </p>
              </div>
              <div className="table-filters">
                <div className="status-filter-group">
                  <label>Status:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-select"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Critical">Critical (&lt;75%)</option>
                    <option value="Stable">Stable (&ge;75%)</option>
                    <option value="ComingSoon">Coming soon...</option>
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
                      <tr key={item.district} className={!item.isAvailable ? 'row-coming-soon' : ''}>
                        <td>
                          <strong>{item.district}</strong>
                          {!item.isAvailable && <span className="sub-badge-cs"> (Upcoming)</span>}
                        </td>
                        <td>{item.isAvailable ? item.demand : <span className="text-gray-400">-</span>}</td>
                        <td>{item.isAvailable ? item.supply : <span className="text-gray-400">-</span>}</td>
                        <td>
                          {item.isAvailable ? (
                            <span className={item.percentage < 75 ? 'text-red-500 font-bold' : 'text-blue-500 font-bold'}>
                              {item.percentage.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td>
                          {item.isAvailable ? (
                            <span className={`status-badge ${item.percentage < 75 ? 'critical' : 'stable'}`}>
                              {item.percentage < 75 ? 'Critical' : 'Stable'}
                            </span>
                          ) : (
                            <span className="status-badge coming-soon">
                              Coming soon...
                            </span>
                          )}
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
              className={`perf-tab-btn perf-tab-users ${performanceTab === 'user-growth' ? 'active' : ''}`}
              onClick={() => handleSetPerformanceTab('user-growth')}
            >
              <span className="perf-tab-icon"><FiUsers /></span>
              <span>User Growth</span>
            </button>
            <button
              className={`perf-tab-btn perf-tab-bookings ${performanceTab === 'booking-growth' ? 'active' : ''}`}
              onClick={() => handleSetPerformanceTab('booking-growth')}
            >
              <span className="perf-tab-icon"><FiTrendingUp /></span>
              <span>Service Booking Growth</span>
            </button>
            <button
              className={`perf-tab-btn perf-tab-revenue ${performanceTab === 'revenue-growth' ? 'active' : ''}`}
              onClick={() => handleSetPerformanceTab('revenue-growth')}
            >
              <span className="perf-tab-icon"><FiDollarSign /></span>
              <span>Revenue Growth</span>
            </button>
          </div>

          <div className="performance-content">
            {performanceTab === 'user-growth' && (
              <div className="performance-card">
                <div className="card-header">
                  <div className="flex flex-col gap-4">
                    <h3>User Growth</h3>
                    <div className="user-type-filters">
                      <button
                        className={`filter-chip chip-user-all ${userTypeFilter === 'All' ? 'active' : ''}`}
                        onClick={() => handleSetUserTypeFilter('All')}
                      >
                        <FiUsers /> Show All
                      </button>
                      <button
                        className={`filter-chip chip-seekers ${userTypeFilter === 'Seekers' ? 'active' : ''}`}
                        onClick={() => handleSetUserTypeFilter('Seekers')}
                      >
                        <FiUsers /> Seekers Only
                      </button>
                      <button
                        className={`filter-chip chip-providers ${userTypeFilter === 'Providers' ? 'active' : ''}`}
                        onClick={() => handleSetUserTypeFilter('Providers')}
                      >
                        <FiUsers /> Providers Only
                      </button>
                    </div>
                  </div>
                  <div className="summary-stat">
                    <span className="label">
                      {userTypeFilter === 'All' ? 'Total Users' : userTypeFilter === 'Seekers' ? 'Total Seekers' : 'Total Providers'}:
                    </span>
                    <span className="value">
                      {performanceData.userData.length > 0
                        ? (
                          userTypeFilter === 'All'
                            ? (performanceData.userData[performanceData.userData.length - 1].seekers +
                              performanceData.userData[performanceData.userData.length - 1].providers)
                            : userTypeFilter === 'Seekers'
                              ? performanceData.userData[performanceData.userData.length - 1].seekers
                              : performanceData.userData[performanceData.userData.length - 1].providers
                        ).toLocaleString()
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
                      {(userTypeFilter === 'All' || userTypeFilter === 'Seekers') && (
                        <Line
                          type="monotone"
                          dataKey="seekers"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          dot={{ r: 6 }}
                          activeDot={{ r: 8 }}
                          name="Service Seekers"
                        />
                      )}
                      {(userTypeFilter === 'All' || userTypeFilter === 'Providers') && (
                        <Line
                          type="monotone"
                          dataKey="providers"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 6 }}
                          activeDot={{ r: 8 }}
                          name="Service Providers"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {performanceTab === 'booking-growth' && (
              <div className="space-y-6">
                {/* 1. Main Interactive Booking Growth Bar Chart */}
                <div className="performance-card">
                  <div className="card-header">
                    <div className="flex flex-col gap-4">
                      <h3>Service Booking Growth</h3>
                      <div className="user-type-filters">
                        <button 
                          className={`filter-chip chip-all ${bookingStatusFilter === 'ALL' ? 'active' : ''}`}
                          onClick={() => handleSetBookingStatusFilter('ALL')}
                        >
                          <FiLayers /> All Bookings
                        </button>
                        <button 
                          className={`filter-chip chip-completed ${bookingStatusFilter === 'COMPLETED' ? 'active' : ''}`}
                          onClick={() => handleSetBookingStatusFilter('COMPLETED')}
                        >
                          <FiCheckCircle /> Completed Only
                        </button>
                        <button 
                          className={`filter-chip chip-confirmed ${bookingStatusFilter === 'CONFIRMED' ? 'active' : ''}`}
                          onClick={() => handleSetBookingStatusFilter('CONFIRMED')}
                        >
                          <FiClock /> Confirmed Only
                        </button>
                        <button 
                          className={`filter-chip chip-cancelled ${bookingStatusFilter === 'CANCELLED' ? 'active' : ''}`}
                          onClick={() => handleSetBookingStatusFilter('CANCELLED')}
                        >
                          <FiXCircle /> Cancelled Only
                        </button>
                      </div>
                    </div>
                    <div className="summary-stat">
                      <span className="label">
                        {bookingStatusFilter === 'ALL' 
                          ? 'Total Bookings:' 
                          : bookingStatusFilter === 'COMPLETED' 
                          ? 'Total Completed Bookings:' 
                          : bookingStatusFilter === 'CONFIRMED'
                          ? 'Total Confirmed Bookings:'
                          : 'Total Cancelled Bookings:'}
                      </span>
                      <span className="value">
                        {performanceData.bookingData.reduce((sum, d) => {
                          if (bookingStatusFilter === 'ALL') return sum + (d.totalBookings || 0);
                          if (bookingStatusFilter === 'CONFIRMED') return sum + (d.confirmedBookings || 0);
                          if (bookingStatusFilter === 'CANCELLED') return sum + (d.cancelledBookings || 0);
                          return sum + (d.completedBookings !== undefined ? d.completedBookings : d.bookings || 0);
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={380}>
                      <BarChart data={performanceData.bookingData.map(d => ({
                        ...d,
                        displayValue: bookingStatusFilter === 'ALL' 
                          ? (d.totalBookings || 0)
                          : bookingStatusFilter === 'CONFIRMED'
                          ? (d.confirmedBookings || 0)
                          : bookingStatusFilter === 'CANCELLED'
                          ? (d.cancelledBookings || 0)
                          : (d.completedBookings !== undefined ? d.completedBookings : d.bookings || 0)
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Legend />
                        <Bar 
                          dataKey="displayValue" 
                          fill={
                            bookingStatusFilter === 'ALL' 
                              ? '#4f46e5' 
                              : bookingStatusFilter === 'COMPLETED' 
                              ? '#059669' 
                              : bookingStatusFilter === 'CONFIRMED' 
                              ? '#2563eb' 
                              : '#e11d48'
                          } 
                          radius={[6, 6, 0, 0]} 
                          name={
                            bookingStatusFilter === 'ALL'
                              ? 'All Bookings'
                              : bookingStatusFilter === 'CONFIRMED'
                              ? 'Confirmed Bookings'
                              : bookingStatusFilter === 'CANCELLED'
                              ? 'Cancelled Bookings'
                              : 'Completed Bookings'
                          } 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. All Bookings vs Completed Bookings Comparison Card */}
                <div className="performance-card comparison-card">
                  <div className="card-header">
                    <div>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiTrendingUp style={{ color: '#4f46e5' }} /> All Bookings vs Completed Bookings
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: '#64748b' }}>
                        Side-by-side volume comparison of total requested bookings versus successfully completed service bookings.
                      </p>
                    </div>
                    <div className="comparison-stats-pills">
                      <div className="comparison-stat-pill pill-indigo">
                        <span className="pill-dot indigo"></span>
                        <span className="pill-label">Total Bookings:</span>
                        <strong className="pill-val">
                          {performanceData.bookingData.reduce((sum, d) => sum + (d.totalBookings || 0), 0)}
                        </strong>
                      </div>
                      <div className="comparison-stat-pill pill-emerald">
                        <span className="pill-dot emerald"></span>
                        <span className="pill-label">Completed:</span>
                        <strong className="pill-val">
                          {performanceData.bookingData.reduce((sum, d) => sum + (d.completedBookings || 0), 0)}
                        </strong>
                      </div>
                      <div className="comparison-stat-pill pill-cyan">
                        <span className="pill-label">Completion Rate:</span>
                        <strong className="pill-val">
                          {(() => {
                            const total = performanceData.bookingData.reduce((sum, d) => sum + (d.totalBookings || 0), 0);
                            const completed = performanceData.bookingData.reduce((sum, d) => sum + (d.completedBookings || 0), 0);
                            return total > 0 ? ((completed / total) * 100).toFixed(1) + '%' : '0.0%';
                          })()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={380}>
                      <BarChart data={performanceData.bookingData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <RechartsTooltip />
                        <Legend verticalAlign="top" height={36} />
                        <Bar 
                          dataKey="totalBookings" 
                          fill="#4f46e5" 
                          radius={[6, 6, 0, 0]} 
                          name="All Bookings (Total Volume)" 
                        />
                        <Bar 
                          dataKey="completedBookings" 
                          fill="#10b981" 
                          radius={[6, 6, 0, 0]} 
                          name="Completed Bookings" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {performanceTab === 'revenue-growth' && (
              <div className="performance-card revenue-card-wrapper">
                {/* 1. Executive Header */}
                <div className="revenue-hero-header">
                  <div className="revenue-hero-left">
                    <div className="revenue-title-row">
                      <div className="revenue-icon-box">
                        <FiDollarSign />
                      </div>
                      <div>
                        <div className="revenue-title-flex">
                          <h3 className="revenue-main-title">Financial Monetization &amp; Revenue Growth</h3>
                          <span className="live-status-pill">
                            <span className="live-status-pulse"></span> Live Financials
                          </span>
                        </div>
                        <p className="revenue-subtitle">
                          Real-time breakdown of Platform 5% Booking Commissions and Provider Post Ad Boosting monetization.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Segmented Control Filter */}
                  <div className="revenue-stream-segmented">
                    <button 
                      className={`rev-seg-btn ${revenueStreamFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => handleSetRevenueStreamFilter('ALL')}
                    >
                      <FiLayers /> All Streams
                    </button>
                    <button 
                      className={`rev-seg-btn ${revenueStreamFilter === 'BOOST' ? 'active' : ''}`}
                      onClick={() => handleSetRevenueStreamFilter('BOOST')}
                    >
                      <FiZap /> Ad Boosting
                    </button>
                    <button 
                      className={`rev-seg-btn ${revenueStreamFilter === 'COMMISSION' ? 'active' : ''}`}
                      onClick={() => handleSetRevenueStreamFilter('COMMISSION')}
                    >
                      <FiCheckCircle /> 5% Commission
                    </button>
                  </div>
                </div>

                {/* 2. Executive KPI Cards Grid */}
                <div className="revenue-kpi-grid">
                  {/* Card 1: Total Platform Revenue */}
                  <div 
                    className={`rev-kpi-card total-card ${revenueStreamFilter === 'ALL' ? 'highlighted' : ''}`}
                    onClick={() => handleSetRevenueStreamFilter('ALL')}
                  >
                    <div className="rev-kpi-header">
                      <span className="rev-kpi-label">Total Platform Revenue</span>
                      <div className="rev-kpi-icon total"><FiDollarSign /></div>
                    </div>
                    <div className="rev-kpi-value-row">
                      <span className="rev-currency">Rs.</span>
                      <span className="rev-amount">
                        {Number(revenueStats.totalIncomeLkr || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="rev-code">LKR</span>
                    </div>
                    <div className="rev-kpi-footer">
                      <span className="rev-kpi-tag total">
                        <FiArrowUpRight /> All Monetization
                      </span>
                      <span className="rev-kpi-meta">{revenueStats.totalTransactions || 0} Total Events</span>
                    </div>
                  </div>

                  {/* Card 2: Post Ad Boosting */}
                  <div 
                    className={`rev-kpi-card boost-card ${revenueStreamFilter === 'BOOST' ? 'highlighted' : ''}`}
                    onClick={() => handleSetRevenueStreamFilter('BOOST')}
                  >
                    <div className="rev-kpi-header">
                      <span className="rev-kpi-label">Provider Ad Boosting</span>
                      <div className="rev-kpi-icon boost"><FiZap /></div>
                    </div>
                    <div className="rev-kpi-value-row">
                      <span className="rev-currency">Rs.</span>
                      <span className="rev-amount">
                        {Number(revenueStats.totalBoostRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="rev-code">LKR</span>
                    </div>
                    <div className="rev-kpi-footer">
                      <span className="rev-kpi-tag boost">
                        {revenueStats.totalBoostTransactions || 0} Boost Ads
                      </span>
                      <span className="rev-kpi-meta">{revenueStats.totalBoostSteps || 0} Boost Steps</span>
                    </div>
                  </div>

                  {/* Card 3: 5% Booking Commission */}
                  <div 
                    className={`rev-kpi-card comm-card ${revenueStreamFilter === 'COMMISSION' ? 'highlighted' : ''}`}
                    onClick={() => handleSetRevenueStreamFilter('COMMISSION')}
                  >
                    <div className="rev-kpi-header">
                      <span className="rev-kpi-label">Service 5% Commission</span>
                      <div className="rev-kpi-icon comm"><FiCheckCircle /></div>
                    </div>
                    <div className="rev-kpi-value-row">
                      <span className="rev-currency">Rs.</span>
                      <span className="rev-amount">
                        {Number(revenueStats.totalCommissionRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="rev-code">LKR</span>
                    </div>
                    <div className="rev-kpi-footer">
                      <span className="rev-kpi-tag comm">
                        {revenueStats.totalCompletedBookings || 0} Completed Jobs
                      </span>
                      <span className="rev-kpi-meta">5% Direct Fee</span>
                    </div>
                  </div>

                  {/* Card 4: Gross GMV */}
                  <div className="rev-kpi-card gmv-card">
                    <div className="rev-kpi-header">
                      <span className="rev-kpi-label">Marketplace Gross GMV</span>
                      <div className="rev-kpi-icon gmv"><FiActivity /></div>
                    </div>
                    <div className="rev-kpi-value-row">
                      <span className="rev-currency">Rs.</span>
                      <span className="rev-amount">
                        {Number(revenueStats.totalBookingVolume || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="rev-code">LKR</span>
                    </div>
                    <div className="rev-kpi-footer">
                      <span className="rev-kpi-tag gmv">100% Volume</span>
                      <span className="rev-kpi-meta">Total Service Value</span>
                    </div>
                  </div>
                </div>

                {/* 3. High-End Interactive Chart */}
                <div className="revenue-chart-box">
                  <div className="revenue-chart-header">
                    <div>
                      <h4 className="revenue-chart-title">
                        {revenueStreamFilter === 'ALL'
                          ? 'Monthly Multi-Stream Revenue Dynamics'
                          : revenueStreamFilter === 'BOOST'
                          ? 'Provider Post Ad Boosting Trajectory'
                          : 'Service Booking Platform 5% Commission Trajectory'}
                      </h4>
                      <span className="revenue-chart-caption">
                        {revenueStreamFilter === 'ALL'
                          ? 'Comparing total net earnings with individual stream contributions (LKR)'
                          : `Visualizing monthly earnings for ${revenueStreamFilter === 'BOOST' ? 'Ad Boosting' : '5% Direct Commission'}`}
                      </span>
                    </div>
                    <div className="revenue-chart-legend-pills">
                      {revenueStreamFilter === 'ALL' && (
                        <>
                          <span className="leg-pill leg-total"><span className="leg-dot total"></span> Total Net</span>
                          <span className="leg-pill leg-boost"><span className="leg-dot boost"></span> Ad Boost</span>
                          <span className="leg-pill leg-comm"><span className="leg-dot comm"></span> 5% Commission</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="chart-container" style={{ padding: '8px 0 0 0' }}>
                    <ResponsiveContainer width="100%" height={380}>
                      <AreaChart data={performanceData.revenueData.map(d => ({
                        ...d,
                        totalRevenue: d.totalRevenue !== undefined ? d.totalRevenue : d.revenue || 0,
                        boostRevenue: d.boostRevenue !== undefined ? d.boostRevenue : 0,
                        commissionRevenue: d.commissionRevenue !== undefined ? d.commissionRevenue : 0,
                      }))}>
                        <defs>
                          <linearGradient id="totalRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.55}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                          </linearGradient>
                          <linearGradient id="boostRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.50}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                          </linearGradient>
                          <linearGradient id="commissionRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.50}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" opacity={0.7} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} 
                          axisLine={{ stroke: '#e2e8f0' }}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          tick={{ fill: '#64748b', fontSize: 12 }} 
                          tickFormatter={(val) => `Rs. ${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartsTooltip 
                          formatter={(value, name) => [`Rs. ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} LKR`, name]}
                          labelFormatter={(label) => `Month: ${label}`}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                            padding: '12px 16px',
                            backdropFilter: 'blur(8px)'
                          }}
                        />

                        {revenueStreamFilter === 'ALL' && (
                          <>
                            <Area 
                              type="monotone" 
                              dataKey="totalRevenue" 
                              name="Total Combined Revenue" 
                              stroke="#4f46e5" 
                              strokeWidth={3.5} 
                              fillOpacity={1} 
                              fill="url(#totalRevenueGrad)" 
                              dot={{ r: 5, fill: '#4f46e5', stroke: '#ffffff', strokeWidth: 2 }}
                              activeDot={{ r: 8, fill: '#3730a3', stroke: '#ffffff', strokeWidth: 2.5 }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="boostRevenue" 
                              name="Post Ad Boosting Income" 
                              stroke="#059669" 
                              strokeWidth={2.2} 
                              fillOpacity={0.12} 
                              fill="url(#boostRevenueGrad)" 
                              dot={{ r: 4, fill: '#059669', stroke: '#ffffff', strokeWidth: 1.5 }}
                              activeDot={{ r: 7, fill: '#047857' }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="commissionRevenue" 
                              name="Service 5% Commission" 
                              stroke="#2563eb" 
                              strokeWidth={2.2} 
                              fillOpacity={0.12} 
                              fill="url(#commissionRevenueGrad)" 
                              dot={{ r: 4, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 1.5 }}
                              activeDot={{ r: 7, fill: '#1d4ed8' }}
                            />
                          </>
                        )}

                        {revenueStreamFilter === 'BOOST' && (
                          <Area 
                            type="monotone" 
                            dataKey="boostRevenue" 
                            name="Post Ad Boosting Income" 
                            stroke="#059669" 
                            strokeWidth={3.5} 
                            fillOpacity={1} 
                            fill="url(#boostRevenueGrad)" 
                            dot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                            activeDot={{ r: 8, fill: '#047857', stroke: '#ffffff', strokeWidth: 2.5 }}
                          />
                        )}

                        {revenueStreamFilter === 'COMMISSION' && (
                          <Area 
                            type="monotone" 
                            dataKey="commissionRevenue" 
                            name="Service Booking 5% Commission" 
                            stroke="#2563eb" 
                            strokeWidth={3.5} 
                            fillOpacity={1} 
                            fill="url(#commissionRevenueGrad)" 
                            dot={{ r: 6, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                            activeDot={{ r: 8, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2.5 }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
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
