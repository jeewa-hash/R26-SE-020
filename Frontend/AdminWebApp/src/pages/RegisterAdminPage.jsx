import { useState } from 'react';
import axios from 'axios';
import { FiUserPlus, FiSend } from 'react-icons/fi';
import { API_BASE_URL } from '../config';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const initialFormState = {
  fullName: '',
  nic: '',
  email: '',
  password: '',
  telephone: '',
  district: '',
};

function RegisterAdminPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${API_BASE_URL}/register`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Admin registered successfully! Login credentials have been sent to their email.');
      setFormData(initialFormState);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="register-page-header">
        <div>
          <h1>Register New Admin</h1>
          <p>Create a new admin account. Credentials will be emailed automatically.</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="register-form-card">
        <h2><FiUserPlus style={{ marginRight: 8, verticalAlign: 'middle' }} /> Admin Details</h2>
        <p className="form-subtitle">Fill in all required fields to register a new administrator</p>

        {error && (
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <span>✓</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name & NIC */}
          <div className="form-row">
            <div className="form-group-reg">
              <label htmlFor="reg-fullName">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="reg-fullName"
                name="fullName"
                type="text"
                className="form-input-reg"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group-reg">
              <label htmlFor="reg-nic">
                NIC Number <span className="required">*</span>
              </label>
              <input
                id="reg-nic"
                name="nic"
                type="text"
                className="form-input-reg"
                placeholder="e.g. 200012345678"
                value={formData.nic}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Email & Password */}
          <div className="form-row">
            <div className="form-group-reg">
              <label htmlFor="reg-email">
                Email Address <span className="required">*</span>
              </label>
              <input
                id="reg-email"
                name="email"
                type="email"
                className="form-input-reg"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group-reg">
              <label htmlFor="reg-password">
                Password <span className="required">*</span>
              </label>
              <input
                id="reg-password"
                name="password"
                type="text"
                className="form-input-reg"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Telephone & District */}
          <div className="form-row">
            <div className="form-group-reg">
              <label htmlFor="reg-telephone">
                Telephone <span className="required">*</span>
              </label>
              <input
                id="reg-telephone"
                name="telephone"
                type="tel"
                className="form-input-reg"
                placeholder="e.g. 0771234567"
                value={formData.telephone}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group-reg">
              <label htmlFor="reg-district">
                District <span className="required">*</span>
              </label>
              <select
                id="reg-district"
                name="district"
                className="form-input-reg"
                value={formData.district}
                onChange={handleChange}
                required
              >
                <option value="">Select District</option>
                {SRI_LANKA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Registering...
                </>
              ) : (
                <>
                  <FiSend /> Register Admin
                </>
              )}
            </button>
            <button type="button" className="btn-reset" onClick={handleReset}>
              Reset Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterAdminPage;
