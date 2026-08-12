// admin/pages/AdminNotificationPlans.jsx
// SuperAdmin route: /admin/notification-plans
import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

const EMPTY_FORM = {
  name: '', description: '',
  whatsappLimit: 0, emailLimit: 0, smsLimit: 0,
  monthlyPrice: '', yearlyPrice: '',
  isActive: true, isFeatured: false,
  badge: '', displayOrder: 0,
};

export default function AdminNotificationPlans() {
  const token  = localStorage.getItem('adminToken');
  const authH  = { headers: { Authorization: `Bearer ${token}` } };

  const [plans,    setPlans]    = useState([]);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [editing,  setEditing]  = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/notification-plans/all`, authH);
      if (data.success) setPlans(data.plans);
    } catch {}
  };

  const openCreate = () => {
    setForm(EMPTY_FORM); setEditing(null); setMsg(''); setShowForm(true);
  };

  const openEdit = (p) => {
    setForm({
      name:          p.name,
      description:   p.description   || '',
      whatsappLimit: p.whatsappLimit  || 0,
      emailLimit:    p.emailLimit     || 0,
      smsLimit:      p.smsLimit       || 0,
      monthlyPrice:  p.monthlyPrice   ?? '',
      yearlyPrice:   p.yearlyPrice    ?? '',
      isActive:      p.isActive,
      isFeatured:    p.isFeatured,
      badge:         p.badge          || '',
      displayOrder:  p.displayOrder   || 0,
    });
    setEditing(p._id);
    setMsg('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg('Plan name required hai.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        monthlyPrice: form.monthlyPrice !== '' ? Number(form.monthlyPrice) : null,
        yearlyPrice:  form.yearlyPrice  !== '' ? Number(form.yearlyPrice)  : null,
        whatsappLimit: Number(form.whatsappLimit),
        emailLimit:    Number(form.emailLimit),
        smsLimit:      Number(form.smsLimit),
        displayOrder:  Number(form.displayOrder),
      };

      if (editing) {
        await axios.put(`${API_BASE}/api/notification-plans/${editing}`, payload, authH);
        setMsg('✅ Plan updated!');
      } else {
        await axios.post(`${API_BASE}/api/notification-plans`, payload, authH);
        setMsg('✅ Plan created!');
      }
      fetchPlans();
      setTimeout(() => { setShowForm(false); setMsg(''); }, 1200);
    } catch (err) {
      setMsg('❌ ' + (err?.response?.data?.message || 'Kuch gadbad ho gayi'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Is plan ko deactivate karna chahte ho?')) return;
    try {
      await axios.delete(`${API_BASE}/api/notification-plans/${id}`, authH);
      fetchPlans();
    } catch {}
  };

  // Controlled field helper
  const F = (key) => ({
    value:    form[key],
    onChange: (e) => setForm(p => ({
      ...p,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    })),
  });

  return (
    <div style={A.page}>
      <div style={A.inner}>

        {/* Header */}
        <div style={A.topRow}>
          <div>
            <h1 style={A.title}>Notification Plans</h1>
            <p style={A.sub}>Doctors ke liye WhatsApp / Email / SMS subscription plans manage karo</p>
          </div>
          <button style={A.addBtn} onClick={openCreate}>+ New Plan</button>
        </div>

        {/* Table */}
        <div style={A.tableWrap}>
          <table style={A.table}>
            <thead>
              <tr>
                {['Plan', 'WhatsApp', 'Email', 'SMS', 'Monthly', 'Yearly', 'Featured', 'Status', ''].map(h => (
                  <th key={h} style={A.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 14 }}>
                    Koi plan nahi hai. Upar se create karo.
                  </td>
                </tr>
              )}
              {plans.map(p => (
                <tr key={p._id} style={A.trow}>
                  <td style={A.td}>
                    <p style={{ fontWeight: 700, margin: 0, color: '#0f172a' }}>{p.name}</p>
                    {p.badge && <span style={A.badgeChip}>{p.badge}</span>}
                  </td>
                  <td style={A.td}>{p.whatsappLimit > 0 ? `${p.whatsappLimit}/mo` : '—'}</td>
                  <td style={A.td}>{p.emailLimit    > 0 ? `${p.emailLimit}/mo`    : '—'}</td>
                  <td style={A.td}>{p.smsLimit      > 0 ? `${p.smsLimit}/mo`      : '—'}</td>
                  <td style={A.td}>{p.monthlyPrice ? `₹${p.monthlyPrice}` : '—'}</td>
                  <td style={A.td}>{p.yearlyPrice  ? `₹${p.yearlyPrice}`  : '—'}</td>
                  <td style={A.td}>{p.isFeatured ? '⭐ Yes' : 'No'}</td>
                  <td style={A.td}>
                    <span style={{
                      ...A.statusChip,
                      background: p.isActive ? '#dcfce7' : '#fee2e2',
                      color:      p.isActive ? '#16a34a' : '#dc2626',
                    }}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...A.td, whiteSpace: 'nowrap' }}>
                    <button style={A.editBtn}   onClick={() => openEdit(p)}>Edit</button>
                    {p.isActive && (
                      <button style={A.deactBtn} onClick={() => handleDeactivate(p._id)}>Deactivate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div style={A.overlay} onClick={() => setShowForm(false)}>
            <div style={A.modal} onClick={e => e.stopPropagation()}>
              <h2 style={A.modalTitle}>{editing ? 'Plan Edit Karo' : 'Naya Notification Plan'}</h2>

              <div style={A.formGrid}>
                <FormField label="Plan Name *" span={2}>
                  <input style={A.input} placeholder="e.g. WhatsApp Starter" {...F('name')} />
                </FormField>

                <FormField label="Description" span={2}>
                  <input style={A.input} placeholder="Short description" {...F('description')} />
                </FormField>

                <FormField label="WhatsApp Limit /month">
                  <input style={A.input} type="number" min="0" placeholder="0 = not included" {...F('whatsappLimit')} />
                </FormField>
                <FormField label="Email Limit /month">
                  <input style={A.input} type="number" min="0" placeholder="0 = not included" {...F('emailLimit')} />
                </FormField>
                <FormField label="SMS Limit /month">
                  <input style={A.input} type="number" min="0" placeholder="0 = not included" {...F('smsLimit')} />
                </FormField>

                <FormField label="Monthly Price (₹)">
                  <input style={A.input} type="number" min="0" placeholder="Blank = nahi milega" {...F('monthlyPrice')} />
                </FormField>
                <FormField label="Yearly Price (₹)">
                  <input style={A.input} type="number" min="0" placeholder="Blank = nahi milega" {...F('yearlyPrice')} />
                </FormField>

                <FormField label='Badge (e.g. "Most Popular")'>
                  <input style={A.input} placeholder="Optional" {...F('badge')} />
                </FormField>
                <FormField label="Display Order">
                  <input style={A.input} type="number" min="0" {...F('displayOrder')} />
                </FormField>

                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 28, alignItems: 'center' }}>
                  <label style={A.checkLabel}>
                    <input type="checkbox" checked={form.isActive}   onChange={F('isActive').onChange} />
                    Active
                  </label>
                  <label style={A.checkLabel}>
                    <input type="checkbox" checked={form.isFeatured} onChange={F('isFeatured').onChange} />
                    Featured (highlighted card)
                  </label>
                </div>
              </div>

              {msg && (
                <p style={{
                  fontSize: 13, fontWeight: 700, margin: '14px 0 0',
                  color: msg.startsWith('✅') ? '#16a34a' : '#dc2626',
                }}>
                  {msg}
                </p>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button style={A.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={A.saveBtn}   onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function FormField({ label, span, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: span ? `1 / -1` : undefined }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const A = {
  page:  { minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter',sans-serif", padding: '32px 24px' },
  inner: { maxWidth: 1100, margin: '0 auto' },

  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title:  { fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 },
  sub:    { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  addBtn: {
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff',
    border: 'none', borderRadius: 10, padding: '11px 22px',
    fontWeight: 700, fontSize: 14, cursor: 'pointer',
  },

  tableWrap: { background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: {
    padding: '12px 16px', fontSize: 11, fontWeight: 800, color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: '#f8fafc', textAlign: 'left', borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  trow:      { borderBottom: '1px solid #f1f5f9' },
  td:        { padding: '14px 16px', fontSize: 13, color: '#334155', verticalAlign: 'middle' },
  badgeChip: {
    fontSize: 10, fontWeight: 700, background: '#ede9fe', color: '#7c3aed',
    padding: '2px 8px', borderRadius: 20, marginTop: 4, display: 'inline-block',
  },
  statusChip:{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  editBtn:   {
    fontSize: 12, fontWeight: 700, color: '#4f46e5', background: '#eef2ff',
    border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', marginRight: 6,
  },
  deactBtn:  {
    fontSize: 12, fontWeight: 700, color: '#dc2626', background: '#fff5f5',
    border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer',
  },

  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 50, padding: 16,
  },
  modal: {
    background: '#fff', borderRadius: 20, padding: '32px',
    width: '100%', maxWidth: 580,
    maxHeight: '90vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 24px' },
  formGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  input: {
    border: '1.5px solid #e2e8f0', borderRadius: 9,
    padding: '10px 14px', fontSize: 14, color: '#0f172a',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
    outline: 'none',
  },
  checkLabel: { fontSize: 13, fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  cancelBtn: {
    flex: 1, padding: '12px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: '#fff',
    color: '#475569', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  },
  saveBtn: {
    flex: 1, padding: '12px', borderRadius: 10,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  },
};