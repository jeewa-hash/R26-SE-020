import { useState, useEffect } from 'react';
import { FiUser, FiShield, FiCheckCircle, FiXCircle, FiClock, FiMapPin, FiCalendar, FiX, FiSearch, FiRotateCcw, FiUnlock } from 'react-icons/fi';
import { HiOutlineExternalLink } from 'react-icons/hi';
import { ADMIN_SERVICE_URL } from '../config';
import './PenaltyManagementPage.css';

const PenaltyManagementPage = () => {
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({ activeInquiries: 0, blockedAccounts: 0 });
  const [loading, setLoading] = useState(true);

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [inquiryFilter, setInquiryFilter] = useState('ALL');

  useEffect(() => {
    fetchPenaltyRegistry(false);
    const interval = setInterval(() => {
      fetchPenaltyRegistry(true);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchPenaltyRegistry = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries/penalty-registry`);
      const data = await response.json();
      if (response.ok && data.data) {
        setWorkers(data.data);
        if (data.stats) setStats(data.stats);
      } else if (!isBackground) {
        setWorkers([]);
      }
    } catch (err) {
      if (!isBackground) {
        console.log('Error fetching penalty registry:', err.message);
        setWorkers([]);
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const handleUnblock = async (e, id) => {
    e.stopPropagation(); // Prevent row click
    try {
      const response = await fetch(`${ADMIN_SERVICE_URL}/api/inquiries/provider/${id}/toggle-lock`, {
        method: 'PUT',
      });
      const result = await response.json();
      if (response.ok) {
        setWorkers((prev) =>
          prev.map((worker) => {
            if (worker.id === id) {
              return {
                ...worker,
                systemAction: 'unlocked',
                status: 'Active',
                isBlocked: false,
                penaltyCount: 0,
                penaltyRatio: '0/3',
                score: 0,
                inquiryStatus: 'Not Required',
                missedServices: [],
              };
            }
            return worker;
          })
        );
        fetchPenaltyRegistry();
      }
    } catch (err) {
      console.log('Unblock error:', err);
    }
  };

  const getPenaltyCount = (worker) => {
    if (worker.penaltyCount !== undefined) return worker.penaltyCount;
    if (worker.consecutiveRejections !== undefined) return worker.consecutiveRejections;
    return 0;
  };

  const getRowClassName = (worker) => {
    const count = getPenaltyCount(worker);
    if (count >= 3 || worker.status === 'Blocked' || worker.status === 'Suspended') {
      return 'clickable-row penalized-row-3';
    }
    if (count === 2) {
      return 'clickable-row penalized-row-2';
    }
    if (count === 1) {
      return 'clickable-row penalized-row-1';
    }
    return 'clickable-row';
  };

  const getInquiryBadgeClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'required') return 'status-required';
    if (s === 'optional') return 'status-optional';
    return 'status-not-required';
  };

  const resetFilters = () => {
    setSearchTerm('');
    setScoreFilter('ALL');
    setStatusFilter('ALL');
    setInquiryFilter('ALL');
  };

  // Filtered workers list
  const filteredWorkers = workers.filter((worker) => {
    // 1. Search by Provider Name or Role
    const nameMatch = (worker.name || '').toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
                      (worker.role || '').toLowerCase().includes(searchTerm.toLowerCase().trim());
    if (!nameMatch) return false;

    const count = getPenaltyCount(worker);
    const inquiryStatus = worker.inquiryStatus || (count >= 3 ? 'Required' : (count === 2 ? 'Optional' : 'Not Required'));

    // 2. Filter by Penalty Score
    if (scoreFilter !== 'ALL') {
      if (scoreFilter === '0' && count !== 0) return false;
      if (scoreFilter === '1' && count !== 1) return false;
      if (scoreFilter === '2' && count !== 2) return false;
      if (scoreFilter === '3' && count < 3) return false;
    }

    // 3. Filter by Status
    if (statusFilter !== 'ALL') {
      if ((worker.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // 4. Filter by Inquiry Status
    if (inquiryFilter !== 'ALL') {
      if (inquiryStatus.toLowerCase() !== inquiryFilter.toLowerCase()) return false;
    }

    return true;
  });

  // Calculate live count of workers requiring inquiries (inquiryStatus === 'Required')
  const activeInquiriesRequiredCount = workers.filter(w => getPenaltyCount(w) > 0).length;
  const blockedCount = workers.filter(w => w.status === 'Blocked' || w.status === 'Suspended' || w.systemAction === 'locked').length;

  const hasActiveFilters = searchTerm !== '' || scoreFilter !== 'ALL' || statusFilter !== 'ALL' || inquiryFilter !== 'ALL';
  const closeDetails = () => setSelectedWorker(null);

  return (
    <div className="penalty-page animate-fade-in">
      <div className="penalty-header">
        <div className="header-left">
          <h1>Penalty Point Registry</h1>
          <p>Click any row to view full inquiry details and missed service history.</p>
        </div>
        <div className="header-right">
          <button className="export-btn" onClick={() => alert('Exporting penalty records to CSV...')}>
            Export CSV <HiOutlineExternalLink />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="penalty-stats">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FiShield />
          </div>
          <div className="stat-info">
            <span className="stat-label">ACTIVE INQUIRIES (REQUIRED)</span>
            <span className="stat-value">{activeInquiriesRequiredCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">
            <FiUser />
          </div>
          <div className="stat-info">
            <span className="stat-label">BLOCKED ACCOUNTS</span>
            <span className="stat-value">{blockedCount < 10 ? `0${blockedCount}` : blockedCount}</span>
          </div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="penalty-filter-bar">
        <div className="search-input-box">
          <FiSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search by provider name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm !== '' && (
            <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
              <FiX />
            </button>
          )}
        </div>

        <div className="filters-group">
          {/* Penalty Score Filter */}
          <div className="filter-select-wrapper">
            <label>Score:</label>
            <select
              className="filter-select"
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
            >
              <option value="ALL">All Scores</option>
              <option value="0">0/3 (0-1 Cancellations)</option>
              <option value="1">1/3 (2 Consecutive Cancellations)</option>
              <option value="2">2/3 (3 Consecutive Cancellations)</option>
              <option value="3">3/3 (4+ Cancellations / Blocked)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-select-wrapper">
            <label>Status:</label>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          {/* Inquiry Status Filter */}
          <div className="filter-select-wrapper">
            <label>Inquiry:</label>
            <select
              className="filter-select"
              value={inquiryFilter}
              onChange={(e) => setInquiryFilter(e.target.value)}
            >
              <option value="ALL">All Inquiries</option>
              <option value="Required">Required (3/3)</option>
              <option value="Optional">Optional (2/3)</option>
              <option value="Not Required">Not Required</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button className="reset-filter-btn" onClick={resetFilters}>
              <FiRotateCcw /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="penalty-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading penalty registry...</div>
        ) : filteredWorkers.length === 0 ? (
          <div style={{ padding: 50, textAlign: 'center', color: '#6b7280' }}>
            <p style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 6 }}>No matching service providers found</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Try adjusting your search keywords or filter criteria.</p>
            {hasActiveFilters && (
              <button className="reset-filter-btn" onClick={resetFilters} style={{ margin: '0 auto' }}>
                <FiRotateCcw /> Clear All Filters
              </button>
            )}
          </div>
        ) : (
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
              {filteredWorkers.map((worker) => {
                const count = getPenaltyCount(worker);
                const ratio = `${count}/3`;
                const inquiryStatus = worker.inquiryStatus || (count >= 3 ? 'Required' : (count === 2 ? 'Optional' : 'Not Required'));

                return (
                  <tr 
                    key={worker.id} 
                    onClick={() => setSelectedWorker(worker)} 
                    className={getRowClassName(worker)}
                  >
                    <td>
                      <div className="worker-info">
                        <div className="worker-details">
                          <span className="worker-name">{worker.name}</span>
                          <span className="worker-role">{worker.role}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="score-container">
                        <span className={`penalty-ratio-badge ratio-${count}-3`}>
                          {ratio}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={`status-badge ${worker.status?.toLowerCase()}`}>
                        {worker.status === 'Active' && <FiCheckCircle />}
                        {worker.status === 'Blocked' && <FiXCircle />}
                        {worker.status === 'Suspended' && <FiClock />}
                        {worker.status}
                      </div>
                    </td>
                    <td>
                      {worker.status === 'Suspended' || worker.status === 'Blocked' || worker.systemAction === 'locked' || worker.isBlocked ? (
                        <button
                          type="button"
                          className="unblock-action-btn"
                          onClick={(e) => handleUnblock(e, worker.id)}
                          title="Click to Unblock/Restore Account"
                        >
                          <FiUnlock /> Unblock
                        </button>
                      ) : (
                        <span className="no-action-label">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`inquiry-badge ${getInquiryBadgeClass(inquiryStatus)}`}>
                        {inquiryStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {selectedWorker && (
        <div className="modal-overlay" onClick={closeDetails}>
          <div className="details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-area">
                <div>
                  <h3>{selectedWorker.name}</h3>
                  <p>{selectedWorker.role}</p>
                </div>
              </div>
              <button className="modal-close" onClick={closeDetails}><FiX /></button>
            </div>

            <div className="modal-body">
              <h4 className="section-title">Consecutive Missed Services</h4>
              <p className="section-subtitle">Detailed log of missed service appointments requiring justification.</p>

              <div className="missed-services-list">
                {selectedWorker.missedServices && selectedWorker.missedServices.length > 0 ? (
                  selectedWorker.missedServices.map((service, index) => (
                    <div key={service.id || service.bookingId || index} className="missed-service-item">
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
                  ))
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: 13, padding: 10 }}>No missed services recorded for this provider.</p>
                )}
              </div>

              <div className="modal-footer-info">
                <div className="footer-stat">
                  <span className="label">Consecutive Penalty</span>
                  <span className={`penalty-ratio-badge ratio-${getPenaltyCount(selectedWorker)}-3`} style={{ fontSize: 16 }}>
                    {getPenaltyCount(selectedWorker)}/3
                  </span>
                </div>
                <div className="footer-stat">
                  <span className="label">Inquiry Status</span>
                  <span className={`inquiry-badge ${getInquiryBadgeClass(getPenaltyCount(selectedWorker) === 0 ? 'Not Required' : 'Required')}`}>
                    {getPenaltyCount(selectedWorker) === 0 ? 'Not Required' : 'Required'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Bottom Footer with Close Button */}
            <div className="modal-bottom-actions">
              <button type="button" className="details-modal-close-btn" onClick={closeDetails}>
                <FiX /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PenaltyManagementPage;
