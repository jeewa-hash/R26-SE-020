import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiUsers, FiUserPlus, FiActivity, FiShield } from 'react-icons/fi';
import { HiOutlineBriefcase, HiOutlineUserGroup } from 'react-icons/hi';
import { API_BASE_URL } from '../config';

function HomePage() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const [stats, setStats] = useState({ adminCount: '—', providerCount: '—', seekerCount: '—' });
  const [loading, setLoading] = useState(true);

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
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="page-content">
      {/* Welcome Banner */}
      <div className="home-welcome">
        <div className="home-welcome-content">
          <h1>Welcome back, {adminUser.fullName || 'Admin'} 👋</h1>
          <p>
            Here's your admin dashboard overview. Manage admins, monitor the platform, and keep things running smoothly.
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
            <h3>{loading ? '...' : stats.adminCount}</h3>
            <p>Total Admins</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <HiOutlineBriefcase />
          </div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.providerCount}</h3>
            <p>Service Providers</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <HiOutlineUserGroup />
          </div>
          <div className="stat-info">
            <h3>{loading ? '...' : stats.seekerCount}</h3>
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

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => navigate('/register-admin')}>
            <FiUserPlus className="qa-icon" />
            Register New Admin
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/users')}>
            <FiUsers className="qa-icon" />
            View All Users
          </button>
          <button className="quick-action-btn">
            <HiOutlineBriefcase className="qa-icon" />
            Manage Providers
          </button>
          <button className="quick-action-btn">
            <FiActivity className="qa-icon" />
            View Activity Logs
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
