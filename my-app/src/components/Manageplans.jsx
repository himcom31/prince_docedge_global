import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const EMPTY_FORM = {
  name: "",
  description: "",
  features: "",
  monthlyPrice: "",
  yearlyPrice: "",
  doctorLimit: 1,
  patientLimit: "",
  isFeatured: false,
  badge: "",
  ctaLabel: "",
  isCustomPricing: false,
  displayOrder: 0,
};

export default function ManagePlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/plans/all");
      setPlans(data.plans || []);
    } catch (err) {
      showToast(
        "Plans could not be loaded: " + (err.response?.data?.message || err.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .plan-row:hover { background: #f0f7ff !important; }
      .action-btn:hover { opacity: 0.82; transform: scale(1.06); }
      .modal-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); outline: none; }
      .toggle-switch { position:relative; display:inline-block; width:40px; height:22px; }
      .toggle-switch input { opacity:0; width:0; height:0; }
      .toggle-slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:#d1d5db; border-radius:22px; transition:.3s; }
      .toggle-slider:before { position:absolute; content:""; height:16px; width:16px; left:3px; bottom:3px; background:white; border-radius:50%; transition:.3s; }
      input:checked + .toggle-slider { background:#2563eb; }
      input:checked + .toggle-slider:before { transform:translateX(18px); }
      .section-divider { border: none; border-top: 1px solid #f1f5f9; margin: 4px 0 12px; }
    `;
    document.head.appendChild(styleEl);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const openAddForm = () => {
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (plan) => {
    setEditPlan(plan);
    setForm({
      name: plan.name || "",
      description: plan.description || "",
      features: (plan.features || []).join(", "),
      monthlyPrice: plan.monthlyPrice || "",
      yearlyPrice: plan.yearlyPrice || "",
      doctorLimit: plan.doctorLimit || 1,
      patientLimit: plan.patientLimit || "",
      isFeatured: plan.isFeatured || false,
      badge: plan.badge || "",
      ctaLabel: plan.ctaLabel || "",
      isCustomPricing: plan.isCustomPricing || false,
      displayOrder: plan.displayOrder || 0,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditPlan(null);
    setForm(EMPTY_FORM);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return showToast("Plan name is required", "error");
    if (!form.monthlyPrice && !form.yearlyPrice && !form.isCustomPricing)
      return showToast("Enter at least one price, or enable Custom Pricing", "error");

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      features: form.features
        ? form.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [],
      monthlyPrice: form.monthlyPrice ? Number(form.monthlyPrice) : null,
      yearlyPrice: form.yearlyPrice ? Number(form.yearlyPrice) : null,
      doctorLimit: Number(form.doctorLimit) || 1,
      patientLimit: form.patientLimit ? Number(form.patientLimit) : null,
      isFeatured: form.isFeatured,
      badge: form.badge.trim() || null,
      ctaLabel: form.ctaLabel.trim() || undefined,
      isCustomPricing: form.isCustomPricing,
      displayOrder: Number(form.displayOrder) || 0,
    };

    try {
      setSubmitting(true);
      if (editPlan) {
        await api.put(`/api/plans/${editPlan._id}`, payload);
        showToast("Plan updated successfully ✅");
      } else {
        await api.post("/api/plans", payload);
        showToast("New plan added successfully ✅");
      }
      closeForm();
      fetchPlans();
    } catch (err) {
      showToast(err.response?.data?.message || "Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePlan = async (plan) => {
    try {
      await api.put(`/api/plans/${plan._id}`, { isActive: !plan.isActive });
      showToast(plan.isActive ? "Plan deactivated" : "Plan activated ✅");
      fetchPlans();
    } catch {
      showToast("Could not change status", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/api/plans/${deleteConfirm}`);
      showToast("Plan deleted successfully");
      setDeleteConfirm(null);
      fetchPlans();
    } catch {
      showToast("Could not delete plan", "error");
    }
  };

  const fmt = (n) => (n ? `₹${Number(n).toLocaleString("en-IN")}` : "—");

  return (
    <div style={S.page}>
      {/* ── Toast ── */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type === "error" ? "#dc2626" : "#16a34a" }}>
          <span style={{ fontSize: 16 }}>{toast.type === "error" ? "⚠️" : "✅"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Subscription Plans</h1>
          <p style={S.subtitle}>Manage subscription plans for clinics</p>
        </div>
        <button style={S.addBtn} onClick={openAddForm}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Plan
        </button>
      </div>

      {/* ── Stats ── */}
      <div style={S.statsRow}>
        <StatCard label="Total Plans" value={plans.length} color="#3b82f6" icon="📋" />
        <StatCard label="Active" value={plans.filter((p) => p.isActive).length} color="#22c55e" icon="✅" />
        <StatCard label="Inactive" value={plans.filter((p) => !p.isActive).length} color="#f59e0b" icon="⏸" />
        <StatCard label="Featured" value={plans.filter((p) => p.isFeatured).length} color="#8b5cf6" icon="⭐" />
      </div>

      {/* ── Table Card ── */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>All Plans</span>
          <span style={{ fontSize: 13, color: "#94a3b8" }}>{plans.length} total</span>
        </div>

        {loading ? (
          <div style={S.center}>
            <div style={S.spinner} />
            <p style={{ color: "#94a3b8", marginTop: 14, fontSize: 14 }}>Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "#1e293b" }}>No plans found</p>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 20 }}>Add your first plan to get started</p>
            <button style={S.addBtn} onClick={openAddForm}>+ Add Plan</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr style={S.thead}>
                  {["Plan", "Pricing", "Limits", "Featured", "Features", "Status", "Actions"].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, i) => (
                  <tr
                    key={plan._id}
                    className="plan-row"
                    style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", transition: "background 0.15s" }}
                  >
                    {/* Plan name + desc */}
                    <td style={S.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 9,
                            background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 16,
                            flexShrink: 0,
                          }}
                        >
                          {plan.name?.[0]?.toUpperCase() || "P"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{plan.name}</div>
                          {plan.description && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2, maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {plan.description}
                            </div>
                          )}
                          {plan.displayOrder !== undefined && (
                            <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 1 }}>Order #{plan.displayOrder}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Pricing */}
                    <td style={S.td}>
                      {plan.isCustomPricing ? (
                        <span style={S.customBadge}>Custom</span>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {plan.monthlyPrice && (
                            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                              <span style={S.priceAmt}>{fmt(plan.monthlyPrice)}</span>
                              <span style={S.perLabel}>/mo</span>
                            </div>
                          )}
                          {plan.yearlyPrice && (
                            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                              <span style={{ ...S.priceAmt, color: "#7c3aed", fontSize: 13 }}>{fmt(plan.yearlyPrice)}</span>
                              <span style={S.perLabel}>/yr</span>
                            </div>
                          )}
                          {!plan.monthlyPrice && !plan.yearlyPrice && <span style={{ color: "#d1d5db" }}>—</span>}
                        </div>
                      )}
                    </td>

                    {/* Limits */}
                    <td style={S.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={S.limitIcon}>👨‍⚕️</span>
                          <span style={S.limitText}>{plan.doctorLimit} doctors</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={S.limitIcon}>🧑</span>
                          <span style={S.limitText}>
                            {plan.patientLimit ? `${plan.patientLimit} patients` : "Unlimited patients"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Featured */}
                    <td style={{ ...S.td, textAlign: "center" }}>
                      {plan.isFeatured ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <span style={S.featuredBadge}>⭐ Featured</span>
                          {plan.badge && <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>{plan.badge}</span>}
                        </div>
                      ) : (
                        <span style={{ color: "#e2e8f0", fontSize: 18 }}>—</span>
                      )}
                    </td>

                    {/* Features */}
                    <td style={S.td}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 200 }}>
                        {(plan.features || []).slice(0, 3).map((f, idx) => (
                          <span key={idx} style={S.featureTag}>{f}</span>
                        ))}
                        {(plan.features || []).length > 3 && (
                          <span style={S.moreTag}>+{plan.features.length - 3}</span>
                        )}
                        {(!plan.features || plan.features.length === 0) && (
                          <span style={{ color: "#d1d5db", fontSize: 13 }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={S.td}>
                      <span style={plan.isActive ? S.activePill : S.inactivePill}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: plan.isActive ? "#16a34a" : "#dc2626", display: "inline-block" }} />
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <ActionBtn
                          title="Edit"
                          icon="✏️"
                          bg="#eff6ff"
                          onClick={() => openEditForm(plan)}
                        />
                        <ActionBtn
                          title={plan.isActive ? "Deactivate" : "Activate"}
                          icon={plan.isActive ? "⏸" : "▶️"}
                          bg={plan.isActive ? "#fef3c7" : "#dcfce7"}
                          onClick={() => togglePlan(plan)}
                        />
                        <ActionBtn
                          title="Delete"
                          icon="🗑️"
                          bg="#fee2e2"
                          onClick={() => setDeleteConfirm(plan._id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showForm && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && closeForm()}>
          <div style={S.modal}>
            {/* Modal Header */}
            <div style={S.modalHeader}>
              <div>
                <h2 style={S.modalTitle}>
                  {editPlan ? "✏️ Edit Plan" : "➕ Add New Plan"}
                </h2>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                  {editPlan ? `Editing: ${editPlan.name}` : "Fill in the subscription plan details"}
                </p>
              </div>
              <button style={S.closeBtn} onClick={closeForm}>✕</button>
            </div>

            <div style={S.modalBody}>

              {/* ── Section: Basic Info ── */}
              <SectionLabel label="Basic Information" />
              <div style={S.twoCol}>
                <Field label="Plan Name *">
                  <input
                    className="modal-input"
                    style={S.input}
                    name="name"
                    placeholder="e.g. Basic, Pro, Enterprise"
                    value={form.name}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Display Order">
                  <input
                    className="modal-input"
                    style={S.input}
                    name="displayOrder"
                    type="number"
                    placeholder="e.g. 1 (lower = shown first)"
                    value={form.displayOrder}
                    onChange={handleChange}
                  />
                </Field>
              </div>

              <Field label="Description">
                <input
                  className="modal-input"
                  style={S.input}
                  name="description"
                  placeholder="Short tagline for this plan"
                  value={form.description}
                  onChange={handleChange}
                />
              </Field>

              {/* ── Section: Pricing ── */}
              <SectionLabel label="Pricing" />
              <div style={S.twoCol}>
                <Field label="Monthly Price (₹)">
                  <div style={S.inputWrapper}>
                    <span style={S.inputPrefix}>₹</span>
                    <input
                      className="modal-input"
                      style={{ ...S.input, paddingLeft: 30 }}
                      name="monthlyPrice"
                      type="number"
                      placeholder="999"
                      value={form.monthlyPrice}
                      onChange={handleChange}
                      disabled={form.isCustomPricing}
                    />
                  </div>
                </Field>
                <Field label="Yearly Price (₹)">
                  <div style={S.inputWrapper}>
                    <span style={S.inputPrefix}>₹</span>
                    <input
                      className="modal-input"
                      style={{ ...S.input, paddingLeft: 30 }}
                      name="yearlyPrice"
                      type="number"
                      placeholder="9999"
                      value={form.yearlyPrice}
                      onChange={handleChange}
                      disabled={form.isCustomPricing}
                    />
                  </div>
                </Field>
              </div>

              <ToggleRow
                name="isCustomPricing"
                checked={form.isCustomPricing}
                onChange={handleChange}
                label="Custom / Enterprise Pricing"
                hint="Price fields will be disabled; CTA will default to "Talk to Sales/>

              {/* ── Section: Limits ── */}
              <SectionLabel label="Usage Limits" />
              <div style={S.twoCol}>
                <Field label="Doctor Limit">
                  <input
                    className="modal-input"
                    style={S.input}
                    name="doctorLimit"
                    type="number"
                    placeholder="e.g. 5"
                    value={form.doctorLimit}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Patient Limit (blank = unlimited)">
                  <input
                    className="modal-input"
                    style={S.input}
                    name="patientLimit"
                    type="number"
                    placeholder="Leave blank for unlimited"
                    value={form.patientLimit}
                    onChange={handleChange}
                  />
                </Field>
              </div>

              {/* ── Section: Features ── */}
              <SectionLabel label="Features" />
              <Field label="Features (comma separated)">
                <textarea
                  className="modal-input"
                  style={{ ...S.input, height: 88, resize: "vertical" }}
                  name="features"
                  placeholder="PDF Reports, WhatsApp Alerts, Multi Doctor, Unlimited Patients"
                  value={form.features}
                  onChange={handleChange}
                />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  Enter each feature separated by a comma
                </span>
              </Field>

              {form.features && (
                <div style={S.featurePreview}>
                  <span style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginRight: 4 }}>Preview:</span>
                  {form.features.split(",").map(
                    (f, i) => f.trim() && <span key={i} style={S.featureTag}>{f.trim()}</span>
                  )}
                </div>
              )}

              {/* ── Section: Display & CTA ── */}
              <SectionLabel label="Display & CTA" />
              <ToggleRow
                name="isFeatured"
                checked={form.isFeatured}
                onChange={handleChange}
                label="Featured Plan"
                hint="Highlighted on the landing page as a featured card"
              />

              <div style={S.twoCol}>
                <Field label="Badge Text">
                  <input
                    className="modal-input"
                    style={S.input}
                    name="badge"
                    placeholder="e.g. Most Popular"
                    value={form.badge}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="CTA Button Text">
                  <input
                    className="modal-input"
                    style={S.input}
                    name="ctaLabel"
                    placeholder="e.g. Start Free Trial"
                    value={form.ctaLabel}
                    onChange={handleChange}
                  />
                </Field>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={closeForm} disabled={submitting}>
                Cancel
              </button>
              <button style={S.saveBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting
                  ? editPlan ? "Updating..." : "Adding..."
                  : editPlan ? "Update Plan" : "Add Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div style={S.overlay}>
          <div style={{ ...S.modal, maxWidth: 420 }}>
            <div style={{ ...S.modalHeader, borderBottom: "1px solid #fee2e2" }}>
              <div>
                <h2 style={{ ...S.modalTitle, color: "#dc2626" }}>Delete Plan?</h2>
                <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>This action cannot be undone</p>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ background: "#fff7f7", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 16px", fontSize: 14, color: "#7f1d1d" }}>
                ⚠️ This plan will be permanently deleted. Are you sure?
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ ...S.saveBtn, background: "#dc2626" }} onClick={confirmDelete}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────

function StatCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      padding: "18px 20px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${color}`,
      display: "flex",
      alignItems: "center",
      gap: 14,
    }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</label>}
      {children}
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div style={{ marginTop: 4, marginBottom: -4 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
        {label}
      </div>
      <hr className="section-divider" />
    </div>
  );
}

function ToggleRow({ name, checked, onChange, label, hint }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "12px 16px",
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{hint}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

function ActionBtn({ title, icon, bg, onClick }) {
  return (
    <button
      className="action-btn"
      title={title}
      onClick={onClick}
      style={{
        border: "none",
        background: bg,
        borderRadius: 8,
        padding: "7px 9px",
        cursor: "pointer",
        fontSize: 15,
        transition: "opacity 0.15s, transform 0.15s",
      }}
    >
      {icon}
    </button>
  );
}

// ── Styles ────────────────────────────────────────────────
const S = {
  page: {
    padding: "28px 24px",
    background: "#f1f5f9",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: "relative",
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    color: "#fff",
    padding: "12px 20px",
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 14,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    animation: "slideIn 0.25s ease",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 },
  subtitle: { fontSize: 13, color: "#94a3b8", margin: "4px 0 0" },
  addBtn: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
    overflow: "hidden",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 20px",
    borderBottom: "1px solid #f1f5f9",
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 56,
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e2e8f0",
    borderTop: "3px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 64,
    gap: 6,
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thead: { background: "#f8fafc" },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 16px",
    color: "#334155",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "middle",
  },
  priceAmt: { fontWeight: 800, color: "#2563eb", fontSize: 14 },
  perLabel: { fontSize: 11, color: "#94a3b8" },
  customBadge: {
    background: "#f3e8ff",
    color: "#7c3aed",
    borderRadius: 6,
    padding: "3px 10px",
    fontSize: 12,
    fontWeight: 700,
  },
  limitIcon: { fontSize: 13 },
  limitText: { fontSize: 12, color: "#475569", fontWeight: 500 },
  featuredBadge: {
    background: "#ede9fe",
    color: "#7c3aed",
    borderRadius: 20,
    padding: "3px 10px",
    fontSize: 11,
    fontWeight: 700,
  },
  featureTag: {
    background: "#f0fdf4",
    color: "#166534",
    borderRadius: 5,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
    border: "1px solid #bbf7d0",
  },
  moreTag: {
    background: "#f1f5f9",
    color: "#64748b",
    borderRadius: 5,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  activePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#dcfce7",
    color: "#15803d",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  inactivePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  // Modal
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
    animation: "fadeIn 0.2s ease",
    backdropFilter: "blur(2px)",
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 580,
    maxHeight: "92vh",
    overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.2)",
    animation: "slideIn 0.25s ease",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "20px 24px",
    borderBottom: "1px solid #f1f5f9",
  },
  modalTitle: { fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 },
  closeBtn: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    cursor: "pointer",
    color: "#64748b",
    padding: "6px 10px",
    marginTop: 2,
  },
  modalBody: {
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  twoCol: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  inputWrapper: { position: "relative" },
  inputPrefix: {
    position: "absolute",
    left: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: 700,
    pointerEvents: "none",
  },
  input: {
    border: "1.5px solid #e2e8f0",
    borderRadius: 9,
    padding: "10px 12px",
    fontSize: 13,
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    background: "#fafafa",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  featurePreview: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    padding: "10px 14px",
    background: "#f8fafc",
    borderRadius: 9,
    border: "1px dashed #e2e8f0",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "16px 24px",
    borderTop: "1px solid #f1f5f9",
  },
  cancelBtn: {
    border: "1.5px solid #e2e8f0",
    background: "#fff",
    borderRadius: 9,
    padding: "10px 20px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: "#475569",
  },
  saveBtn: {
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "10px 24px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
  },
};