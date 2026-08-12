// routes/notificationPlanRoutes.js
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/Notificationplancontroller');
const { protect, isAdmin, protectD } = require('../middleware/authMiddleware');
const protectUser = require('../middleware/AuthUsermiddleware');

// ── SUPERADMIN ────────────────────────────────────────────────
router.get   ('/all',   protect, isAdmin, ctrl.getAllPlans);  // All plans (raw)
router.post  ('/',      protect, isAdmin, ctrl.createPlan);  // Create
router.put   ('/:id',   protect, isAdmin, ctrl.updatePlan);  // Update
router.delete('/:id',   protect, isAdmin, ctrl.deletePlan);  // Soft delete

// ── PUBLIC (doctor side listing) ─────────────────────────────
router.get('/', ctrl.getPlans);

// ── DOCTOR (authenticated) ────────────────────────────────────
router.post('/subscribe',      protectD, ctrl.subscribe);       // Subscribe
router.get ('/my-subscription',protectD, ctrl.mySubscription);  // My status + usage
router.get ('/my-subscription-web',protectUser, ctrl.mySubscription);  // My status + usage
router.get ('/verify/:orderId',          ctrl.verifyPayment);   // After payment return

// ── CASHFREE WEBHOOK (raw body — register BEFORE express.json()) ──
router.post('/webhook', express.raw({ type: 'application/json' }), ctrl.webhook);

router.get('/channel-status/:slug', ctrl.channelStatus);

module.exports = router;

/*
─── server.js mein add karo ──────────────────────────────────

const notificationPlanRoutes = require('./routes/notificationPlanRoutes');

// IMPORTANT: webhook route express.json() se PEHLE register karo
app.use('/api/notification-plans', notificationPlanRoutes);

// Baaki routes ke liye express.json() use hota rahega as usual
─────────────────────────────────────────────────────────────
*/