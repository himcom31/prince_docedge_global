const express = require('express');
const router  = express.Router();
const {
  createPlan, getPlans, getAllPlans, updatePlan, deletePlan, getPlanById
} = require('../controllers/plan.controller');
const { protect, isAdmin, protectD } = require("../middleware/authMiddleware");

router.get('/',     getPlans);
router.get('/all',  protect, isAdmin, getAllPlans);  // ← pehle
router.get('/:id',  getPlanById);                    // ← baad mein
router.post('/',    protect, isAdmin, createPlan);
router.put('/:id',  protect, isAdmin, updatePlan);
router.delete('/:id', protect, isAdmin, deletePlan);

module.exports = router;