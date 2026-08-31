const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const commissionPaymentsController = require('../controllers/commissionPaymentsController');

router.get('/analytics/demand-supply', analyticsController.getDemandSupplyAnalytics);
router.get('/analytics/booking-growth', analyticsController.getBookingGrowthAnalytics);
router.get('/analytics/user-growth', analyticsController.getUserGrowthAnalytics);
router.get('/analytics/revenue-growth', analyticsController.getRevenueGrowthAnalytics);

// Provider Monthly Commission Payments
router.get('/monthly-commission-payments', commissionPaymentsController.getMonthlyCommissionPayments);
router.post('/monthly-commission-payments/:id/remind', commissionPaymentsController.sendPaymentReminder);
router.patch('/monthly-commission-payments/:id/mark-paid', commissionPaymentsController.markCommissionPaid);

module.exports = router;


