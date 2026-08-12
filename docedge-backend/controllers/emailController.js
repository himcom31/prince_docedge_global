// controllers/emailController.js
const nodemailer = require('nodemailer');
const Doctor = require('../models/Doctor');
const { checkUsage, incrementUsageOnly } = require('./notificationPlanController');

// ── Load SMTP config from .env ──
const SMTP_CONFIG = {
    emailHost:    process.env.SMTP_HOST,
    emailPort:    process.env.SMTP_PORT    || '587',
    emailUser:    process.env.SMTP_USER,
    emailPass:    process.env.SMTP_PASS,
    emailFrom:    process.env.SMTP_FROM    || process.env.SMTP_USER,
    emailEnabled: process.env.SMTP_ENABLED !== 'false',
};

// ── Transporter cache ──
const transporterCache = new Map();

function getTransporter() {
    const cacheKey = `${SMTP_CONFIG.emailUser}::${SMTP_CONFIG.emailHost}::${SMTP_CONFIG.emailPort}`;

    if (transporterCache.has(cacheKey)) {
        return transporterCache.get(cacheKey);
    }

    const isGmail =
        (SMTP_CONFIG.emailHost || '').toLowerCase().includes('gmail') ||
        (SMTP_CONFIG.emailUser || '').toLowerCase().includes('gmail.com');

    const transportOptions = isGmail
        ? {
              service: 'gmail',
              pool: true,
              maxConnections: 3,
              maxMessages: 100,
              rateDelta: 1000,
              rateLimit: 5,
              auth: {
                  user: SMTP_CONFIG.emailUser.trim(),
                  pass: SMTP_CONFIG.emailPass.trim().replace(/\s/g, '')
              }
          }
        : {
              host: SMTP_CONFIG.emailHost.trim(),
              port: Number(SMTP_CONFIG.emailPort) || 587,
              secure: Number(SMTP_CONFIG.emailPort) === 465,
              pool: true,
              maxConnections: 3,
              maxMessages: 100,
              rateDelta: 1000,
              rateLimit: 5,
              auth: {
                  user: SMTP_CONFIG.emailUser.trim(),
                  pass: SMTP_CONFIG.emailPass.trim().replace(/\s/g, '')
              },
              tls: { rejectUnauthorized: false },
              connectionTimeout: 10000,
              greetingTimeout: 10000,
              socketTimeout: 30000
          };

    const transporter = nodemailer.createTransport(transportOptions);
    transporterCache.set(cacheKey, transporter);
    return transporter;
}

function invalidateCache() {
    transporterCache.clear();
    console.warn('⚠️ Transporter cache cleared.');
}

