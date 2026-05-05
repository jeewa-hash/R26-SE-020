import { useState } from 'react';
import { FiSearch, FiFilter, FiCheck, FiX, FiEye, FiMessageSquare, FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import './InquiriesPage.css';

const InquiriesPage = () => {
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [note, setNote] = useState('');
  const [inquiries, setInquiries] = useState([
    {
      id: 1,
      providerName: 'Nimali Silva',
      providerAvatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      submittedDate: '2024-05-01',
      status: 'Submitted',
      reason: 'Vehicle breakdown during travel to the location.',
      missedServices: [
        { date: '2024-04-28', time: '08:00 AM', location: 'Gampaha' },
        { date: '2024-04-29', time: '11:00 AM', location: 'Kiribathgoda' },
        { date: '2024-04-30', time: '04:00 PM', location: 'Kadawatha' }
      ]
    },
    {
      id: 2,
      providerName: 'Sunil Perera',
      providerAvatar: 'https://randomuser.me/api/portraits/men/10.jpg',
      submittedDate: '2024-05-02',
      status: 'Approved',
      reason: 'Sudden medical emergency, medical reports attached.',
      missedServices: [
        { date: '2024-04-25', time: '10:00 AM', location: 'Colombo 07' },
        { date: '2024-04-26', time: '01:00 PM', location: 'Borella' },
        { date: '2024-04-27', time: '09:00 AM', location: 'Maradana' }
      ],
      adminNote: 'Medical reports verified. Account reinstated.'
    },
    {
      id: 3,
      providerName: 'Kamal Gunawardena',
      providerAvatar: 'https://randomuser.me/api/portraits/men/11.jpg',
      submittedDate: '2024-05-03',
      status: 'Rejected',
      reason: 'Family event overlapping with service hours.',
      missedServices: [
        { date: '2024-04-20', time: '02:00 PM', location: 'Negombo' },
        { date: '2024-04-21', time: '11:30 AM', location: 'Seeduwa' },
        { date: '2024-04-22', time: '04:00 PM', location: 'Ja-Ela' }
      ],
      adminNote: 'Personal events are not valid reasons for consecutive service cancellations.'
    }
  ]);

  const handleReview = (status) => {
    setInquiries(prev => prev.map(inq => {
      if (inq.id === selectedInquiry.id) {
        return { ...inq, status, adminNote: note };
      }
      return inq;
    }));
    setSelectedInquiry(null);
    setNote('');
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Submitted': return 'status-submitted';
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      default: return '';
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
              <tr key={inquiry.id}>
                <td>
                  <div className="provider-info">
                    <img src={inquiry.providerAvatar} alt={inquiry.providerName} className="provider-avatar" />
                    <span className="provider-name">{inquiry.providerName}</span>
                  </div>
                </td>
                <td>{inquiry.submittedDate}</td>
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
      </div>

      {selectedInquiry && (
        <div className="modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="review-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Inquiry Review</h3>
              <button className="close-btn" onClick={() => setSelectedInquiry(null)}><FiX /></button>
            </div>
            
            <div className="modal-body">
              <div className="review-section">
                <div className="section-header">
                  <FiUser /> <h4>Provider Details</h4>
                </div>
                <div className="provider-card">
                  <img src={selectedInquiry.providerAvatar} alt="" />
                  <div>
                    <p className="name">{selectedInquiry.providerName}</p>
                    <p className="date">Submitted on: {selectedInquiry.submittedDate}</p>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <div className="section-header">
                  <FiClock /> <h4>Missed Services Context</h4>
                </div>
                <div className="missed-grid">
                  {selectedInquiry.missedServices.map((s, i) => (
                    <div key={i} className="missed-mini-card">
                      <p><strong>{s.date}</strong></p>
                      <p>{s.time} - {s.location}</p>
                    </div>
                  ))}
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

              {selectedInquiry.status === 'Submitted' ? (
                <div className="review-section">
                  <div className="section-header">
                    <FiCheck /> <h4>Admin Action</h4>
                  </div>
                  <textarea 
                    placeholder="Add an optional note for the provider..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="note-textarea"
                  />
                  <div className="action-buttons">
                    <button className="reject-btn" onClick={() => handleReview('Rejected')}>
                      <FiX /> Reject Inquiry
                    </button>
                    <button className="approve-btn" onClick={() => handleReview('Approved')}>
                      <FiCheck /> Approve & Reinstate
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
