import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiHome, FiUserPlus, FiLogOut, FiSettings, FiBell, FiUsers, FiLayers, FiAlertCircle, FiXCircle, FiCheckCircle, FiTrash2, FiClock, FiMessageSquare } from 'react-icons/fi';
import { HiOutlineShieldCheck } from 'react-icons/hi';

function Layout() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        const response = await axios.get(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(response.data);
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${API_BASE_URL}/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const clearAll = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      markAsRead(notif._id);
    }
    if (notif.relatedId) {
      navigate(`/verify-provider/${notif.relatedId}`);
    }
    setShowDropdown(false);
  };

  const getInitials = (name) => {
    if (!name) return 'A';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <HiOutlineShieldCheck />
            </div>
            <div>
              <span className="sidebar-logo-text">WorkWave</span>
              <span className="sidebar-logo-sub">Admin Panel</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main Menu</div>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiHome /></span>
            Dashboard
          </NavLink>
          <NavLink
            to="/register-admin"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiUserPlus /></span>
            Register Admin
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiUsers /></span>
            View Users
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiLayers /></span>
            Manage Categories
          </NavLink>
          <NavLink
            to="/rejected-verifications"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiXCircle /></span>
            Rejected Verifications
          </NavLink>
          <NavLink
            to="/penalty-management"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiAlertCircle /></span>
            Penalty Management
          </NavLink>
          <NavLink
            to="/inquiries"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon"><FiMessageSquare /></span>
            Inquiries
          </NavLink>

          <div className="sidebar-section-label">System</div>
          <div className="sidebar-link">
            <span className="sidebar-link-icon"><FiSettings /></span>
            Settings
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">{getInitials(adminUser.fullName)}</div>
            <div className="sidebar-profile-info">
              <div className="sidebar-profile-name">{adminUser.fullName || 'Admin'}</div>
              <div className="sidebar-profile-role">Administrator</div>
            </div>
            <button className="sidebar-logout-btn" onClick={handleLogout} title="Logout">
              <FiLogOut />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">Admin Dashboard</span>
          </div>
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                className="topbar-icon-btn"
                title="Notifications"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ position: 'relative' }}
              >
                <FiBell />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: '0',
                  width: '360px',
                  maxHeight: '480px',
                  background: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                  border: '1px solid var(--gray-100)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}>
                  {/* Dropdown Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--gray-100)',
                  }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--gray-800)' }}>
                      Notifications
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#4f46e5',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Mark all as read"
                        >
                          <FiCheckCircle size={14} />
                          Mark all read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAll}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#ef4444',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Clear all"
                        >
                          <FiTrash2 size={14} />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notification List */}
                  <div style={{ overflowY: 'auto', flex: 1, maxHeight: '360px' }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: 'var(--gray-400)',
                        fontSize: '14px',
                      }}>
                        <FiBell size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p>No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: '14px 20px',
                            borderBottom: '1px solid var(--gray-50)',
                            cursor: 'pointer',
                            background: notif.isRead ? '#fff' : '#f5f3ff',
                            transition: 'background 0.15s',
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? '#fff' : '#f5f3ff'}
                        >
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: notif.type === 'provider_registration'
                              ? '#eef2ff'
                              : notif.type === 'provider_approved'
                              ? '#ecfdf5'
                              : '#fef2f2',
                            color: notif.type === 'provider_registration'
                              ? '#4f46e5'
                              : notif.type === 'provider_approved'
                              ? '#10b981'
                              : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            flexShrink: 0,
                          }}>
                            {notif.type === 'provider_registration' ? <FiUserPlus /> : notif.type === 'provider_approved' ? <FiCheckCircle /> : <FiXCircle />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{
                              fontSize: '13px',
                              fontWeight: notif.isRead ? 500 : 700,
                              color: 'var(--gray-800)',
                              margin: '0 0 4px 0',
                              lineHeight: 1.4,
                            }}>
                              {notif.title}
                            </p>
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--gray-500)',
                              margin: 0,
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}>
                              {notif.message}
                            </p>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '6px',
                              fontSize: '11px',
                              color: 'var(--gray-400)',
                            }}>
                              <FiClock size={11} />
                              {new Date(notif.createdAt).toLocaleString()}
                            </div>
                          </div>
                          {!notif.isRead && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#4f46e5',
                              flexShrink: 0,
                              marginTop: '6px',
                            }} />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="topbar-icon-btn" title="Settings">
              <FiSettings />
            </button>
          </div>
        </header>

        {/* Page Outlet */}
        <Outlet />
      </div>
    </div>
  );
}

export default Layout;
