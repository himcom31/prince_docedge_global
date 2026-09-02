// SubscriptionsPage.jsx
// Super Admin — Doctor Subscription Management

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Users, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, Phone, Mail, Building2, User, Calendar, CreditCard,
  TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock,
  Activity, Hash, SlidersHorizontal, Download, Eye,
  Repeat2, IndianRupee, BarChart3, Shield, CalendarClock,
  Stethoscope, Check, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, ImageIcon, LayoutTemplate,
  GraduationCap, Award, Languages, FileText, BookOpen,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;
const TOKEN = () => localStorage.getItem("adminToken");

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt = (iso, opts) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", opts || {
      day: "2-digit", month: "short", year: "numeric",
    })
    : "—";

const fmtMoney = (n) =>
  n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";

const daysLeft = (expiry) => {
  if (!expiry) return null;
  const diff = Math.ceil((new Date(expiry) - Date.now()) / 864e5);
  return diff;
};

const statusMeta = (sub) => {
  const dl = daysLeft(sub.expiryDate);
  if (sub.status === "expired" || dl < 0)
    return { label: "Expired", color: "#ef4444", bg: "#fff5f5", border: "#fecaca", Icon: XCircle };
  if (dl != null && dl <= 7)
    return { label: "Expiring", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", Icon: AlertTriangle };
  if (sub.status === "active")
    return { label: "Active", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", Icon: CheckCircle2 };
  return { label: sub.status, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: Clock };
};

const resolveTemplate = (doctor) => {
  const t = doctor?.selectedTemplate;
  if (!t) return null;
  if (t.type === "preset") {
    const tpl = t.templateId;
    if (!tpl) return { type: "preset", name: "Preset template", imageUrl: null };
    return { type: "preset", name: tpl.name, imageUrl: tpl.imageUrl };
  }
  if (t.type === "custom") {
    return { type: "custom", name: "Custom upload", imageUrl: t.imageUrl };
  }
  return null;
};

// ── CSS ────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; }

.sp-page {
  font-family: 'Inter', system-ui, sans-serif;
  min-height: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: #f8fafc;
  color: #0f172a;
}

.sp-header { display: flex; align-items: center; gap: 1rem; }
.sp-header-icon {
  width: 48px; height: 48px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, #0B2550, #1a4fa8);
  display: grid; place-items: center;
  box-shadow: 0 4px 12px rgba(11,37,80,.25);
}
.sp-title { font-size: 1.4rem; font-weight: 800; color: #0B2550; letter-spacing: -.025em; }
.sp-sub   { font-size: .8rem; color: #64748b; margin-top: 3px; font-weight: 500; }

.sp-kpi-row { display: grid; grid-template-columns: repeat(5,1fr); gap: .75rem; }
.sp-kpi {
  background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 1rem 1.15rem; display: flex; align-items: center; gap: .85rem;
  transition: all .15s; position: relative; overflow: hidden;
}
.sp-kpi:hover { box-shadow: 0 4px 16px rgba(11,37,80,.08); transform: translateY(-1px); }
.sp-kpi::before {
  content:''; position:absolute; left:0;top:0;bottom:0;width:3px; border-radius:3px 0 0 3px;
}
.sp-kpi-icon { width:40px;height:40px;border-radius:10px;display:grid;place-items:center;flex-shrink:0; }
.sp-kpi-val  { font-size:1.6rem;font-weight:800;line-height:1;letter-spacing:-.03em; }
.sp-kpi-lbl  { font-size:.67rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.07em;margin-top:2px; }

.sp-toolbar { display:flex;align-items:center;gap:.6rem;flex-wrap:wrap; }
.sp-search-wrap { flex:1;min-width:220px;position:relative;display:flex;align-items:center; }
.sp-search-icon { position:absolute;left:.85rem;color:#94a3b8;pointer-events:none; }
.sp-search {
  width:100%;padding:.62rem 1rem .62rem 2.5rem;border:1.5px solid #e2e8f0;
  border-radius:9px;font-size:.845rem;font-family:inherit;outline:none;
  background:#fff;color:#0f172a;transition:border-color .15s;font-weight:500;
}
.sp-search::placeholder{color:#94a3b8;font-weight:400;}
.sp-search:focus{border-color:#0B2550;}
.sp-sel-wrap{position:relative;display:flex;align-items:center;}
.sp-sel-icon{position:absolute;left:.75rem;color:#94a3b8;pointer-events:none;}
.sp-sel {
  padding:.62rem 1rem .62rem 2.3rem;border:1.5px solid #e2e8f0;border-radius:9px;
  font-size:.82rem;font-family:inherit;background:#fff;color:#0f172a;
  cursor:pointer;outline:none;appearance:none;font-weight:600;
  transition:border-color .15s;min-width:160px;
}
.sp-sel:focus{border-color:#0B2550;}
.sp-refresh {
  display:flex;align-items:center;gap:6px;padding:.62rem 1rem;border-radius:9px;
  border:1.5px solid #e2e8f0;background:#fff;font-size:.82rem;font-weight:600;
  color:#475569;cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap;
}
.sp-refresh:hover{border-color:#0B2550;color:#0B2550;background:#f0f4ff;}
.sp-refresh .spin{animation:spin .7s linear infinite;}
.sp-badge {
  margin-left:auto;font-size:.78rem;color:#94a3b8;font-weight:600;white-space:nowrap;
  background:#f1f5f9;padding:.35rem .75rem;border-radius:100px;border:1px solid #e2e8f0;
}

.sp-card {
  background:#fff;border:1px solid #e2e8f0;border-radius:14px;
  overflow:hidden;box-shadow:0 2px 16px rgba(11,37,80,.06);
}
.sp-table{width:100%;border-collapse:collapse;font-size:.835rem;}
.sp-table thead{background:#f8fafc;border-bottom:1px solid #e2e8f0;}
.sp-table th{
  padding:.75rem 1rem;text-align:left;font-weight:700;color:#64748b;
  font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;
}
.sp-th-inner{display:flex;align-items:center;gap:5px;}
.sp-table tbody tr{border-bottom:1px solid #f1f5f9;cursor:pointer;transition:background .1s;}
.sp-table tbody tr:last-child{border-bottom:none;}
.sp-table tbody tr:hover{background:#f8fafc;}
.sp-td{padding:.9rem 1rem;vertical-align:middle;}
.sp-name{font-weight:700;color:#0B2550;font-size:.87rem;}
.sp-clinic{font-size:.74rem;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:4px;font-weight:500;}
.sp-icon-row{display:flex;align-items:center;gap:5px;color:#475569;font-size:.8rem;font-weight:500;}
.sp-muted{color:#475569;font-size:.8rem;font-weight:500;}
.sp-idx{color:#cbd5e1;font-size:.78rem;font-weight:700;font-variant-numeric:tabular-nums;}

.sp-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px 4px 7px;
  border-radius:100px;font-size:.69rem;font-weight:700;white-space:nowrap;border:1px solid;}

.sp-days{font-size:.72rem;font-weight:700;padding:2px 7px;border-radius:6px;white-space:nowrap;}

.sp-tpl-thumb-wrap{display:flex;align-items:center;gap:6px;}
.sp-tpl-thumb{
  width:30px;height:30px;border-radius:7px;object-fit:contain;
  background:#f8fafc;border:1px solid #e2e8f0;flex-shrink:0;
}
.sp-tpl-thumb-empty{
  width:30px;height:30px;border-radius:7px;flex-shrink:0;
  background:#f8fafc;border:1px dashed #e2e8f0;
  display:flex;align-items:center;justify-content:center;color:#cbd5e1;
}
.sp-tpl-badge{
  font-size:.65rem;font-weight:700;padding:1px 6px;border-radius:100px;
  text-transform:uppercase;letter-spacing:.03em;
}
.sp-tpl-badge.preset{background:#eef2ff;color:#4f46e5;}
.sp-tpl-badge.custom{background:#f5f3ff;color:#8b5cf6;}

.sp-center{padding:4rem 2rem;text-align:center;color:#94a3b8;font-size:.85rem;}
.sp-loading{display:flex;align-items:center;justify-content:center;gap:.6rem;color:#64748b;font-weight:500;}
.sp-spinner{width:18px;height:18px;border-radius:50%;border:2px solid #e2e8f0;border-top-color:#0B2550;animation:spin .7s linear infinite;}
.sp-empty-ico{font-size:2.5rem;margin-bottom:.5rem;}

.sp-pagination{
  display:flex;align-items:center;justify-content:space-between;
  padding:.85rem 1rem;border-top:1px solid #f1f5f9;
  font-size:.78rem;color:#94a3b8;font-weight:600;
}
.sp-pg-btns{display:flex;gap:4px;align-items:center;}
.sp-pg-btn{
  padding:5px 11px;border-radius:7px;border:1.5px solid #e2e8f0;background:#fff;
  color:#64748b;font-weight:700;cursor:pointer;font-size:.78rem;font-family:inherit;
  transition:all .12s;display:flex;align-items:center;gap:3px;
}
.sp-pg-btn:hover:not(:disabled){border-color:#0B2550;color:#0B2550;}
.sp-pg-btn.active{background:#0B2550;border-color:#0B2550;color:#fff;}
.sp-pg-btn:disabled{opacity:.35;cursor:not-allowed;}

.sp-overlay{
  position:fixed;inset:0;background:rgba(11,37,80,.3);z-index:100;
  display:flex;justify-content:flex-end;backdrop-filter:blur(3px);
}
.sp-drawer{
  width:min(600px,100vw);height:100vh;background:#fff;
  display:flex;flex-direction:column;overflow-y:auto;
  box-shadow:-12px 0 48px rgba(11,37,80,.12);
  animation:slideIn .22s cubic-bezier(.22,1,.36,1);
}
@keyframes slideIn{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}
.sp-dh{
  padding:1.3rem 1.5rem;border-bottom:1px solid #f1f5f9;
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;background:#fff;z-index:1;gap:1rem;
}
.sp-dh-left{display:flex;align-items:center;gap:.85rem;}
.sp-dh-icon{width:40px;height:40px;border-radius:10px;background:linear-gradient(135deg,#0B2550,#1a4fa8);display:grid;place-items:center;flex-shrink:0;}
.sp-dh-title{font-size:1rem;font-weight:800;color:#0B2550;}
.sp-dh-sub{font-size:.72rem;color:#94a3b8;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums;}
.sp-close{
  width:34px;height:34px;border-radius:8px;border:1.5px solid #e2e8f0;
  background:#f8fafc;display:grid;place-items:center;cursor:pointer;
  color:#64748b;transition:all .15s;flex-shrink:0;
}
.sp-close:hover{border-color:#ef4444;color:#ef4444;background:#fff5f5;}

.sp-db{padding:1.5rem;display:flex;flex-direction:column;gap:1.5rem;}

.sp-sec{
  font-size:.67rem;font-weight:800;color:#94a3b8;text-transform:uppercase;
  letter-spacing:.09em;margin-bottom:.65rem;display:flex;align-items:center;gap:6px;
}
.sp-sec::after{content:'';flex:1;height:1px;background:#f1f5f9;}

.sp-ig{display:grid;grid-template-columns:1fr 1fr;gap:.55rem;}
.sp-ic{background:#f8fafc;border:1px solid #f1f5f9;border-radius:9px;padding:.7rem .9rem;}
.sp-ic.full{grid-column:1/-1;}
.sp-ic-lbl{font-size:.63rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;display:flex;align-items:center;gap:4px;}
.sp-ic-val{font-size:.86rem;font-weight:600;color:#0f172a;line-height:1.3;}

.sp-tpl-card{
  display:flex;align-items:flex-start;gap:.9rem;
  background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;
  padding:.8rem .9rem;
}
.sp-tpl-card-img{
  width:64px;height:64px;border-radius:9px;object-fit:contain;
  background:#fff;border:1px solid #e2e8f0;flex-shrink:0;
}
.sp-tpl-card-empty{
  width:64px;height:64px;border-radius:9px;flex-shrink:0;
  background:#fff;border:1px dashed #e2e8f0;
  display:flex;align-items:center;justify-content:center;color:#cbd5e1;
}
.sp-tpl-card-name{font-size:.86rem;font-weight:700;color:#0f172a;}
.sp-tpl-card-meta{font-size:.73rem;color:#94a3b8;margin-top:3px;font-weight:600;}

.sp-tpl-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
.sp-tpl-btn{
  display:inline-flex;align-items:center;gap:5px;
  padding:4px 11px;border-radius:7px;border:1.5px solid #e2e8f0;
  background:#fff;font-size:.73rem;font-weight:600;color:#0B2550;
  cursor:pointer;font-family:inherit;transition:all .15s;text-decoration:none;
}
.sp-tpl-btn:hover{background:#f0f4ff;border-color:#0B2550;}
.sp-tpl-btn.download{background:#f0fdf4;border-color:#bbf7d0;color:#15803d;}
.sp-tpl-btn.download:hover{background:#dcfce7;border-color:#86efac;}

.sp-prog-bar{height:6px;border-radius:100px;background:#f1f5f9;overflow:hidden;margin-top:4px;}
.sp-prog-fill{height:100%;border-radius:100px;transition:width .3s;}

.sp-renewal{display:flex;flex-direction:column;gap:.5rem;}
.sp-renewal-item{
  display:flex;align-items:center;justify-content:space-between;
  padding:.75rem;background:#f8fafc;border:1px solid #f1f5f9;border-radius:9px;
}
.sp-renewal-left{display:flex;align-items:center;gap:.65rem;}
.sp-renewal-icon{width:32px;height:32px;border-radius:8px;background:#eef2ff;display:grid;place-items:center;flex-shrink:0;}
.sp-renewal-plan{font-size:.84rem;font-weight:700;color:#0f172a;}
.sp-renewal-meta{font-size:.73rem;color:#64748b;margin-top:2px;font-weight:500;}
.sp-renewal-amt{font-size:.85rem;font-weight:800;color:#0B2550;}

.sp-ext-btn{
  display:inline-flex;align-items:center;gap:5px;
  padding:5px 11px;border-radius:7px;border:1.5px solid #e2e8f0;
  background:#fff;font-size:.78rem;font-weight:600;color:#0B2550;
  cursor:pointer;font-family:inherit;transition:all .15s;text-decoration:none;
}
.sp-ext-btn:hover{background:#f0f4ff;border-color:#0B2550;}

.sp-toast{
  position:fixed;bottom:1.5rem;right:1.5rem;padding:.75rem 1.15rem;border-radius:10px;
  color:#fff;font-weight:700;font-size:.84rem;z-index:999;
  box-shadow:0 8px 24px rgba(0,0,0,.18);font-family:inherit;
  display:flex;align-items:center;gap:8px;
  animation:toastIn .2s cubic-bezier(.22,1,.36,1);
}
.sp-toast.success{background:#0B2550;}
.sp-toast.error{background:#dc2626;}
@keyframes toastIn{from{transform:translateY(12px);opacity:0;}to{transform:translateY(0);opacity:1;}}
@keyframes spin{to{transform:rotate(360deg);}}

.sp-lang-chip{
  font-size:.72rem;font-weight:700;padding:3px 10px;border-radius:100px;
  background:#eef2ff;color:#4f46e5;border:1px solid #c7d7fd;
}

.sp-edu-row{
  background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;
  padding:.5rem .75rem;font-size:.78rem;font-weight:600;color:#0f172a;
  display:flex;justify-content:space-between;gap:8px;align-items:center;
}
.sp-edu-year{color:#94a3b8;font-weight:700;font-size:.72rem;flex-shrink:0;}

.sp-prof-badge{
  font-size:.73rem;color:#4f46e5;font-weight:700;margin-top:3px;
  display:flex;align-items:center;gap:4px;
}

@media(max-width:900px){
  .sp-kpi-row{grid-template-columns:repeat(3,1fr);}
  .sp-page{padding:1rem;}
}
@media(max-width:600px){
  .sp-kpi-row{grid-template-columns:1fr 1fr;}
  .sp-ig{grid-template-columns:1fr;}
}
`;

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg, type, onHide }) {
  useEffect(() => { const t = setTimeout(onHide, 2800); return () => clearTimeout(t); }, []);
  return (
    <div className={`sp-toast ${type}`}>
      {type === "success" ? <Check size={15} strokeWidth={2.5} /> : <AlertCircle size={15} strokeWidth={2.5} />}
      {msg}
    </div>
  );
}

// ── Template Download Helper ───────────────────────────────────────────────
async function downloadTemplate(imageUrl, name) {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name || "template"}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.open(imageUrl, "_blank");
  }
}

// ── Drawer ─────────────────────────────────────────────────────────────────
function Drawer({ item, onClose }) {
  const [histOpen, setHistOpen] = useState(true);
  const dl = daysLeft(item.expiryDate);
  const meta = statusMeta(item);
  const doctor = item.clinicId || {};
  const plan = item.planId || {};
  const tpl = resolveTemplate(doctor);
  const profile = doctor.professionalProfile || {};
  const hasProfile = !!(profile.degrees?.length || profile.specialization || profile.registrationNo || profile.experience || profile.about || profile.languages?.length || profile.education?.length);

  const apptUsed = item.appointmentsUsed || 0;
  const apptLimit = item.patientLimit || 0;
  const apptPct = apptLimit > 0 ? Math.min(100, (apptUsed / apptLimit) * 100) : 0;
  const apptColor = apptPct >= 90 ? "#ef4444" : apptPct >= 70 ? "#f59e0b" : "#10b981";

  const renewals = [...(item.renewalOrders || [])].reverse();

  return (
    <div className="sp-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sp-drawer">

        {/* Header */}
        <div className="sp-dh">
          <div className="sp-dh-left">
            <div className="sp-dh-icon">
              <Shield size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div className="sp-dh-title">{doctor.clinicName || doctor.name || "—"}</div>
              <div className="sp-dh-sub">Dr. {doctor.name || "—"} · {item._id?.slice(-8).toUpperCase()}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <a
              className="sp-ext-btn"
              href={`https://software.docedge.in/${doctor.slug || ""}/login`}
              target="_blank" rel="noreferrer"
            >
              <ExternalLink size={12} /> Portal
            </a>
            <button className="sp-close" onClick={onClose}><X size={15} strokeWidth={2.5} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="sp-db">

          {/* Status banner */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0.85rem 1rem", borderRadius: "10px",
            background: meta.bg, border: `1px solid ${meta.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <meta.Icon size={16} color={meta.color} strokeWidth={2.5} />
              <span style={{ fontWeight: 800, color: meta.color, fontSize: "0.88rem" }}>
                {meta.label}
              </span>
              {dl != null && (
                <span style={{ fontSize: "0.78rem", color: meta.color, fontWeight: 600 }}>
                  {dl > 0 ? `· ${dl} days left` : "· Expired"}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", color: meta.color, fontWeight: 700 }}>
              {item.interval === "yearly" ? "Annual Plan" : "Monthly Plan"}
            </div>
          </div>

          {/* Doctor Info */}
          <div>
            <div className="sp-sec"><User size={11} /> Doctor Info</div>
            <div className="sp-ig">
              <div className="sp-ic">
                <div className="sp-ic-lbl"><User size={10} /> Doctor Name</div>
                <div className="sp-ic-val">{doctor.name || "—"}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Building2 size={10} /> Clinic</div>
                <div className="sp-ic-val">{doctor.clinicName || "—"}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Mail size={10} /> Email</div>
                <div className="sp-ic-val" style={{ wordBreak: "break-all" }}>{doctor.email || "—"}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Phone size={10} /> Mobile</div>
                <div className="sp-ic-val">{doctor.mobile || "—"}</div>
              </div>
            </div>
          </div>

          {/* Professional Profile — filled during signup */}
          <div>
            <div className="sp-sec"><GraduationCap size={11} /> Professional Profile</div>
            {hasProfile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <div className="sp-ig">
                  <div className="sp-ic">
                    <div className="sp-ic-lbl"><GraduationCap size={10} /> Degree</div>
                    <div className="sp-ic-val" style={{ color: "#4f46e5" }}>
                      {profile.degrees?.length ? profile.degrees.join(", ") : "—"}
                    </div>
                  </div>
                  <div className="sp-ic">
                    <div className="sp-ic-lbl"><Stethoscope size={10} /> Specialization</div>
                    <div className="sp-ic-val" style={{ color: "#4f46e5" }}>{profile.specialization || "—"}</div>
                  </div>
                  <div className="sp-ic">
                    <div className="sp-ic-lbl"><Hash size={10} /> Registration No.</div>
                    <div className="sp-ic-val">{profile.registrationNo || "—"}</div>
                  </div>
                  <div className="sp-ic">
                    <div className="sp-ic-lbl"><Award size={10} /> Experience</div>
                    <div className="sp-ic-val">
                      {profile.experience != null && profile.experience !== ""
                        ? `${profile.experience} ${Number(profile.experience) === 1 ? "yr" : "yrs"}`
                        : "—"}
                    </div>
                  </div>
                </div>

                {profile.languages?.length > 0 && (
                  <div className="sp-ic full">
                    <div className="sp-ic-lbl"><Languages size={10} /> Languages Spoken</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      {profile.languages.map((l, i) => (
                        <span key={i} className="sp-lang-chip">{l}</span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.education?.length > 0 && (
                  <div>
                    <div className="sp-ic-lbl" style={{ marginBottom: 6 }}>
                      <BookOpen size={10} /> Education
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {profile.education.map((e, i) => (
                        <div key={i} className="sp-edu-row">
                          <span>
                            {e.degree || "—"}
                            {e.institution ? ` · ${e.institution}` : ""}
                          </span>
                          {e.year && <span className="sp-edu-year">{e.year}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile.about && (
                  <div className="sp-ic full">
                    <div className="sp-ic-lbl"><FileText size={10} /> About</div>
                    <div className="sp-ic-val" style={{ fontWeight: 500, lineHeight: 1.5 }}>
                      {profile.about}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                padding: "0.85rem 1rem", textAlign: "center", color: "#94a3b8",
                fontSize: "0.82rem", background: "#f8fafc", borderRadius: "9px",
                border: "1px dashed #e2e8f0",
              }}>
                No professional profile filled during signup.
              </div>
            )}
          </div>

          {/* Selected Template */}
          <div>
            <div className="sp-sec"><LayoutTemplate size={11} /> Selected Template</div>
            {tpl ? (
              <div className="sp-tpl-card">
                {tpl.imageUrl ? (
                  <img src={tpl.imageUrl} alt={tpl.name} className="sp-tpl-card-img" />
                ) : (
                  <div className="sp-tpl-card-empty"><ImageIcon size={20} /></div>
                )}
                <div style={{ flex: 1 }}>
                  <div className="sp-tpl-card-name">{tpl.name}</div>
                  <div className="sp-tpl-card-meta">
                    {tpl.type === "preset" ? "Preset template" : "Custom uploaded"}
                  </div>
                  {tpl.imageUrl && (
                    <div className="sp-tpl-actions">
                      <a
                        href={tpl.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="sp-tpl-btn"
                      >
                        <Eye size={11} /> Preview
                      </a>
                      <button
                        className="sp-tpl-btn download"
                        onClick={() => downloadTemplate(tpl.imageUrl, tpl.name)}
                      >
                        <Download size={11} /> Download
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{
                padding: "0.85rem 1rem", textAlign: "center", color: "#94a3b8",
                fontSize: "0.82rem", background: "#f8fafc", borderRadius: "9px",
                border: "1px dashed #e2e8f0",
              }}>
                No template selected during signup.
              </div>
            )}
          </div>

          {/* Subscription Details */}
          <div>
            <div className="sp-sec"><CreditCard size={11} /> Subscription Details</div>
            <div className="sp-ig">
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Stethoscope size={10} /> Plan Name</div>
                <div className="sp-ic-val">{plan.name || "—"}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Activity size={10} /> Interval</div>
                <div className="sp-ic-val">{item.interval === "yearly" ? "Annual" : "Monthly"}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Calendar size={10} /> Start Date</div>
                <div className="sp-ic-val">{fmt(item.createdAt)}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><CalendarClock size={10} /> Expiry Date</div>
                <div className="sp-ic-val" style={{ color: dl != null && dl <= 7 ? "#ef4444" : "inherit" }}>
                  {fmt(item.expiryDate)}
                </div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><IndianRupee size={10} /> Last Payment</div>
                <div className="sp-ic-val">{fmtMoney(item.paidAmount)}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><TrendingUp size={10} /> Total Paid</div>
                <div className="sp-ic-val" style={{ color: "#10b981" }}>{fmtMoney(item.totalPaid)}</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Repeat2 size={10} /> Renewals</div>
                <div className="sp-ic-val">{item.renewalOrders?.length || 0} times</div>
              </div>
              <div className="sp-ic">
                <div className="sp-ic-lbl"><Hash size={10} /> Order ID</div>
                <div className="sp-ic-val" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                  {item.cashfreeOrderId || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Usage */}
          {apptLimit > 0 && (
            <div>
              <div className="sp-sec"><BarChart3 size={11} /> Appointment Usage</div>
              <div className="sp-ic full" style={{ background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: "9px", padding: "0.85rem 1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0f172a" }}>
                    {apptUsed.toLocaleString()} / {apptLimit.toLocaleString()} used
                  </span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: apptColor }}>
                    {apptPct.toFixed(0)}%
                  </span>
                </div>
                <div className="sp-prog-bar">
                  <div className="sp-prog-fill" style={{ width: `${apptPct}%`, background: apptColor }} />
                </div>
                <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: "5px", fontWeight: 500 }}>
                  {Math.max(0, apptLimit - apptUsed).toLocaleString()} appointments remaining
                </div>
              </div>
            </div>
          )}

          {/* Renewal History */}
          <div>
            <div
              className="sp-sec"
              style={{ cursor: "pointer" }}
              onClick={() => setHistOpen((v) => !v)}
            >
              <Repeat2 size={11} />
              Renewal History ({renewals.length})
              <span style={{ marginLeft: "auto", color: "#94a3b8" }}>
                {histOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </span>
            </div>
            {histOpen && (
              <div className="sp-renewal">
                {renewals.length === 0 && (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#94a3b8", fontSize: "0.82rem", background: "#f8fafc", borderRadius: "9px", border: "1px solid #f1f5f9" }}>
                    No renewals yet — this is the first purchase.
                  </div>
                )}
                {renewals.map((r, i) => (
                  <div key={i} className="sp-renewal-item">
                    <div className="sp-renewal-left">
                      <div className="sp-renewal-icon">
                        <Repeat2 size={14} color="#0B2550" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="sp-renewal-plan">
                          {r.planId?.name || "Plan"} · {r.interval === "yearly" ? "Annual" : "Monthly"}
                        </div>
                        <div className="sp-renewal-meta">
                          {fmt(r.paidAt, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          &nbsp;·&nbsp;{r.orderId}
                        </div>
                      </div>
                    </div>
                    <div className="sp-renewal-amt">{fmtMoney(r.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilt, setStatusFilt] = useState("");
  const [intervalFilt, setIntervalFilt] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const LIMIT = 20;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/subscriptions/all`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const data = await res.json();
      if (data.success) setSubs(data.subscriptions);
    } catch {
      showToast("Failed to load subscriptions", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubs(); }, []);

  const handleRefresh = async () => {
    setSpinning(true);
    await fetchSubs();
    setTimeout(() => setSpinning(false), 600);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return subs.filter((s) => {
      const doc = s.clinicId || {};
      const plan = s.planId || {};
      const meta = statusMeta(s);

      if (q && ![doc.name, doc.clinicName, doc.email, doc.mobile, plan.name]
        .some((v) => v?.toLowerCase().includes(q)))
        return false;

      if (statusFilt) {
        if (statusFilt === "expiring" && meta.label !== "Expiring") return false;
        if (statusFilt === "expired" && meta.label !== "Expired") return false;
        if (statusFilt === "active" && meta.label !== "Active") return false;
      }

      if (intervalFilt && s.interval !== intervalFilt) return false;
      return true;
    });
  }, [subs, search, statusFilt, intervalFilt]);

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const pageRows = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  useEffect(() => { setPage(1); }, [search, statusFilt, intervalFilt]);

  const kpi = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, revenue = 0;
    subs.forEach((s) => {
      const m = statusMeta(s);
      if (m.label === "Active") active++;
      if (m.label === "Expiring") expiring++;
      if (m.label === "Expired") expired++;
      revenue += Number(s.totalPaid || 0);
    });
    return { total: subs.length, active, expiring, expired, revenue };
  }, [subs]);

  const KPIS = [
    { key: "total", label: "Total Doctors", val: kpi.total, color: "#0B2550", bg: "#eef2ff", border: "#c7d7fd", Icon: Users },
    { key: "active", label: "Active", val: kpi.active, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", Icon: CheckCircle2 },
    { key: "expiring", label: "Expiring Soon", val: kpi.expiring, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", Icon: AlertTriangle },
    { key: "expired", label: "Expired", val: kpi.expired, color: "#ef4444", bg: "#fff5f5", border: "#fecaca", Icon: XCircle },
    { key: "revenue", label: "Total Revenue", val: fmtMoney(kpi.revenue), color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", Icon: IndianRupee },
  ];

  const pageNums = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);

  return (
    <>
      <style>{css}</style>
      <div className="sp-page">

        {/* Header */}
        <div className="sp-header">
          <div className="sp-header-icon">
            <Users size={22} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div className="sp-title">Doctor Subscriptions</div>
            <div className="sp-sub">Track every doctor's subscription plan, payment status, and expiry date in one place.</div>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="sp-kpi-row">
          {KPIS.map(({ key, label, val, color, bg, border, Icon: KIcon }) => (
            <div key={key} className="sp-kpi">
              <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "3px 0 0 3px", background: color }} />
              <div className="sp-kpi-icon" style={{ background: bg }}>
                <KIcon size={18} color={color} strokeWidth={2} />
              </div>
              <div>
                <div className="sp-kpi-val" style={{ color }}>{val}</div>
                <div className="sp-kpi-lbl">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="sp-toolbar">
          <div className="sp-search-wrap">
            <Search size={15} className="sp-search-icon" />
            <input
              className="sp-search"
              placeholder="Search by name, clinic, email, mobile, plan…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sp-sel-wrap">
            <SlidersHorizontal size={13} className="sp-sel-icon" />
            <select className="sp-sel" value={statusFilt} onChange={(e) => setStatusFilt(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="sp-sel-wrap">
            <Calendar size={13} className="sp-sel-icon" />
            <select className="sp-sel" value={intervalFilt} onChange={(e) => setIntervalFilt(e.target.value)}>
              <option value="">All Intervals</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Annual</option>
            </select>
          </div>
          <button className="sp-refresh" onClick={handleRefresh}>
            <RefreshCw size={14} className={spinning ? "spin" : ""} />
            Refresh
          </button>
          <div className="sp-badge">
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        <div className="sp-card">
          <table className="sp-table">
            <thead>
              <tr>
                <th><div className="sp-th-inner"><Hash size={10} /> #</div></th>
                <th><div className="sp-th-inner"><User size={10} /> Doctor / Clinic</div></th>
                <th><div className="sp-th-inner"><Phone size={10} /> Contact</div></th>
                <th><div className="sp-th-inner"><LayoutTemplate size={10} /> Template</div></th>
                <th><div className="sp-th-inner"><CreditCard size={10} /> Plan</div></th>
                <th><div className="sp-th-inner"><Calendar size={10} /> Start Date</div></th>
                <th><div className="sp-th-inner"><CalendarClock size={10} /> Expiry</div></th>
                <th><div className="sp-th-inner"><Clock size={10} /> Days Left</div></th>
                <th><div className="sp-th-inner"><Activity size={10} /> Status</div></th>
                <th><div className="sp-th-inner"><IndianRupee size={10} /> Total Paid</div></th>
                <th><div className="sp-th-inner"><Repeat2 size={10} /> Renewals</div></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="sp-center">
                  <div className="sp-loading">
                    <div className="sp-spinner" />
                    Loading subscriptions…
                  </div>
                </td></tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr><td colSpan={11} className="sp-center">
                  <div className="sp-empty-ico">📋</div>
                  <div>No records found. Try changing the filter or search.</div>
                </td></tr>
              )}
              {!loading && pageRows.map((s, i) => {
                const doc = s.clinicId || {};
                const plan = s.planId || {};
                const meta = statusMeta(s);
                const dl = daysLeft(s.expiryDate);
                const SIcon = meta.Icon;
                const tpl = resolveTemplate(doc);
                const prof = doc.professionalProfile || {};

                return (
                  <tr key={s._id} onClick={() => setSelected(s)}>
                    <td className="sp-td"><span className="sp-idx">{(page - 1) * LIMIT + i + 1}</span></td>

                    <td className="sp-td">
                      <div className="sp-name">{doc.name || "—"}</div>
                      <div className="sp-clinic"><Building2 size={11} /> {doc.clinicName || "—"}</div>
                      {prof.degrees?.length > 0 && (
                        <div className="sp-prof-badge">
                          <GraduationCap size={11} />
                          {prof.degrees.join(", ")}{prof.specialization ? ` · ${prof.specialization}` : ""}
                        </div>
                      )}
                    </td>

                    <td className="sp-td">
                      <div className="sp-icon-row"><Mail size={11} color="#94a3b8" /> {doc.email || "—"}</div>
                      <div className="sp-icon-row" style={{ marginTop: "3px" }}>
                        <Phone size={11} color="#94a3b8" /> {doc.mobile || "—"}
                      </div>
                    </td>

                    <td className="sp-td">
                      {tpl ? (
                        <div className="sp-tpl-thumb-wrap">
                          {tpl.imageUrl ? (
                            <img src={tpl.imageUrl} alt={tpl.name} className="sp-tpl-thumb" />
                          ) : (
                            <div className="sp-tpl-thumb-empty"><ImageIcon size={14} /></div>
                          )}
                          <span className={`sp-tpl-badge ${tpl.type}`}>
                            {tpl.type === "preset" ? "Preset" : "Custom"}
                          </span>
                        </div>
                      ) : (
                        <span className="sp-muted">—</span>
                      )}
                    </td>

                    <td className="sp-td">
                      <div style={{ fontWeight: 700, fontSize: "0.84rem", color: "#0f172a" }}>{plan.name || "—"}</div>
                      <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: "2px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {s.interval === "yearly" ? "Annual" : "Monthly"}
                      </div>
                    </td>

                    <td className="sp-td"><div className="sp-muted">{fmt(s.createdAt)}</div></td>

                    <td className="sp-td">
                      <div className="sp-muted" style={{ color: dl != null && dl <= 7 ? "#ef4444" : "inherit" }}>
                        {fmt(s.expiryDate)}
                      </div>
                    </td>

                    <td className="sp-td">
                      {dl == null ? (
                        <span className="sp-muted">—</span>
                      ) : dl <= 0 ? (
                        <span className="sp-days" style={{ background: "#fff5f5", color: "#ef4444" }}>Expired</span>
                      ) : dl <= 7 ? (
                        <span className="sp-days" style={{ background: "#fffbeb", color: "#f59e0b" }}>{dl}d left</span>
                      ) : (
                        <span className="sp-days" style={{ background: "#f0fdf4", color: "#10b981" }}>{dl}d left</span>
                      )}
                    </td>

                    <td className="sp-td">
                      <span className="sp-pill" style={{ background: meta.bg, borderColor: meta.border, color: meta.color }}>
                        <SIcon size={11} strokeWidth={2.5} />
                        {meta.label}
                      </span>
                    </td>

                    <td className="sp-td">
                      <div style={{ fontWeight: 800, color: "#0B2550", fontSize: "0.85rem" }}>{fmtMoney(s.totalPaid)}</div>
                      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>Last: {fmtMoney(s.paidAmount)}</div>
                    </td>

                    <td className="sp-td">
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <Repeat2 size={12} color="#94a3b8" />
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.82rem" }}>
                          {s.renewalOrders?.length || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="sp-pagination">
              <span>Page {page} of {totalPages} · {filtered.length} records</span>
              <div className="sp-pg-btns">
                <button className="sp-pg-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft size={13} /> Prev
                </button>
                {pageNums.map((pg) => (
                  <button key={pg} className={`sp-pg-btn${pg === page ? " active" : ""}`} onClick={() => setPage(pg)}>
                    {pg}
                  </button>
                ))}
                <button className="sp-pg-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {selected && <Drawer item={selected} onClose={() => setSelected(null)} />}
        {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}

      </div>
    </>
  );
}