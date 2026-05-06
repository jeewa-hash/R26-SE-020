const jwt = require('jsonwebtoken');
const ServiceCategory = require('../models/ServiceCategory');
const axios = require('axios');

const AUTH_SERVICE_URL = 'http://127.0.0.1:4000/api/auth';

const logAudit = async (req, action, target) => {
  try {
    const adminId = req.user.id;
    console.log(`Attempting to log audit: ${action} for admin ${adminId}`);
    
    await axios.post(`${AUTH_SERVICE_URL}/admin/audit-logs/internal`, {
      action,
      category: 'Category',
      adminId,
      target
    });
    console.log(`Audit log successfully sent to authService for action: ${action}`);
  } catch (err) {
    console.error('Failed to log audit in adminService:', err.message);
  }
};

// Middleware to verify admin JWT token
exports.verifyAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Get all categories with optional search
exports.getAllCategories = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const categories = await ServiceCategory.find(query).sort({ name: 1 });
    res.status(200).json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

// Public endpoint to get all categories (no auth required)
exports.getCategoriesPublic = async (req, res) => {
  try {
    const categories = await ServiceCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const trimmedName = name.trim();

    const existing = await ServiceCategory.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = new ServiceCategory({ name: trimmedName });
    await category.save();

    await logAudit(req, 'Category Created', { id: category._id, name: category.name, type: 'Category' });

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (err) {
    console.error('Error creating category:', err.message);
    res.status(500).json({ message: 'Server error while creating category' });
  }
};

// Update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const trimmedName = name.trim();

    const existing = await ServiceCategory.findOne({
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
    });

    if (existing) {
      return res.status(400).json({ message: 'Another category with this name already exists' });
    }

    const category = await ServiceCategory.findByIdAndUpdate(
      id,
      { name: trimmedName },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await logAudit(req, 'Category Updated', { id: category._id, name: category.name, type: 'Category' });

    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (err) {
    console.error('Error updating category:', err.message);
    res.status(500).json({ message: 'Server error while updating category' });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ServiceCategory.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await logAudit(req, 'Category Deleted', { id: category._id, name: category.name, type: 'Category' });

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err.message);
    res.status(500).json({ message: 'Server error while deleting category' });
  }
};
