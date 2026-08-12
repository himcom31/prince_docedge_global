/**
 * NotificationReceiptPDF.jsx  —  DocEdge Notification Plan Invoice
 * Same style as PaymentReceiptPDF.jsx (subscription receipt)
 *
 * Usage:
 *   import NotificationReceiptPDF from "./NotificationReceiptPDF";
 *   <NotificationReceiptPDF details={details} onClose={() => setShowReceipt(false)} />
 *
 * details shape:
 * {
 *   clinicName, planName, invoiceNumber,
 *   paymentMode, bankName, mobile, email,
 *   amount, transactionId,
 * }
 */

import { useRef, useState } from "react";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

const autoInv = () => "NINV-" + Date.now().toString().slice(-8).toUpperCase();

const rs = (n) =>
  n != null
    ? "Rs." + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";

const fmtDate = (d) =>
  new Date(d || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

/* ─── PDF generator using html2canvas + jsPDF ─────────────────────────────── */

async function generatePDF(paperRef, invoiceNumber) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF }   = await import("jspdf");

  const canvas = await html2canvas(paperRef.current, {
    scale: 3,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    windowWidth: paperRef.current.scrollWidth,
    windowHeight: paperRef.current.scrollHeight,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf     = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW  = pageW;
  const imgH  = (canvas.height * pageW) / canvas.width;

  let yOffset = 0;
  while (yOffset < imgH) {
    if (yOffset > 0) pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, -yOffset, imgW, imgH, undefined, "FAST");
    yOffset += pageH;
  }

  pdf.save(`Notification-Invoice-${invoiceNumber}.pdf`);
}

/* ─── React component ─────────────────────────────────────────────────────── */

