import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiCheckCircle, FiXCircle, FiAlertCircle, FiSearch, FiClock, FiShield } from 'react-icons/fi';

function NICVerificationsPage() {
  const navigate = useNavigate();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Pending', 'Approved', 'Rejected'

  useEffect(() => {
    const fetchVerifications = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/providers/verifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setVerifications(response.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch verifications', err);
        setError('Failed to load verifications. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchVerifications();
  }, []);

  const filteredVerifications = useMemo(() => {
    return verifications.filter(v => {
      const matchesSearch = 
        v.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (v.fullName && v.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        v.nicNumber.includes(searchTerm);
      
      const matchesStatus = statusFilter === 'All' || v.verificationStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [verifications, searchTerm, statusFilter]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Approved': return 'status-badge stable';
      case 'Rejected': return 'status-badge critical';
      case 'Pending': return 'status-badge warning';
      default: return 'status-badge';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <FiCheckCircle />;
      case 'Rejected': return <FiXCircle />;
      case 'Pending': return <FiClock />;
      default: return <FiAlertCircle />;
    }
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="register-page-header">
        <div>
          <h1>NIC Verifications</h1>
          <p>Manage and track all service provider NIC verification statuses</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="table-section" style={{ marginTop: '0' }}>
        <div className="table-header-controls">
          <h3>Verification List</h3>
          <div className="table-filters">
            <div className="status-filter-group">
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-select"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Only</option>
                <option value="Approved">Approved Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
            </div>
            <div className="search-container">
              <FiSearch />
              <input 
                type="text" 
                placeholder="Search name, email, or NIC..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>NIC Number</th>
                <th>District</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center">Loading verifications...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center" style={{ color: '#ef4444' }}>{error}</td>
                </tr>
              ) : filteredVerifications.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px' }}>
                      <FiAlertCircle size={20} color="#9ca3af" />
                      <span>No verifications found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVerifications.map((v) => (
                  <tr key={v._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: v.verificationStatus === 'Approved' 
                              ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
                              : v.verificationStatus === 'Rejected'
                              ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
                              : 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: v.verificationStatus === 'Approved' ? '#10b981' : v.verificationStatus === 'Rejected' ? '#ef4444' : '#eab308',
                            fontSize: '14px',
                          }}
                        >
                          <FiShield />
                        </div>
                        <span style={{ fontWeight: '500' }}>{v.email}</span>
                      </div>
                    </td>
                    <td>{v.nicNumber}</td>
                    <td>{v.district}</td>
                    <td>
                      <span className={getStatusBadgeClass(v.verificationStatus)} style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                        {getStatusIcon(v.verificationStatus)}
                        {v.verificationStatus}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="filter-btn" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => navigate(`/verify-provider/${v._id}`)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default NICVerificationsPage;
