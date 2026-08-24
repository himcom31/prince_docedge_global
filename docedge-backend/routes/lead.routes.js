const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { createLeadAndSubscription } = require('../controllers/leadSignup.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'), false);
    cb(null, true);
  },
});

router.post('/signup', upload.single('customTemplate'), createLeadAndSubscription);

module.exports = router;