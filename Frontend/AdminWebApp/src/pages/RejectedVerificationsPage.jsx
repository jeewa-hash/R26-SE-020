import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiXCircle, FiAlertCircle } from 'react-icons/fi';

function RejectedVerificationsPage() {
  const navigate = useNavigate();
  const [rejectedProviders, setRejectedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRejectedProviders = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${API_BASE_URL}/providers/rejected`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRejectedProviders(response.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch rejected providers', err);
        setError('Failed to load rejected providers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRejectedProviders();
  }, []);

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="register-page-header">
        <div>
          <h1>Rejected Verifications</h1>
          <p>Service providers whose NIC verification was rejected</p>
        </div>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>NIC Number</th>
              <th>District</th>
              <th>Telephone</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center">Loading rejected verifications...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className="text-center" style={{ color: '#ef4444' }}>{error}</td>
              </tr>
            ) : rejectedProviders.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '24px' }}>
                    <FiAlertCircle size={20} color="#9ca3af" />
                    <span>No rejected verifications</span>
                  </div>
                </td>
              </tr>
            ) : (
              rejectedProviders.map((provider) => (
                <tr
                  key={provider._id}
                  className="clickable-row"
                  onClick={() => navigate(`/verify-provider/${provider._id}`)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ef4444',
                          fontSize: '14px',
                        }}
                      >
                        <FiXCircle />
                      </div>
                      <span>{provider.email}</span>
                    </div>
                  </td>
                  <td>{provider.nicNumber}</td>
                  <td>{provider.district || 'N/A'}</td>
                  <td>{provider.telephone || 'N/A'}</td>
                  <td>{provider.category || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RejectedVerificationsPage;
