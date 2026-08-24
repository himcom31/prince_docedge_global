import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Upload, X, ImageIcon, Loader2, AlertTriangle,
  CheckCircle2, Tag, Grid3X3,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;


// ── Inline styles (ya apni existing CSS system me merge karo) ─────────────────
const S = {
  page: {
    padding: "28px 32px",
    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    maxWidth: 1100,
    margin: "0 auto",
  },
  header: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between", marginBottom: 28,
  },
  title: { fontSize: 22, fontWeight: 800, color: "#1a1d2e", margin: 0 },
  subtitle: { fontSize: 13, color: "#9ca3af", marginTop: 4 },

  addBtn: {
    display: "flex", alignItems: "center", gap: 8,
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 12,
    padding: "10px 18px", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
    transition: "transform 0.15s",
  },

  toast: (type) => ({
    position: "fixed", top: 20, right: 20, zIndex: 9999,
    background: type === "success" ? "#f0fdf4" : "#fff5f5",
    border: `1px solid ${type === "success" ? "#bbf7d0" : "#fecaca"}`,
    color: type === "success" ? "#16a34a" : "#dc2626",
    borderRadius: 12, padding: "12px 18px",
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, fontWeight: 600,
    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
    animation: "fadeSlideUp 0.3s ease both",
  }),

  categorySection: { marginBottom: 36 },
  categoryTitle: {
    fontSize: 13, fontWeight: 800, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "#6366f1",
    display: "flex", alignItems: "center", gap: 6,
    marginBottom: 14, paddingBottom: 10,
    borderBottom: "1px solid #e4e7f0",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
  },

  card: (isActive) => ({
    border: `1.5px solid ${isActive ? "#e4e7f0" : "#f3f4f6"}`,
    borderRadius: 14, overflow: "hidden", background: "#fff",
    opacity: isActive ? 1 : 0.55,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    transition: "box-shadow 0.2s",
  }),

  cardImg: {
    width: "100%", height: 140, objectFit: "contain",
    background: "#f8f9fc", display: "block",
    borderBottom: "1px solid #e4e7f0",
  },

  cardBody: { padding: "12px 14px" },
  cardName: { fontSize: 13, fontWeight: 700, color: "#1a1d2e", marginBottom: 4 },
  cardMeta: { fontSize: 11, color: "#9ca3af" },

  cardActions: {
    display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap",
  },

  iconBtn: (color) => ({
    display: "flex", alignItems: "center", gap: 4,
    background: `${color}12`,
    border: `1px solid ${color}30`,
    color, borderRadius: 8,
    padding: "5px 10px", fontSize: 12, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    transition: "background 0.15s",
  }),

  // ── Modal ──
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    zIndex: 1000, display: "flex", alignItems: "center",
    justifyContent: "center", padding: 20,
  },

  modal: {
    background: "#fff", borderRadius: 20,
    maxWidth: 500, width: "100%",
    padding: 28, boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
    animation: "fadeSlideUp 0.35s ease both",
  },

  modalTitle: {
    fontSize: 18, fontWeight: 800, color: "#1a1d2e",
    marginBottom: 20,
  },

  label: {
    fontSize: 11.5, fontWeight: 700, color: "#8b8fa8",
    letterSpacing: "0.07em", textTransform: "uppercase",
    display: "block", marginBottom: 6,
  },

  input: {
    width: "100%", boxSizing: "border-box",
    background: "#f8f9fc", border: "1.5px solid #e4e7f0",
    borderRadius: 10, padding: "10px 14px",
    fontSize: 14, color: "#1a1d2e", fontFamily: "inherit",
    outline: "none", marginBottom: 16,
    transition: "border-color 0.2s",
  },

  uploadArea: (hasPrev) => ({
    border: `2px dashed ${hasPrev ? "#6366f1" : "#e4e7f0"}`,
    borderRadius: 12, padding: 20, textAlign: "center",
    cursor: "pointer", background: "#f8f9fc",
    transition: "all 0.2s", marginBottom: 20,
  }),

  submitBtn: {
    width: "100%",
    background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 12,
    padding: "12px", fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit",
    display: "flex", alignItems: "center",
    justifyContent: "center", gap: 8,
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null); // { type, msg }
  const [modal, setModal]         = useState(null); // null | "add" | template_obj

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/api/templates/admin`);
      if (data.success) setTemplates(data.templates);
    } catch {
      showToast("error", "Templates could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  // ── Group by category ──
  const grouped = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const handleToggle = async (id) => {
    try {
      await axios.patch(`${API_BASE}/api/templates/admin/${id}/toggle`);
      setTemplates(prev =>
        prev.map(t => t._id === id ? { ...t, isActive: !t.isActive } : t)
      );
    } catch {
      showToast("error", "Toggle failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Do you want to delete this template?")) return;
    try {
      await axios.delete(`${API_BASE}/api/templates/admin/${id}`);
      setTemplates(prev => prev.filter(t => t._id !== id));
      showToast("success", "Template deleted successfully");
    } catch {
      showToast("error", "Delete failed");
    }
  };

  const handleSaved = (newOrUpdated) => {
    setTemplates(prev => {
      const exists = prev.find(t => t._id === newOrUpdated._id);
      if (exists) return prev.map(t => t._id === newOrUpdated._id ? newOrUpdated : t);
      return [newOrUpdated, ...prev];
    });
    setModal(null);
    showToast("success", modal === "add" ? "Template added successfully!" : "Template updated successfully!");
  };

  return (
    <div style={S.page}>
      {/* Toast */}
      {toast && (
        <div style={S.toast(toast.type)}>
          {toast.type === "success"
            ? <CheckCircle2 size={15} />
            : <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Letterhead & Prescription Templates</h1>
          <p style={S.subtitle}>
            Add or edit templates here — they will appear on the signup form
          </p>
        </div>
        <button style={S.addBtn} onClick={() => setModal("add")}>
          <Plus size={16} /> Add Template
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <Loader2 size={28} style={{ animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 12 }}>Loading templates...</p>
        </div>
      )}

      {/* Grouped list */}
      {!loading && Object.keys(grouped).map(category => (
        <div key={category} style={S.categorySection}>
          <div style={S.categoryTitle}>
            <Tag size={13} />
            {category}
            <span style={{
              background: "#ede9fe", color: "#7c3aed",
              borderRadius: 20, padding: "1px 9px",
              fontSize: 11, fontWeight: 700, marginLeft: 4,
            }}>
              {grouped[category].length}
            </span>
          </div>

          <div style={S.grid}>
            {grouped[category].map(t => (
              <div key={t._id} style={S.card(t.isActive)}>
                <img src={t.imageUrl} alt={t.name} style={S.cardImg} />
                <div style={S.cardBody}>
                  <div style={S.cardName}>{t.name}</div>
                  <div style={S.cardMeta}>
                    {t.isActive ? "✅ Active" : "⛔ Inactive"} • Order: {t.sortOrder}
                  </div>
                  <div style={S.cardActions}>
                    <button style={S.iconBtn("#6366f1")} onClick={() => setModal(t)}>
                      <Pencil size={11} /> Edit
                    </button>
                    <button style={S.iconBtn(t.isActive ? "#f59e0b" : "#16a34a")}
                      onClick={() => handleToggle(t._id)}>
                      {t.isActive
                        ? <><ToggleRight size={11} /> Hide</>
                        : <><ToggleLeft  size={11} /> Show</>}
                    </button>
                    <button style={S.iconBtn("#ef4444")} onClick={() => handleDelete(t._id)}>
                      <Trash2 size={11} /> Del
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {!loading && templates.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#9ca3af" }}>
          <Grid3X3 size={40} style={{ margin: "0 auto 14px", display: "block" }} />
          <p>No templates found. Start by adding a template.</p>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <TemplateModal
          existing={modal === "add" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ADD / EDIT MODAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TemplateModal({ existing, onClose, onSaved, showToast }) {
  const isEdit = Boolean(existing);
  const fileRef = useRef(null);

  const [form, setForm]       = useState({
    name: existing?.name || "",
    category: existing?.category || "",
    sortOrder: existing?.sortOrder ?? 0,
  });
  const [preview, setPreview]   = useState(existing?.imageUrl || null);
  const [file, setFile]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim() || !form.category.trim()) {
      return setError("Name and category are required");
    }
    if (!isEdit && !file) {
      return setError("Image is required");
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("name",      form.name);
      fd.append("category",  form.category);
      fd.append("sortOrder", form.sortOrder);
      if (file) fd.append("image", file);

      let res;
      if (isEdit) {
        res = await axios.put(
          `${API_BASE}/api/templates/admin/${existing._id}`, fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else {
        res = await axios.post(
          `${API_BASE}/api/templates/admin`, fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }
      if (res.data.success) onSaved(res.data.template);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ ...S.modalTitle, margin: 0 }}>
            {isEdit ? "Edit Template" : "Add New Template"}
          </h2>
          <button onClick={onClose} style={{
            background: "#f3f4f6", border: "none", borderRadius: 8,
            padding: 6, cursor: "pointer", display: "flex",
          }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {error && (
          <div style={{
            background: "#fff5f5", border: "1px solid #fecaca",
            color: "#dc2626", borderRadius: 10, padding: "10px 14px",
            fontSize: 13, fontWeight: 600, marginBottom: 16,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Name */}
        <label style={S.label}>Template Name *</label>
        <input
          style={S.input}
          placeholder="e.g. Blue Letterhead"
          value={form.name}
          onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        />

        {/* Category */}
        <label style={S.label}>Category *</label>
        <input
          style={S.input}
          placeholder="e.g. Prescription, Letterhead, Invoice"
          value={form.category}
          onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
          list="category-list"
        />
        <datalist id="category-list">
          <option value="Prescription" />
          <option value="Letterhead" />
          <option value="Invoice" />
          <option value="Discharge Summary" />
        </datalist>

        {/* Sort Order */}
        <label style={S.label}>Sort Order</label>
        <input
          style={{ ...S.input, width: 100 }}
          type="number"
          value={form.sortOrder}
          onChange={e => setForm(p => ({ ...p, sortOrder: e.target.value }))}
        />

        {/* Image Upload */}
        <label style={S.label}>Template Image * {isEdit && "(leave empty to keep current)"}</label>
        <div
          style={S.uploadArea(!!preview)}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current.click()}
        >
          {preview ? (
            <img src={preview} alt="preview"
              style={{ maxHeight: 140, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
          ) : (
            <>
              <Upload size={24} color="#9ca3af" style={{ margin: "0 auto 8px" }} />
              <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                Click or drag and drop an image here
              </p>
              <p style={{ color: "#c2c6d8", fontSize: 11, marginTop: 4 }}>
                PNG, JPG, WebP — max 5MB
              </p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*"
          style={{ display: "none" }} onChange={handleFile} />

        {/* Submit */}
        <button style={S.submitBtn} onClick={handleSubmit} disabled={saving}>
          {saving
            ? <><Loader2 size={16} style={{ animation: "spin 0.8s linear infinite" }} /> Saving...</>
            : <><CheckCircle2 size={16} /> {isEdit ? "Update " : "Add "}</>}
        </button>
      </div>
    </div>
  );
}