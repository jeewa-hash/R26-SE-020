const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

router.get('/analytics/demand-supply', analyticsController.getDemandSupplyAnalytics);
router.get('/analytics/booking-growth', analyticsController.getBookingGrowthAnalytics);
router.get('/analytics/user-growth', analyticsController.getUserGrowthAnalytics);
router.get('/analytics/revenue-growth', analyticsController.getRevenueGrowthAnalytics);

module.exports = router;

