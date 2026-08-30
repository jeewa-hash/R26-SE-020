import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, AUTH_SERVICE_URL } from '../config';
import { FiUsers, FiEdit2, FiTrash2, FiX, FiAlertTriangle, FiFilter, FiSearch, FiMapPin, FiMap } from 'react-icons/fi';

function ViewUsersPage () {
  const [users, setUsers] = useState({ admins: [], providers: [], seekers: [] });
  const [activeTab, setActiveTab] = useState('seekers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [providerCategoryFilter, setProviderCategoryFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');

  const SRI_LANKA_DISTRICTS = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
    'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
    'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
    'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
    'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
  ];

  const DISTRICT_OPTIONS = ['All', ...SRI_LANKA_DISTRICTS];

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editType, setEditType] = useState('');

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState(null);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState('');

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
    if (type === 'seeker') return (user.name || user.fullName || 'S').charAt(0).toUpperCase();
    if (type === 'admin') return (user.fullName || user.name || 'A').charAt(0).toUpperCase();
    if (type === 'provider') return (user.name || user.fullName || (user.email ? user.email.split('@')[0] : 'P')).charAt(0).toUpperCase();
    return '?';
  };

  const getDisplayName = (user, type) => {
    if (type === 'seeker') return user.name || user.fullName || 'Unknown';
    if (type === 'admin') return user.fullName || user.name || 'Unknown';
    if (type === 'provider') return user.name || user.fullName || (user.email ? user.email.split('@')[0] : 'Unknown');
    return 'Unknown';
  };

  const providerCategories = ['All', ...Array.from(new Set(users.providers.map((provider) => provider.category).filter(Boolean)))];
  const genderOptions = ['All', 'Male', 'Female'];

  const filterUsers = (list, type) => {
    const term = searchTerm.trim().toLowerCase();

    return list.filter((user) => {
      const name = type === 'seeker' 
        ? (user.name || user.fullName || '') 
        : type === 'admin' 
        ? (user.fullName || user.name || '') 
        : (user.name || user.fullName || (user.email ? user.email.split('@')[0] : ''));
      const email = user.email || '';
      const telephone = user.telephone || '';
      const nic = user.nicNumber || user.nic || '';
      const matchesSearch = !term || 
        name.toLowerCase().includes(term) || 
        email.toLowerCase().includes(term) || 
        telephone.toLowerCase().includes(term) || 
        nic.toLowerCase().includes(term);
      const matchesDistrict = districtFilter === 'All' || (user.district && user.district.toLowerCase() === districtFilter.toLowerCase());
      const matchesCategory = type !== 'provider' || providerCategoryFilter === 'All' || (user.category && user.category.toLowerCase() === providerCategoryFilter.toLowerCase());
      const matchesGender = type !== 'provider' || genderFilter === 'All' || (user.gender && user.gender === genderFilter);
      return matchesSearch && matchesDistrict && matchesCategory && matchesGender;
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
  const openDeleteModal = (user, type) => {
    setDeleteData({ id: user._id, type, email: user.email });
    setIsDeleteModalOpen(true);
    setConfirmEmail('');
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteData(null);
    setConfirmEmail('');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!deleteData) return;

    if (confirmEmail.trim().toLowerCase() !== deleteData.email.toLowerCase()) {
      setDeleteError('Email does not match. Please try again.');
      return;
    }

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
        <button className="btn-icon delete" onClick={(e) => { e.stopPropagation(); openDeleteModal(user, type); }} title="Delete">
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
              <th>Name</th>
              <th>Email</th>
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
              <tr key={provider._id} className="clickable-row" onClick={() => openViewModal(provider, 'provider')} title="Click to view full details card">
                <td style={{ fontWeight: '600', color: 'var(--gray-900)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {renderAvatar(provider, 'provider', 'sm')}
                    <span>{getDisplayName(provider, 'provider')}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--gray-600)' }}>{provider.email}</td>
                <td>
                  <span style={{ fontWeight: '500', color: 'var(--gray-800)' }}>
                    {provider.category || 'N/A'}
                  </span>
                </td>
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
            {filteredUsers.providers.length === 0 && <tr><td colSpan="8" className="text-center">No service providers found.</td></tr>}
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
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiUsers style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
            <span>View All Users</span>
          </h1>
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
                <div className="filter-divider"></div>
                <div className="filter-control-group">
                  <label>Gender</label>
                  <select
                    className="filter-select"
                    value={genderFilter}
                    onChange={(e) => setGenderFilter(e.target.value)}
                  >
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>{g}</option>
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
                    <div className="detail-label">Location</div>
                    <div className="detail-value">
                      {viewData.location?.latitude && viewData.location?.longitude ? (
                        <a 
                          href={`https://www.google.com/maps?q=${viewData.location.latitude},${viewData.location.longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary-500)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: '600' }}
                        >
                          <FiMap size={14} /> View on Map
                        </a>
                      ) : 'N/A'}
                    </div>
                  </div>
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
                  <div className="detail-row"><div className="detail-label">Gender</div><div className="detail-value">{viewData.gender || 'N/A'}</div></div>
                  <div className="detail-row"><div className="detail-label">Address</div><div className="detail-value">{viewData.address || 'N/A'}</div></div>
                  <div className="detail-row">
                    <div className="detail-label">Location</div>
                    <div className="detail-value">
                      {viewData.location?.latitude && viewData.location?.longitude ? (
                        <a 
                          href={`https://www.google.com/maps?q=${viewData.location.latitude},${viewData.location.longitude}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary-500)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: '600' }}
                        >
                          <FiMap size={14} /> View on Map
                        </a>
                      ) : 'N/A'}
                    </div>
                  </div>
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

            <div style={{ paddingBottom: '24px' }}></div>
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
                      <select className="form-input" name="district" value={editData.district || ''} onChange={handleEditChange} required>
                        <option value="" disabled>Select District</option>
                        {SRI_LANKA_DISTRICTS.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
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
                      <select className="form-input" name="district" value={editData.district || ''} onChange={handleEditChange} required>
                        <option value="" disabled>Select District</option>
                        {SRI_LANKA_DISTRICTS.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
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
                      <select className="form-input" name="district" value={editData.district || ''} onChange={handleEditChange} required>
                        <option value="" disabled>Select District</option>
                        {SRI_LANKA_DISTRICTS.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
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
              <p style={{ color: 'var(--gray-500)', margin: '0 0 16px', lineHeight: '1.6', fontSize: '14px' }}>
                This action cannot be undone. To confirm, please type the user's email: <strong>{deleteData.email}</strong>
              </p>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter email to confirm"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  style={{ 
                    textAlign: 'center', 
                    borderColor: deleteError ? '#ef4444' : 'var(--gray-200)',
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--gray-200)'
                  }}
                />
                {deleteError && (
                  <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', fontWeight: '500' }}>
                    {deleteError}
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', paddingBottom: '24px' }}>
              <button className="modal-btn cancel" onClick={closeDeleteModal}>Cancel</button>
              <button 
                className="modal-btn danger" 
                onClick={confirmDelete}
                disabled={!confirmEmail.trim()}
                style={{ opacity: !confirmEmail.trim() ? 0.6 : 1, cursor: !confirmEmail.trim() ? 'not-allowed' : 'pointer' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewUsersPage;
