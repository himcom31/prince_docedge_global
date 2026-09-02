const nodemailer = require("nodemailer");

// ── Transporter ──────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── HTML Template ─────────────────────────────────────────────────────────────
const buildDemoEmailHTML = ({ full_name, clinic_name, specialization, preferred_time }) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your DocEdge Demo is Confirmed!</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;
                      overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1628 0%,#0d2345 100%);
                        padding:40px 40px 32px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🏥</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;
                          letter-spacing:-0.5px;">Doc<span style="color:#00aeef;">Edge</span></h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.6);
                         letter-spacing:0.08em;text-transform:uppercase;">
                Smart Clinic Management
              </p>
            </td>
          </tr>

          <!-- ── HERO BANNER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#00aeef,#0077c8);
                        padding:28px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.12em;
                          text-transform:uppercase;color:rgba(255,255,255,0.85);">
                🎉 Demo Access Ready
              </p>
              <h2 style="margin:8px 0 0;font-size:24px;font-weight:800;color:#ffffff;">
                Your Free Demo is Confirmed!
              </h2>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:40px 40px 0;">

              <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;">
                Hi <strong>${full_name}</strong> 👋,
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#4b5563;line-height:1.8;">
                Thank you for booking a free demo for <strong>${clinic_name}</strong>.
                We're excited to show you how DocEdge can transform your
                <strong>${specialization}</strong> practice.
                Your preferred slot — <strong>${preferred_time}</strong> — is noted and our
                specialist will confirm it on WhatsApp shortly.
              </p>

              <!-- ── ACCESS CREDENTIALS BOX ── -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8fafc;border:1.5px solid #e2e8f0;
                             border-radius:16px;margin-bottom:28px;overflow:hidden;">
                <tr>
                  <td style="background:#0a1628;padding:14px 24px;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#00aeef;
                               letter-spacing:0.08em;text-transform:uppercase;">
                      🔐 Your Demo Login Credentials
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px;">
                    <!-- Demo URL -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="width:100px;font-size:12px;font-weight:700;color:#6b7280;
                                   text-transform:uppercase;letter-spacing:0.06em;padding-top:2px;">
                          Demo URL
                        </td>
                        <td>
                          <a href="https://software.docedge.in/docedge-clinic/login"
                             style="color:#0077c8;font-size:14px;font-weight:600;
                                    text-decoration:none;word-break:break-all;">
                            https://software.docedge.in/docedge-clinic/login
                          </a>
                        </td>
                      </tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;"/>
                    <!-- Email ID -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="width:100px;font-size:12px;font-weight:700;color:#6b7280;
                                   text-transform:uppercase;letter-spacing:0.06em;padding-top:2px;">
                          Login ID
                        </td>
                        <td>
                          <span style="font-size:14px;font-weight:600;color:#1e293b;
                                        background:#e0f2fe;padding:4px 12px;border-radius:6px;">
                            docedge@gmail.com
                          </span>
                        </td>
                      </tr>
                    </table>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px;"/>
                    <!-- Password -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="width:100px;font-size:12px;font-weight:700;color:#6b7280;
                                   text-transform:uppercase;letter-spacing:0.06em;padding-top:2px;">
                          Password
                        </td>
                        <td>
                          <span style="font-size:14px;font-weight:700;color:#1e293b;
                                        background:#fef9c3;padding:4px 12px;border-radius:6px;
                                        font-family:monospace;letter-spacing:0.05em;">
                            1234567890
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- ── CTA BUTTON ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://software.docedge.in/docedge-clinic/login"
                       style="display:inline-block;background:linear-gradient(135deg,#00aeef,#0077c8);
                               color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;
                               padding:16px 40px;border-radius:12px;
                               box-shadow:0 6px 20px rgba(0,174,239,0.4);">
                      🚀 Open Demo Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- ── WHAT TO EXPLORE ── -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f0fdf4;border:1px solid #bbf7d0;
                             border-radius:14px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#166534;
                               text-transform:uppercase;letter-spacing:0.07em;">
                      ✅ What to Explore in Your Demo
                    </p>
                    ${[
                      "Patient registration & appointment booking",
                      "Prescription & billing module",
                      "WhatsApp & SMS patient reminders",
                      "Multi-doctor & staff management",
                      "Reports & analytics dashboard",
                    ].map(item => `
                    <p style="margin:0 0 8px;font-size:14px;color:#15803d;line-height:1.6;">
                      ✓ &nbsp;${item}
                    </p>`).join("")}
                  </td>
                </tr>
              </table>

              <!-- ── WHATSAPP ROW ── -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f0fdf4;border:1px solid #bbf7d0;
                             border-radius:14px;margin-bottom:32px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 6px;font-size:13px;color:#374151;">
                      Need help logging in or have questions?
                    </p>
                    <a href="https://wa.me/919382555796"
                       style="display:inline-flex;align-items:center;color:#15803d;
                               font-weight:700;font-size:15px;text-decoration:none;">
                      💬 &nbsp;WhatsApp us: +91 93825 55796
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:24px 40px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;line-height:1.7;">
                This is an automated email from the DocEdge team.<br/>
                Please do not reply to this email.
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;">
                © ${new Date().getFullYear()} DocEdge · Smart Clinic Management · All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
`;

// ── Send Demo Confirmation Email ──────────────────────────────────────────────
const sendDemoConfirmationEmail = async ({ full_name, clinic_name, specialization, preferred_time, email }) => {
  const mailOptions = {
    from:    `"DocEdge — No Reply" <${process.env.SMTP_FROM}>`,
    to:      email,
    subject: `🎉 Your DocEdge Demo is Ready — Login Credentials Inside`,
    html:    buildDemoEmailHTML({ full_name, clinic_name, specialization, preferred_time }),
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendDemoConfirmationEmail };