import { useState, useEffect } from 'react';
import { 
  FiSettings, FiSun, FiMoon, FiMonitor, FiBell, 
  FiBellOff, FiVolume2, FiVolumeX, FiCheck, FiRefreshCw, 
  FiShield, FiMapPin, FiClock, FiSave, FiRotateCcw, FiCheckCircle
} from 'react-icons/fi';
import './SettingsPage.css';

const SettingsPage = () => {
  // Theme state: 'light' | 'dark' | 'system'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('admin_theme') || 'light';
  });

  // Notification Preferences
  const [muteAllNotifications, setMuteAllNotifications] = useState(() => {
    return localStorage.getItem('admin_mute_notifications') === 'true';
  });

  const [soundAlerts, setSoundAlerts] = useState(() => {
    const val = localStorage.getItem('admin_sound_alerts');
    return val !== null ? val === 'true' : true;
  });

  const [browserPush, setBrowserPush] = useState(() => {
    const val = localStorage.getItem('admin_browser_push');
    return val !== null ? val === 'true' : true;
  });

  const [emailAlerts, setEmailAlerts] = useState(() => {
    const val = localStorage.getItem('admin_email_alerts');
    return val !== null ? val === 'true' : true;
  });

  // System & Regional Preferences
  const [defaultDistrict, setDefaultDistrict] = useState(() => {
    return localStorage.getItem('admin_default_district') || 'All';
  });

  const [autoRefreshInterval, setAutoRefreshInterval] = useState(() => {
    return localStorage.getItem('admin_refresh_interval') || '60';
  });

  const [sessionTimeout, setSessionTimeout] = useState(() => {
    return localStorage.getItem('admin_session_timeout') || '60';
  });

  // Feedback States
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Apply Theme to document root
  const applyThemeMode = (selectedTheme) => {
    let effectiveTheme = selectedTheme;
    if (selectedTheme === 'system') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    if (effectiveTheme === 'dark') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };

  useEffect(() => {
    applyThemeMode(theme);
  }, [theme]);

  // Handle Theme Change
  const handleThemeSelect = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('admin_theme', newTheme);
    applyThemeMode(newTheme);
    triggerSaveToast();
  };

  // Trigger brief Save Notification Toast
  const triggerSaveToast = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  // Save all settings explicitly
  const handleSaveSettings = (e) => {
    if (e) e.preventDefault();

    localStorage.setItem('admin_theme', theme);
    localStorage.setItem('admin_mute_notifications', String(muteAllNotifications));
    localStorage.setItem('admin_sound_alerts', String(soundAlerts));
    localStorage.setItem('admin_browser_push', String(browserPush));
    localStorage.setItem('admin_email_alerts', String(emailAlerts));
    localStorage.setItem('admin_default_district', defaultDistrict);
    localStorage.setItem('admin_refresh_interval', autoRefreshInterval);
    localStorage.setItem('admin_session_timeout', sessionTimeout);

    applyThemeMode(theme);
    triggerSaveToast();
  };

  // Reset to default settings
  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to reset all preferences to default values?')) {
      const defTheme = 'light';
      const defMute = false;
      const defSound = true;
      const defPush = true;
      const defEmail = true;
      const defDistrict = 'All';
      const defRefresh = '60';
      const defTimeout = '60';

      setTheme(defTheme);
      setMuteAllNotifications(defMute);
      setSoundAlerts(defSound);
      setBrowserPush(defPush);
      setEmailAlerts(defEmail);
      setDefaultDistrict(defDistrict);
      setAutoRefreshInterval(defRefresh);
      setSessionTimeout(defTimeout);

      localStorage.setItem('admin_theme', defTheme);
      localStorage.setItem('admin_mute_notifications', 'false');
      localStorage.setItem('admin_sound_alerts', 'true');
      localStorage.setItem('admin_browser_push', 'true');
      localStorage.setItem('admin_email_alerts', 'true');
      localStorage.setItem('admin_default_district', defDistrict);
      localStorage.setItem('admin_refresh_interval', defRefresh);
      localStorage.setItem('admin_session_timeout', defTimeout);

      applyThemeMode(defTheme);

      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 2500);
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      {/* Header Banner */}
      <div className="settings-header-card">
        <div className="settings-header-info">
          <div className="settings-badge">
            <FiSettings /> System & Platform Preferences
          </div>
          <h1>System Settings & Personalization</h1>
          <p>
            Customize your administrator environment, toggle Dark/Light appearance themes, manage notification alerts, and configure regional defaults.
          </p>
        </div>

        <div className="settings-header-actions">
          <button className="settings-reset-btn" onClick={handleResetDefaults} title="Reset all to defaults">
            <FiRotateCcw /> Reset Defaults
          </button>
          <button className="settings-save-btn" onClick={handleSaveSettings}>
            <FiSave /> Save Changes
          </button>
        </div>
      </div>

      {/* Floating Success Toast */}
      {savedSuccess && (
        <div className="settings-toast-banner success">
          <FiCheckCircle /> Settings updated and applied successfully!
        </div>
      )}
      {resetSuccess && (
        <div className="settings-toast-banner info">
          <FiRotateCcw /> Preferences restored to factory defaults.
        </div>
      )}

      <div className="settings-content-grid">
        {/* ================= 1. THEME & APPEARANCE ================= */}
        <div className="settings-section-card">
          <div className="section-card-header">
            <div className="section-icon-bubble indigo">
              <FiSun />
            </div>
            <div>
              <h3>Interface Appearance & Theme Mode</h3>
              <p>Choose your visual presentation mode for the WorkWave Admin Panel.</p>
            </div>
          </div>

          <div className="theme-options-grid">
            {/* Light Mode */}
            <div 
              className={`theme-card ${theme === 'light' ? 'selected' : ''}`}
              onClick={() => handleThemeSelect('light')}
            >
              <div className="theme-preview light-preview">
                <div className="preview-top-bar"></div>
                <div className="preview-body">
                  <div className="preview-side"></div>
                  <div className="preview-content">
                    <div className="preview-block active"></div>
                    <div className="preview-block"></div>
                  </div>
                </div>
              </div>
              <div className="theme-card-info">
                <div className="theme-title-row">
                  <span className="theme-name"><FiSun className="text-amber" /> Light Mode</span>
                  {theme === 'light' && <span className="active-pill"><FiCheck /> Active</span>}
                </div>
                <p className="theme-desc">Clean, high-contrast, daytime illumination interface.</p>
              </div>
            </div>

            {/* Dark Mode */}
            <div 
              className={`theme-card ${theme === 'dark' ? 'selected' : ''}`}
              onClick={() => handleThemeSelect('dark')}
            >
              <div className="theme-preview dark-preview">
                <div className="preview-top-bar dark"></div>
                <div className="preview-body dark">
                  <div className="preview-side dark"></div>
                  <div className="preview-content dark">
                    <div className="preview-block dark-active"></div>
                    <div className="preview-block dark-subtle"></div>
                  </div>
                </div>
              </div>
              <div className="theme-card-info">
                <div className="theme-title-row">
                  <span className="theme-name"><FiMoon className="text-indigo" /> Dark Mode</span>
                  {theme === 'dark' && <span className="active-pill"><FiCheck /> Active</span>}
                </div>
                <p className="theme-desc">Deep obsidian charcoal, reduced eye fatigue for low-light work.</p>
              </div>
            </div>

            {/* System Auto */}
            <div 
              className={`theme-card ${theme === 'system' ? 'selected' : ''}`}
              onClick={() => handleThemeSelect('system')}
            >
              <div className="theme-preview system-preview">
                <div className="preview-half left"></div>
                <div className="preview-half right"></div>
              </div>
              <div className="theme-card-info">
                <div className="theme-title-row">
                  <span className="theme-name"><FiMonitor /> System Auto</span>
                  {theme === 'system' && <span className="active-pill"><FiCheck /> Active</span>}
                </div>
                <p className="theme-desc">Automatically synchronize with your operating system theme.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 2. NOTIFICATIONS & SOUNDS ================= */}
        <div className="settings-section-card">
          <div className="section-card-header">
            <div className="section-icon-bubble rose">
              {muteAllNotifications ? <FiBellOff /> : <FiBell />}
            </div>
            <div>
              <h3>Notification Alerts & Sound Controls</h3>
              <p>Configure real-time administrative alert delivery, audio chimes, and push notifications.</p>
            </div>
          </div>

          <div className="settings-toggles-list">
            {/* Master Mute Toggle */}
            <div className={`setting-toggle-item highlight-mute ${muteAllNotifications ? 'active-mute' : ''}`}>
              <div className="toggle-info-col">
                <div className="toggle-label-row">
                  <span className="toggle-icon-wrap">
                    {muteAllNotifications ? <FiVolumeX className="text-rose" /> : <FiVolume2 className="text-emerald" />}
                  </span>
                  <span className="toggle-title">Mute All Notifications</span>
                  {muteAllNotifications && <span className="status-badge-muted">MUTED</span>}
                </div>
                <p className="toggle-desc">
                  Silence all audio alerts and popup banners during high-focus administrative sessions.
                </p>
              </div>
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  checked={muteAllNotifications} 
                  onChange={(e) => {
                    setMuteAllNotifications(e.target.checked);
                    localStorage.setItem('admin_mute_notifications', String(e.target.checked));
                    triggerSaveToast();
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Sound Alerts */}
            <div className="setting-toggle-item">
              <div className="toggle-info-col">
                <div className="toggle-label-row">
                  <span className="toggle-icon-wrap"><FiVolume2 /></span>
                  <span className="toggle-title">Audio Sound Chimes</span>
                </div>
                <p className="toggle-desc">
                  Play an auditory notification bell when high-priority provider registrations or alerts arrive.
                </p>
              </div>
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  disabled={muteAllNotifications}
                  checked={soundAlerts && !muteAllNotifications} 
                  onChange={(e) => {
                    setSoundAlerts(e.target.checked);
                    localStorage.setItem('admin_sound_alerts', String(e.target.checked));
                    triggerSaveToast();
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Browser Push */}
            <div className="setting-toggle-item">
              <div className="toggle-info-col">
                <div className="toggle-label-row">
                  <span className="toggle-icon-wrap"><FiMonitor /></span>
                  <span className="toggle-title">Browser Desktop Notifications</span>
                </div>
                <p className="toggle-desc">
                  Display system desktop notification popups even when the Admin panel tab is minimized.
                </p>
              </div>
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  disabled={muteAllNotifications}
                  checked={browserPush && !muteAllNotifications} 
                  onChange={(e) => {
                    setBrowserPush(e.target.checked);
                    localStorage.setItem('admin_browser_push', String(e.target.checked));
                    triggerSaveToast();
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Email Alerts */}
            <div className="setting-toggle-item">
              <div className="toggle-info-col">
                <div className="toggle-label-row">
                  <span className="toggle-icon-wrap"><FiShield /></span>
                  <span className="toggle-title">Critical Security & Audit Email Alerts</span>
                </div>
                <p className="toggle-desc">
                  Receive email alerts for administrator password changes and provider account suspensions.
                </p>
              </div>
              <label className="switch-toggle">
                <input 
                  type="checkbox" 
                  checked={emailAlerts} 
                  onChange={(e) => {
                    setEmailAlerts(e.target.checked);
                    localStorage.setItem('admin_email_alerts', String(e.target.checked));
                    triggerSaveToast();
                  }}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        {/* ================= 3. REGIONAL & ANALYTICS PREFERENCES ================= */}
        <div className="settings-section-card">
          <div className="section-card-header">
            <div className="section-icon-bubble emerald">
              <FiMapPin />
            </div>
            <div>
              <h3>Regional & Performance Defaults</h3>
              <p>Set default filters for district reporting, revenue aggregation, and data sync rates.</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="setting-form-group">
              <label><FiMapPin /> Default Regional District View</label>
              <select 
                value={defaultDistrict}
                onChange={(e) => {
                  setDefaultDistrict(e.target.value);
                  localStorage.setItem('admin_default_district', e.target.value);
                  triggerSaveToast();
                }}
              >
                <option value="All">All Districts (National Overview)</option>
                <option value="Colombo">Colombo District</option>
                <option value="Gampaha">Gampaha District</option>
              </select>
              <span className="field-hint">Initial district filter pre-selected upon visiting Analytics & Reports.</span>
            </div>

            <div className="setting-form-group">
              <label><FiRefreshCw /> Analytics Live Polling Interval</label>
              <select 
                value={autoRefreshInterval}
                onChange={(e) => {
                  setAutoRefreshInterval(e.target.value);
                  localStorage.setItem('admin_refresh_interval', e.target.value);
                  triggerSaveToast();
                }}
              >
                <option value="30">Every 30 Seconds (Real-Time)</option>
                <option value="60">Every 1 Minute (Recommended)</option>
                <option value="300">Every 5 Minutes</option>
                <option value="manual">Manual Refresh Only</option>
              </select>
              <span className="field-hint">Frequency of automatic background data synchronization for dashboards.</span>
            </div>

            <div className="setting-form-group">
              <label><FiClock /> Admin Inactivity Session Lock</label>
              <select 
                value={sessionTimeout}
                onChange={(e) => {
                  setSessionTimeout(e.target.value);
                  localStorage.setItem('admin_session_timeout', e.target.value);
                  triggerSaveToast();
                }}
              >
                <option value="30">30 Minutes of Inactivity</option>
                <option value="60">1 Hour of Inactivity</option>
                <option value="240">4 Hours of Inactivity</option>
                <option value="never">Do not auto-lock session</option>
              </select>
              <span className="field-hint">Automatic security timeout to protect unauthorized portal access.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
