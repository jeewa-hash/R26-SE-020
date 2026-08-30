import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  FiUser, FiMail, FiPhone, FiShield, FiLock, 
  FiEye, FiEyeOff, FiCheck, FiX, FiAlertCircle, FiSave, 
  FiKey, FiClock, FiCheckCircle, FiLogOut 
} from 'react-icons/fi';
import { HiOutlineShieldCheck } from 'react-icons/hi';
import { API_BASE_URL } from '../config';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();

  // Initial & Current Profile States
  const [initialProfile, setInitialProfile] = useState({
    fullName: '',
    email: '',
    telephone: '',
    nic: '',
    role: 'Admin',
    createdAt: '',
  });

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    telephone: '',
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Change States
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Fetch admin profile
  useEffect(() => {
    const fetchAdminProfile = async () => {
      setLoadingProfile(true);
      try {
        const token = localStorage.getItem('adminToken');
        const storedAdmin = JSON.parse(localStorage.getItem('adminUser') || '{}');

        if (token) {
          const response = await axios.get(`${API_BASE_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.data) {
            const data = response.data;
            const profileData = {
              fullName: data.fullName || storedAdmin.fullName || '',
              email: data.email || storedAdmin.email || '',
              telephone: data.telephone || storedAdmin.telephone || '',
              nic: data.nic || storedAdmin.nic || 'Verified ID',
              role: data.role || 'Admin',
              createdAt: data.createdAt || '',
            };

            setInitialProfile(profileData);
            setProfileForm({
              fullName: profileData.fullName,
              email: profileData.email,
              telephone: profileData.telephone,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch admin profile:', err);
        const storedAdmin = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const fallback = {
          fullName: storedAdmin.fullName || 'WorkWave Admin',
          email: storedAdmin.email || 'admin@workwave.lk',
          telephone: storedAdmin.telephone || '',
          nic: storedAdmin.nic || 'Verified Admin',
          role: 'Administrator',
          createdAt: '',
        };
        setInitialProfile(fallback);
        setProfileForm({
          fullName: fallback.fullName,
          email: fallback.email,
          telephone: fallback.telephone,
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchAdminProfile();
  }, []);

  // Check if profile is dirty (has modifications)
  const isProfileDirty = useMemo(() => {
    return (
      profileForm.fullName.trim() !== initialProfile.fullName.trim() ||
      profileForm.email.trim() !== initialProfile.email.trim() ||
      profileForm.telephone.trim() !== initialProfile.telephone.trim()
    );
  }, [profileForm, initialProfile]);

  // Live Password Validations
  const passwordValidations = useMemo(() => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    const hasCurrent = currentPassword.length > 0;
    const hasMinLength = newPassword.length >= 6;
    const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
    const isDifferentFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
    const matchesConfirm = confirmPassword.length > 0 && confirmPassword === newPassword;
    const confirmTouched = confirmPassword.length > 0;

    // Strength score (0 to 3)
    let strengthScore = 0;
    if (newPassword.length >= 6) strengthScore++;
    if (newPassword.length >= 8 && /[A-Z]/.test(newPassword)) strengthScore++;
    if (hasNumberOrSpecial) strengthScore++;

    const isAllValid = hasCurrent && hasMinLength && hasNumberOrSpecial && isDifferentFromCurrent && matchesConfirm;

    return {
      hasCurrent,
      hasMinLength,
      hasNumberOrSpecial,
      isDifferentFromCurrent,
      matchesConfirm,
      confirmTouched,
      strengthScore,
      isAllValid,
    };
  }, [passwordForm]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!isProfileDirty || profileSaving) return;

    setProfileSaving(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `${API_BASE_URL}/profile`,
        {
          fullName: profileForm.fullName,
          email: profileForm.email,
          telephone: profileForm.telephone,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data) {
        setProfileSuccessMsg('Admin profile details updated successfully!');
        setInitialProfile((prev) => ({
          ...prev,
          fullName: profileForm.fullName,
          email: profileForm.email,
          telephone: profileForm.telephone,
        }));

        // Update local storage so navbar/sidebar names reflect changes
        const currentAdmin = JSON.parse(localStorage.getItem('adminUser') || '{}');
        localStorage.setItem(
          'adminUser',
          JSON.stringify({
            ...currentAdmin,
            fullName: profileForm.fullName,
            email: profileForm.email,
            telephone: profileForm.telephone,
          })
        );
      }
    } catch (err) {
      console.error('Update profile error:', err);
      setProfileErrorMsg(err.response?.data?.message || 'Failed to update profile details. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Password Change & Immediate Logout
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!passwordValidations.isAllValid || passwordSaving || isRedirecting) return;

    setPasswordSaving(true);
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `${API_BASE_URL}/change-password`,
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data) {
        setIsRedirecting(true);
        setPasswordSuccessMsg('Password changed successfully! You will now be redirected to the login page...');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });

        // Immediately logout and redirect
        setTimeout(() => {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminUser');
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      console.error('Change password error:', err);
      setPasswordErrorMsg(err.response?.data?.message || 'Failed to change password. Please check your current password.');
      setPasswordSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'AD';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="profile-page animate-fade-in">
      {/* Top Banner Card */}
      <div className="profile-header-card">
        <div className="profile-header-left">
          <div className="profile-avatar-large">
            {getInitials(profileForm.fullName || initialProfile.fullName)}
          </div>
          <div className="profile-header-info">
            <div className="profile-role-badge">
              <HiOutlineShieldCheck /> Administrator Account
            </div>
            <h2>{profileForm.fullName || initialProfile.fullName}</h2>
            <p className="profile-header-sub">
              {profileForm.email || initialProfile.email}
            </p>
          </div>
        </div>

        <div className="profile-header-badges">
          <div className="security-badge">
            <FiShield className="text-emerald" /> High Privilege Access
          </div>
        </div>
      </div>

      {/* 1. Profile Details Update Section */}
      <div className="profile-section-card">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-icon-wrap indigo">
              <FiUser />
            </div>
            <div>
              <h3>Admin Profile Information</h3>
              <p>Manage your account personal information and contact details.</p>
            </div>
          </div>
          {isProfileDirty && (
            <span className="unsaved-changes-tag">
              ● Unsaved Changes Detected
            </span>
          )}
        </div>

        {profileSuccessMsg && (
          <div className="alert-box success">
            <FiCheckCircle /> {profileSuccessMsg}
          </div>
        )}

        {profileErrorMsg && (
          <div className="alert-box error">
            <FiAlertCircle /> {profileErrorMsg}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="profile-form">
          <div className="form-grid">
            {/* Full Name */}
            <div className="form-group">
              <label>
                <FiUser /> Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={profileForm.fullName}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, fullName: e.target.value });
                  setProfileSuccessMsg('');
                  setProfileErrorMsg('');
                }}
                required
              />
            </div>

            {/* Email Address */}
            <div className="form-group">
              <label>
                <FiMail /> Email Address
              </label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={profileForm.email}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, email: e.target.value });
                  setProfileSuccessMsg('');
                  setProfileErrorMsg('');
                }}
                required
              />
            </div>

            {/* Telephone */}
            <div className="form-group">
              <label>
                <FiPhone /> Contact Number
              </label>
              <input
                type="text"
                placeholder="e.g. +94 77 123 4567"
                value={profileForm.telephone}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, telephone: e.target.value });
                  setProfileSuccessMsg('');
                  setProfileErrorMsg('');
                }}
              />
            </div>

            {/* NIC Number (Readonly) */}
            <div className="form-group">
              <label>
                <FiShield /> National Identity Card (NIC)
              </label>
              <input
                type="text"
                value={initialProfile.nic || 'Verified'}
                disabled
                className="input-disabled"
                title="NIC is permanently verified and cannot be altered"
              />
            </div>

            {/* System Role (Readonly) */}
            <div className="form-group">
              <label>
                <HiOutlineShieldCheck /> System Access Level
              </label>
              <input
                type="text"
                value="WorkWave Administrator (Super)"
                disabled
                className="input-disabled"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="form-action-row">
            <button
              type="submit"
              disabled={!isProfileDirty || profileSaving}
              className={`submit-btn ${!isProfileDirty ? 'btn-disabled' : 'btn-active'}`}
            >
              <FiSave /> {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
            {!isProfileDirty && (
              <span className="button-hint-text">
                Edit any field above to enable the save button.
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 2. Password Change Section */}
      <div className="profile-section-card security-card">
        <div className="section-header">
          <div className="section-title-wrap">
            <div className="section-icon-wrap rose">
              <FiKey />
            </div>
            <div>
              <h3>Security & Password Management</h3>
              <p>Change your administrator account login password with live security validation.</p>
            </div>
          </div>
          <div className="security-status-badge">
            <HiOutlineShieldCheck /> Active Security Policy
          </div>
        </div>

        {passwordSuccessMsg && (
          <div className="alert-box success">
            <FiCheckCircle /> {passwordSuccessMsg}
          </div>
        )}

        {passwordErrorMsg && (
          <div className="alert-box error">
            <FiAlertCircle /> {passwordErrorMsg}
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="profile-form">
          <div className="form-grid password-grid">
            {/* Current Password */}
            <div className="form-group">
              <label>
                <FiLock /> Current Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value });
                    setPasswordSuccessMsg('');
                    setPasswordErrorMsg('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  tabIndex="-1"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="form-group">
              <label>
                <FiLock /> New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter new password (min. 6 chars)"
                  value={passwordForm.newPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value });
                    setPasswordSuccessMsg('');
                    setPasswordErrorMsg('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex="-1"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group">
              <label>
                <FiLock /> Confirm New Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-type new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => {
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value });
                    setPasswordSuccessMsg('');
                    setPasswordErrorMsg('');
                  }}
                  required
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          </div>

          {/* Live Validation Feedback Box - Elegant Security Dashboard */}
          <div className="password-validation-box">
            <div className="validation-header-row">
              <span className="validation-title">
                <FiShield /> Password Security Requirements
              </span>
              {passwordForm.newPassword.length > 0 && (
                <span className={`strength-badge strength-${passwordValidations.strengthScore}`}>
                  Strength: {passwordValidations.strengthScore === 3 ? 'Strong' : passwordValidations.strengthScore === 2 ? 'Medium' : 'Weak'}
                </span>
              )}
            </div>

            {/* Password Strength Progress Bar */}
            {passwordForm.newPassword.length > 0 && (
              <div className="strength-meter-wrap">
                <div className="strength-bar-bg">
                  <div 
                    className={`strength-bar-fill strength-${passwordValidations.strengthScore}`}
                    style={{ width: `${(passwordValidations.strengthScore / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* 4 Elegant Security Requirement Chips */}
            <div className="validation-rules-list">
              <div className={`rule-item ${passwordValidations.hasMinLength ? 'valid' : passwordForm.newPassword.length > 0 ? 'invalid' : 'pending'}`}>
                <span className="rule-icon">
                  {passwordValidations.hasMinLength ? <FiCheck /> : passwordForm.newPassword.length > 0 ? <FiX /> : <FiClock />}
                </span>
                <span className="rule-text">At least 6 characters in length</span>
              </div>

              <div className={`rule-item ${passwordValidations.hasNumberOrSpecial ? 'valid' : passwordForm.newPassword.length > 0 ? 'invalid' : 'pending'}`}>
                <span className="rule-icon">
                  {passwordValidations.hasNumberOrSpecial ? <FiCheck /> : passwordForm.newPassword.length > 0 ? <FiX /> : <FiClock />}
                </span>
                <span className="rule-text">Contains numbers or special symbols</span>
              </div>

              <div className={`rule-item ${passwordValidations.isDifferentFromCurrent ? 'valid' : passwordForm.newPassword.length > 0 ? 'invalid' : 'pending'}`}>
                <span className="rule-icon">
                  {passwordValidations.isDifferentFromCurrent ? <FiCheck /> : passwordForm.newPassword.length > 0 ? <FiX /> : <FiClock />}
                </span>
                <span className="rule-text">Different from current password</span>
              </div>

              <div className={`rule-item ${passwordValidations.matchesConfirm ? 'valid' : passwordValidations.confirmTouched ? 'invalid' : 'pending'}`}>
                <span className="rule-icon">
                  {passwordValidations.matchesConfirm ? (
                    <FiCheck />
                  ) : passwordValidations.confirmTouched ? (
                    <FiX />
                  ) : (
                    <FiClock />
                  )}
                </span>
                <span className="rule-text">
                  {passwordValidations.confirmTouched && !passwordValidations.matchesConfirm
                    ? 'Passwords do not match'
                    : passwordValidations.matchesConfirm
                    ? 'Passwords match successfully'
                    : 'Confirm password must match'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="form-action-row">
            <button
              type="submit"
              disabled={!passwordValidations.isAllValid || passwordSaving || isRedirecting}
              className={`submit-btn ${!passwordValidations.isAllValid ? 'btn-disabled' : 'btn-active-rose'}`}
            >
              <FiKey /> {passwordSaving ? 'Updating Password...' : isRedirecting ? 'Redirecting to Login...' : 'Update Password'}
            </button>
            {!passwordValidations.isAllValid && (
              <span className="button-hint-text">
                <FiLock className="hint-lock-icon" /> Complete all password security requirements above to enable update.
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
