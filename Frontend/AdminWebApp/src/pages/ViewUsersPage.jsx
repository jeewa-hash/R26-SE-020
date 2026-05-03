import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { FiUsers, FiEdit2, FiTrash2, FiX, FiAlertTriangle, FiFilter, FiSearch } from 'react-icons/fi';

function ViewUsersPage () {
  const [users, setUsers] = useState({ admins: [], providers: [], seekers: [] });
  const [activeTab, setActiveTab] = useState('seekers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('All');

  const DISTRICT_OPTIONS = ['All', 'Gampaha', 'Colombo'];

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editType, setEditType] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState(null);

  // View Details Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [viewType, setViewType] = useState('');

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getInitials = (user, type) => {
    if (type === 'seeker') return (user.name || 'S').charAt(0);
    if (type === 'admin') return (user.fullName || 'A').charAt(0);
    if (type === 'provider') return (user.email || 'P').charAt(0);
    return '?';
  };

  const getDisplayName = (user, type) => {
    if (type === 'seeker') return user.name || 'Unknown';
    if (type === 'admin') return user.fullName || 'Unknown';
    if (type === 'provider') return user.email || 'Unknown';
    return 'Unknown';
  };

  const AUTH_SERVICE_URL = 'http://localhost:4003';

  const providerCategories = ['All', ...Array.from(new Set(users.providers.map((provider) => provider.category).filter(Boolean)))];

  const filterUsers = (list, type) => {
    const term = searchTerm.trim().toLowerCase();

    return list.filter((user) => {
      const name = type === 'seeker' ? (user.name || '') : type === 'admin' ? (user.fullName || '') : (user.email || '');
      const email = user.email || '';
      const matchesSearch = !term || name.toLowerCase().includes(term) || email.toLowerCase().includes(term);
      const matchesDistrict = districtFilter === 'All' || (user.district && user.district.toLowerCase() === districtFilter.toLowerCase());
      const matchesCategory = type !== 'provider' || providerCategoryFilter === 'All' || (user.category && user.category.toLowerCase() === providerCategoryFilter.toLowerCase());
      return matchesSearch && matchesDistrict && matchesCategory;
    });
  };

  const filteredUsers = {
    seekers: filterUsers(users.seekers, 'seeker'),
    providers: filterUsers(users.providers, 'provider'),
    admins: filterUsers(users.admins, 'admin'),
  };

  const renderAvatar = (user, type, sizeClass = 'sm') => {
    let imageUrl = null;
    if (type === 'seeker') imageUrl = user.profilePicture;
    if (type === 'provider') imageUrl = user.profileImage;

    if (imageUrl) {
      // Stored path is like "uploads/profilePicture-xxx.jpg" 
      // authService serves static files at /uploads
      let fullUrl;
      if (imageUrl.startsWith('http')) {
        fullUrl = imageUrl;
      } else if (imageUrl.startsWith('/')) {
        fullUrl = `${AUTH_SERVICE_URL}${imageUrl}`;
      } else {
        fullUrl = `${AUTH_SERVICE_URL}/${imageUrl}`;
      }
      return (
        <>
          <img 
            src={fullUrl} 
            alt={getDisplayName(user, type)} 
            className={`user-avatar img ${sizeClass}`}
            onError={(e) => { e.target.style.display = 'none'; if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
          />
          <div className={`user-avatar initials ${sizeClass}`} style={{ display: 'none' }}>
            {getInitials(user, type)}
          </div>
        </>
      );
    }

    return (
      <div className={`user-avatar initials ${sizeClass}`}>
        {getInitials(user, type)}
      </div>
    );
  };

  // View Details Modal Handlers
  const openViewModal = (user, type) => {
    setViewType(type);
    setViewData(user);
    setIsViewModalOpen(true);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewData(null);
    setViewType('');
  };

  // Delete Handlers
  const openDeleteModal = (id, type) => {
    setDeleteData({ id, type });
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteData(null);
  };

  const confirmDelete = async () => {
    if (!deleteData) return;
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${API_BASE_URL}/users/${deleteData.type}/${deleteData.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.message || 'Failed to delete user');
      closeDeleteModal();
    }
  };

  // Toggle Status Handler
  const handleToggleStatus = async (id, type) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.patch(`${API_BASE_URL}/users/${type}/${id}/status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      console.error('Error toggling status:', err);
      alert('Failed to update status');
    }
  };

  // Edit Handlers
  const openEditModal = (user, type) => {
    setEditType(type);
    setEditData({ ...user });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditData(null);
    setEditType('');
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(`${API_BASE_URL}/users/${editType}/${editData._id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      closeEditModal();
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      alert('Failed to update user');
    }
  };

  // Render Helpers
  const renderStatus = (user, type) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span className={`status-badge ${user.isBlocked ? 'blocked' : 'active'}`}>
          {user.isBlocked ? 'Blocked' : 'Active'}
        </span>
        <label className="switch" title={user.isBlocked ? 'Click to Unblock' : 'Click to Block'} onClick={(e) => e.stopPropagation()}>
          <input 
            type="checkbox" 
            checked={!user.isBlocked} 
            onChange={() => handleToggleStatus(user._id, type)} 
          />
          <span className="slider round"></span>
        </label>
      </div>
    );
  };

  const renderActions = (user, type) => {
    return (
      <div className="action-buttons">
        <button className="btn-icon edit" onClick={(e) => { e.stopPropagation(); openEditModal(user, type); }} title="Edit">
          <FiEdit2 />
        </button>
        <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); openDeleteModal(user._id, type); }} title="Delete">
          <FiTrash2 />
        </button>
      </div>
    );
  };

  const renderTable = () => {
    if (loading) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--gray-400)' }}><div style={{ width: '40px', height: '40px', border: '3px solid var(--gray-100)', borderTopColor: 'var(--primary-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />Loading users...</div>;
    if (error) return <div style={{ margin: '24px', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)', color: '#991b1b', fontSize: '14px' }}>{error}</div>;

    if (activeTab === 'seekers') {
      return (
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Telephone</th>
              <th>NIC</th>
              <th>District</th>
              <th>Email Verified</th>
              <th>Joined Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.seekers.map((seeker) => (
              <tr key={seeker._id} className="clickable-row" onClick={() => openViewModal(seeker, 'seeker')}>
                <td style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {renderAvatar(seeker, 'seeker', 'sm')}
                    {seeker.name}
                  </div>
                </td>
                <td>{seeker.email}</td>
                <td>{seeker.telephone}</td>
                <td>{seeker.nicNumber || 'N/A'}</td>
                <td>{seeker.district || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${seeker.isEmailVerified ? 'verified' : 'pending'}`}>
                    {seeker.isEmailVerified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td style={{ color: 'var(--gray-400)', fontSize: '12.5px' }}>{formatDate(seeker.createdAt)}</td>
                <td onClick={(e) => e.stopPropagation()}>{renderStatus(seeker, 'seeker')}</td>
                <td onClick={(e) => e.stopPropagation()}>{renderActions(seeker, 'seeker')}</td>
              </tr>
            ))}
            {users.seekers.length === 0 && <tr><td colSpan="9" className="text-center">No seekers found.</td></tr>}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'providers') {
      return (
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Telephone</th>
              <th>NIC</th>
              <th>Category</th>
              <th>District</th>
              <th>Verified</th>
              <th>Joined Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.providers.map((provider) => (
              <tr key={provider._id} className="clickable-row" onClick={() => openViewModal(provider, 'provider')}>
                <td style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {renderAvatar(provider, 'provider', 'sm')}
                    {provider.email}
                  </div>
                </td>
                <td>{provider.telephone || 'N/A'}</td>
                <td>{provider.nicNumber || 'N/A'}</td>
                <td>{provider.category || 'N/A'}</td>
                <td>{provider.district || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${provider.isVerified ? 'verified' : 'pending'}`}>
                    {provider.isVerified ? 'Verified' : 'Pending'}
                  </span>
                </td>
                <td style={{ color: 'var(--gray-400)', fontSize: '12.5px' }}>{formatDate(provider.createdAt)}</td>
                <td onClick={(e) => e.stopPropagation()}>{renderStatus(provider, 'provider')}</td>
                <td onClick={(e) => e.stopPropagation()}>{renderActions(provider, 'provider')}</td>
              </tr>
            ))}
            {users.providers.length === 0 && <tr><td colSpan="9" className="text-center">No service providers found.</td></tr>}
          </tbody>
        </table>
      );
    }

    if (activeTab === 'admins') {
      return (
        <table className="users-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Telephone</th>
              <th>NIC</th>
              <th>District</th>
              <th>Joined Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.admins.map((admin) => (
              <tr key={admin._id} className="clickable-row" onClick={() => openViewModal(admin, 'admin')}>
                <td style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {renderAvatar(admin, 'admin', 'sm')}
                    {admin.fullName}
                  </div>
                </td>
                <td>{admin.email}</td>
                <td>{admin.telephone}</td>
                <td>{admin.nic}</td>
                <td>{admin.district}</td>
                <td style={{ color: 'var(--gray-400)', fontSize: '12.5px' }}>{formatDate(admin.createdAt)}</td>
                <td onClick={(e) => e.stopPropagation()}>{renderStatus(admin, 'admin')}</td>
                <td onClick={(e) => e.stopPropagation()}>{renderActions(admin, 'admin')}</td>
              </tr>
            ))}
            {users.admins.length === 0 && <tr><td colSpan="8" className="text-center">No admins found.</td></tr>}
          </tbody>
        </table>
      );
    }
  };

  return (
    <div className="page-content">
      <div className="register-page-header">
        <div>
          <h1><FiUsers style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--primary-500)' }} /> View All Users</h1>
          <p>Manage and view details of all users registered in the system.</p>
        </div>
      </div>

      <div className="users-container">
        <div className="tabs">
          <button 
            className={`tab-btn ${activeTab === 'seekers' ? 'active' : ''}`}
            onClick={() => setActiveTab('seekers')}
          >
            Seekers ({users.seekers?.length || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'providers' ? 'active' : ''}`}
            onClick={() => setActiveTab('providers')}
          >
            Service Providers ({users.providers?.length || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveTab('admins')}
          >
            Admins ({users.admins?.length || 0})
          </button>
        </div>

        <div className="table-filters">
          <div className="filter-left">
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                className="filter-search-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-right">
            <div className="filter-control-group">
              <label>District</label>
              <select
                className="filter-select"
                value={districtFilter}
                onChange={(e) => setDistrictFilter(e.target.value)}
              >
                {DISTRICT_OPTIONS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {activeTab === 'providers' && (
              <>
                <div className="filter-divider"></div>
                <div className="filter-control-group">
                  <label>Category</label>
                  <select
                    className="filter-select"
                    value={providerCategoryFilter}
                    onChange={(e) => setProviderCategoryFilter(e.target.value)}
                  >
                    {providerCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="table-container">
          {renderTable()}
        </div>
      </div>

      {/* ===== View Details Modal ===== */}
      {isViewModalOpen && viewData && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            {/* Gradient Header with Avatar */}
            <div className="detail-modal-header">
              {renderAvatar(viewData, viewType, 'lg')}
              <div className="detail-header-info">
                <h3>{getDisplayName(viewData, viewType)}</h3>
                <p>{viewType.charAt(0).toUpperCase() + viewType.slice(1)} • {viewData.email}</p>
              </div>
              <button className="btn-close" onClick={closeViewModal} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', color: '#fff' }}><FiX /></button>
            </div>

            {/* Detail Rows */}
            <div className="detail-body">
              {viewType === 'seeker' && (
                <>
                  <div className="detail-row"><div className="detail-label">Telephone</div><div className="detail-value">{viewData.telephone}</div></div>
                  <div className="detail-row"><div className="detail-label">NIC Number</div><div className="detail-value">{viewData.nicNumber || 'N/A'}</div></div>
                  <div className="detail-row"><div className="detail-label">District</div><div className="detail-value">{viewData.district || 'N/A'}</div></div>
                  <div className="detail-row">
                    <div className="detail-label">Email Verified</div>
                    <div className="detail-value">
                      <span className={`status-badge ${viewData.isEmailVerified ? 'verified' : 'pending'}`}>
                        {viewData.isEmailVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {viewType === 'provider' && (
                <>
                  <div className="detail-row"><div className="detail-label">Telephone</div><div className="detail-value">{viewData.telephone || 'N/A'}</div></div>
                  <div className="detail-row"><div className="detail-label">NIC Number</div><div className="detail-value">{viewData.nicNumber || 'N/A'}</div></div>
                  <div className="detail-row"><div className="detail-label">Category</div><div className="detail-value">{viewData.category || 'N/A'}</div></div>
                  <div className="detail-row"><div className="detail-label">District</div><div className="detail-value">{viewData.district || 'N/A'}</div></div>
                  <div className="detail-row"><div className="detail-label">Bio</div><div className="detail-value">{viewData.bio || 'N/A'}</div></div>
                  <div className="detail-row">
                    <div className="detail-label">Profile Verified</div>
                    <div className="detail-value">
                      <span className={`status-badge ${viewData.isVerified ? 'verified' : 'pending'}`}>
                        {viewData.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {viewType === 'admin' && (
                <>
                  <div className="detail-row"><div className="detail-label">Telephone</div><div className="detail-value">{viewData.telephone}</div></div>
                  <div className="detail-row"><div className="detail-label">NIC</div><div className="detail-value">{viewData.nic}</div></div>
                  <div className="detail-row"><div className="detail-label">District</div><div className="detail-value">{viewData.district}</div></div>
                  <div className="detail-row"><div className="detail-label">Role</div><div className="detail-value">{viewData.role}</div></div>
                </>
              )}

              <div className="detail-row"><div className="detail-label">Joined Date</div><div className="detail-value">{formatDate(viewData.createdAt)}</div></div>
              <div className="detail-row">
                <div className="detail-label">Account Status</div>
                <div className="detail-value">
                  <span className={`status-badge ${viewData.isBlocked ? 'blocked' : 'active'}`}>
                    {viewData.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-footer">
              <button className="modal-btn cancel" onClick={closeViewModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Edit Modal ===== */}
      {isEditModalOpen && editData && (
        <div className="modal-overlay">
          <div className="modal-content edit-modal">
            <div className="modal-header">
              <h2>Edit {editType.charAt(0).toUpperCase() + editType.slice(1)}</h2>
              <button className="btn-close" onClick={closeEditModal}><FiX /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editType === 'seeker' && (
                  <>
                    <div className="form-group">
                      <label>Name</label>
                      <input type="text" className="form-input" name="name" value={editData.name || ''} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>Telephone</label>
                      <input type="text" className="form-input" name="telephone" value={editData.telephone || ''} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>District</label>
                      <input type="text" className="form-input" name="district" value={editData.district || ''} onChange={handleEditChange} required />
                    </div>
                  </>
                )}
                {editType === 'provider' && (
                  <>
                    <div className="form-group">
                      <label>Category</label>
                      <input type="text" className="form-input" name="category" value={editData.category || ''} onChange={handleEditChange} />
                    </div>
                    <div className="form-group">
                      <label>Telephone</label>
                      <input type="text" className="form-input" name="telephone" value={editData.telephone || ''} onChange={handleEditChange} />
                    </div>
                    <div className="form-group">
                      <label>District</label>
                      <input type="text" className="form-input" name="district" value={editData.district || ''} onChange={handleEditChange} />
                    </div>
                  </>
                )}
                {editType === 'admin' && (
                  <>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" className="form-input" name="fullName" value={editData.fullName || ''} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>Telephone</label>
                      <input type="text" className="form-input" name="telephone" value={editData.telephone || ''} onChange={handleEditChange} required />
                    </div>
                    <div className="form-group">
                      <label>District</label>
                      <input type="text" className="form-input" name="district" value={editData.district || ''} onChange={handleEditChange} required />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>Email (Read-only)</label>
                  <input type="email" className="form-input" value={editData.email || ''} readOnly disabled style={{backgroundColor: 'var(--gray-100)', cursor: 'not-allowed', opacity: 0.7}} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn cancel" onClick={closeEditModal}>Cancel</button>
                <button type="submit" className="modal-btn primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {isDeleteModalOpen && deleteData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <div></div>
              <button className="btn-close" onClick={closeDeleteModal}><FiX /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: '0' }}>
              <div className="delete-modal-icon">
                <FiAlertTriangle />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700', color: 'var(--gray-900)' }}>Delete {deleteData.type}?</h3>
              <p style={{ color: 'var(--gray-500)', margin: '0 0 4px', lineHeight: '1.6', fontSize: '14px' }}>
                This action cannot be undone. The account and all associated data will be permanently removed.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button className="modal-btn cancel" onClick={closeDeleteModal}>Cancel</button>
              <button className="modal-btn danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewUsersPage;
