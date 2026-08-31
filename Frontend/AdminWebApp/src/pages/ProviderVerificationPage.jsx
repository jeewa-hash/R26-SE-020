import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL, AUTH_SERVICE_URL } from '../config';
import {
  FiArrowLeft,
  FiUser,
  FiMapPin,
  FiPhone,
  FiCreditCard,
  FiCheckCircle,
  FiXCircle,
  FiMessageSquare,
  FiMap,
  FiMail,
} from 'react-icons/fi';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ProviderVerificationPage.css';

// Fix for default marker icons in Leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

function ProviderVerificationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState('');

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/providers/${id}/verify-details`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProvider(response.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch provider details', err);
        setError('Failed to load provider details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id]);

  const handleVerify = async (action) => {
    if (action === 'reject') {
      setShowRejectModal(true);
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API_BASE_URL}/providers/${id}/verify`,
        { action: 'approve' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/nic-verifications');
    } catch (err) {
      console.error('Failed to approve provider', err);
      alert(err.response?.data?.message || 'Failed to approve provider');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectNote.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    try {
      setActionLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API_BASE_URL}/providers/${id}/verify`,
        { action: 'reject', note: rejectNote.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowRejectModal(false);
      navigate('/nic-verifications');
    } catch (err) {
      console.error('Failed to reject provider', err);
      alert(err.response?.data?.message || 'Failed to reject provider');
    } finally {
      setActionLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/')) return `${AUTH_SERVICE_URL}${imagePath}`;
    return `${AUTH_SERVICE_URL}/${imagePath}`;
  };

  const isNicMatch = () => {
    if (!provider || !provider.extractedNicNumber) return false;
    return (
      provider.nicNumber.trim().toUpperCase() ===
      provider.extractedNicNumber.trim().toUpperCase()
    );
  };

  if (loading) {
    return (
      <div
        className="page-content verification-page"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <p>Loading provider details...</p>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="page-content verification-page">
        <button
          className="verification-back-btn"
          onClick={() => navigate('/nic-verifications')}
        >
          <FiArrowLeft /> Back
        </button>
        <div className="text-center" style={{ color: '#ef4444', padding: '48px' }}>
          {error || 'Provider not found'}
        </div>
      </div>
    );
  }

  const providerDisplayName =
    provider.name ||
    provider.fullName ||
    (provider.email ? provider.email.split('@')[0] : 'N/A');

  return (
    <div className="page-content verification-page">
      {/* Back Button */}
      <button
        onClick={() => navigate('/nic-verifications')}
        className="verification-back-btn"
      >
        <FiArrowLeft /> Back to NIC Verifications
      </button>

      {/* Page Title */}
      <div className="register-page-header">
        <div>
          <h1>Identity Document Review</h1>
          <p>
            Please verify if the OCR extracted data matches the user-submitted profile details
            and the provided NIC scan.
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="verification-grid">
        {/* Left: NIC Image Card */}
        <div className="verification-card">
          <h3 className="verification-card-title">
            <FiCreditCard size={16} /> NIC Front — User Document Upload
          </h3>
          {provider.nicImage ? (
            <div className="verification-image-container">
              <img
                src={getImageUrl(provider.nicImage)}
                alt="NIC Document Upload"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div
                style={{
                  display: 'none',
                  padding: '48px',
                  textAlign: 'center',
                  color: 'var(--gray-400)',
                }}
              >
                Failed to load document image
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: '48px',
                textAlign: 'center',
                color: 'var(--gray-400)',
                background: 'var(--gray-50)',
                borderRadius: '12px',
              }}
            >
              No NIC image uploaded
            </div>
          )}
        </div>

        {/* Right: User Data & Comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Profile Data Section */}
          <div className="verification-card">
            <h3 className="verification-card-title">
              <FiUser size={16} /> User Profile Information
            </h3>

            <div className="verification-data-grid">
              <div>
                <label className="verification-field-label">Full Name</label>
                <p className="verification-field-value">{providerDisplayName}</p>
              </div>
              <div>
                <label className="verification-field-label">Email Address</label>
                <p className="verification-field-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiMail size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
                  <span>{provider.email || 'N/A'}</span>
                </p>
              </div>
              <div>
                <label className="verification-field-label">District</label>
                <p className="verification-field-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiMapPin size={14} style={{ color: 'var(--primary-500)' }} /> {provider.district || 'N/A'}
                </p>
              </div>
              <div>
                <label className="verification-field-label">Telephone</label>
                <p className="verification-field-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiPhone size={14} style={{ color: '#10b981' }} /> {provider.telephone || 'N/A'}
                </p>
              </div>
              <div>
                <label className="verification-field-label">Category</label>
                <p className="verification-field-value">{provider.category || 'N/A'}</p>
              </div>
              <div>
                <label className="verification-field-label">Gender</label>
                <p className="verification-field-value">{provider.gender || 'N/A'}</p>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="verification-field-label">Registered Address</label>
                <p className="verification-field-value">{provider.address || 'N/A'}</p>
              </div>
            </div>

            {/* Map Integration */}
            {provider.location?.latitude && provider.location?.longitude && (
              <div
                style={{
                  marginTop: '20px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '1px solid var(--gray-200)',
                  height: '190px',
                  position: 'relative',
                }}
              >
                <MapContainer
                  center={[provider.location.latitude, provider.location.longitude]}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  <Marker
                    position={[provider.location.latitude, provider.location.longitude]}
                  >
                    <Popup>
                      <div style={{ fontSize: '12px' }}>
                        <strong>{providerDisplayName}</strong>
                        <br />
                        {provider.address || provider.district}
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
                <a
                  href={`https://www.google.com/maps?q=${provider.location.latitude},${provider.location.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    zIndex: 1000,
                    background: '#fff',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--primary-600)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <FiMap size={13} /> Open Google Maps
                </a>
              </div>
            )}
          </div>

          {/* NIC Comparison Section */}
          <div className="verification-card">
            <h3 className="verification-card-title">
              <FiCreditCard size={16} /> NIC Number Comparison
            </h3>

            <div className="verification-data-grid">
              <div>
                <label className="verification-field-label">ID Number (Entered by Provider)</label>
                <p className="verification-field-value" style={{ fontFamily: 'monospace', fontSize: '15px', letterSpacing: '0.5px' }}>
                  {provider.nicNumber || 'N/A'}
                </p>
              </div>
              <div>
                <label className="verification-field-label">Extracted ID Number (OCR Scan)</label>
                <p className="verification-field-value" style={{ fontFamily: 'monospace', fontSize: '15px', letterSpacing: '0.5px' }}>
                  {provider.extractedNicNumber || (
                    <span style={{ color: 'var(--gray-400)', fontStyle: 'italic', fontFamily: 'inherit', fontSize: '13px' }}>
                      Could not extract OCR
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Match Status Badge */}
            <div className={`verification-match-badge ${isNicMatch() ? 'matched' : 'mismatched'}`}>
              {isNicMatch() ? (
                <>
                  <FiCheckCircle size={22} color="#10b981" />
                  <span className="verification-match-text">
                    Verified Match — Entered NIC Matches Uploaded Document
                  </span>
                </>
              ) : (
                <>
                  <FiXCircle size={22} color="#ef4444" />
                  <span className="verification-match-text">
                    Mismatch Warning — Entered NIC does not match OCR extraction
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Admin Note (shown if provider was previously rejected) */}
          {provider.isRejected && provider.adminNote && (
            <div
              className="verification-card"
              style={{ borderLeft: '4px solid #ef4444' }}
            >
              <h3
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiMessageSquare size={16} /> Previous Rejection Reason
              </h3>
              <p
                className="verification-field-value"
                style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
              >
                {provider.adminNote}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {provider.verificationStatus === 'Pending' && (
        <div className="verification-action-bar">
          <button
            onClick={() => handleVerify('reject')}
            disabled={actionLoading}
            className="verification-reject-btn"
          >
            <FiXCircle size={18} />
            {actionLoading ? 'Processing...' : 'REJECT APPLICATION'}
          </button>
          <button
            onClick={() => handleVerify('approve')}
            disabled={actionLoading}
            className="verification-approve-btn"
          >
            <FiCheckCircle size={18} />
            {actionLoading ? 'Processing...' : 'APPROVE IDENTITY'}
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="verification-modal-overlay">
          <div className="verification-modal-card">
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#ef4444',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <FiXCircle size={24} /> Reject Provider Application
            </h2>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--gray-500)',
                marginBottom: '20px',
                lineHeight: 1.5,
              }}
            >
              Please provide an internal note explaining why this provider is being rejected.
              This explanation will be recorded and sent to the provider.
            </p>

            <label className="verification-field-label" style={{ marginBottom: '8px' }}>
              Rejection Reason Note *
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g., NIC number does not match the uploaded document, or photo is unclear..."
              rows={5}
              className="verification-modal-textarea"
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNote('');
                }}
                disabled={actionLoading}
                className="verification-back-btn"
                style={{ margin: 0 }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="verification-reject-btn"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                }}
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProviderVerificationPage;
