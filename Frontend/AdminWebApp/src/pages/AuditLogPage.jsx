import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiUser, FiFilter, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './AuditLogPage.css';

const AuditLogPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const { category, startDate, endDate } = filters;
      let url = `${API_BASE_URL}/audit-logs?page=${page}&limit=10`;
      
      if (category) url += `&category=${category}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setLogs(response.data.logs);
      setPages(response.data.pages);
      setCurrentPage(response.data.currentPage);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pages) {
      fetchLogs(newPage);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="audit-log-page animate-fade-in">
      <div className="page-header">
        <div className="header-left">
          <h1>System Audit Logs</h1>
          <p>Track all administrative actions and system changes.</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label><FiFilter /> Category</label>
          <select 
            value={filters.category} 
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            <option value="User">User Actions</option>
            <option value="Category">Category Actions</option>
            <option value="NIC">NIC Verifications</option>
          </select>
        </div>

        <div className="filter-group">
          <label><FiCalendar /> Start Date</label>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          />
        </div>

        <div className="filter-group">
          <label><FiCalendar /> End Date</label>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          />
        </div>

        <button className="clear-filters" onClick={() => setFilters({category: '', startDate: '', endDate: ''})}>
          Clear
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-state">Loading logs...</div>
        ) : (
          <>
            <table className="audit-table">
              <thead>
                <tr>
                  <th>DATE & TIME</th>
                  <th>ACTION</th>
                  <th>CATEGORY</th>
                  <th>ACTION OWNER</th>
                  <th>TARGET</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <div className="datetime-cell">
                        <span className="date">{formatDate(log.createdAt)}</span>
                        <span className="time">{formatTime(log.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="action-text">{log.action}</span>
                    </td>
                    <td>
                      <span className={`cat-badge ${log.category.toLowerCase()}`}>
                        {log.category}
                      </span>
                    </td>
                    <td>
                      <div className="owner-cell">
                        <FiUser className="icon" />
                        <span>{log.actionOwner.fullName}</span>
                      </div>
                    </td>
                    <td>
                      {log.target ? (
                        <div className="target-cell">
                          <span className="target-name">{log.target.name}</span>
                          <span className="target-type">{log.target.type}</span>
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="empty-state">No audit logs found matching the criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>

            {pages > 1 && (
              <div className="pagination">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  <FiChevronLeft />
                </button>
                
                {[...Array(pages)].map((_, i) => (
                  <button 
                    key={i + 1}
                    className={currentPage === i + 1 ? 'active' : ''}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}

                <button 
                  disabled={currentPage === pages} 
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  <FiChevronRight />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
