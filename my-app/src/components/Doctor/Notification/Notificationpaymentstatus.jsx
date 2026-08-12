// pages/NotificationPaymentStatus.jsx
// Route: /:slug/dashboard/notifications/payment-status?order_id=XXXXX

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import NotificationReceiptPDF from "./Notificationreceiptpdf";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const injectStyles = () => {
  if (document.getElementById("nps-styles")) return;
  const s = document.createElement("style");
  s.id = "nps-styles";
  s.textContent = `
    @keyframes spin   { to { transform: rotate(360deg); } }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .nps-animate { animation: fadeUp 0.5s ease both; }
  `;
  document.head.appendChild(s);
};

export default function NotificationPaymentStatus() {
  const { slug }       = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const orderId        = searchParams.get("order_id");

  const [status,      setStatus]      = useState("checking");
  const [details,     setDetails]     = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    injectStyles();
    if (!orderId) { setStatus("failed"); return; }

    axios
      .get(`${API_BASE}/api/notification-plans/verify/${orderId}`)
      .then(({ data }) => {
        if (data.paid) {
          setStatus("success");
          setDetails(data.details || null);
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, [orderId]);

  const goDashboard = () => navigate(`/${slug}/dashboard/notifications`);

  return (
    <div style={S.page}>
      <div style={S.card}>

        {/* ── Checking ── */}
        {status === "checking" && (
          <div style={{ textAlign: "center" }}>
            <div style={S.spinner} />
            <h2 style={S.title}>Verifying payment...</h2>
            <p style={S.sub}>Ek second rukein</p>
          </div>
        )}

        {/* ── Success ── */}
        {status === "success" && (
          <div className="nps-animate">

            <div style={S.successHeader}>
              <div style={S.checkCircle}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 style={S.successTitle}>Payment successful</h2>
            </div>

            <div style={S.detailsBox}>
              {details?.planName && (
                <Row label="Plan" value={details.planName} />
              )}
              {details?.paymentMode && (
                <Row label="Payment type" value={details.paymentMode} />
              )}
              {details?.bankName && (
                <Row label="Bank" value={details.bankName} />
              )}
              {details?.mobile && (
                <Row label="Mobile" value={details.mobile} />
              )}
              {details?.email && (
                <Row label="Email" value={details.email} />
              )}
              {details?.amount != null && (
                <Row
                  label="Amount paid"
                  value={`${Number(details.amount).toFixed(2)}`}
                  bold
                />
              )}
              {details?.transactionId && (
                <Row label="Transaction id" value={details.transactionId} />
              )}
            </div>

            <p style={S.emailNote}>
              ✅ WhatsApp, Email aur SMS notifications ab active hain.
            </p>

            {/* PRINT + Dashboard buttons — same layout as PaymentStatus */}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button style={S.btnOutline} onClick={() => setShowReceipt(true)}>
                PRINT
              </button>
              <button style={S.btnFilled} onClick={goDashboard}>
                DASHBOARD →
              </button>
            </div>
          </div>
        )}

        {/* ── Receipt Modal ── */}
        {showReceipt && (
          <NotificationReceiptPDF
            details={details}
            onClose={() => setShowReceipt(false)}
          />
        )}

        {/* ── Failed ── */}
        {status === "failed" && (
          <div className="nps-animate" style={{ textAlign: "center" }}>
            <div style={S.failIcon}>✕</div>
            <h2 style={{ ...S.title, color: "#dc2626" }}>Payment Failed ya Cancel</h2>
            <p style={S.sub}>
              Dobara try karein ya support se contact karein.
            </p>
            <button
              style={{ ...S.btnFilled, background: "linear-gradient(135deg,#ef4444,#dc2626)" }}
              onClick={goDashboard}
            >
              ← Wapas jaao
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div style={S.row}>
      <span style={S.rowLabel}>{label}</span>
      <span style={{ ...S.rowValue, ...(bold ? { fontWeight: 700, fontSize: 16 } : {}) }}>
        {value}
      </span>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Inter','Segoe UI',sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "36px 32px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
    maxWidth: 440,
    width: "100%",
  },
  successHeader: {
    textAlign: "center",
    marginBottom: 28,
  },
  checkCircle: {
    width: 64, height: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
  },
  successTitle: {
    fontSize: 22, fontWeight: 700,
    color: "#16a34a", margin: 0,
  },
  detailsBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 18px",
    borderBottom: "1px solid #f1f5f9",
  },
  rowLabel: { fontSize: 14, color: "#64748b" },
  rowValue: { fontSize: 14, color: "#0f172a", fontWeight: 500, textAlign: "right", maxWidth: "60%" },
  emailNote: {
    fontSize: 12, color: "#94a3b8",
    textAlign: "center", margin: "0 0 4px",
  },
  btnOutline: {
    flex: 1, padding: "12px", borderRadius: 10,
    border: "1.5px solid #cbd5e1", background: "#fff",
    color: "#334155", fontWeight: 700, fontSize: 14, cursor: "pointer",
  },
  btnFilled: {
    flex: 1, padding: "12px", borderRadius: 10,
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#fff", border: "none",
    fontWeight: 700, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit",
  },
  failIcon: {
    width: 64, height: 64, borderRadius: "50%",
    background: "#fee2e2", color: "#dc2626",
    fontSize: 28, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
  },
  spinner: {
    width: 44, height: 44,
    border: "4px solid #e2e8f0",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    margin: "0 auto 20px",
    animation: "spin 0.9s linear infinite",
  },
  title: { fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" },
  sub:   { fontSize: 14, color: "#64748b", margin: "0 0 20px" },
};