// routes/authRoutes.js
// Default export — use in server.js as:
//   app.use('/api/auth', require('./routes/authRoutes'));

const express = require("express");
const {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
   resetPassword,
} = require("../controllers/AuthcontrollerUser");
const protectUser = require("../middleware/AuthUsermiddleware");

const router = express.Router();

router.post("/register", register);        // POST /api/auth/register
router.post("/login",    login);           // POST /api/auth/login
router.get("/logout",    logout);          // GET  /api/auth/logout
router.get("/me",        protectUser, getMe);  // GET  /api/auth/me  (protected)
router.post("/forgot-password", forgotPassword);          // POST /api/auth/forgot-password
router.post("/reset-password/:token", resetPassword);    // POST /api/auth/reset-password/:token

module.exports = router;