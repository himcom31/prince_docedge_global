const express = require("express");
const router  = express.Router();

const {
  submitDemoRequest,
  getAllDemoRequests,
  getDemoRequestById,
  updateDemoRequest,
  deleteDemoRequest,
  getDemoStats,
} = require("../controllers/Demorequest.controller");

// ── Middleware (apna existing auth middleware use karo) ──────────────────────
// const { protect }      = require("../middleware/auth");
// const { adminOnly }    = require("../middleware/roles");

/* ─────────────────────────────────────────────────────────────
   PUBLIC  —  Landing page form submit
   POST /api/demo-requests
───────────────────────────────────────────────────────────── */
router.post("/", submitDemoRequest);

/* ─────────────────────────────────────────────────────────────
   ADMIN  —  Prefixed as /api/admin/demo-requests  (in app.js)
             ya router ko  protect + adminOnly lagao
───────────────────────────────────────────────────────────── */
router.get(  "/stats",  /* protect, adminOnly, */ getDemoStats);
router.get(  "/",       /* protect, adminOnly, */ getAllDemoRequests);
router.get(  "/:id",    /* protect, adminOnly, */ getDemoRequestById);
router.patch("/:id",    /* protect, adminOnly, */ updateDemoRequest);
router.delete("/:id",   /* protect, adminOnly, */ deleteDemoRequest);

module.exports = router;