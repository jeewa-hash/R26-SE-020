import { useState, useEffect } from 'react';
import axios from 'axios';
import { ADMIN_SERVICE_URL } from '../config';
import { FiGrid, FiLayers, FiPlus, FiEdit2, FiTrash2, FiX, FiAlertTriangle, FiSearch } from 'react-icons/fi';

function ManageCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [formData, setFormData] = useState({ name: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [editId, setEditId] = useState(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`${ADMIN_SERVICE_URL}/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(response.data);
        setError('');
      } catch (err) {
        console.error('Failed to fetch categories', err);
        setError('Failed to load categories. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, [refreshTrigger]);

  const filteredCategories = categories.filter((cat) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return cat.name.toLowerCase().includes(term);
  });

  const openAddModal = () => {
    setFormMode('add');
    setFormData({ name: '' });
    setFormError('');
    setEditId(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (category) => {
    setFormMode('edit');
    setFormData({ name: category.name });
    setFormError('');
    setEditId(category._id);
    setIsFormModalOpen(true);
  };

  const closeFormModal = () => {
    setIsFormModalOpen(false);
    setFormData({ name: '' });
    setFormError('');
    setEditId(null);
    setFormLoading(false);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (formError) setFormError('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      setFormError('Category name is required');
      return;
    }

    setFormLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (formMode === 'add') {
        await axios.post(
          `${ADMIN_SERVICE_URL}/categories`,
          { name: trimmedName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.put(
          `${ADMIN_SERVICE_URL}/categories/${editId}`,
          { name: trimmedName },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      closeFormModal();
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error('Error saving category:', err);
      setFormError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setFormLoading(false);
    }
  };

  const openDeleteModal = (category) => {
    setDeleteCategory(category);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteCategory(null);
    setDeleteLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteCategory) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`${ADMIN_SERVICE_URL}/categories/${deleteCategory._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshTrigger((prev) => prev + 1);
      closeDeleteModal();
    } catch (err) {
      console.error('Error deleting category:', err);
      alert(err.response?.data?.message || 'Failed to delete category');
      closeDeleteModal();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="page-content">
      {/* Page Header */}
      <div className="register-page-header">
        <div>
          <h1>Manage Service Categories</h1>
        </div>
      </div>

      {/* Stats Card */}
      <div className="stats-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className="stat-card" style={{ maxWidth: '220px' }}>
          <div className="stat-icon purple">
            <FiGrid />
          </div>
          <div className="stat-info">
            <h3>{loading ? '...' : categories.length}</h3>
            <p>Total Categories</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="table-filters">
        <div className="filter-left">
          <div className="search-input-wrapper">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search by category name..."
              className="filter-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="filter-right">
          <button
            className="modal-btn primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={openAddModal}
          >
            <FiPlus size={16} />
            Add Category
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Category Name</th>
              <th>Created Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="3" className="text-center">Loading categories...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="3" className="text-center" style={{ color: '#ef4444' }}>{error}</td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan="3" className="text-center">
                  {searchTerm ? 'No categories match your search.' : 'No categories found. Add one to get started.'}
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => (
                <tr key={cat._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#4f46e5',
                          fontSize: '14px',
                          fontWeight: 700,
                        }}
                      >
                        <FiLayers />
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{cat.name}</span>
                    </div>
                  </td>
                  <td>{formatDate(cat.createdAt)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                      <button
                        className="btn-icon edit"
                        onClick={() => openEditModal(cat)}
                        title="Edit"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        className="btn-icon delete"
                        onClick={() => openDeleteModal(cat)}
                        title="Delete"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={closeFormModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formMode === 'add' ? 'Add New Category' : 'Edit Category'}</h2>
              <button className="btn-close" onClick={closeFormModal}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="categoryName">Category Name</label>
                  <input
                    id="categoryName"
                    name="name"
                    type="text"
                    className="form-input"
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={handleFormChange}
                    autoFocus
                  />
                </div>
                {formError && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px' }}>
                    {formError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn cancel" onClick={closeFormModal}>
                  Cancel
                </button>
                <button type="submit" className="modal-btn primary" disabled={formLoading}>
                  {formLoading ? 'Saving...' : formMode === 'add' ? 'Add Category' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && deleteCategory && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body" style={{ textAlign: 'center', paddingTop: '32px' }}>
              <div className="delete-modal-icon">
                <FiAlertTriangle />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
                Delete Category?
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)', lineHeight: 1.5 }}>
                Are you sure you want to delete <strong style={{ color: 'var(--gray-800)' }}>{deleteCategory.name}</strong>?<br />
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', paddingBottom: '28px' }}>
              <button type="button" className="modal-btn cancel" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn danger"
                onClick={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCategoriesPage;
