import { useState, useEffect } from 'react';
import {
  FiCheck,
  FiX,
  FiEye,
  FiMessageSquare,
  FiCalendar,
  FiClock,
  FiUser,
  FiArrowLeft,
  FiAlertTriangle,
  FiAlertOctagon,
  FiShield,
  FiMail,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiRepeat,
  FiLayers,
} from 'react-icons/fi';
import { ADMIN_SERVICE_URL } from '../config';
import './InquiriesPage.css';

const InquiriesPage = () => {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [suspensionAlert, setSuspensionAlert] = useState(null);

  useEffect(() => {
    fetchInquiries(false);
    const interval = setInterval(() => {
      fetchInquiries(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchInquiries = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries`);
      const data = await response.json();
      if (response.ok && data.data) {
        setInquiries(data.data);
      } else if (!isBackground) {
        setInquiries([]);
      }
    } catch (err) {
      if (!isBackground) {
        console.log('Error fetching inquiries:', err.message);
        setInquiries([]);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleApproveInquiry = async () => {
    if (!selectedInquiry) return;
    setActionLoading(true);
    try {
      const inqId = selectedInquiry._id || selectedInquiry.id;
      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries/${inqId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          adminNote: 'Inquiry approved by administrator.',
        }),
      });

      const result = await response.json();
      if (response.ok) {
        await fetchInquiries();
        setSelectedInquiry(null);
      } else {
        alert(result.message || 'Failed to approve inquiry.');
      }
    } catch (err) {
      console.error('Approve error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedInquiry) return;
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      const inqId = selectedInquiry._id || selectedInquiry.id;
      const currentProviderName = selectedInquiry.providerName;
      const currentProviderEmail = selectedInquiry.providerEmail;

      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries/${inqId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          adminNote: rejectReason.trim(),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        if (result.autoBlocked) {
          setSuspensionAlert({
            providerName: currentProviderName,
            providerEmail: currentProviderEmail,
            duration: '30 Days (1 Month)',
          });
        }
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedInquiry(null);
        await fetchInquiries();
      } else {
        alert(result.message || 'Failed to reject inquiry.');
      }
    } catch (err) {
      console.error('Reject error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Submitted':
        return 'status-submitted';
      case 'ReSubmited':
      case 'ReSubmitted':
      case 'Re-submitted':
      case 'Resubmitted':
        return 'status-resubmitted';
      case 'Approved':
        return 'status-approved';
      case 'Rejected':
        return 'status-rejected';
      default:
        return 'status-submitted';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const countAll = inquiries.length;
  const countSubmitted = inquiries.filter((i) => i.status === 'Submitted' || i.status === 'Pending').length;
  const countResubmitted = inquiries.filter(
    (i) => i.status === 'ReSubmited' || i.status === 'ReSubmitted' || i.status === 'Re-submitted'
  ).length;
  const countApproved = inquiries.filter((i) => i.status === 'Approved').length;
  const countRejected = inquiries.filter((i) => i.status === 'Rejected').length;

  const filteredInquiries = inquiries.filter((inquiry) => {
    // 1. Status Filter
    let matchesStatus = true;
    if (activeFilter === 'SUBMITTED') {
      matchesStatus = inquiry.status === 'Submitted' || inquiry.status === 'Pending';
    } else if (activeFilter === 'RESUBMITTED') {
      matchesStatus = inquiry.status === 'ReSubmited' || inquiry.status === 'ReSubmitted' || inquiry.status === 'Re-submitted';
    } else if (activeFilter === 'APPROVED') {
      matchesStatus = inquiry.status === 'Approved';
    } else if (activeFilter === 'REJECTED') {
      matchesStatus = inquiry.status === 'Rejected';
    }

    // 2. Search Filter (by Provider Name, Email, Reason, or BookingId)
    const term = searchTerm.trim().toLowerCase();
    let matchesSearch = true;
    if (term) {
      const name = (inquiry.providerName || '').toLowerCase();
      const email = (inquiry.providerEmail || '').toLowerCase();
      const reason = (inquiry.reason || '').toLowerCase();
      const bookingId = (inquiry.bookingId || '').toLowerCase();
      matchesSearch = name.includes(term) || email.includes(term) || reason.includes(term) || bookingId.includes(term);
    }

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="inquiries-page animate-fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1>Inquiry Management</h1>
          <p>Review and manage provider inquiry submissions for service cancellations.</p>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="inquiry-controls-bar">
        <div className="filter-tabs-bar">
          <button
            type="button"
            className={`filter-tab-btn tab-all ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            <FiLayers className="tab-icon" /> All <span className="tab-count">{countAll}</span>
          </button>
          <button
            type="button"
            className={`filter-tab-btn tab-resubmitted ${activeFilter === 'RESUBMITTED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('RESUBMITTED')}
          >
            <FiRepeat className="tab-icon" /> Re-submitted <span className="tab-count">{countResubmitted}</span>
          </button>
          <button
            type="button"
            className={`filter-tab-btn tab-submitted ${activeFilter === 'SUBMITTED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('SUBMITTED')}
          >
            <FiClock className="tab-icon" /> Submitted / Pending <span className="tab-count">{countSubmitted}</span>
          </button>
          <button
            type="button"
            className={`filter-tab-btn tab-approved ${activeFilter === 'APPROVED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('APPROVED')}
          >
            <FiCheckCircle className="tab-icon" /> Approved <span className="tab-count">{countApproved}</span>
          </button>
          <button
            type="button"
            className={`filter-tab-btn tab-rejected ${activeFilter === 'REJECTED' ? 'active' : ''}`}
            onClick={() => setActiveFilter('REJECTED')}
          >
            <FiXCircle className="tab-icon" /> Rejected <span className="tab-count">{countRejected}</span>
          </button>
        </div>

        {/* Search by Provider Bar */}
        <div className="inquiry-search-wrapper">
          <FiSearch className="search-input-icon" />
          <input
            type="text"
            className="inquiry-search-input"
            placeholder="Search by provider name, email, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchTerm('')}
              title="Clear search"
            >
              <FiX />
            </button>
          ) : null}
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading inquiries...</div>
        ) : filteredInquiries.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
            No inquiries found matching {searchTerm ? `"${searchTerm}"` : `the "${activeFilter}" filter`}.
          </div>
        ) : (
          <table className="inquiries-table">
            <thead>
              <tr>
                <th>PROVIDER</th>
                <th>SUBMITTED DATE</th>
                <th>STATUS</th>
                <th>REASON SUMMARY</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.map((inquiry) => (
                <tr key={inquiry._id || inquiry.id}>
                  <td>
                    <div className="provider-info">
                      <span className="provider-name">{inquiry.providerName}</span>
                    </div>
                  </td>
                  <td>{formatDate(inquiry.createdAt || inquiry.submittedDate)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(inquiry.status)}`}>{inquiry.status}</span>
                  </td>
                  <td className="reason-cell">{inquiry.reason}</td>
                  <td>
                    <button className="view-btn" onClick={() => setSelectedInquiry(inquiry)}>
                      <FiEye /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Main Review Modal */}
      {selectedInquiry && (
        <div className="modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <FiClock />
                </div>
                <div>
                  <div className="modal-title-row">
                    <h3>Inquiry Review & Decision</h3>
                    <span className={`status-pill ${getStatusClass(selectedInquiry.status)}`}>
                      {selectedInquiry.status}
                    </span>
                  </div>
                  <p className="modal-subtitle">
                    Provider: <strong>{selectedInquiry.providerName}</strong> • Submitted:{' '}
                    <strong>{formatDate(selectedInquiry.createdAt || selectedInquiry.submittedDate)}</strong>
                  </p>
                </div>
              </div>
              <button className="modal-header-close" onClick={() => setSelectedInquiry(null)} title="Close">
                <FiX />
              </button>
            </div>

            <div className="modal-body">
              {/* Provider Details */}
              <div className="review-section">
                <div className="section-header">
                  <FiUser /> <h4>Provider Profile</h4>
                </div>
                <div className="provider-info-card">
                  <div className="provider-avatar-circle">
                    <FiUser size={20} />
                  </div>
                  <div className="provider-info-text">
                    <div className="provider-info-name-row">
                      <span className="provider-info-name">{selectedInquiry.providerName}</span>
                      <span className="provider-role-tag">{selectedInquiry.providerRole || 'Service Provider'}</span>
                    </div>
                    <span className="provider-info-email">{selectedInquiry.providerEmail || 'nethmiumaya5@gmail.com'}</span>
                  </div>
                </div>
              </div>

              {/* Missed Services Context */}
              <div className="review-section">
                <div className="section-header">
                  <FiClock /> <h4>Missed Service Details</h4>
                </div>
                <div className="missed-grid">
                  {selectedInquiry.missedServices && selectedInquiry.missedServices.length > 0 ? (
                    selectedInquiry.missedServices.map((s, i) => {
                      const currentItemStatus = s.status || selectedInquiry.status || 'Pending';

                      return (
                        <div key={i} className={`missed-booking-card ${currentItemStatus.toLowerCase()}`}>
                          <div className="missed-booking-top">
                            <div className="missed-booking-date">
                              <FiCalendar size={14} />
                              <span>{s.date}</span>
                            </div>
                            <span className={`item-badge item-${currentItemStatus.toLowerCase()}`}>
                              {currentItemStatus}
                            </span>
                          </div>
                          <div className="missed-booking-meta">
                            <span className="meta-time">🕒 {s.time}</span>
                            <span className="meta-loc">📍 {s.location || 'Colombo'}</span>
                          </div>
                          {s.reason ? (
                            <div className="missed-booking-reason">
                              <span>⚠️ Reason: {s.reason}</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>No missed service details attached</p>
                  )}
                </div>
              </div>

              {/* Provider's Reason */}
              <div className="review-section">
                <div className="section-header">
                  <FiMessageSquare /> <h4>Provider's Explanation</h4>
                </div>
                <div className="provider-reason-box">
                  <p className="reason-text">"{selectedInquiry.reason}"</p>
                </div>
              </div>

              {/* Evidence */}
              <div className="review-section evidence-section">
                <div className="section-header">
                  <FiCalendar /> <h4>Submitted Evidence (Click to Zoom)</h4>
                </div>
                <div className="evidence-grid">
                  {selectedInquiry.evidenceImages && selectedInquiry.evidenceImages.length > 0 ? (
                    selectedInquiry.evidenceImages.map((image, index) => {
                      const imgUrl = image.startsWith('http') ? image : `${ADMIN_SERVICE_URL}${image}`;
                      return (
                        <div
                          key={index}
                          className="evidence-card clickable-evidence"
                          onClick={() => setPreviewImage(imgUrl)}
                          title="Click to zoom in"
                        >
                          <img src={imgUrl} alt={`Evidence ${index + 1}`} />
                          <div className="evidence-caption">
                            <FiEye size={12} /> Evidence #{index + 1}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-evidence-box">
                      <span>No image evidence attached by provider</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Decision Section if already reviewed */}
              {selectedInquiry.status === 'Approved' || selectedInquiry.status === 'Rejected' ? (
                <div className="review-section">
                  <div className="section-header">
                    <FiCheck /> <h4>Review Result</h4>
                  </div>
                  <div className={`decision-box ${getStatusClass(selectedInquiry.status)}`}>
                    <p className="status">Status: {selectedInquiry.status}</p>
                    {selectedInquiry.adminNote && <p className="note">Admin Note: {selectedInquiry.adminNote}</p>}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Bottom Footer (Reject & Approve Buttons Only) */}
            {selectedInquiry.status !== 'Approved' && selectedInquiry.status !== 'Rejected' ? (
              <div className="modal-footer-bar">
                <div className="modal-footer-actions modal-footer-actions-full">
                  <button
                    type="button"
                    className="modal-footer-btn footer-reject-btn"
                    disabled={actionLoading}
                    onClick={() => {
                      setRejectReason('');
                      setShowRejectModal(true);
                    }}
                  >
                    <FiX /> Reject Inquiry
                  </button>
                  <button
                    type="button"
                    className="modal-footer-btn footer-approve-btn"
                    disabled={actionLoading}
                    onClick={handleApproveInquiry}
                  >
                    <FiCheck /> Approve Inquiry
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Reject Reason Dialog Popup */}
      {showRejectModal && (
        <div className="modal-overlay popup-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="reject-popup-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="reject-popup-header">
              <div className="reject-popup-title-row">
                <FiAlertTriangle className="reject-icon" />
                <h3>Reject Inquiry</h3>
              </div>
              <button className="popup-close-x" onClick={() => setShowRejectModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="reject-popup-body">
              <p className="reject-popup-desc">
                Please enter the reason for rejecting this inquiry. This feedback will be recorded and visible to the provider.
              </p>
              <textarea
                className="reject-reason-textarea"
                placeholder="Enter rejection reason (e.g., Insufficient medical proof, unverified transport breakdown)..."
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className="reject-popup-footer">
              <button
                type="button"
                className="popup-cancel-btn"
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="popup-confirm-reject-btn"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={handleConfirmReject}
              >
                <FiX /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Image Preview Lightbox Modal */}
      {previewImage && (
        <div className="modal-overlay image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="image-preview-header">
              <span className="image-preview-title">Evidence Photo Preview</span>
              <button className="image-preview-close" onClick={() => setPreviewImage(null)} title="Close Preview">
                <FiX />
              </button>
            </div>
            <div className="image-preview-body">
              <img src={previewImage} alt="Evidence Full Preview" className="full-evidence-img" />
            </div>
          </div>
        </div>
      )}

      {/* Account Suspension Alert Modal */}
      {suspensionAlert && (
        <div className="modal-overlay popup-overlay suspension-alert-overlay" onClick={() => setSuspensionAlert(null)}>
          <div className="suspension-alert-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="suspension-alert-top-banner">
              <div className="suspension-icon-circle">
                <FiAlertOctagon size={28} />
              </div>
            </div>

            <div className="suspension-alert-body">
              <span className="suspension-pill">GOVERNANCE ENFORCEMENT</span>
              <h3 className="suspension-title">Account Automatically Suspended</h3>
              <p className="suspension-description">
                Provider <strong>{suspensionAlert.providerName}</strong> has reached{' '}
                <span className="highlight-danger">3 consecutive inquiry rejections</span>.
              </p>

              <div className="suspension-details-card">
                <div className="suspension-detail-item">
                  <div className="detail-item-left">
                    <FiShield className="detail-icon-shield" />
                    <span>Enforcement Action</span>
                  </div>
                  <strong className="detail-val-red">Locked for 30 Days (1 Month)</strong>
                </div>
                <div className="suspension-detail-item">
                  <div className="detail-item-left">
                    <FiMail className="detail-icon-mail" />
                    <span>Provider Notice</span>
                  </div>
                  <strong className="detail-val-green">Warning Email Dispatched</strong>
                </div>
              </div>

              <div className="suspension-help-note">
                ℹ️ The provider's app account is now restricted. You can review or unblock this provider at any time from the <strong>Penalty Management</strong> tab.
              </div>
            </div>

            <div className="suspension-alert-footer">
              <button
                type="button"
                className="suspension-confirm-btn"
                onClick={() => setSuspensionAlert(null)}
              >
                <FiCheck /> Acknowledge & Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;
