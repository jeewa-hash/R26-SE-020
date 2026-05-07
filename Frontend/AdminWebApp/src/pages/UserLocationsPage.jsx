import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FiMapPin, FiSearch, FiFilter, FiUser, FiBriefcase, FiNavigation } from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import './UserLocationsPage.css';

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for Seekers and Providers
const seekerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const providerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function UserLocationsPage() {
  const [users, setUsers] = useState({ providers: [], seekers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Seekers', 'Providers'
  const [mapCenter] = useState([7.8731, 80.7718]); // Center of Sri Lanka
  const [mapZoom] = useState(8);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers({
          providers: response.data.providers || [],
          seekers: response.data.seekers || []
        });
      } catch (err) {
        console.error('Failed to fetch users', err);
        setError('Failed to load user locations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = {
    seekers: (typeFilter === 'All' || typeFilter === 'Seekers') 
      ? users.seekers.filter(s => 
          s.location?.latitude && s.location?.longitude &&
          (s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
        ) 
      : [],
    providers: (typeFilter === 'All' || typeFilter === 'Providers') 
      ? users.providers.filter(p => 
          p.location?.latitude && p.location?.longitude &&
          (p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.toLowerCase().includes(searchTerm.toLowerCase()))
        ) 
      : []
  };

  const totalFiltered = filteredUsers.seekers.length + filteredUsers.providers.length;

  return (
    <div className="page-content user-locations-page">
      <div className="register-page-header">
        <div>
          <h1><FiNavigation style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary-500)' }} /> User Locations</h1>
          <p>Real-time geographic distribution of service seekers and providers across Sri Lanka.</p>
        </div>
        <div className="location-stats">
          <div className="loc-stat-card">
            <span className="dot seeker"></span>
            <strong>{filteredUsers.seekers.length}</strong> Seekers
          </div>
          <div className="loc-stat-card">
            <span className="dot provider"></span>
            <strong>{filteredUsers.providers.length}</strong> Providers
          </div>
        </div>
      </div>

      <div className="map-controls-container">
        <div className="filter-left">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by name, email or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="filter-right">
          <div className="filter-control-group">
            <label><FiFilter size={14} /> User Type</label>
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="All">All Users</option>
              <option value="Seekers">Seekers Only</option>
              <option value="Providers">Providers Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="map-main-section">
        {loading ? (
          <div className="map-loading">
            <div className="spinner"></div>
            <p>Loading user locations...</p>
          </div>
        ) : error ? (
          <div className="map-error">{error}</div>
        ) : (
          <MapContainer 
            center={mapCenter} 
            zoom={mapZoom} 
            style={{ height: 'calc(100vh - 300px)', width: '100%', borderRadius: '16px' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Seeker Markers */}
            {filteredUsers.seekers.map((seeker) => (
              <Marker 
                key={seeker._id} 
                position={[seeker.location.latitude, seeker.location.longitude]}
                icon={seekerIcon}
              >
                <Popup className="user-popup">
                  <div className="popup-content">
                    <div className="popup-header seeker">
                      <FiUser />
                      <span>Service Seeker</span>
                    </div>
                    <div className="popup-body">
                      <h4>{seeker.name}</h4>
                      <p className="email">{seeker.email}</p>
                      <div className="info-row">
                        <FiMapPin size={12} />
                        <span>{seeker.district || 'N/A'}</span>
                      </div>
                      <a 
                        href={`https://www.google.com/maps?q=${seeker.location.latitude},${seeker.location.longitude}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="google-maps-link"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                  {seeker.name}
                </Tooltip>
              </Marker>
            ))}

            {/* Provider Markers */}
            {filteredUsers.providers.map((provider) => (
              <Marker 
                key={provider._id} 
                position={[provider.location.latitude, provider.location.longitude]}
                icon={providerIcon}
              >
                <Popup className="user-popup">
                  <div className="popup-content">
                    <div className="popup-header provider">
                      <FiBriefcase />
                      <span>Service Provider</span>
                    </div>
                    <div className="popup-body">
                      <h4>{provider.email}</h4>
                      <p className="category">{provider.category || 'General Service'}</p>
                      <div className="info-row">
                        <FiMapPin size={12} />
                        <span>{provider.district || 'N/A'}</span>
                      </div>
                      <div className="status-row">
                        <span className={`status-badge ${provider.isVerified ? 'verified' : 'pending'}`}>
                          {provider.isVerified ? 'Verified' : 'Pending Verification'}
                        </span>
                      </div>
                      <a 
                        href={`https://www.google.com/maps?q=${provider.location.latitude},${provider.location.longitude}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="google-maps-link"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
                <Tooltip direction="top" offset={[0, -32]} opacity={1}>
                  {provider.email} ({provider.category || 'Provider'})
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

export default UserLocationsPage;
