import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiShield, FiActivity, FiAlertCircle } from 'react-icons/fi';
import { HiOutlineBriefcase, HiOutlineUserGroup } from 'react-icons/hi';
import { API_BASE_URL } from '../config';

function HomePage() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const [stats, setStats] = useState({ adminCount: '—', providerCount: '—', seekerCount: '—' });
  const [statsLoading, setStatsLoading] = useState(true);
  const [unverifiedProviders, setUnverifiedProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchUnverifiedProviders = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/providers/unverified`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUnverifiedProviders(response.data);
      } catch (error) {
        console.error('Failed to fetch unverified providers', error);
      } finally {
        setProvidersLoading(false);
      }
    };

    fetchStats();
    fetchUnverifiedProviders();
  }, []);

  return (
    <div className="page-content">
      {/* Welcome Banner */}
      <div className="home-welcome">
        <div className="home-welcome-content">
          <h1>Welcome back, {adminUser.fullName || 'Admin'}</h1>
          <p>
            Here is your admin dashboard overview. Manage admins, monitor the platform, and keep things running smoothly.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <FiShield />
          </div>
          <div className="stat-info">
            <h3>{statsLoading ? '...' : stats.adminCount}</h3>
            <p>Total Admins</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <HiOutlineBriefcase />
          </div>
          <div className="stat-info">
            <h3>{statsLoading ? '...' : stats.providerCount}</h3>
            <p>Service Providers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <HiOutlineUserGroup />
          </div>
          <div className="stat-info">
            <h3>{statsLoading ? '...' : stats.seekerCount}</h3>
            <p>Seekers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <FiActivity />
          </div>
          <div className="stat-info">
            <h3>Active</h3>
            <p>System Status</p>
          </div>
        </div>
      </div>

      {/* Pending Verifications */}
      <div className="register-page-header" style={{ marginTop: '32px' }}>
        <div>
          <h1>Pending Verifications</h1>
          <p>Service providers awaiting NIC verification</p>
        </div>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>NIC Number</th>
              <th>District</th>
              <th>Telephone</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {providersLoading ? (
              <tr>
                <td colSpan="5" className="text-center">Loading pending verifications...</td>
              </tr>
            ) : unverifiedProviders.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px' }}>
                    <FiAlertCircle size={20} color="#9ca3af" />
                    <span>No pending verifications</span>
                  </div>
                </td>
              </tr>
            ) : (
              unverifiedProviders.map((provider) => (
                <tr
                  key={provider._id}
                  className="clickable-row"
                  onClick={() => navigate(`/verify-provider/${provider._id}`)}
                >
                  <td>{provider.email}</td>
                  <td>{provider.nicNumber}</td>
                  <td>{provider.district || 'N/A'}</td>
                  <td>{provider.telephone || 'N/A'}</td>
                  <td>{provider.category || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HomePage;
