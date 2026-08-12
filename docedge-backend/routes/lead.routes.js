const express = require('express');
const router  = express.Router();
const { createLeadAndSubscription } = require('../controllers/leadSignup.controller');

// Public route — koi bhi visitor signup form bhar sakta hai
router.post('/signup', createLeadAndSubscription);

module.exports = router;