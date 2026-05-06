const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Public route (no auth required)
router.get('/categories/public', categoryController.getCategoriesPublic);

// Admin protected routes
router.get('/categories', categoryController.verifyAdmin, categoryController.getAllCategories);
router.post('/categories', categoryController.verifyAdmin, categoryController.createCategory);
router.put('/categories/:id', categoryController.verifyAdmin, categoryController.updateCategory);
router.delete('/categories/:id', categoryController.verifyAdmin, categoryController.deleteCategory);

module.exports = router;
