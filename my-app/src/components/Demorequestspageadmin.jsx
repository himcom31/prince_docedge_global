// DemoRequestsPage.jsx
// Super Admin — Demo Enquiry Management
// Professional redesign with Lucide React icons

import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList, Search, RefreshCw, ChevronLeft, ChevronRight,
  X, Phone, MapPin, Stethoscope, Clock, Mail, Building2,
  User, Calendar, Globe, Hash, CheckCircle2, Circle,
  PhoneCall, CalendarCheck, TrendingUp, XCircle, Inbox,
  SlidersHorizontal, Save, AlertCircle, Check,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const STATUS_META = {
  new:            { label: "New",            color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", Icon: Circle },
  contacted:      { label: "Contacted",      color: "#f59e0b", bg: "#fffbeb", border: "#fde68a", Icon: PhoneCall },
  demo_scheduled: { label: "Demo Scheduled", color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe", Icon: CalendarCheck },
  converted:      { label: "Converted",      color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", Icon: CheckCircle2 },
  not_interested: { label: "Not Interested", color: "#ef4444", bg: "#fff5f5", border: "#fecaca", Icon: XCircle },
};

const TOKEN = () => localStorage.getItem("docedge_token");

const fmt = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

// ── STYLES ─────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; }

  .demo-page {
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: #f8fafc;
    color: #0f172a;
  }

  /* ── Page Header ── */
  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .page-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, #0B2550 0%, #1a4fa8 100%);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(11,37,80,0.25);
  }
  .page-title {
    font-size: 1.4rem;
    font-weight: 800;
    color: #0B2550;
    letter-spacing: -0.025em;
    line-height: 1;
  }
  .page-sub {
    font-size: 0.8rem;
    color: #64748b;
    margin-top: 4px;
    font-weight: 500;
  }

  /* ── Stats Row ── */
  .stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.75rem;
  }
  .stat-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1rem 1.2rem;
    display: flex;
    align-items: center;
    gap: 0.85rem;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
    overflow: hidden;
  }
  .stat-card:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 16px rgba(11,37,80,0.08);
    transform: translateY(-1px);
  }
  .stat-card.active {
    border-width: 1.5px;
  }
  .stat-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    border-radius: 3px 0 0 3px;
  }
  .stat-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .stat-info { display: flex; flex-direction: column; gap: 2px; }
  .stat-count {
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
  }
  .stat-label {
    font-size: 0.68rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  /* ── Toolbar ── */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }
  .search-wrap {
    flex: 1;
    min-width: 220px;
    position: relative;
    display: flex;
    align-items: center;
  }
  .search-icon {
    position: absolute;
    left: 0.85rem;
    color: #94a3b8;
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 0.62rem 1rem 0.62rem 2.5rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    font-size: 0.845rem;
    font-family: inherit;
    outline: none;
    background: #fff;
    color: #0f172a;
    transition: border-color 0.15s;
    font-weight: 500;
  }
  .search-input::placeholder { color: #94a3b8; font-weight: 400; }
  .search-input:focus { border-color: #0B2550; }

  .filter-select-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .filter-icon {
    position: absolute;
    left: 0.75rem;
    color: #94a3b8;
    pointer-events: none;
  }
  .filter-select {
    padding: 0.62rem 1rem 0.62rem 2.3rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    font-size: 0.82rem;
    font-family: inherit;
    background: #fff;
    color: #0f172a;
    cursor: pointer;
    outline: none;
    appearance: none;
    font-weight: 600;
    transition: border-color 0.15s;
    min-width: 170px;
  }
  .filter-select:focus { border-color: #0B2550; }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0.62rem 1rem;
    border-radius: 9px;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    font-size: 0.82rem;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .refresh-btn:hover {
    border-color: #0B2550;
    color: #0B2550;
    background: #f0f4ff;
  }
  .refresh-btn .spin { animation: spin 0.7s linear infinite; }

  .count-badge {
    margin-left: auto;
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 600;
    white-space: nowrap;
    background: #f1f5f9;
    padding: 0.35rem 0.75rem;
    border-radius: 100px;
    border: 1px solid #e2e8f0;
  }

  /* ── Table Card ── */
  .table-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 16px rgba(11,37,80,0.06);
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.835rem;
  }
  .data-table thead {
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }
  .data-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-weight: 700;
    color: #64748b;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
  }
  .data-table th .th-inner {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .data-table tbody tr {
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
    transition: background 0.1s;
  }
  .data-table tbody tr:last-child { border-bottom: none; }
  .data-table tbody tr:hover { background: #f8fafc; }
  .data-table td {
    padding: 0.9rem 1rem;
    vertical-align: middle;
  }
  .cell-name { font-weight: 700; color: #0B2550; font-size: 0.87rem; }
  .cell-clinic {
    font-size: 0.74rem;
    color: #64748b;
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 500;
  }
  .cell-muted {
    color: #475569;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .cell-icon-row {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #475569;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .cell-idx {
    color: #cbd5e1;
    font-size: 0.78rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* ── Status Pill ── */
  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px 4px 7px;
    border-radius: 100px;
    font-size: 0.69rem;
    font-weight: 700;
    white-space: nowrap;
    border: 1px solid;
  }

  /* ── Empty / Loading ── */
  .cell-center {
    padding: 4rem 2rem;
    text-align: center;
    color: #94a3b8;
    font-size: 0.85rem;
  }
  .loading-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: #64748b;
    font-weight: 500;
  }
  .spinner {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 2px solid #e2e8f0;
    border-top-color: #0B2550;
    animation: spin 0.7s linear infinite;
  }
  .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }

  /* ── Pagination ── */
  .pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.85rem 1rem;
    border-top: 1px solid #f1f5f9;
    font-size: 0.78rem;
    color: #94a3b8;
    font-weight: 600;
  }
  .page-btns { display: flex; gap: 4px; align-items: center; }
  .page-btn {
    padding: 5px 11px;
    border-radius: 7px;
    border: 1.5px solid #e2e8f0;
    background: #fff;
    color: #64748b;
    font-weight: 700;
    cursor: pointer;
    font-size: 0.78rem;
    font-family: inherit;
    transition: all 0.12s;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .page-btn:hover:not(:disabled) {
    border-color: #0B2550;
    color: #0B2550;
  }
  .page-btn.active {
    background: #0B2550;
    border-color: #0B2550;
    color: #fff;
  }
  .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* ── Drawer Overlay ── */
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 37, 80, 0.3);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
    backdrop-filter: blur(3px);
  }
  .drawer {
    width: min(540px, 100vw);
    height: 100vh;
    background: #fff;
    display: flex;
    flex-direction: column;
    box-shadow: -12px 0 48px rgba(11,37,80,0.12);
    overflow-y: auto;
    animation: slideIn 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }

  .drawer-header {
    padding: 1.3rem 1.5rem;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 1;
    gap: 1rem;
  }
  .drawer-header-left { display: flex; align-items: center; gap: 0.85rem; }
  .drawer-header-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, #0B2550, #1a4fa8);
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .drawer-title { font-size: 1rem; font-weight: 800; color: #0B2550; }
  .drawer-id {
    font-size: 0.72rem;
    color: #94a3b8;
    font-weight: 600;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }
  .close-btn {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: #64748b;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .close-btn:hover {
    border-color: #ef4444;
    color: #ef4444;
    background: #fff5f5;
  }

  .drawer-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    flex: 1;
  }

  /* ── Info Grid ── */
  .section-label {
    font-size: 0.67rem;
    font-weight: 800;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    margin-bottom: 0.65rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .section-label::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #f1f5f9;
  }
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem;
  }
  .info-cell {
    background: #f8fafc;
    border: 1px solid #f1f5f9;
    border-radius: 9px;
    padding: 0.7rem 0.9rem;
  }
  .info-cell.full { grid-column: 1 / -1; }
  .info-cell-label {
    font-size: 0.63rem;
    font-weight: 700;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .info-cell-value {
    font-size: 0.86rem;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.3;
  }

  /* ── Status Chips ── */
  .status-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .status-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 13px 6px 9px;
    border-radius: 100px;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    border: 1.5px solid #e2e8f0;
    background: #f8fafc;
    color: #94a3b8;
    font-family: inherit;
    transition: all 0.15s;
  }
  .status-chip:hover {
    border-color: #cbd5e1;
    color: #475569;
  }
  .status-chip.active { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

  /* ── Notes Textarea ── */
  .notes-textarea {
    width: 100%;
    min-height: 120px;
    padding: 0.85rem;
    border: 1.5px solid #e2e8f0;
    border-radius: 9px;
    font-size: 0.85rem;
    font-family: inherit;
    resize: vertical;
    color: #0f172a;
    outline: none;
    line-height: 1.65;
    transition: border-color 0.15s;
    font-weight: 500;
  }
  .notes-textarea::placeholder { color: #94a3b8; font-weight: 400; }
  .notes-textarea:focus { border-color: #0B2550; }

  /* ── Save Button ── */
  .save-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0.72rem 1.5rem;
    border-radius: 9px;
    background: linear-gradient(135deg, #0B2550 0%, #1a4fa8 100%);
    color: #fff;
    font-weight: 700;
    font-size: 0.87rem;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    align-self: flex-end;
    box-shadow: 0 3px 12px rgba(11,37,80,0.25);
    letter-spacing: -0.01em;
  }
  .save-btn:hover:not(:disabled) {
    box-shadow: 0 5px 20px rgba(11,37,80,0.35);
    transform: translateY(-1px);
  }
  .save-btn:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  /* ── Toast ── */
  .toast {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    padding: 0.75rem 1.15rem;
    border-radius: 10px;
    color: #fff;
    font-weight: 700;
    font-size: 0.84rem;
    z-index: 999;
    box-shadow: 0 8px 24px rgba(0,0,0,0.18);
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: toastIn 0.2s cubic-bezier(0.22,1,0.36,1);
    letter-spacing: -0.01em;
  }
  .toast.success { background: #0B2550; }
  .toast.error   { background: #dc2626; }
  @keyframes toastIn {
    from { transform: translateY(12px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 900px) {
    .stats-row { grid-template-columns: repeat(3, 1fr); }
    .demo-page { padding: 1rem; }
  }
  @media (max-width: 600px) {
    .stats-row { grid-template-columns: 1fr 1fr; }
    .info-grid { grid-template-columns: 1fr; }
  }
`;

// ── TOAST ──────────────────────────────────────────────────────────────────
function Toast({ msg, type, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 2800);
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  const Icon = type === "success" ? Check : AlertCircle;
  return (
    <div className={`toast ${type}`}>
      <Icon size={15} strokeWidth={2.5} />
      {msg}
    </div>
  );
}

// ── DRAWER ─────────────────────────────────────────────────────────────────
function Drawer({ item, onClose, onUpdated }) {
  const [status, setStatus] = useState(item.status);
  const [notes,  setNotes]  = useState(item.notes || "");
  const [saving, setSaving] = useState(false);
  const [toast,  setToast]  = useState(null);

  const showToast = (msg, type = "success") => setToast({ msg, type });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`${API_BASE}/api/formlanding/${item._id}`, {
        method:  "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${TOKEN()}`,
        },
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast("Changes saved successfully.");
      onUpdated(data.data);
    } catch (e) {
      showToast(e.message || "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Full Name",       value: item.full_name,       icon: <User size={11} />,         full: false },
    { label: "Clinic",          value: item.clinic_name,     icon: <Building2 size={11} />,    full: false },
    { label: "Mobile",          value: item.mobile,          icon: <Phone size={11} />,         full: false },
    { label: "City",            value: item.city,            icon: <MapPin size={11} />,        full: false },
    { label: "Specialization",  value: item.specialization,  icon: <Stethoscope size={11} />,  full: false },
    { label: "Email",           value: item.email || "—",    icon: <Mail size={11} />,          full: false },
    { label: "Preferred Time",  value: item.preferred_time,  icon: <Clock size={11} />,         full: false },
    { label: "Source",          value: item.source || "website", icon: <Globe size={11} />,    full: false },
    { label: "Submitted At",    value: fmt(item.createdAt),  icon: <Calendar size={11} />,      full: true  },
  ];

  return (
    <div className="drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer">

        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-icon">
              <ClipboardList size={18} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div className="drawer-title">Enquiry Detail</div>
              <div className="drawer-id">#{item._id?.slice(-8).toUpperCase()}</div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">

          {/* Doctor Info */}
          <div>
            <div className="section-label">
              <User size={11} /> Doctor Info
            </div>
            <div className="info-grid">
              {fields.map(({ label, value, icon, full }) => (
                <div key={label} className={`info-cell${full ? " full" : ""}`}>
                  <div className="info-cell-label">{icon} {label}</div>
                  <div className="info-cell-value">{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <div className="section-label">
              <TrendingUp size={11} /> Update Status
            </div>
            <div className="status-grid">
              {Object.entries(STATUS_META).map(([key, { label, color, bg, border, Icon: SIcon }]) => {
                const active = status === key;
                return (
                  <button
                    key={key}
                    className={`status-chip${active ? " active" : ""}`}
                    style={active ? { background: bg, border: `1.5px solid ${border}`, color } : {}}
                    onClick={() => setStatus(key)}
                  >
                    <SIcon size={12} strokeWidth={2.5} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="section-label">
              <ClipboardList size={11} /> Notes & Feedback
            </div>
            <textarea
              className="notes-textarea"
              placeholder="Call summary, demo notes, follow-up reminders…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Save */}
          <button className="save-btn" onClick={handleSave} disabled={saving}>
            <Save size={15} strokeWidth={2.5} />
            {saving ? "Saving…" : "Save Changes"}
          </button>

        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export default function DemoRequestsPage() {
  const [rows,         setRows]         = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [spinning,     setSpinning]     = useState(false);
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [total,        setTotal]        = useState(0);
  const [selected,     setSelected]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const LIMIT = 15;

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchStats = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/formlanding/stats`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error(e); }
  };

  const fetchRows = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pg, limit: LIMIT,
        ...(search       && { search }),
        ...(statusFilter && { status: statusFilter }),
      });
      const res  = await fetch(`${API_BASE}/api/formlanding?${params}`, {
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      const data = await res.json();
      if (data.success) {
        setRows(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
        setPage(pg);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchRows(1), 350);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  useEffect(() => { fetchStats(); }, []);

  const handleRefresh = async () => {
    setSpinning(true);
    await Promise.all([fetchRows(1), fetchStats()]);
    setTimeout(() => setSpinning(false), 600);
  };

  const handleUpdated = (updated) => {
    setRows((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    setSelected(updated);
    fetchStats();
    showToast("Enquiry updated successfully.");
  };

  const STAT_ORDER = [
    { key: "total",          label: "Total",     color: "#0B2550", bg: "#eef2ff", border: "#c7d7fd", Icon: Inbox },
    { key: "new",            ...STATUS_META.new,            Icon: STATUS_META.new.Icon            },
    { key: "contacted",      ...STATUS_META.contacted,      Icon: STATUS_META.contacted.Icon      },
    { key: "demo_scheduled", ...STATUS_META.demo_scheduled, label: "Scheduled", Icon: STATUS_META.demo_scheduled.Icon },
    { key: "converted",      ...STATUS_META.converted,      Icon: STATUS_META.converted.Icon      },
  ];

  const pageNums = (() => {
    const total = Math.min(totalPages, 7);
    return Array.from({ length: total }, (_, i) => i + 1);
  })();

  return (
    <>
      <style>{css}</style>
      <div className="demo-page">

        {/* Header */}
        <div className="page-header">
          <div className="page-icon">
            <ClipboardList size={22} color="#fff" strokeWidth={2} />
          </div>
          <div>
            <div className="page-title">Demo Enquiries</div>
            <div className="page-sub">Track and manage all incoming demo requests — update status and add notes.</div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-row">
            {STAT_ORDER.map(({ key, label, color, bg, border, Icon: SIcon }) => {
              const isActive = key === "total" ? statusFilter === "" : statusFilter === key;
              return (
                <div
                  key={key}
                  className={`stat-card${isActive ? " active" : ""}`}
                  style={{
                    borderColor: isActive ? border : undefined,
                  }}
                  onClick={() => setStatusFilter(key === "total" ? "" : (statusFilter === key ? "" : key))}
                >
                  <span style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                    borderRadius: "3px 0 0 3px", background: color,
                  }} />
                  <div className="stat-icon-wrap" style={{ background: bg }}>
                    <SIcon size={18} color={color} strokeWidth={2} />
                  </div>
                  <div className="stat-info">
                    <div className="stat-count" style={{ color }}>{stats[key] ?? 0}</div>
                    <div className="stat-label">{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search by name, clinic, mobile, city, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-select-wrap">
            <SlidersHorizontal size={13} className="filter-icon" />
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, { label }]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <button className="refresh-btn" onClick={handleRefresh}>
            <RefreshCw size={14} className={spinning ? "spin" : ""} />
            Refresh
          </button>
          <div className="count-badge">
            {total} enquir{total === 1 ? "y" : "ies"}
          </div>
        </div>

        {/* Table */}
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th><div className="th-inner"><Hash size={10} /> #</div></th>
                <th><div className="th-inner"><User size={10} /> Name & Clinic</div></th>
                <th><div className="th-inner"><Phone size={10} /> Mobile</div></th>
                <th><div className="th-inner"><MapPin size={10} /> City</div></th>
                <th><div className="th-inner"><Stethoscope size={10} /> Specialization</div></th>
                <th><div className="th-inner"><Clock size={10} /> Preferred Time</div></th>
                <th><div className="th-inner"><Circle size={10} /> Status</div></th>
                <th><div className="th-inner"><Calendar size={10} /> Submitted</div></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="cell-center">
                    <div className="loading-row">
                      <div className="spinner" />
                      Loading enquiries…
                    </div>
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="cell-center">
                    <div className="empty-icon">📭</div>
                    <div>No enquiries found. Try adjusting your search or filter.</div>
                  </td>
                </tr>
              )}
              {!loading && rows.map((r, i) => {
                const meta = STATUS_META[r.status];
                const SIcon = meta?.Icon;
                return (
                  <tr key={r._id} onClick={() => setSelected(r)}>
                    <td><span className="cell-idx">{(page - 1) * LIMIT + i + 1}</span></td>
                    <td>
                      <div className="cell-name">{r.full_name}</div>
                      <div className="cell-clinic">
                        <Building2 size={11} /> {r.clinic_name}
                      </div>
                    </td>
                    <td>
                      <div className="cell-icon-row">
                        <Phone size={12} color="#94a3b8" /> {r.mobile}
                      </div>
                    </td>
                    <td>
                      <div className="cell-icon-row">
                        <MapPin size={12} color="#94a3b8" /> {r.city}
                      </div>
                    </td>
                    <td>
                      <div className="cell-icon-row">
                        <Stethoscope size={12} color="#94a3b8" /> {r.specialization}
                      </div>
                    </td>
                    <td>
                      <div className="cell-icon-row">
                        <Clock size={12} color="#94a3b8" />
                        {r.preferred_time?.split(" ")[0]}
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-pill"
                        style={{
                          background: meta?.bg,
                          borderColor: meta?.border,
                          color: meta?.color,
                        }}
                      >
                        {SIcon && <SIcon size={11} strokeWidth={2.5} />}
                        {meta?.label || r.status}
                      </span>
                    </td>
                    <td className="cell-muted">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit", month: "short", year: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span>Page {page} of {totalPages}</span>
              <div className="page-btns">
                <button
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => fetchRows(page - 1)}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                {pageNums.map((pg) => (
                  <button
                    key={pg}
                    className={`page-btn${pg === page ? " active" : ""}`}
                    onClick={() => fetchRows(pg)}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  className="page-btn"
                  disabled={page >= totalPages}
                  onClick={() => fetchRows(page + 1)}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer */}
        {selected && (
          <Drawer
            item={selected}
            onClose={() => setSelected(null)}
            onUpdated={handleUpdated}
          />
        )}

        {/* Toast */}
        {toast && <Toast msg={toast.msg} type={toast.type} onHide={() => setToast(null)} />}

      </div>
    </>
  );
}