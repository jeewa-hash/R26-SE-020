import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiShield,
  FiActivity,
  FiKey,
  FiAlertCircle,
  FiCheckCircle,
  FiArrowLeft,
  FiRefreshCw,
  FiCheck,
  FiX
} from 'react-icons/fi';
import { API_BASE_URL } from '../config';
import workwaveLogo from '../assets/logo.png';

function LoginPage() {
  const navigate = useNavigate();

  // Login form state
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password flow state: 'email' | 'otp' | 'password' | 'success'
  const [resetStep, setResetStep] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  const otpInputRefs = useRef([]);

  // Always force Light Theme on Login Page
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.classList.remove('dark-theme');
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Live Password Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpperLower = /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;

  // Strength score calculation (0 - 100)
  const strengthScore = [hasMinLength, hasUpperLower, hasNumber, hasSpecial].filter(Boolean).length * 25;
  const getStrengthMeta = () => {
    if (strengthScore <= 25) return { label: 'Weak', color: '#ef4444' };
    if (strengthScore <= 50) return { label: 'Fair', color: '#f59e0b' };
    if (strengthScore <= 75) return { label: 'Good', color: '#3b82f6' };
    return { label: 'Strong', color: '#10b981' };
  };
  const strengthMeta = getStrengthMeta();

  // Handle Admin Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { email, password });
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminUser', JSON.stringify(res.data.admin));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccessMsg('');
    setResetLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/forgot-password`, { email: resetEmail });
      setResetSuccessMsg(res.data.message || 'Verification code sent to your email.');
      setResetStep('otp');
      setCountdown(60); // 60s cooldown for resend
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setResetLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resetLoading) return;
    setResetError('');
    setResetSuccessMsg('');
    setResetLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/forgot-password`, { email: resetEmail });
      setResetSuccessMsg('A new verification code has been dispatched to your email.');
      setCountdown(60);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setResetLoading(false);
    }
  };

  // Handle OTP digit typing
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto focus next box
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1].focus();
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0 && otpInputRefs.current[index - 1]) {
      otpInputRefs.current[index - 1].focus();
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setResetError('Please enter the complete 6-digit verification code.');
      return;
    }

    setResetError('');
    setResetSuccessMsg('');
    setResetLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/verify-otp`, {
        email: resetEmail,
        otp: fullOtp
      });
      setResetSuccessMsg(res.data.message || 'Code verified successfully.');
      setResetStep('password');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!hasMinLength) {
      setResetError('Password must be at least 8 characters long.');
      return;
    }
    if (!passwordsMatch) {
      setResetError('Passwords do not match. Please re-check.');
      return;
    }

    setResetError('');
    setResetSuccessMsg('');
    setResetLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/reset-password`, {
        email: resetEmail,
        otp: otp.join(''),
        newPassword
      });
      setResetSuccessMsg(res.data.message || 'Password reset successfully!');
      setResetStep('success');
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  // Switch to login
  const handleSwitchToLogin = () => {
    setAuthMode('login');
    setResetStep('email');
    setResetError('');
    setResetSuccessMsg('');
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Branding Panel */}
        <div className="login-branding">
          <div className="login-branding-content">
            <div className="login-logo-wrapper">
              <img src={workwaveLogo} alt="WorkWave Logo" className="login-logo-img" />
            </div>
            <p className="login-tagline">
              Admin Control Portal — Manage your platform, users, analytics, and services with full authority.
            </p>

            <div className="login-feature-list">
              <div className="login-feature-item">
                <FiShield className="feature-icon" />
                <span>256-bit Encrypted Session</span>
              </div>
              <div className="login-feature-item">
                <FiActivity className="feature-icon" />
                <span>Real-time Platform Monitoring</span>
              </div>
              <div className="login-feature-item">
                <FiKey className="feature-icon" />
                <span>Role-Based Access Control</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="login-form-panel">
          {authMode === 'login' ? (
            /* ===== LOGIN FORM ===== */
            <>
              <h2>Sign In</h2>
              <p className="login-subtitle">Enter your administrator account credentials</p>

              {error && (
                <div className="alert alert-error">
                  <FiAlertCircle className="alert-icon" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="login-email">Email Address</label>
                  <div className="input-with-icon">
                    <FiMail className="input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      className="form-input"
                      placeholder="admin@workwave.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-with-forgot">
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="forgot-password-link"
                      onClick={() => {
                        setAuthMode('forgot');
                        setResetStep('email');
                        setResetEmail(email);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-with-icon">
                    <FiLock className="input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading && <span className="spinner" />}
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div className="login-security-notice">
                  <FiShield className="notice-icon" />
                  <span>Authorized Administrator Access Only • Session Monitored</span>
                </div>
              </form>
            </>
          ) : (
            /* ===== FORGOT PASSWORD FLOW ===== */
            <div className="forgot-flow-container">
              {resetStep === 'email' && (
                /* Step 1: Request OTP */
                <>
                  <button type="button" className="btn-back-link" onClick={handleSwitchToLogin}>
                    <FiArrowLeft /> Back to Sign In
                  </button>

                  <h2 className="mt-2">Reset Password</h2>
                  <p className="login-subtitle">
                    Enter your registered administrator email to receive a 6-digit verification code.
                  </p>

                  {resetError && (
                    <div className="alert alert-error">
                      <FiAlertCircle className="alert-icon" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRequestOtp}>
                    <div className="form-group">
                      <label htmlFor="reset-email">Registered Admin Email</label>
                      <div className="input-with-icon">
                        <FiMail className="input-icon" />
                        <input
                          id="reset-email"
                          type="email"
                          className="form-input"
                          placeholder="admin@workwave.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={resetLoading || !resetEmail}>
                      {resetLoading && <span className="spinner" />}
                      {resetLoading ? 'Sending Verification Code...' : 'Send Verification Code'}
                    </button>
                  </form>
                </>
              )}

              {resetStep === 'otp' && (
                /* Step 2: Enter 6-digit OTP */
                <>
                  <button type="button" className="btn-back-link" onClick={() => setResetStep('email')}>
                    <FiArrowLeft /> Change Email
                  </button>

                  <h2 className="mt-2">Verify Security Code</h2>
                  <p className="login-subtitle">
                    Enter the 6-digit OTP code sent to <strong>{resetEmail}</strong>
                  </p>

                  {resetSuccessMsg && (
                    <div className="alert alert-success">
                      <FiCheckCircle className="alert-icon" />
                      <span>{resetSuccessMsg}</span>
                    </div>
                  )}

                  {resetError && (
                    <div className="alert alert-error">
                      <FiAlertCircle className="alert-icon" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp}>
                    <div className="otp-inputs-grid">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputRefs.current[idx] = el)}
                          type="text"
                          maxLength="1"
                          inputMode="numeric"
                          className="otp-digit-box"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>

                    <div className="otp-resend-row">
                      <span className="otp-resend-hint">Didn't receive code?</span>
                      <button
                        type="button"
                        className="btn-resend-otp"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || resetLoading}
                      >
                        <FiRefreshCw className={resetLoading ? 'spin-icon' : ''} />
                        {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
                      </button>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={resetLoading || otp.join('').length !== 6}
                    >
                      {resetLoading && <span className="spinner" />}
                      {resetLoading ? 'Verifying Code...' : 'Verify Code'}
                    </button>
                  </form>
                </>
              )}

              {resetStep === 'password' && (
                /* Step 3: Set New Password with Live Validation */
                <>
                  <h2 className="mt-2">Set New Password</h2>
                  <p className="login-subtitle">
                    Create a strong, secure password for your administrator account.
                  </p>

                  {resetError && (
                    <div className="alert alert-error">
                      <FiAlertCircle className="alert-icon" />
                      <span>{resetError}</span>
                    </div>
                  )}

                  <form onSubmit={handleResetPassword}>
                    <div className="form-group">
                      <label htmlFor="new-password">New Password</label>
                      <div className="input-with-icon">
                        <FiLock className="input-icon" />
                        <input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          className="form-input"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          autoFocus
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          tabIndex={-1}
                        >
                          {showNewPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    {/* Live Password Strength Meter */}
                    {newPassword.length > 0 && (
                      <div className="password-strength-widget">
                        <div className="strength-meter-header">
                          <span>Password Strength:</span>
                          <strong style={{ color: strengthMeta.color }}>{strengthMeta.label}</strong>
                        </div>
                        <div className="strength-bar-track">
                          <div
                            className="strength-bar-fill"
                            style={{
                              width: `${strengthScore}%`,
                              backgroundColor: strengthMeta.color,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label htmlFor="confirm-password">Confirm New Password</label>
                      <div className="input-with-icon">
                        <FiLock className="input-icon" />
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`form-input ${
                            confirmPassword && (passwordsMatch ? 'input-success' : 'input-error')
                          }`}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                    </div>

                    {/* Live Validation Checklist */}
                    <div className="live-validation-grid">
                      <div className={`validation-item ${hasMinLength ? 'valid' : ''}`}>
                        {hasMinLength ? <FiCheck className="val-icon" /> : <FiX className="val-icon" />}
                        <span>At least 8 characters</span>
                      </div>
                      <div className={`validation-item ${hasUpperLower ? 'valid' : ''}`}>
                        {hasUpperLower ? <FiCheck className="val-icon" /> : <FiX className="val-icon" />}
                        <span>Uppercase & lowercase letters</span>
                      </div>
                      <div className={`validation-item ${hasNumber ? 'valid' : ''}`}>
                        {hasNumber ? <FiCheck className="val-icon" /> : <FiX className="val-icon" />}
                        <span>At least one number (0-9)</span>
                      </div>
                      <div className={`validation-item ${passwordsMatch ? 'valid' : ''}`}>
                        {passwordsMatch ? <FiCheck className="val-icon" /> : <FiX className="val-icon" />}
                        <span>Passwords match</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={resetLoading || !hasMinLength || !passwordsMatch}
                    >
                      {resetLoading && <span className="spinner" />}
                      {resetLoading ? 'Resetting Password...' : 'Reset Password & Proceed'}
                    </button>
                  </form>
                </>
              )}

              {resetStep === 'success' && (
                /* Step 4: Success State */
                <div className="reset-success-card">
                  <div className="success-icon-circle">
                    <FiCheckCircle />
                  </div>
                  <h3>Password Reset Complete!</h3>
                  <p className="success-desc">
                    Your administrator password has been updated securely. You can now sign in to the WorkWave admin portal with your new credentials.
                  </p>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setEmail(resetEmail);
                      handleSwitchToLogin();
                    }}
                  >
                    Proceed to Sign In
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
