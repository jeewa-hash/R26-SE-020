import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiArrowLeft, FiUser, FiMapPin, FiPhone, FiCreditCard, FiCheckCircle, FiXCircle, FiMessageSquare } from 'react-icons/fi';

const AUTH_SERVICE_URL = 'http://localhost:4003';

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
          headers: { Authorization: `Bearer ${token}` }
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

    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API_BASE_URL}/providers/${id}/verify`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/');
    } catch (err) {
      console.error(`Failed to ${action} provider`, err);
      alert(err.response?.data?.message || `Failed to ${action} provider`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectNote.trim()) {
      alert('Please enter an internal note before rejecting.');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(
        `${API_BASE_URL}/providers/${id}/verify`,
        { action: 'reject', adminNote: rejectNote.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/');
    } catch (err) {
      console.error('Failed to reject provider', err);
      alert(err.response?.data?.message || 'Failed to reject provider');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
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
    return provider.nicNumber.trim().toUpperCase() === provider.extractedNicNumber.trim().toUpperCase();
  };

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p>Loading provider details...</p>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="page-content">
        <button className="btn-close" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '8px 16px', borderRadius: '8px' }} onClick={() => navigate('/')}>
          <FiArrowLeft /> Back
        </button>
        <div className="text-center" style={{ color: '#ef4444', padding: '48px' }}>
          {error || 'Provider not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '20px',
          padding: '8px 16px',
          borderRadius: '10px',
          border: '1px solid var(--gray-200)',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--gray-700)',
        }}
      >
        <FiArrowLeft /> Back to Dashboard
      </button>

      {/* Page Title */}
      <div className="register-page-header">
        <div>
          <h1>Identity Document Review</h1>
          <p>Please verify if the OCR extracted data matches the user-submitted profile details and the provided NIC scan.</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
        {/* Left: NIC Image */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-100)', padding: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            NIC FRONT - USER UPLOAD
          </h3>
          {provider.nicImage ? (
            <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
              <img
                src={getImageUrl(provider.nicImage)}
                alt="NIC Upload"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div style={{ display: 'none', padding: '48px', textAlign: 'center', color: 'var(--gray-400)' }}>
                Failed to load image
              </div>
            </div>
          ) : (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--gray-400)', background: 'var(--gray-50)', borderRadius: '12px' }}>
              No NIC image uploaded
            </div>
          )}
        </div>

        {/* Right: User Data & Comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* User Data Section */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-100)', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiUser size={16} /> User Data
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>Full Name</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>{provider.email || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>District</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiMapPin size={14} /> {provider.district || 'N/A'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>Telephone</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FiPhone size={14} /> {provider.telephone || 'N/A'}
                </p>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>Category</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>{provider.category || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>Gender</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>{provider.gender || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>Address</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>{provider.address || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* NIC Comparison Section */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-100)', padding: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiCreditCard size={16} /> NIC Verification
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>ID Number (Entered)</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>{provider.nicNumber || 'N/A'}</p>
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--gray-400)', marginBottom: '4px', display: 'block' }}>Extracted ID Number (OCR)</label>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-800)', margin: 0 }}>
                  {provider.extractedNicNumber || (
                    <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Could not extract</span>
                  )}
                </p>
              </div>
            </div>

            {/* Match Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '10px', background: isNicMatch() ? '#ecfdf5' : '#fef2f2', border: `1px solid ${isNicMatch() ? '#a7f3d0' : '#fecaca'}` }}>
              {isNicMatch() ? (
                <>
                  <FiCheckCircle size={20} color="#10b981" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>Same</span>
                </>
              ) : (
                <>
                  <FiXCircle size={20} color="#ef4444" />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>Not Same</span>
                </>
              )}
            </div>
          </div>

          {/* Admin Note (shown if provider was rejected) */}
          {provider.isRejected && provider.adminNote && (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #fecaca', padding: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMessageSquare size={16} /> Rejection Reason (Internal Note)
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-700)', margin: 0, whiteSpace: 'pre-wrap' }}>{provider.adminNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!provider.isRejected && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
          <button
            onClick={() => handleVerify('reject')}
            disabled={actionLoading}
            style={{
              padding: '12px 32px',
              borderRadius: '12px',
              border: '2px solid #ef4444',
              background: '#fff',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: 700,
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FiXCircle size={18} />
            {actionLoading ? 'Processing...' : 'REJECT APPLICATION'}
          </button>
          <button
            onClick={() => handleVerify('approve')}
            disabled={actionLoading}
            style={{
              padding: '12px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              opacity: actionLoading ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FiCheckCircle size={18} />
            {actionLoading ? 'Processing...' : 'APPROVE IDENTITY'}
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiXCircle size={24} /> Reject Application
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', marginBottom: '20px' }}>
              Please provide an internal note explaining why this provider is being rejected. This note will be included in the rejection email sent to the provider.
            </p>

            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-600)', marginBottom: '8px', display: 'block' }}>
              Internal Note *
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="e.g., NIC number does not match the uploaded image, or image is unclear..."
              rows={5}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid var(--gray-200)',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: '24px',
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectNote(''); }}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--gray-200)',
                  background: '#fff',
                  color: 'var(--gray-700)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
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
