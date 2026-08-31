import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiShield,
  FiActivity,
  FiAlertCircle,
  FiUsers,
  FiCheckCircle,
  FiArrowRight,
  FiClock,
  FiMapPin,
  FiLayers,
  FiPlusCircle,
  FiUserCheck,
  FiServer,
  FiCalendar,
  FiCheck,
} from 'react-icons/fi';
import { HiOutlineBriefcase, HiOutlineUserGroup } from 'react-icons/hi';
import { API_BASE_URL, AUTH_SERVICE_URL } from '../config';

function HomePage() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const [stats, setStats] = useState({ adminCount: 0, providerCount: 0, seekerCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [unverifiedProviders, setUnverifiedProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [allUsers, setAllUsers] = useState({ admins: [], providers: [], seekers: [] });

  // Get current time greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const currentDateFormatted = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = localStorage.getItem('adminToken');
      const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

      try {
        const statsRes = await axios.get(`${API_BASE_URL}/dashboard-stats`, authHeaders);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setStatsLoading(false);
      }

      try {
        const unverifiedRes = await axios.get(`${API_BASE_URL}/providers/unverified`, authHeaders);
        setUnverifiedProviders(unverifiedRes.data || []);
      } catch (error) {
        console.error('Failed to fetch unverified providers', error);
      } finally {
        setProvidersLoading(false);
      }

      try {
        const usersRes = await axios.get(`${API_BASE_URL}/users`, authHeaders);
        setAllUsers(usersRes.data || { admins: [], providers: [], seekers: [] });
      } catch (error) {
        console.error('Failed to fetch all users', error);
      }
    };

    fetchDashboardData();
  }, []);

  // Compute category distribution
  const categoryStats = useMemo(() => {
    const counts = {};
    (allUsers.providers || []).forEach((p) => {
      const cat = p.category || 'General Service';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const total = (allUsers.providers || []).length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [allUsers.providers]);

  // Compute district distribution
  const districtStats = useMemo(() => {
    const counts = {};
    [...(allUsers.seekers || []), ...(allUsers.providers || [])].forEach((u) => {
      if (u.district) {
        counts[u.district] = (counts[u.district] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [allUsers]);

  const renderAvatar = (provider) => {
    let imageUrl = provider.profileImage;
    if (imageUrl) {
      const fullUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${AUTH_SERVICE_URL}/${imageUrl.replace(/^\/+/, '')}`;
      return (
        <img
          src={fullUrl}
          alt={provider.name || 'Provider'}
          className="dash-table-avatar"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      );
    }
    const initial = (
      provider.name ||
      provider.fullName ||
      (provider.email ? provider.email.split('@')[0] : 'P')
    )
      .charAt(0)
      .toUpperCase();
    return (
      <div className="dash-table-initial-avatar">
        {initial}
      </div>
    );
  };

  const totalUsersCount =
    (Number(stats.adminCount) || 0) +
    (Number(stats.providerCount) || 0) +
    (Number(stats.seekerCount) || 0);

  return (
    <div className="page-content professional-dashboard">
      {/* ─── Executive Welcome Banner ─── */}
      <div className="exec-welcome-card">
        <div className="exec-welcome-body">
          <div className="exec-badge-row">
            <span className="live-status-pill">
              <span className="live-status-dot"></span>
              WorkWave Platform • Live & Secure
            </span>
            <span className="date-chip">
              <FiCalendar style={{ marginRight: 6 }} /> {currentDateFormatted}
            </span>
          </div>

          <h1 className="exec-greeting">
            {greeting}, <span className="exec-name">{adminUser.fullName || 'Administrator'}</span>
          </h1>
          <p className="exec-subtitle">
            Platform governance overview. You have{' '}
            <strong>{unverifiedProviders.length} pending verification{unverifiedProviders.length === 1 ? '' : 's'}</strong>{' '}
            requiring administrative review.
          </p>

          <div className="exec-quick-actions">
            <button
              className="exec-btn-primary"
              onClick={() => navigate('/register-admin')}
            >
              <FiPlusCircle size={17} />
              <span>Register Admin</span>
            </button>
            <button
              className="exec-btn-secondary"
              onClick={() => navigate('/nic-verifications')}
            >
              <FiUserCheck size={17} />
              <span>Review NIC Verifications</span>
              {unverifiedProviders.length > 0 && (
                <span className="exec-pill-counter">{unverifiedProviders.length}</span>
              )}
            </button>
            <button
              className="exec-btn-glass"
              onClick={() => navigate('/users')}
            >
              <FiUsers size={17} />
              <span>View All Users</span>
            </button>
          </div>
        </div>

        <div className="exec-decorative-pattern">
          <div className="decor-circle c1"></div>
          <div className="decor-circle c2"></div>
        </div>
      </div>

      {/* ─── Executive KPI Stat Cards ─── */}
      <div className="pro-stats-grid">
        <div className="pro-stat-card" onClick={() => navigate('/users')} role="button" tabIndex={0}>
          <div className="pro-stat-header">
            <div className="pro-stat-icon purple">
              <FiShield />
            </div>
            <span className="pro-stat-badge purple">System Governance</span>
          </div>
          <div className="pro-stat-value">
            {statsLoading ? '...' : stats.adminCount}
          </div>
          <div className="pro-stat-label">Total Administrators</div>
          <div className="pro-stat-footer">
            <span className="footer-subtext">Access control & privileges</span>
            <FiArrowRight className="stat-arrow-icon" />
          </div>
        </div>

        <div className="pro-stat-card" onClick={() => navigate('/users')} role="button" tabIndex={0}>
          <div className="pro-stat-header">
            <div className="pro-stat-icon green">
              <HiOutlineBriefcase />
            </div>
            <span className="pro-stat-badge green">Verified Supply</span>
          </div>
          <div className="pro-stat-value">
            {statsLoading ? '...' : stats.providerCount}
          </div>
          <div className="pro-stat-label">Service Providers</div>
          <div className="pro-stat-footer">
            <span className="footer-subtext">Active professionals registered</span>
            <FiArrowRight className="stat-arrow-icon" />
          </div>
        </div>

        <div className="pro-stat-card" onClick={() => navigate('/users')} role="button" tabIndex={0}>
          <div className="pro-stat-header">
            <div className="pro-stat-icon blue">
              <HiOutlineUserGroup />
            </div>
            <span className="pro-stat-badge blue">Demand Side</span>
          </div>
          <div className="pro-stat-value">
            {statsLoading ? '...' : stats.seekerCount}
          </div>
          <div className="pro-stat-label">Service Seekers</div>
          <div className="pro-stat-footer">
            <span className="footer-subtext">Registered customer accounts</span>
            <FiArrowRight className="stat-arrow-icon" />
          </div>
        </div>

        <div
          className={`pro-stat-card ${unverifiedProviders.length > 0 ? 'highlight-warning' : ''}`}
          onClick={() => navigate('/nic-verifications')}
          role="button"
          tabIndex={0}
        >
          <div className="pro-stat-header">
            <div className={`pro-stat-icon ${unverifiedProviders.length > 0 ? 'orange' : 'teal'}`}>
              {unverifiedProviders.length > 0 ? <FiClock /> : <FiActivity />}
            </div>
            <span className={`pro-stat-badge ${unverifiedProviders.length > 0 ? 'orange' : 'teal'}`}>
              {unverifiedProviders.length > 0 ? 'Action Needed' : 'Operational'}
            </span>
          </div>
          <div className="pro-stat-value">
            {providersLoading ? '...' : unverifiedProviders.length}
          </div>
          <div className="pro-stat-label">Pending Verifications</div>
          <div className="pro-stat-footer">
            <span className="footer-subtext">
              {unverifiedProviders.length > 0
                ? 'Providers waiting for approval'
                : 'All verifications up to date'}
            </span>
            <FiArrowRight className="stat-arrow-icon" />
          </div>
        </div>
      </div>

      {/* ─── Two-Column Executive Dashboard Grid ─── */}
      <div className="pro-dashboard-grid">
        {/* Left Column: Pending Verifications & Quick Actions */}
        <div className="dash-column-left">
          {/* Pending Verifications Panel */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title-group">
                <div className="dash-title-icon-box">
                  <FiUserCheck />
                </div>
                <div>
                  <h2 className="dash-card-title">Pending Provider Verifications</h2>
                  <p className="dash-card-subtitle">
                    Service providers awaiting administrative NIC and credential review
                  </p>
                </div>
              </div>

              {unverifiedProviders.length > 0 && (
                <button
                  className="dash-view-all-link"
                  onClick={() => navigate('/nic-verifications')}
                >
                  <span>Review All ({unverifiedProviders.length})</span>
                  <FiArrowRight />
                </button>
              )}
            </div>

            <div className="dash-table-wrapper">
              <table className="users-table pro-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>NIC Number</th>
                    <th>Category</th>
                    <th>District</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {providersLoading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8">
                        <div className="dash-loading-spinner" />
                        <span style={{ color: 'var(--gray-400)', fontSize: 14 }}>
                          Loading pending verifications...
                        </span>
                      </td>
                    </tr>
                  ) : unverifiedProviders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center">
                        <div className="dash-empty-state">
                          <div className="dash-empty-icon">
                            <FiCheckCircle size={32} color="#10b981" />
                          </div>
                          <h3>All Clear! No Pending Verifications</h3>
                          <p>
                            Every service provider in the system has been verified and approved.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    unverifiedProviders.slice(0, 5).map((provider) => {
                      const pName =
                        provider.name ||
                        provider.fullName ||
                        (provider.email ? provider.email.split('@')[0] : 'Provider');

                      return (
                        <tr
                          key={provider._id}
                          className="clickable-row"
                          onClick={() => navigate(`/verify-provider/${provider._id}`)}
                        >
                          <td>
                            <div className="dash-provider-cell">
                              {renderAvatar(provider)}
                              <div className="dash-provider-text">
                                <span className="dash-provider-name">{pName}</span>
                                <span className="dash-provider-email">{provider.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="nic-tag">{provider.nicNumber || 'N/A'}</span>
                          </td>
                          <td>
                            <span className="category-pill">{provider.category || 'General'}</span>
                          </td>
                          <td>
                            <span className="district-text">
                              <FiMapPin style={{ marginRight: 4, color: 'var(--gray-400)' }} />
                              {provider.district || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <span className="status-badge pending">
                              <FiClock size={12} style={{ marginRight: 4 }} /> Pending
                            </span>
                          </td>
                          <td>
                            <button
                              className="dash-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/verify-provider/${provider._id}`);
                              }}
                            >
                              Verify <FiArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Analytics */}
        <div className="dash-column-right">
          {/* Category Distribution Card */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-sidebar-title">Service Category Demand</h3>
            </div>

            <div className="category-bars-list">
              {categoryStats.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-4">No categories registered yet</div>
              ) : (
                categoryStats.map((item, idx) => (
                  <div key={idx} className="category-bar-item">
                    <div className="category-bar-label-row">
                      <span className="category-bar-name">{item.name}</span>
                      <span className="category-bar-count">
                        {item.count} pro{item.count === 1 ? '' : 's'} ({item.percent}%)
                      </span>
                    </div>
                    <div className="category-progress-track">
                      <div
                        className={`category-progress-fill color-${idx % 4}`}
                        style={{ width: `${Math.max(item.percent, 8)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Regional Presence Card */}
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-sidebar-title">Top Regional Activity</h3>
            </div>

            <div className="regional-list">
              {districtStats.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-4">No location data available</div>
              ) : (
                districtStats.map((item, idx) => (
                  <div key={idx} className="regional-item">
                    <div className="regional-left">
                      <span className="regional-rank">{idx + 1}</span>
                      <span className="regional-name">{item.district}</span>
                    </div>
                    <span className="regional-count-badge">{item.count} users</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
