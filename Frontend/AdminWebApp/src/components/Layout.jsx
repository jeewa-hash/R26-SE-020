import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { FiHome, FiUserPlus, FiLogOut, FiSettings, FiBell, FiUsers, FiLayers } from 'react-icons/fi';
import { HiOutlineShieldCheck } from 'react-icons/hi';

function Layout() {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');

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
          <div className="topbar-right">
            <button className="topbar-icon-btn" title="Notifications">
              <FiBell />
            </button>
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
