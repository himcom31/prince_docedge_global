const express = require('express');
const router  = express.Router();
const {
  getClinicSubscription,
  getAllSubscriptions,
  webhook,
  verifyOrder,
  getSubscriptionStatus,
  renewSubscription,
  getMySubscriptions 
} = require('../controllers/subscription.controller');
const { protect, isAdmin, protectD } = require('../middleware/authMiddleware');
const protectUser = require("../middleware/AuthUsermiddleware");


// Public
router.get('/status/:slug', getSubscriptionStatus);
router.get('/verify/:orderId', verifyOrder);

// Webhook — raw body chahiye signature verify ke liye
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

// Doctor (authenticated)
router.post('/renew', protectD, renewSubscription);

// Admin
router.get('/clinic/:clinicId', protect, isAdmin, getClinicSubscription);
router.get('/all',              protect, isAdmin, getAllSubscriptions);

router.get('/my', protectUser, getMySubscriptions);   // ← yeh add karo

module.exports = router;