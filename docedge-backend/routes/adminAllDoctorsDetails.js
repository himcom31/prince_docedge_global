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
