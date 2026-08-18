import { useState } from 'react';
import { FiUser, FiShield, FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiCalendar, FiX } from 'react-icons/fi';
import { HiOutlineExternalLink } from 'react-icons/hi';
import './PenaltyManagementPage.css';

const PenaltyManagementPage = () => {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workers, setWorkers] = useState([
    {
      id: 1,
      name: 'Arjun Perera',
      role: 'Plumbing Specialist',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
      score: 15,
      maxScore: 100,
      status: 'Active',
      systemAction: 'unlocked',
      inquiryStatus: 'Submitted',
      missedServices: [
        { id: 101, date: '2024-05-01', time: '10:00 AM', location: 'Colombo 03' },
        { id: 102, date: '2024-05-02', time: '02:30 PM', location: 'Nugegoda' },
        { id: 103, date: '2024-05-03', time: '09:15 AM', location: 'Battaramulla' }
      ]
    },
    {
      id: 2,
      name: 'Nimali Silva',
      role: 'Home Cleaning',
      avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
      score: 85,
      maxScore: 100,
      status: 'Blocked',
      systemAction: 'locked',
      inquiryStatus: 'Submitted',
      missedServices: [
        { id: 201, date: '2024-04-28', time: '08:00 AM', location: 'Gampaha' },
        { id: 202, date: '2024-04-29', time: '11:00 AM', location: 'Kiribathgoda' },
        { id: 203, date: '2024-04-30', time: '04:00 PM', location: 'Kadawatha' }
      ]
    },
    {
      id: 3,
      name: 'Kasun Rathnayake',
      role: 'Electrician',
      avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
      score: 100,
      maxScore: 100,
      status: 'Suspended',
      systemAction: 'locked',
      inquiryStatus: 'Not Yet',
      missedServices: [
        { id: 301, date: '2024-05-04', time: '01:00 PM', location: 'Mount Lavinia' },
        { id: 302, date: '2024-05-05', time: '10:30 AM', location: 'Dehiwala' },
        { id: 303, date: '2024-05-06', time: '03:45 PM', location: 'Ratmalana' }
      ]
    },
    {
      id: 4,
      name: 'Priya Jayawardena',
      role: 'Beauty Therapist',
      avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
      score: 5,
      maxScore: 100,
      status: 'Active',
      systemAction: 'unlocked',
      inquiryStatus: 'Not Required',
      missedServices: [
        { id: 401, date: '2024-05-01', time: '11:00 AM', location: 'Rajagiriya' },
        { id: 402, date: '2024-05-02', time: '01:00 PM', location: 'Kotte' },
        { id: 403, date: '2024-05-03', time: '04:00 PM', location: 'Thalahena' }
      ]
    },
    {
      id: 5,
      name: 'Dimuthu Bandara',
      role: 'Carpenter',
      avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
      score: 68,
      maxScore: 100,
      status: 'Active',
      systemAction: 'unlocked',
      inquiryStatus: 'Approved',
      missedServices: [
        { id: 501, date: '2024-04-25', time: '09:00 AM', location: 'Moratuwa' },
        { id: 502, date: '2024-04-26', time: '12:00 PM', location: 'Panadura' },
        { id: 503, date: '2024-04-27', time: '03:00 PM', location: 'Wadduwa' }
      ]
    }
  ]);

  const stats = {
    activeInquiries: 3,
    blockedAccounts: 1
  };

  const handleToggleAction = (e, id) => {
    e.stopPropagation(); // Prevent row click
    setWorkers(prev => prev.map(worker => {
      if (worker.id === id) {
        const newAction = worker.systemAction === 'unlocked' ? 'locked' : 'unlocked';
        return {
          ...worker,
          systemAction: newAction,
          status: newAction === 'locked' ? 'Blocked' : 'Active'
        };
      }
      return worker;
    }));
  };

  const getScoreColor = (score) => {
    if (score < 30) return '#4f46e5';
    if (score < 70) return '#f59e0b';
    return '#ef4444';
  };

  const getInquiryBadgeClass = (status) => {
    switch (status) {
      case 'Not Required': return 'status-not-required';
      case 'Not Yet': return 'status-not-yet';
      case 'Submitted': return 'status-submitted';
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      default: return '';
    }
  };

  const closeDetails = () => setSelectedWorker(null);

  return (
    <div className="penalty-page animate-fade-in">
      <div className="penalty-header">
        <div className="header-left">
          <h1>Penalty Point Registry</h1>
          <p>Click any row to view full inquiry details and missed service history.</p>
        </div>
        <div className="header-right">
          <button className="export-btn">
            Export CSV <HiOutlineExternalLink />
          </button>
        </div>
      </div>

      <div className="penalty-stats">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiShield />
          </div>
          <div className="stat-info">
            <span className="stat-label">ACTIVE INQUIRIES</span>
            <span className="stat-value">{stats.activeInquiries}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <FiUser />
          </div>
          <div className="stat-info">
            <span className="stat-label">BLOCKED ACCOUNTS</span>
            <span className="stat-value">{stats.blockedAccounts < 10 ? `0${stats.blockedAccounts}` : stats.blockedAccounts}</span>
          </div>
        </div>
      </div>

      <div className="penalty-container">
        <table className="penalty-table">
          <thead>
            <tr>
              <th>WORKER INFORMATION</th>
              <th>PENALTY SCORE</th>
              <th>STATUS</th>
              <th>SYSTEM ACTION</th>
              <th>INQUIRY STATUS</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((worker) => (
              <tr key={worker.id} onClick={() => setSelectedWorker(worker)} className="clickable-row">
                <td>
                  <div className="worker-info">
                    <img src={worker.avatar} alt={worker.name} className="worker-avatar" />
                    <div className="worker-details">
                      <span className="worker-name">{worker.name}</span>
                      <span className="worker-role">{worker.role}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="score-container">
                    <div className="score-label">
                      <span>SCORE</span>
                      <span className="score-value">{worker.score}/100</span>
                    </div>
                    <div className="score-bar-bg">
                      <div
                        className="score-bar-fill"
                        style={{
                          width: `${worker.score}%`,
                          backgroundColor: getScoreColor(worker.score)
                        }}
                      ></div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={`status-badge ${worker.status.toLowerCase()}`}>
                    {worker.status === 'Active' && <FiCheckCircle />}
                    {worker.status === 'Blocked' && <FiXCircle />}
                    {worker.status === 'Suspended' && <FiClock />}
                    {worker.status}
                  </div>
                </td>
                <td>
                  <div className="action-toggle-container">
                    <button
                      className={`toggle-btn ${worker.systemAction}`}
                      onClick={(e) => handleToggleAction(e, worker.id)}
                    >
                      <div className="toggle-slider"></div>
                    </button>
                    <span className="toggle-label">{worker.systemAction.toUpperCase()}</span>
                  </div>
                </td>
                <td>
                  <span className={`inquiry-badge ${getInquiryBadgeClass(worker.inquiryStatus)}`}>
                    {worker.inquiryStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedWorker && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <img src={selectedWorker.avatar} alt={selectedWorker.name} className="modal-avatar" />
                <div>
                  <h3>{selectedWorker.name}</h3>
                  <p>{selectedWorker.role}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeDetails}><FiX /></button>
            </div>

            <div className="modal-body">
              <h4 className="section-title">Consecutive Missed Services</h4>
              <p className="section-subtitle">Detailed log of the 3 most recent missed service appointments.</p>

              <div className="missed-services-list">
                {selectedWorker.missedServices.map((service, index) => (
                  <div key={service.id} className="missed-service-item">
                    <div className="service-number">#{index + 1}</div>
                    <div className="service-details">
                      <div className="detail-row">
                        <FiCalendar className="detail-icon" />
                        <span>Date: <strong>{service.date}</strong></span>
                      </div>
                      <div className="detail-row">
                        <FiClock className="detail-icon" />
                        <span>Time: <strong>{service.time}</strong></span>
                      </div>
                      <div className="detail-row">
                        <FiMapPin className="detail-icon" />
                        <span>Location: <strong>{service.location}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="modal-footer-info">
                <div className="footer-stat">
                  <span className="label">Current Penalty Score</span>
                  <span className="value" style={{ color: getScoreColor(selectedWorker.score) }}>{selectedWorker.score}/100</span>
                </div>
                <div className="footer-stat">
                  <span className="label">Inquiry Status</span>
                  <span className={`inquiry-badge ${getInquiryBadgeClass(selectedWorker.inquiryStatus)}`}>
                    {selectedWorker.inquiryStatus}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenaltyManagementPage;
