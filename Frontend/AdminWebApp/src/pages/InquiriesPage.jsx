import { useState, useEffect } from 'react';
import { FiCheck, FiX, FiEye, FiMessageSquare, FiCalendar, FiClock, FiUser, FiArrowLeft, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { ADMIN_SERVICE_URL } from '../config';
import './InquiriesPage.css';

const InquiriesPage = () => {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [itemDecisions, setItemDecisions] = useState({});

  useEffect(() => {
    fetchInquiries();
  }, []);

  useEffect(() => {
    if (selectedInquiry && selectedInquiry.missedServices) {
      const initial = {};
      selectedInquiry.missedServices.forEach((s) => {
        initial[s.bookingId] = s.status || 'Pending';
      });
      setItemDecisions(initial);
    }
  }, [selectedInquiry]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries`);
      const data = await response.json();
      if (response.ok && data.data) {
        setInquiries(data.data);
      } else {
        setInquiries([]);
      }
    } catch (err) {
      console.log('Error fetching inquiries:', err.message);
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  };

  const setSingleBookingDecision = (bookingId, status) => {
    setItemDecisions((prev) => ({
      ...prev,
      [bookingId]: status,
    }));
  };

  const handleSubmitReview = async (bulkStatus = null) => {
    if (!selectedInquiry) return;
    setActionLoading(true);
    try {
      const inqId = selectedInquiry._id || selectedInquiry.id;
      
      let payload = { adminNote: note };
      if (bulkStatus) {
        payload.status = bulkStatus;
      } else {
        const itemReviews = selectedInquiry.missedServices?.map((s) => ({
          bookingId: s.bookingId,
          status: itemDecisions[s.bookingId] || 'Approved',
          adminNote: note,
        })) || [];
        payload.itemReviews = itemReviews;
      }

      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries/${inqId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.autoBlocked) {
        alert(`⚠️ Alert: Provider ${selectedInquiry.providerName} has reached 3 consecutive inquiry rejections! Account has been automatically suspended for 1 Month (30 Days) and an appeal notice email was sent.`);
      }

      await fetchInquiries();
      setSelectedInquiry(null);
      setNote('');
    } catch (err) {
      console.error('Review submission error:', err);
      setSelectedInquiry(null);
      setNote('');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Submitted': return 'status-submitted';
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      default: return '';
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

  return (
    <div className="inquiries-page animate-fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1>Inquiry Management</h1>
          <p>Review and manage provider inquiry submissions for service cancellations.</p>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading inquiries...</div>
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
              {inquiries.map((inquiry) => (
                <tr key={inquiry._id || inquiry.id}>
                  <td>
                    <div className="provider-info">
                      <span className="provider-name">{inquiry.providerName}</span>
                    </div>
                  </td>
                  <td>{formatDate(inquiry.createdAt || inquiry.submittedDate)}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(inquiry.status)}`}>
                      {inquiry.status}
                    </span>
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

      {selectedInquiry && (
        <div className="modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <button className="back-btn" onClick={() => setSelectedInquiry(null)}>
                <FiArrowLeft /> Back
              </button>
              <div className="modal-title-group">
                <h3>Inquiry Review</h3>
                <div className="modal-meta">
                  <span className="modal-meta-item"><strong>Provider:</strong> {selectedInquiry.providerName}</span>
                  <span className="modal-meta-item"><strong>Submitted:</strong> {formatDate(selectedInquiry.createdAt || selectedInquiry.submittedDate)}</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setSelectedInquiry(null)}><FiX /> Close</button>
            </div>

            <div className="detail-summary">
              <div className="detail-summary-item"><strong>Provider:</strong> {selectedInquiry.providerName}</div>
              <div className="detail-summary-item"><strong>Submitted Date:</strong> {formatDate(selectedInquiry.createdAt || selectedInquiry.submittedDate)}</div>
            </div>
            
            <div className="modal-body">
              <div className="review-section">
                <div className="section-header">
                  <FiUser /> <h4>Provider Details</h4>
                </div>
                <div className="provider-card">
                  <div>
                    <p className="name">{selectedInquiry.providerName}</p>
                    <p className="date">Email: {selectedInquiry.providerEmail || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <div className="section-header">
                  <FiClock /> <h4>Missed Services Context (Review Each Booking)</h4>
                </div>
                <div className="missed-grid">
                  {selectedInquiry.missedServices && selectedInquiry.missedServices.length > 0 ? (
                    selectedInquiry.missedServices.map((s, i) => {
                      const currentItemStatus = (selectedInquiry.status === 'Approved' || selectedInquiry.status === 'Rejected')
                        ? (s.status || selectedInquiry.status)
                        : (itemDecisions[s.bookingId] || 'Pending');

                      return (
                        <div key={i} className={`missed-mini-card ${currentItemStatus.toLowerCase()}`}>
                          <div className="card-top-row">
                            <span className="card-date">{s.date}</span>
                            <span className={`item-badge item-${currentItemStatus.toLowerCase()}`}>
                              {currentItemStatus}
                            </span>
                          </div>
                          <p className="card-time-loc">🕒 {s.time} - {s.location || 'Colombo'}</p>
                          {s.reason ? (
                            <p className="card-reason">⚠️ Reason: {s.reason}</p>
                          ) : null}

                          {(selectedInquiry.status === 'Submitted' || selectedInquiry.status === 'Pending') && (
                            <div className="card-item-actions">
                              <button
                                type="button"
                                className={`item-action-btn approve ${currentItemStatus === 'Approved' ? 'active' : ''}`}
                                onClick={() => setSingleBookingDecision(s.bookingId, 'Approved')}
                              >
                                <FiCheck size={12} /> Approve
                              </button>
                              <button
                                type="button"
                                className={`item-action-btn reject ${currentItemStatus === 'Rejected' ? 'active' : ''}`}
                                onClick={() => setSingleBookingDecision(s.bookingId, 'Rejected')}
                              >
                                <FiX size={12} /> Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>No missed service details</p>
                  )}
                </div>
              </div>

              <div className="review-section">
                <div className="section-header">
                  <FiMessageSquare /> <h4>Provider's Reason</h4>
                </div>
                <div className="reason-box">
                  {selectedInquiry.reason}
                </div>
              </div>

              <div className="review-section evidence-section">
                <div className="section-header">
                  <FiCalendar /> <h4>Evidence</h4>
                </div>
                <div className="evidence-grid">
                  {selectedInquiry.evidenceImages && selectedInquiry.evidenceImages.length > 0 ? (
                    selectedInquiry.evidenceImages.map((image, index) => {
                      const imgUrl = image.startsWith('http') ? image : `${ADMIN_SERVICE_URL}${image}`;
                      return (
                        <div key={index} className="evidence-card">
                          <img src={imgUrl} alt={`Evidence ${index + 1}`} />
                          <p>Evidence {index + 1}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>No image evidence attached</p>
                  )}
                </div>
              </div>

              {selectedInquiry.status === 'Submitted' || selectedInquiry.status === 'Pending' ? (
                <div className="review-section">
                  <div className="section-header">
                    <FiCheck /> <h4>Admin Action</h4>
                  </div>
                  <textarea 
                    placeholder="Add an optional note for the provider (Reason if rejected)..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="note-textarea"
                  />
                  <div className="action-buttons">
                    <button 
                      className="reject-btn" 
                      disabled={actionLoading}
                      onClick={() => handleSubmitReview('Rejected')}
                    >
                      <FiX /> Reject All
                    </button>
                    <button 
                      className="approve-btn" 
                      disabled={actionLoading}
                      onClick={() => handleSubmitReview('Approved')}
                    >
                      <FiCheck /> Approve All
                    </button>
                    <button 
                      className="itemized-submit-btn" 
                      disabled={actionLoading}
                      onClick={() => handleSubmitReview(null)}
                    >
                      <FiCheckCircle /> Submit Decisions
                    </button>
                    <button className="modal-close-action" onClick={() => setSelectedInquiry(null)}>
                      <FiX /> Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="review-section">
                  <div className="section-header">
                    <FiCheck /> <h4>Admin Decision</h4>
                  </div>
                  <div className={`decision-box ${getStatusClass(selectedInquiry.status)}`}>
                    <p className="status">Status: {selectedInquiry.status}</p>
                    {selectedInquiry.adminNote && <p className="note">Note: {selectedInquiry.adminNote}</p>}
                  </div>
                  <div className="action-buttons action-buttons-center">
                    <button className="modal-close-action" onClick={() => setSelectedInquiry(null)}>
                      <FiX /> Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;
