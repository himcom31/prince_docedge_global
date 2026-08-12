// controllers/authController.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require('crypto');
const nodemailer = require('nodemailer');


// ── Helper: sign JWT ────────────────────────────────────────────────────────
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

// ── Helper: send token in cookie + JSON ────────────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() +
        (parseInt(process.env.JWT_COOKIE_EXPIRES_IN) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.cookie("docedge_token", token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

// ── REGISTER ────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { clinicName, doctorName, email, phone, password, specialization } =
      req.body;

    // Check duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered. Please log in instead.",
      });
    }

    const user = await User.create({
      clinicName,
      doctorName,
      email,
      phone,
      password,
      specialization,
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    // Mongoose validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    next(err);
  }
};

// ── LOGIN ───────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required." });
    }

    // Fetch user with password (select: false by default)
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact support.",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// ── LOGOUT ──────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.cookie("docedge_token", "loggedout", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "Logged out successfully." });
};

// ── GET ME ──────────────────────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};



// ── FORGOT PASSWORD ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log(email)

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "No account found with this email address." 
      });
    }

    // Reset token generate karo
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Token + expiry user pe save karo (10 min)
    user.passwordResetToken  = hashedToken;
    user.passwordResetExpiry = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Mail bhejo
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Gmail App Password
      },
    });

    await transporter.sendMail({
      from: `"DocEdge Support" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request — DocEdge',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #dde3e9;border-radius:12px;">
          <h2 style="color:#0d5c63;">Reset Your Password</h2>
          <p>Hello <strong>${user.doctorName}</strong>,</p>
          <p>Click the button below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
          <a href="${resetUrl}" 
             style="display:inline-block;margin:24px 0;padding:12px 28px;background:#0d5c63;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
            Reset Password
          </a>
          <p style="color:#6b7a8d;font-size:0.85rem;">If you didn't request this, ignore this email. Your password won't change.</p>
        </div>
      `,
    });

    res.status(200).json({ 
      success: true, 
      message: "Password reset link sent to your email." 
    });

  } catch (err) {
    // Token clear karo agar mail fail ho
    await User.findOneAndUpdate(
      { email: req.body.email },
      { $unset: { passwordResetToken: 1, passwordResetExpiry: 1 } }
    );
    next(err);
  }
};

// ── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Token hash karo aur DB mein dhundo
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:  hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: "Reset link is invalid or has expired." 
      });
    }

    // Naya password set karo
    user.password            = password;
    user.passwordResetToken  = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Password reset successful. Please log in." 
    });

  } catch (err) {
    next(err);
  }
};