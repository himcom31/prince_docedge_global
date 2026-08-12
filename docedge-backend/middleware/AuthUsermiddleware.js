// middleware/authMiddleware.js
// Usage in any route file:
//   const protect = require('../middleware/authMiddleware');
//   router.get('/profile', protect, controller);

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protectUser = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // 2. Fallback to cookie
    else if (req.cookies?.docedge_token) {
      token = req.cookies.docedge_token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "You are not logged in. Please log in to continue.",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists.",
      });
    }

    if (!currentUser.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact support.",
      });
    }

    req.user = currentUser;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ success: false, message: "Invalid token. Please log in again." });
    }
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ success: false, message: "Session expired. Please log in again." });
    }
    next(err);
  }
};

// ── Role restriction helper ──────────────────────────────────────────────────
// Usage: router.delete('/user/:id', protect, restrictTo('admin'), deleteUser);
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };

module.exports = protectUser;
module.exports.restrictTo = restrictTo;