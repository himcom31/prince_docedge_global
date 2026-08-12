// pages/NotificationPlans.jsx
// Doctor dashboard route: /:slug/dashboard/notifications
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

const loadCashfree = () =>
  new Promise((resolve) => {
    if (window.Cashfree) return resolve();
    const script = document.createElement('script');
    script.src    = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });

const CHANNELS = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#22c55e', bg: '#f0fdf4' },
  email:    { label: 'Email',    icon: '📧', color: '#6366f1', bg: '#eef2ff' },
  sms:      { label: 'SMS',      icon: '📱', color: '#3b82f6', bg: '#eff6ff' },
};

export default function NotificationPlans() {
  const { slug }  = useParams();
  const token     = localStorage.getItem('doctorToken');
  const authH     = { headers: { Authorization: `Bearer ${token}` } };

  const [plans,        setPlans]        = useState([]);
  const [mySub,        setMySub]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [paying,       setPaying]       = useState(null);
  const [intervalSel,  setIntervalSel]  = useState({}); // planId → 'monthly'|'yearly'

  useEffect(() => {
    Promise.all([fetchPlans(), fetchMySub()]).finally(() => setLoading(false));
  }, []);

  const fetchPlans = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/notification-plans`);
      if (data.success) {
        setPlans(data.plans);
        const def = {};
        data.plans.forEach(p => { def[p._id] = 'monthly'; });
        setIntervalSel(def);
      }
    } catch {}
  };

  const fetchMySub = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/notification-plans/my-subscription`, authH);
      if (data.success) setMySub(data);
    } catch {}
  };

  const handleSubscribe = async (plan) => {
    setPaying(plan._id);
    try {
      const sel = intervalSel[plan._id] || 'monthly';
      const { data } = await axios.post(
        `${API_BASE}/api/notification-plans/subscribe`,
        { planId: plan._id, interval: sel },
        authH
      );

      if (!data.success || !data.paymentSessionId) {
        alert('Order could not be created. Please try again.');
        return;
      }

      await loadCashfree();
      const cf = window.Cashfree({ mode: import.meta.env.VITE_CF_MODE || 'sandbox' });
      cf.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' });

    } catch (err) {
      alert(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setPaying(null);
    }
  };

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.inner}>

        {/* ── Header ── */}
        <div style={S.header}>
          <div>
            <h1 style={S.title}>Notification Plans</h1>
            <p style={S.sub}>
              Send prescriptions &amp; invoices via WhatsApp, Email and SMS
            </p>
          </div>
        </div>

        {/* ── Active Subscription Banner ── */}
        {mySub?.hasSubscription && !mySub?.isExpired && (
          <div style={S.activeBanner}>
            <div style={S.activeBannerLeft}>
              <span style={S.activeChip}>✓ Active</span>
              <div>
                <p style={S.activePlanName}>{mySub.plan?.name}</p>
                <p style={S.activeExpiry}>
                  Expires:{' '}
                  {new Date(mySub.expiryDate).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                  {mySub.daysLeft !== null && ` · ${mySub.daysLeft} days left`}
                </p>
              </div>
            </div>

            {/* Usage bars */}
            <div style={S.usageRow}>
              {Object.entries(mySub.limits || {}).map(([ch, info]) => {
                if (!info.enabled) return null;
                const pct = info.limit > 0 ? Math.min(100, Math.round((info.used / info.limit) * 100)) : 0;
                const C   = CHANNELS[ch];
                return (
                  <div key={ch} style={S.usageItem}>
                    <span style={{ fontSize: 18 }}>{C.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={S.usageBar}>
                        <div style={{ ...S.usageFill, width: `${pct}%`, background: C.color }} />
                      </div>
                      <p style={S.usageLabel}>
                        {info.used}/{info.limit} {C.label}
                        {' '}· {info.remaining} left
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Expired Warning ── */}
        {mySub?.isExpired && (
          <div style={{ ...S.activeBanner, background: '#fff5f5', border: '1.5px solid #fecaca' }}>
            <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 14, margin: 0 }}>
             ⚠️ Your notification subscription has expired. Please renew below.
            </p>
          </div>
        )}

        {/* ── Plans Grid ── */}
        <div style={S.grid}>
          {plans.map(plan => {
            const sel        = intervalSel[plan._id] || 'monthly';
            const price      = sel === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
            const hasMonthly = plan.monthlyPrice > 0;
            const hasYearly  = plan.yearlyPrice  > 0;
            const isCurrent  = mySub?.hasSubscription && !mySub?.isExpired
                               && mySub?.plan?.name === plan.name;

            return (
              <div key={plan._id} style={{ ...S.card, ...(plan.isFeatured ? S.cardFeatured : {}) }}>
                {plan.badge && <div style={S.badge}>{plan.badge}</div>}

                <p style={S.planName}>{plan.name}</p>
                {plan.description && <p style={S.planDesc}>{plan.description}</p>}

                {/* Price */}
                <div style={S.priceRow}>
                  <span style={S.priceSym}>₹</span>
                  <span style={S.priceNum}>{price?.toLocaleString('en-IN') || '—'}</span>
                  <span style={S.pricePer}>/{sel === 'yearly' ? 'yr' : 'mo'}</span>
                </div>

                {/* Monthly / Yearly toggle */}
                {hasMonthly && hasYearly && (
                  <div style={S.toggle}>
                    {['monthly', 'yearly'].map(iv => (
                      <button
                        key={iv}
                        style={{ ...S.toggleBtn, ...(sel === iv ? S.toggleActive : {}) }}
                        onClick={() => setIntervalSel(p => ({ ...p, [plan._id]: iv }))}
                      >
                        {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Channel breakdown */}
                <div style={S.channels}>
                  {[
                    { key: 'whatsapp', limit: plan.whatsappLimit },
                    { key: 'email',    limit: plan.emailLimit    },
                    { key: 'sms',      limit: plan.smsLimit      },
                  ].map(({ key, limit }) => {
                    const C = CHANNELS[key];
                    return (
                      <div key={key} style={{ ...S.channelRow, opacity: limit > 0 ? 1 : 0.4 }}>
                        <span style={{ fontSize: 20 }}>{C.icon}</span>
                        <div style={{ flex: 1 }}>
                          <p style={S.chLabel}>{C.label}</p>
                          <p style={S.chLimit}>
                            {limit > 0 ? `${limit.toLocaleString('en-IN')} msg/month` : 'Not included'}
                          </p>
                        </div>
                        <span style={{
                          ...S.chChip,
                          background: limit > 0 ? C.bg    : '#f1f5f9',
                          color:      limit > 0 ? C.color : '#94a3b8',
                        }}>
                          {limit > 0 ? '✓' : '✗'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <div style={S.currentBadge}>✓ Current Plan</div>
                ) : (
                  <button
                    style={{ ...S.ctaBtn, ...(plan.isFeatured ? S.ctaBtnFilled : {}) }}
                    onClick={() => handleSubscribe(plan)}
                    disabled={paying === plan._id}
                  >
                    {paying === plan._id
                      ? 'Redirecting...'
                      : `Subscribe · ₹${price?.toLocaleString('en-IN') || '—'}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {plans.length === 0 && (
          <div style={S.empty}>
            <p style={{ fontSize: 36, margin: '0 0 10px' }}>📭</p>
            <p style={{ fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
              No plans available right now
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
              Please contact admin to enable notification plans.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' },
  spinner: {
    width: 40, height: 40,
    border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1',
    borderRadius: '50%', animation: 'spin 0.9s linear infinite',
  },
  page:  { minHeight: '100vh', background: '#f8f9fc', fontFamily: "'Inter','Segoe UI',sans-serif" },
  inner: { maxWidth: 1100, margin: '0 auto', padding: '36px 24px' },

  header: { marginBottom: 28 },
  title:  { fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 },
  sub:    { fontSize: 13, color: '#64748b', margin: '4px 0 0' },

  // Active banner
  activeBanner: {
    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
    borderRadius: 16, padding: '18px 22px', marginBottom: 28,
    display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
  },
  activeBannerLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  activeChip: {
    background: '#22c55e', color: '#fff', fontWeight: 800,
    fontSize: 11, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap',
  },
  activePlanName: { fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 },
  activeExpiry:   { fontSize: 12, color: '#16a34a', margin: '2px 0 0' },

  usageRow:  { display: 'flex', gap: 16, flex: 1, flexWrap: 'wrap' },
  usageItem: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 140, flex: 1 },
  usageBar:  { height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden', marginBottom: 3 },
  usageFill: { height: '100%', borderRadius: 99, transition: 'width 0.4s ease' },
  usageLabel:{ fontSize: 10, color: '#64748b', fontWeight: 600, margin: 0 },

  // Plans grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff', border: '1.5px solid #e8edf5',
    borderRadius: 20, padding: '28px 24px',
    display: 'flex', flexDirection: 'column', gap: 16,
    position: 'relative',
  },
  cardFeatured: {
    border: '2px solid #6366f1',
    boxShadow: '0 8px 32px rgba(99,102,241,0.12)',
  },
  badge: {
    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', fontSize: 11, fontWeight: 800,
    padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap',
  },
  planName: { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 },
  planDesc: { fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 },

  priceRow: { display: 'flex', alignItems: 'flex-end', gap: 2 },
  priceSym: { fontSize: 18, fontWeight: 700, color: '#64748b', marginBottom: 5 },
  priceNum: { fontSize: 40, fontWeight: 800, color: '#0f172a', lineHeight: 1 },
  pricePer: { fontSize: 13, color: '#94a3b8', marginBottom: 6 },

  toggle: { display: 'flex', gap: 8 },
  toggleBtn: {
    flex: 1, padding: '8px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: '#f8fafc',
    color: '#64748b', fontWeight: 700, fontSize: 12,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  toggleActive: {
    background: '#eef2ff', border: '1.5px solid #6366f1', color: '#4f46e5',
  },

  channels:   { display: 'flex', flexDirection: 'column', gap: 10 },
  channelRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #f1f5f9',
  },
  chLabel: { fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 },
  chLimit: { fontSize: 11, color: '#64748b', margin: '2px 0 0' },
  chChip: {
    marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeigh: 800,
  },

  ctaBtn: {
    padding: '13px', borderRadius: 12,
    border: '1.5px solid #6366f1', background: '#fff',
    color: '#4f46e5', fontWeight: 800, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'all 0.2s',
  },
  ctaBtnFilled: {
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none',
    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
  },
  currentBadge: {
    padding: '12px', borderRadius: 12, textAlign: 'center',
    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
    color: '#16a34a', fontWeight: 800, fontSize: 14,
  },

  empty: {
    textAlign: 'center', padding: '60px 24px',
    background: '#fff', borderRadius: 20,
    border: '1.5px dashed #e2e8f0',
  },
};