export default function NotificationReceiptPDF({ details = {}, onClose }) {
  const {
    clinicName    = "Your Clinic",
    planName      = "Notification Plan",
    invoiceNumber = autoInv(),
    paymentMode, bankName, mobile, email,
    amount, transactionId,
  } = details;

  const paperRef       = useRef(null);
  const [busy, setBusy] = useState(false);

  const total  = amount != null ? Number(amount) : null;
  const gstAmt = total  != null ? +(total * 18 / 118).toFixed(2) : null;
  const base   = total  != null ? +(total - gstAmt).toFixed(2)   : null;

  const handleDownload = async () => {
    setBusy(true);
    try {
      await generatePDF(paperRef, invoiceNumber);
    } catch (e) {
      console.error("PDF error:", e);
      alert("PDF generation failed. Please try again.");
    }
    setBusy(false);
  };

  const S = {
    root: {
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#e2e8f0",
      overflowY: "scroll", overflowX: "hidden",
      fontFamily: "'Inter','Segoe UI',Arial,sans-serif",
    },
    bar: {
      position: "sticky", top: 0, zIndex: 20,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 24px",
      background: "#0f172a",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    },
    paper: {
      background: "#fff",
      width: "100%", maxWidth: 780,
      borderRadius: 6, overflow: "hidden",
      boxShadow: "0 4px 32px rgba(0,0,0,0.15)",
    },
    /* Purple-indigo gradient header for notification (vs blue for subscription) */
    header: {
      background: "linear-gradient(135deg,#1e1b4b 0%,#4f46e5 100%)",
      padding: "28px 36px 24px",
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      color: "#fff",
    },
    accentBar: { height: 4, background: "linear-gradient(90deg,#4f46e5,#7c3aed,#ec4899)" },
    section: { padding: "24px 36px", borderBottom: "1px solid #f1f5f9" },
    sectionLabel: {
      fontSize: 10, fontWeight: 800, color: "#94a3b8",
      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
    },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
    totalBox: {
      display: "flex", justifyContent: "flex-end",
      padding: "16px 36px 28px",
      borderBottom: "1px solid #f1f5f9",
    },
    totalInner: { width: 260 },
    pdGrid: { display: "flex", flexWrap: "wrap", gap: "20px 36px" },
    footer: {
      background: "#f8fafc", borderTop: "1px solid #e2e8f0",
      padding: "20px 36px", textAlign: "center",
    },
  };

  return (
    <div style={S.root}>

      {/* sticky action bar */}
      <div style={S.bar}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>📄 Invoice Preview</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleDownload}
            disabled={busy}
            style={{
              padding: "8px 20px", borderRadius: 7, fontWeight: 700, fontSize: 13,
              cursor: busy ? "not-allowed" : "pointer", border: "none",
              opacity: busy ? 0.65 : 1,
              background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff",
            }}
          >
            {busy ? "⏳ Generating…" : "⬇ Download PDF"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px", borderRadius: 7, fontWeight: 700,
              fontSize: 13, cursor: "pointer", border: "none",
              background: "#334155", color: "#fff",
            }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* paper — captured by html2canvas */}
      <div style={{ padding: "32px 16px 80px", display: "flex", justifyContent: "center" }}>
        <div ref={paperRef} style={S.paper}>

          {/* HEADER */}
          <div style={S.header}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>DocEdge</div>
              <div style={{ fontSize: 12, opacity: 0.65, marginTop: 3 }}>Notification Services</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 3, opacity: 0.9, marginBottom: 10 }}>
                TAX INVOICE
              </div>
              <InfoRow k="Invoice No." v={invoiceNumber} />
              <InfoRow k="Date"        v={fmtDate()} />
              <InfoRow k="Status" v={
                <span style={{
                  background: "#16a34a", color: "#fff",
                  borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                }}>✓ PAID</span>
              } />
            </div>
          </div>

          {/* accent bar */}
          <div style={S.accentBar} />

          {/* BILLED TO / FROM */}
          <div style={S.section}>
            <div style={S.sectionLabel}>Billed To / From</div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{
                flex: 1, padding: "14px 16px",
                background: "#f8fafc",
                borderLeft: "3px solid #4f46e5",
                borderRadius: 4,
              }}>
                <Cap>Billed To</Cap>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{clinicName}</div>
                {mobile && <IL>📱 {mobile}</IL>}
                {email  && <IL>✉️  {email}</IL>}
              </div>
              <div style={{ width: 1, background: "#e2e8f0" }} />
              <div style={{
                flex: 1, padding: "14px 16px",
                background: "#f8fafc",
                borderRadius: 4,
              }}>
                <Cap>From</Cap>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>DocEdge Pvt. Ltd.</div>
                <IL>✉️  support@docedge.in</IL>
                <IL>🌐 www.docedge.in</IL>
                <IL>GSTIN: 10XXXXX0000X1Z5</IL>
              </div>
            </div>
          </div>

          {/* LINE ITEMS */}
          <div style={{ padding: "24px 36px 0" }}>
            <div style={S.sectionLabel}>Order Summary</div>
          </div>
          <table style={S.table}>
            <thead>
              <tr style={{ background: "#1e1b4b" }}>
                <TH w="6%">#</TH>
                <TH w="48%">Description</TH>
                <TH w="24%" center>Billing Date</TH>
                <TH w="22%" right>Amount (₹)</TH>
              </tr>
            </thead>
            <tbody>
              <tr>
                <TD center color="#94a3b8">1</TD>
                <TD>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#0f172a" }}>{planName}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    Notification services — WhatsApp, Email &amp; SMS
                  </div>
                </TD>
                <TD center color="#64748b">{fmtDate()}</TD>
                <TD right bold>{rs(base)}</TD>
              </tr>
            </tbody>
          </table>

          {/* TOTALS */}
          <div style={S.totalBox}>
            <div style={S.totalInner}>
              <TotalRow label="Base Amount" val={rs(base)} />
              <TotalRow label="GST @ 18%"   val={rs(gstAmt)} />
              <TotalRow label="Total Paid"  val={rs(total)} bold highlight />
            </div>
          </div>

          {/* PAYMENT DETAILS */}
          {(paymentMode || bankName || transactionId || mobile) && (
            <div style={S.section}>
              <div style={S.sectionLabel}>Payment Details</div>
              <div style={S.pdGrid}>
                {paymentMode   && <PC k="Mode"           v={paymentMode} />}
                {bankName      && <PC k="Bank / UPI"     v={bankName} />}
                {transactionId && <PC k="Transaction ID" v={transactionId} />}
                {mobile        && <PC k="Registered No." v={mobile} />}
              </div>
            </div>
          )}

          {/* CHANNELS ACTIVATED */}
          <div style={{ padding: "16px 36px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={S.sectionLabel}>Channels Activated</div>
            <div style={{ display: "flex", gap: 10 }}>
              {["💬 WhatsApp", "📧 Email", "📱 SMS"].map((ch) => (
                <div key={ch} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#ede9fe", borderRadius: 20,
                  padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#4f46e5",
                }}>
                  {ch}
                </div>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <div style={S.footer}>
            <div style={{ fontWeight: 600, color: "#334155", marginBottom: 6, fontSize: 14 }}>
              Thank you for choosing DocEdge 🙏
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>
              This is a system-generated invoice and does not require a physical signature.
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>
              For support: support@docedge.in &nbsp;|&nbsp; +91-XXXXXXXXXX
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─── sub-components (same as PaymentReceiptPDF) ──────────────────────────── */

function InfoRow({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{k}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{v}</span>
    </div>
  );
}

function Cap({ children }) {
  return (
    <div style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function IL({ children }) {
  return <div style={{ fontSize: 13, color: "#475569", marginBottom: 4, lineHeight: 1.6 }}>{children}</div>;
}

function TH({ children, w, center, right }) {
  return (
    <th style={{
      padding: "10px 16px", width: w,
      textAlign: center ? "center" : right ? "right" : "left",
      fontSize: 10, fontWeight: 700, color: "#fff",
      letterSpacing: "0.06em", textTransform: "uppercase",
    }}>
      {children}
    </th>
  );
}

function TD({ children, center, right, bold, color }) {
  return (
    <td style={{
      padding: "16px", verticalAlign: "top",
      borderBottom: "1px solid #f1f5f9",
      color: color || "#1e293b",
      textAlign: center ? "center" : right ? "right" : "left",
      fontWeight: bold ? 700 : "normal",
    }}>
      {children}
    </td>
  );
}

function TotalRow({ label, val, bold, highlight }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      padding: highlight ? "10px 12px" : "7px 0",
      marginTop: highlight ? 8 : 0,
      background:   highlight ? "#eff6ff" : "transparent",
      borderTop:    highlight ? "2px solid #4f46e5" : "none",
      borderBottom: highlight ? "2px solid #4f46e5" : "none",
      borderRadius: highlight ? 4 : 0,
    }}>
      <span style={{ fontSize: bold ? 13 : 12, color: bold ? "#0f172a" : "#64748b", fontWeight: bold ? 700 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: bold ? 15 : 12, color: "#0f172a", fontWeight: bold ? 800 : 500 }}>
        {val}
      </span>
    </div>
  );
}

function PC({ k, v }) {
  return (
    <div style={{ minWidth: 130 }}>
      <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{k}</div>
      <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{v}</div>
    </div>
  );
}