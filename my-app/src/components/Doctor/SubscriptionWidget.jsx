import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

export default function SubscriptionWidget({ slug }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    axios.get(`${API_BASE}/api/subscriptions/status/${slug}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div style={S.card}>
      <div style={S.skeleton} />
      <div style={{ ...S.skeleton, width: "60%", marginTop: 8 }} />
    </div>
  );

  if (!data?.hasSubscription) return (
    <div style={{ ...S.card, borderColor: "#fecaca", background: "#fff5f5" }}>
      <p style={{ fontSize: 13, color: "#dc2626", fontWeight: 700 }}>
        ⚠️ No active subscription found.
      </p>
      <a href="/pricing" style={S.renewBtn}>View Plans →</a>
    </div>
  );

  const sub  = data.subscription;
  const warn = data.warnings;

  // ── Limit values — appointmentLimit 0 = unlimited ──────────────────────────
  const apptLimit = sub.appointmentLimit ?? 0;   // 0 = unlimited
  const apptUsed  = sub.appointmentsUsed  ?? 0;
  const apptLeft  = sub.appointmentsLeft;        // null = unlimited, number = limited
  const hasLimit  = apptLimit > 0;

  const usagePct = hasLimit
    ? Math.min(100, Math.round((apptUsed / apptLimit) * 100))
    : 0;

  const barColor = usagePct >= 90 ? "#dc2626"
                 : usagePct >= 70 ? "#d97706"
                 : "#6366f1";

  const cardBorder = warn.isExpired     ? "#fecaca"
                   : warn.expiryWarning ? "#fde68a"
                   : warn.limitReached  ? "#fecaca"
                   : warn.limitWarning  ? "#fde68a"
                   : "#e0e7ff";

  const cardBg = warn.isExpired     ? "#fff5f5"
               : warn.expiryWarning ? "#fffbeb"
               : warn.limitReached  ? "#fff5f5"
               : warn.limitWarning  ? "#fffbeb"
               : "#f5f3ff";

  const statusColor = warn.isExpired || warn.limitReached  ? "#dc2626"
                    : warn.expiryWarning || warn.limitWarning ? "#d97706"
                    : "#16a34a";

  const statusLabel = warn.isExpired     ? "Expired"
                    : warn.limitReached  ? "Limit Reached"
                    : warn.expiryWarning ? "Expiring Soon"
                    : warn.limitWarning  ? "Low Quota"
                    : "Active";

  return (
    <div style={{ ...S.card, borderColor: cardBorder, background: cardBg }}>

      {/* Header */}
      <div style={S.header}>
        <div>
          <p style={S.planName}>{sub.plan?.name || "—"} Plan</p>
          <p style={S.interval}>
            {sub.interval === "yearly" ? "Annual" : "Monthly"} subscription
          </p>
        </div>
        <span style={{ ...S.badge, background: statusColor }}>
          {statusLabel}
        </span>
      </div>

      {/* Warnings */}
      {warn.isExpired && (
        <div style={S.alertBox("#fef2f2", "#dc2626")}>
          🚫 Subscription expired on {formatDate(sub.expiryDate)}. Appointment booking is blocked.
        </div>
      )}
      {warn.expiryWarning && !warn.isExpired && (
        <div style={S.alertBox("#fffbeb", "#d97706")}>
          ⚠️ Expires in <strong>{sub.daysLeft} day{sub.daysLeft !== 1 ? "s" : ""}</strong>. Please renew soon.
        </div>
      )}
      {warn.limitReached && (
        <div style={S.alertBox("#fef2f2", "#dc2626")}>
          🚫 Appointment limit reached ({apptUsed}/{apptLimit}). Upgrade your plan to continue.
        </div>
      )}
      {warn.limitWarning && !warn.limitReached && (
        <div style={S.alertBox("#fffbeb", "#d97706")}>
          ⚠️ Only <strong>{apptLeft} appointments</strong> remaining in your plan.
        </div>
      )}

      {/* Stats */}
      <div style={S.statsGrid}>
        {sub.expiryDate && (
          <StatBox
            label="Expires On"
            value={formatDate(sub.expiryDate)}
            sub={sub.daysLeft !== null ? `${sub.daysLeft} days left` : ""}
            color={warn.isExpired ? "#dc2626" : warn.expiryWarning ? "#d97706" : "#16a34a"}
          />
        )}

        {/* Appointments — limit set hai ya unlimited */}
        {hasLimit ? (
          <StatBox
            label="Appointments"
            value={`${apptUsed} / ${apptLimit}`}
            sub={`${apptLeft ?? 0} remaining`}
            color={warn.limitReached ? "#dc2626" : warn.limitWarning ? "#d97706" : "#6366f1"}
          />
        ) : (
          <StatBox
            label="Appointments"
            value={`${apptUsed} used`}
            sub="Unlimited"
            color="#16a34a"
          />
        )}

        <StatBox
          label="Amount Paid"
          value={`₹${(sub.paidAmount || 0).toLocaleString("en-IN")}`}
          sub={sub.interval}
          color="#6366f1"
        />
      </div>

      {/* Usage bar — sirf tab jab limit set ho */}
      {hasLimit && (
        <div style={S.barWrap}>
          <div style={S.barTrack}>
            <div style={{ ...S.barFill, width: `${usagePct}%`, background: barColor }} />
          </div>
          <p style={S.barLabel}>{usagePct}% used</p>
        </div>
      )}

      {/* Renew button */}
      {(warn.isExpired || warn.expiryWarning || warn.limitReached || warn.limitWarning) && (
        <a href={`/${slug}/dashboard/renew-plan`} style={S.renewBtn}>🔄 Renew / Upgrade Plan →</a>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={SS.box}>
      <p style={SS.label}>{label}</p>
      <p style={{ ...SS.value, color }}>{value}</p>
      {sub && <p style={SS.sub}>{sub}</p>}
    </div>
  );
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const S = {
  card: {
    background: "#f5f3ff", border: "1.5px solid #e0e7ff",
    borderRadius: 16, padding: "16px 20px",
    fontFamily: "'Inter','Segoe UI',sans-serif", marginBottom: 8,
  },
  skeleton: { height: 14, width: "80%", borderRadius: 6, background: "#e2e8f0" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  planName: { fontSize: 15, fontWeight: 800, color: "#1e293b", margin: 0 },
  interval: { fontSize: 11, color: "#94a3b8", margin: "3px 0 0", fontWeight: 500 },
  badge: { fontSize: 10, fontWeight: 800, color: "#fff", padding: "3px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.06em" },
  alertBox: (bg, color) => ({
    background: bg, border: `1px solid ${color}30`, borderRadius: 8,
    padding: "8px 12px", fontSize: 12, color, fontWeight: 600, marginBottom: 12, lineHeight: 1.5,
  }),
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 },
  barWrap:  { marginBottom: 12 },
  barTrack: { height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", marginBottom: 4 },
  barFill:  { height: "100%", borderRadius: 99, transition: "width 0.4s ease" },
  barLabel: { fontSize: 10, color: "#94a3b8", fontWeight: 600, margin: 0 },
  renewBtn: {
    display: "inline-block", marginTop: 4,
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff", fontWeight: 700, fontSize: 12,
    padding: "8px 18px", borderRadius: 8, textDecoration: "none",
  },
};
const SS = {
  box:   { background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #e8edf5" },
  label: { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" },
  value: { fontSize: 15, fontWeight: 800, margin: 0 },
  sub:   { fontSize: 10, color: "#94a3b8", margin: "2px 0 0", fontWeight: 500 },
};