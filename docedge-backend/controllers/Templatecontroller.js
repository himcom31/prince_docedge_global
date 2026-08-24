const Template = require("../models/template");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { Readable } = require("stream");

// ── Cloudinary config (already set in your app, bas import karo) ─────────────
// cloudinary.config({ cloud_name, api_key, api_secret }) — app.js me hoga

// ── Multer — memory storage (buffer milta hai, stream karo Cloudinary pe) ────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Sirf image files allowed hain"), false);
    }
    cb(null, true);
  },
});

// Export multer middleware — route me use karein
const uploadMiddleware = upload.single("image");

// ── Helper: buffer → Cloudinary stream upload ─────────────────────────────────
const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "docedge/templates",
        use_filename: true,
        unique_filename: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLIC ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /api/templates
 * Saare active templates fetch karo, grouped by category
 * Query: ?category=Prescription  (optional filter)
 */
const getPublicTemplates = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;

    const templates = await Template.find(filter)
      .sort({ category: 1, sortOrder: 1, createdAt: -1 })
      .select("-cloudinaryPublicId");

    // Group by category
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});

    // All unique categories
    const categories = Object.keys(grouped);

    res.json({ success: true, categories, grouped, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADMIN ROUTES (protect with your existing admin middleware)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * GET /api/admin/templates
 * Admin — saare templates (active + inactive)
 */
const adminGetTemplates = async (req, res) => {
  try {
    const templates = await Template.find()
      .sort({ category: 1, sortOrder: 1, createdAt: -1 });
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/templates
 * Naya template add karo (image upload ke saath)
 * Body (multipart/form-data): name, category, sortOrder, image (file)
 */
const adminCreateTemplate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image required hai" });
    }
    const { name, category, sortOrder } = req.body;
    if (!name || !category) {
      return res.status(400).json({ success: false, message: "Name aur category required hain" });
    }

    // Cloudinary pe upload karo
    const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);

    const template = await Template.create({
      name,
      category,
      imageUrl: result.secure_url,
      cloudinaryPublicId: result.public_id,
      sortOrder: sortOrder ? parseInt(sortOrder) : 0,
      isActive: true,
    });

    res.status(201).json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/admin/templates/:id
 * Template update karo (image optional)
 */
const adminUpdateTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template nahi mila" });
    }

    const { name, category, sortOrder, isActive } = req.body;

    if (name)      template.name      = name;
    if (category)  template.category  = category;
    if (sortOrder !== undefined) template.sortOrder = parseInt(sortOrder);
    if (isActive  !== undefined) template.isActive  = isActive === "true" || isActive === true;

    // Agar nai image aayi toh replace karo
    if (req.file) {
      // Purani Cloudinary image delete karo
      if (template.cloudinaryPublicId) {
        await cloudinary.uploader.destroy(template.cloudinaryPublicId).catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      template.imageUrl = result.secure_url;
      template.cloudinaryPublicId = result.public_id;
    }

    await template.save();
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/admin/templates/:id
 * Template delete karo + Cloudinary se bhi
 */
const adminDeleteTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template nahi mila" });
    }

    if (template.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(template.cloudinaryPublicId).catch(() => {});
    }

    await template.deleteOne();
    res.json({ success: true, message: "Template delete ho gaya" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PATCH /api/admin/templates/:id/toggle
 * Active/inactive toggle
 */
const adminToggleTemplate = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: "Template nahi mila" });
    }
    template.isActive = !template.isActive;
    await template.save();
    res.json({ success: true, isActive: template.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  uploadMiddleware,
  getPublicTemplates,
  adminGetTemplates,
  adminCreateTemplate,
  adminUpdateTemplate,
  adminDeleteTemplate,
  adminToggleTemplate,
};