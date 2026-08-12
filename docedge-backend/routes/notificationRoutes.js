const express = require('express');
const router = express.Router();
const { getSettings, saveSettings } = require('../controllers/notificationController');
const { sendPrescriptionEmail, sendPrescriptionEmailInvoice } = require('../controllers/emailController');

// ✅ Specific routes PEHLE
router.post('/send-email/:slug', sendPrescriptionEmail);
router.post('/send-email-invoice/:slug', sendPrescriptionEmailInvoice);

// ✅ Generic routes BAAD MEIN
router.get('/:clinicSlug', getSettings);
router.post('/:clinicSlug', saveSettings);

module.exports = router;