function buildEmailHtml(patientName, dateStr) {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="background: #4A90D9; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="color: #fff; margin: 0;">Your Prescription is Ready</h2>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px;">Dear <strong>${patientName || 'Patient'}</strong>,</p>
            <p style="font-size: 15px; line-height: 1.6;">
                Please find your prescription attached to this email as a PDF document.
                Keep it safely for your records and share it with your pharmacist when needed.
            </p>
            <p style="font-size: 14px; color: #888;">Date: ${dateStr}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 13px; color: #aaa; text-align: center;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
    </div>`;
}

function validateRequest(pdfBase64, patientEmail) {
    if (!SMTP_CONFIG.emailEnabled) {
        return { error: 400, message: 'Email notifications not enabled.' };
    }
    if (!SMTP_CONFIG.emailHost || !SMTP_CONFIG.emailUser || !SMTP_CONFIG.emailPass) {
        return { error: 400, message: 'Email SMTP credentials missing in .env.' };
    }
    if (!pdfBase64) {
        return { error: 400, message: 'PDF data not received.' };
    }
    if (!patientEmail) {
        return { error: 400, message: 'Patient email address not found.' };
    }
    return null;
}

function cleanAndValidatePdf(pdfBase64) {
    const cleanBase64 = pdfBase64
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/\s/g, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');
    if (pdfBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
        return { error: true };
    }
    return { cleanBase64 };
}

function handleSmtpError(err) {
    if (err.code === 'EAUTH' || err.responseCode === 535) invalidateCache();
    if (err.code === 'EAUTH')        return 'Gmail auth failed. Check App Password in .env.';
    if (err.code === 'ECONNREFUSED') return 'Cannot connect to email server. Check SMTP_HOST/PORT in .env.';
    if (err.code === 'ETIMEDOUT')    return 'Email server timed out. Try again.';
    if (err.responseCode === 535)    return 'Invalid credentials. Check SMTP_PASS in .env.';
    if (err.responseCode === 550)    return 'Recipient email rejected by server.';
    return err.message;
}

// ─────────────────────────────────────────────────────────────
// PRESCRIPTION EMAIL
// ─────────────────────────────────────────────────────────────
exports.sendPrescriptionEmail = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientEmail } = req.body;

        // ── 1. Subscription limit check ──
        const doctor = await Doctor.findOne({ slug });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        const usageCheck = await checkUsage(doctor._id, 'email');
        if (!usageCheck.allowed) {
            return res.status(403).json({ success: false, message: usageCheck.reason });
        }

        // ── 2. Validate ──
        const validationError = validateRequest(pdfBase64, patientEmail);
        if (validationError) {
            return res.status(validationError.error).json({ success: false, message: validationError.message });
        }

        // ── 3. Clean & validate PDF ──
        const { cleanBase64, error: pdfError } = cleanAndValidatePdf(pdfBase64);
        if (pdfError) {
            return res.status(400).json({ success: false, message: 'Invalid PDF data received.' });
        }

        // ── 4. Build mail options ──
        const dateStr  = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const safeName = (patientName || 'Patient').replace(/\s+/g, '_');

        const mailOptions = {
            from:    `"Clinic Prescription" <${SMTP_CONFIG.emailFrom.trim()}>`,
            to:      patientEmail.trim(),
            subject: `Prescription for ${patientName || 'Patient'} — ${new Date().toLocaleDateString('en-GB')}`,
            html:    buildEmailHtml(patientName, new Date().toLocaleDateString('en-GB')),
            attachments: [{
                filename:           `Prescription_${safeName}_${dateStr}.pdf`,
                content:            cleanBase64,
                encoding:           'base64',
                contentType:        'application/pdf',
                contentDisposition: 'attachment',
            }],
        };

        // ── 5. Respond immediately + fire and forget ──
        const transporter = getTransporter();
        res.json({ success: true, message: 'Prescription is being sent to your email!' });

        transporter.sendMail(mailOptions)
            .then(async (info) => {
                console.log(`✅ [${slug}] Prescription sent: ${info.messageId} → ${patientEmail}`);
                await incrementUsageOnly(doctor._id, 'email'); // ✅ sirf send success pe
            })
            .catch((err) => {
                console.error(`❌ [${slug}] Prescription email failed → ${patientEmail}:`, err.message);
                handleSmtpError(err);
            });

    } catch (err) {
        console.error('❌ Prescription email error:', err);
        const errorMessage = handleSmtpError(err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: errorMessage });
        }
    }
};

// ─────────────────────────────────────────────────────────────
// INVOICE EMAIL
// ─────────────────────────────────────────────────────────────
exports.sendPrescriptionEmailInvoice = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientEmail } = req.body;

        // ── 1. Subscription limit check ──
        const doctor = await Doctor.findOne({ slug });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        const usageCheck = await checkUsage(doctor._id, 'email'); // ✅ fixed
        if (!usageCheck.allowed) {
            return res.status(403).json({ success: false, message: usageCheck.reason });
        }

        // ── 2. Validate ──
        const validationError = validateRequest(pdfBase64, patientEmail);
        if (validationError) {
            return res.status(validationError.error).json({ success: false, message: validationError.message });
        }

        // ── 3. Clean & validate PDF ──
        const { cleanBase64, error: pdfError } = cleanAndValidatePdf(pdfBase64);
        if (pdfError) {
            return res.status(400).json({ success: false, message: 'Invalid PDF data received.' });
        }

        // ── 4. Build mail options ──
        const dateStr  = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
        const safeName = (patientName || 'Patient').replace(/\s+/g, '_');

        const mailOptions = {
            from:    `"Clinic Invoice" <${SMTP_CONFIG.emailFrom.trim()}>`,
            to:      patientEmail.trim(),
            subject: `Invoice for ${patientName || 'Patient'} — ${new Date().toLocaleDateString('en-GB')}`,
            html:    buildEmailHtml(patientName, new Date().toLocaleDateString('en-GB')),
            attachments: [{
                filename:           `Invoice_${safeName}_${dateStr}.pdf`,
                content:            cleanBase64,
                encoding:           'base64',
                contentType:        'application/pdf',
                contentDisposition: 'attachment',
            }],
        };

        // ── 5. Respond immediately + fire and forget ──
        const transporter = getTransporter();
        res.json({ success: true, message: 'Invoice is being sent to your email!' });

        transporter.sendMail(mailOptions)
            .then(async (info) => {
                console.log(`✅ [${slug}] Invoice sent: ${info.messageId} → ${patientEmail}`);
                await incrementUsageOnly(doctor._id, 'email'); // ✅ sirf send success pe
            })
            .catch((err) => {
                console.error(`❌ [${slug}] Invoice email failed → ${patientEmail}:`, err.message);
                handleSmtpError(err);
            });

    } catch (err) {
        console.error('❌ Invoice email error:', err);
        const errorMessage = handleSmtpError(err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: errorMessage });
        }
    }
};