const express = require("express");
const router = express.Router();
const {
  uploadMiddleware,
  getPublicTemplates,
  adminGetTemplates,
  adminCreateTemplate,
  adminUpdateTemplate,
  adminDeleteTemplate,
  adminToggleTemplate,
} = require("../controllers/Templatecontroller");

// ── Apna existing admin auth middleware import karo ──────────────────────────
// const { verifyAdmin } = require("../middleware/authMiddleware");
// Agar tumhare paas already koi middleware hai toh wahi use karo
// Filhaal placeholder ke roop mein comment kiya hai

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC — Signup form me use hoga
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get("/", getPublicTemplates);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN — verifyAdmin middleware lagao production pe
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
router.get(   "/admin",              /* verifyAdmin, */ adminGetTemplates);
router.post(  "/admin",              /* verifyAdmin, */ uploadMiddleware, adminCreateTemplate);
router.put(   "/admin/:id",          /* verifyAdmin, */ uploadMiddleware, adminUpdateTemplate);
router.delete("/admin/:id",          /* verifyAdmin, */ adminDeleteTemplate);
router.patch( "/admin/:id/toggle",   /* verifyAdmin, */ adminToggleTemplate);

module.exports = router;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// app.js me yeh add karo:
// const templateRoutes = require("./routes/templateRoutes");
// app.use("/api/templates", templateRoutes);
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━