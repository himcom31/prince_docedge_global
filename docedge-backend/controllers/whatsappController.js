// controllers/whatsappController.js
const Doctor                               = require('../models/Doctor');
const { checkUsage, incrementUsageOnly }   = require('./Notificationplancontroller');
const FormData                             = require('form-data');
const fetch                                = require('node-fetch');

// ── Load WhatsApp config from .env ──
const WA_CONFIG = {
    waToken:   process.env.WA_TOKEN,
    waPhoneId: process.env.WA_PHONE_ID,
    waEnabled: process.env.WA_ENABLED !== 'false',
};

exports.sendWhatsAppPrescription = async (req, res) => {
    try {
        const { slug } = req.params;
        const { pdfBase64, patientName, patientMobile } = req.body;

        // ── 1. Subscription limit check ──
        const doctor = await Doctor.findOne({ slug });
        if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

        const usageCheck = await checkUsage(doctor._id, 'whatsapp'); // ✅ sirf check
        if (!usageCheck.allowed) {
            return res.status(403).json({ success: false, message: usageCheck.reason });
        }

        // ── 2. WhatsApp config check ──
        if (!WA_CONFIG.waEnabled) {
            return res.status(400).json({ success: false, message: 'WhatsApp not enabled' });
        }
        if (!WA_CONFIG.waToken || !WA_CONFIG.waPhoneId) {
            return res.status(400).json({ success: false, message: 'WhatsApp credentials missing in .env' });
        }

        const cleanToken   = WA_CONFIG.waToken.trim().replace(/\s+/g, '');
        const cleanPhoneId = WA_CONFIG.waPhoneId.trim();

        // ── 3. PDF upload ──
        const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer  = Buffer.from(base64Data, 'base64');

        const formData = new FormData();
        formData.append('file', pdfBuffer, {
            filename:    `Prescription_${patientName || 'Patient'}.pdf`,
            contentType: 'application/pdf',
        });
        formData.append('type',              'application/pdf');
        formData.append('messaging_product', 'whatsapp');

        const uploadRes  = await fetch(
            `https://graph.facebook.com/v19.0/${cleanPhoneId}/media`,
            {
                method:  'POST',
                headers: { Authorization: `Bearer ${cleanToken}`, ...formData.getHeaders() },
                body:    formData,
            }
        );
        const uploadData = await uploadRes.json();

        if (!uploadData.id) {
            return res.status(400).json({
                success: false,
                message: uploadData.error?.message || 'PDF upload failed',
            });
        }

        // ── 4. Send WhatsApp message ──
        let mobile = String(patientMobile).replace(/\D/g, '');
        if (!mobile.startsWith('91') && mobile.length === 10) mobile = '91' + mobile;

        const msgPayload = {
            messaging_product: 'whatsapp',
            to:   mobile,
            type: 'template',
            template: {
                name:     'jaspers_market_order_confirmation_v1',
                language: { code: 'en_US' },
                components: [
                    {
                        type: 'body',
                        parameters: [
                            { type: 'text', text: patientName || 'Patient' },
                            { type: 'text', text: 'RX123' },
                            { type: 'text', text: new Date().toDateString() },
                        ],
                    },
                ],
            },
        };

        const sendRes  = await fetch(
            `https://graph.facebook.com/v19.0/${cleanPhoneId}/messages`,
            {
                method:  'POST',
                headers: { Authorization: `Bearer ${cleanToken}`, 'Content-Type': 'application/json' },
                body:    JSON.stringify(msgPayload),
            }
        );
        const sendData = await sendRes.json();

        if (sendData.messages?.[0]?.id) {
            await incrementUsageOnly(doctor._id, 'whatsapp'); // ✅ sirf send success pe
            return res.json({
                success: true,
                message: 'Prescription sent on WhatsApp!',
                usage:   { used: usageCheck.used + 1, limit: usageCheck.limit },
            });
        } else {
            return res.status(400).json({
                success: false,
                message: sendData.error?.message || 'Send failed',
            });
        }

    } catch (err) {
        console.error('WhatsApp error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};