// pages/MyPlans.jsx
// Route: /:slug/dashboard/my-plans
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

const loadCashfree = () =>
  new Promise((res) => {
    if (window.Cashfree) return res();
    const s = document.createElement('script');
    s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    s.onload = res;
    document.head.appendChild(s);
  });

const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const CHANNELS = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#22c55e', bg: '#f0fdf4' },
  email: { label: 'Email', icon: '📧', color: '#6366f1', bg: '#eef2ff' },
  sms: { label: 'SMS', icon: '📱', color: '#3b82f6', bg: '#eff6ff' },
};

export default function MyPlans() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('doctorToken');
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  const [mainSub, setMainSub] = useState(null);   // DocEdge main subscription
  const [notifSub, setNotifSub] = useState(null);   // Notification subscription
  const [notifPlans, setNotifPlans] = useState([]);     // Available notification plans
  const [loading, setLoading] = useState(true);
  const [renewing, setRenewing] = useState(null);   // 'main' | planId
  const [showPlans, setShowPlans] = useState(false);  // notification plans drawer

  useEffect(() => {
    Promise.all([fetchMainSub(), fetchNotifSub(), fetchNotifPlans()])
      .finally(() => setLoading(false));
  }, []);

  const fetchMainSub = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/subscriptions/status/${slug}`);
      if (data.success) setMainSub(data);
    } catch { }
  };

  const fetchNotifSub = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/notification-plans/my-subscription`, authH);
      if (data.success) setNotifSub(data);
    } catch { }
  };

  const fetchNotifPlans = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/notification-plans`);
      if (data.success) setNotifPlans(data.plans);
    } catch { }
  };

  // ── Renew Notification Plan ────────────────────────────────────────────────
  const handleRenewNotif = async (planId, interval = 'monthly') => {
    setRenewing(planId);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/notification-plans/subscribe`,
        { planId, interval },
        authH
      );
      if (!data.success || !data.paymentSessionId) {
        alert('Order create nahi hua. Dobara try karo.');
        return;
      }
      await loadCashfree();
      const cf = window.Cashfree({ mode: import.meta.env.VITE_CF_MODE || 'sandbox' });
      cf.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' });
    } catch (err) {
      alert(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setRenewing(null);
    }
  };

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
    </div>
  );

  const ms = mainSub?.subscription;
  const ns = notifSub;

  // Warnings
  const mainExpiring = ms && !ms.isExpired && ms.daysLeft !== null && ms.daysLeft <= 7;
  const mainExpired = ms?.isExpired;
  const notifExpiring = ns?.hasSubscription && !ns?.isExpired && ns?.daysLeft !== null && ns?.daysLeft <= 7;
  const notifExpired = ns?.isExpired;

  return (
    <div style={S.page}>
      <div style={S.inner}>

        {/* ── Page Header ── */}
        <div style={S.pageHeader}>
          <div>
            <h1 style={S.pageTitle}>My Plans</h1>
            <p style={S.pageSub}>Manage your DocEdge subscription and notification add-ons</p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 1 — Main DocEdge Subscription
        ════════════════════════════════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>🏥</span>
            <div>
              <p style={S.sectionTitle}>DocEdge Subscription</p>
              <p style={S.sectionSub}>Your main clinic management plan</p>
            </div>
          </div>

          {!mainSub?.hasSubscription ? (
            <div style={S.emptyCard}>
              <p style={S.emptyIcon}>📋</p>
              <p style={S.emptyTitle}>No active subscription</p>
              <p style={S.emptySub}>Your account was created manually or subscription data not found.</p>
            </div>
          ) : (
            <div style={S.subCard}>
              {/* Status chip */}
              <div style={S.subCardTop}>
                <div>
                  <p style={S.subPlanName}>{ms?.plan?.name || '—'} Plan</p>
                  <p style={S.subInterval}>{ms?.interval === 'yearly' ? 'Annual' : 'Monthly'} subscription</p>
                </div>
                <StatusChip
                  expired={mainExpired}
                  expiring={mainExpiring}
                  daysLeft={ms?.daysLeft}
                />
              </div>

              {/* Warnings */}
              {mainExpired && (
                <AlertBox color="red">
                  🚫 Your subscription expired on {fmt(ms?.expiryDate)}. Appointment booking is blocked. Please renew.
                </AlertBox>
              )}
              {mainExpiring && !mainExpired && (
                <AlertBox color="amber">
                  ⚠️ Subscription expires in <strong>{ms?.daysLeft} day{ms?.daysLeft !== 1 ? 's' : ''}</strong> on {fmt(ms?.expiryDate)}. Renew now to avoid interruption.
                </AlertBox>
              )}

              {/* Stats */}
              <div style={S.statsRow}>
                <StatBox
                  label="Expiry Date"
                  value={fmt(ms?.expiryDate)}
                  sub={ms?.daysLeft !== null ? `${ms?.daysLeft} days remaining` : ''}
                  color={mainExpired ? '#dc2626' : mainExpiring ? '#d97706' : '#16a34a'}
                />
                <StatBox
                  label="Appointments"
                  value={
                    ms?.appointmentLimit > 0
                      ? `${ms?.appointmentsUsed} / ${ms?.appointmentLimit}`
                      : `${ms?.appointmentsUsed || 0} used`
                  }
                  sub={
                    ms?.appointmentLimit > 0
                      ? `${ms?.appointmentsLeft ?? 0} remaining`
                      : 'No limit set'
                  }
                  color="#6366f1"
                />
                <StatBox
                  label="Amount Paid"
                  value={`₹${(ms?.paidAmount || 0).toLocaleString('en-IN')}`}
                  sub={ms?.interval}
                  color="#0f172a"
                />
              </div>

              {/* Appointment usage bar */}
              {ms?.appointmentLimit > 0 && (
                <UsageBar
                  used={ms?.appointmentsUsed}
                  limit={ms?.appointmentLimit}
                  color="#6366f1"
                  label="Appointment usage"
                />
              )}

              {/* Renew button */}
              <div style={S.cardActions}>
                <button
                  style={S.renewBtn}
                  // Line ~157 — onClick change karo:
                  onClick={() => navigate(`/${slug}/dashboard/renew-plan`)}
                >
                  🔄 Renew / Upgrade Plan →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            SECTION 2 — Notification Subscription
        ════════════════════════════════════════════════════════ */}
        <div style={S.section}>
          <div style={S.sectionHeader}>
            <span style={S.sectionIcon}>🔔</span>
            <div>
              <p style={S.sectionTitle}>Notification Add-on</p>
              <p style={S.sectionSub}>WhatsApp, Email & SMS messaging for your patients</p>
            </div>
          </div>

          {!ns?.hasSubscription ? (
            <div style={S.emptyCard}>
              <p style={S.emptyIcon}>💬</p>
              <p style={S.emptyTitle}>No notification plan active</p>
              <p style={S.emptySub}>Subscribe to send prescriptions & invoices directly to patients.</p>
              <button style={S.primaryBtn} onClick={() => setShowPlans(true)}>
                View Notification Plans →
              </button>
            </div>
          ) : (
            <div style={S.subCard}>
              {/* Status */}
              <div style={S.subCardTop}>
                <div>
                  <p style={S.subPlanName}>{ns?.plan?.name || '—'}</p>
                  <p style={S.subInterval}>{ns?.interval === 'yearly' ? 'Annual' : 'Monthly'} subscription</p>
                </div>
                <StatusChip
                  expired={notifExpired}
                  expiring={notifExpiring}
                  daysLeft={ns?.daysLeft}
                />
              </div>

              {/* Warnings */}
              {notifExpired && (
                <AlertBox color="red">
                  🚫 Notification subscription expired. Renew below to continue sending messages.
                </AlertBox>
              )}
              {notifExpiring && !notifExpired && (
                <AlertBox color="amber">
                  ⚠️ Notification plan expires in <strong>{ns?.daysLeft} day{ns?.daysLeft !== 1 ? 's' : ''}</strong>. Renew soon.
                </AlertBox>
              )}

              {/* Expiry stat */}
              <div style={S.statsRow}>
                <StatBox
                  label="Expiry Date"
                  value={fmt(ns?.expiryDate)}
                  sub={ns?.daysLeft !== null ? `${ns?.daysLeft} days left` : ''}
                  color={notifExpired ? '#dc2626' : notifExpiring ? '#d97706' : '#16a34a'}
                />
                <StatBox
                  label="Amount Paid"
                  value={`₹${(ns?.paidAmount || 0).toLocaleString('en-IN')}`}
                  sub={ns?.interval}
                  color="#0f172a"
                />
              </div>

              {/* Channel usage */}
              <div style={S.channelGrid}>
                {Object.entries(ns?.limits || {}).map(([ch, info]) => {
                  const C = CHANNELS[ch];
                  const pct = info.limit > 0 ? Math.min(100, Math.round((info.used / info.limit) * 100)) : 0;
                  return (
                    <div key={ch} style={{ ...S.channelCard, borderColor: info.enabled ? C.color + '33' : '#e2e8f0', opacity: info.enabled ? 1 : 0.5 }}>
                      <div style={S.channelTop}>
                        <span style={{ fontSize: 22 }}>{C.icon}</span>
                        <div>
                          <p style={S.channelLabel}>{C.label}</p>
                          {info.enabled
                            ? <p style={{ ...S.channelStat, color: C.color }}>{info.remaining} remaining</p>
                            : <p style={S.channelStat}>Not included</p>
                          }
                        </div>
                      </div>
                      {info.enabled && (
                        <>
                          <UsageBar used={info.used} limit={info.limit} color={C.color} />
                          <p style={S.channelReset}>
                            {info.used}/{info.limit} used
                            {info.resetDate && ` · Resets ${fmt(info.resetDate)}`}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div style={S.cardActions}>
                {(notifExpired || notifExpiring) && notifPlans.length > 0 && (
                  <button
                    style={S.renewBtn}
                    onClick={() => setShowPlans(true)}
                  >
                    🔄 Renew Notification Plan →
                  </button>
                )}
                <button
                  style={S.outlineBtn}
                  onClick={() => navigate(`/${slug}/dashboard/notifications`)}
                >
                  View All Plans
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════
            NOTIFICATION PLANS DRAWER (renew / subscribe)
        ════════════════════════════════════════════════════════ */}
        {showPlans && (
          <div style={S.overlay} onClick={() => setShowPlans(false)}>
            <div style={S.drawer} onClick={e => e.stopPropagation()}>
              <div style={S.drawerHeader}>
                <p style={S.drawerTitle}>Choose a Notification Plan</p>
                <button style={S.closeBtn} onClick={() => setShowPlans(false)}>✕</button>
              </div>

              <div style={S.drawerPlans}>
                {notifPlans.map(plan => {
                  const hasMonthly = plan.monthlyPrice > 0;
                  const hasYearly = plan.yearlyPrice > 0;
                  const isCurrent = ns?.hasSubscription && !ns?.isExpired && ns?.plan?.name === plan.name;

                  return (
                    <div key={plan._id} style={{ ...S.drawerPlan, ...(plan.isFeatured ? S.drawerPlanFeatured : {}) }}>
                      {plan.badge && <span style={S.drawerBadge}>{plan.badge}</span>}
                      <p style={S.drawerPlanName}>{plan.name}</p>

                      {/* Channel limits summary */}
                      <div style={S.drawerChannels}>
                        {[
                          { key: 'whatsapp', limit: plan.whatsappLimit },
                          { key: 'email', limit: plan.emailLimit },
                          { key: 'sms', limit: plan.smsLimit },
                        ].map(({ key, limit }) => {
                          const C = CHANNELS[key];
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: limit > 0 ? 1 : 0.4 }}>
                              <span>{C.icon}</span>
                              <span style={{ fontSize: 12, color: limit > 0 ? '#334155' : '#94a3b8', fontWeight: 600 }}>
                                {limit > 0 ? `${limit.toLocaleString('en-IN')}/mo` : 'Not included'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Price + buttons */}
                      {isCurrent ? (
                        <div style={S.currentLabel}>✓ Current Plan</div>
                      ) : (
                        <div style={S.drawerBtns}>
                          {hasMonthly && (
                            <button
                              style={S.drawerBtn}
                              disabled={renewing === plan._id}
                              onClick={() => handleRenewNotif(plan._id, 'monthly')}
                            >
                              {renewing === plan._id ? '...' : `₹${plan.monthlyPrice.toLocaleString('en-IN')}/mo`}
                            </button>
                          )}
                          {hasYearly && (
                            <button
                              style={{ ...S.drawerBtn, ...S.drawerBtnFilled }}
                              disabled={renewing === plan._id}
                              onClick={() => handleRenewNotif(plan._id, 'yearly')}
                            >
                              {renewing === plan._id ? '...' : `₹${plan.yearlyPrice.toLocaleString('en-IN')}/yr`}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Small components ──────────────────────────────────────────────────────────
function StatusChip({ expired, expiring, daysLeft }) {
  const bg = expired ? '#fee2e2' : expiring ? '#fef3c7' : '#dcfce7';
  const color = expired ? '#dc2626' : expiring ? '#d97706' : '#16a34a';
  const label = expired ? 'Expired' : expiring ? `Expiring in ${daysLeft}d` : 'Active';
  return <span style={{ ...SC.chip, background: bg, color }}>{label}</span>;
}

function AlertBox({ color, children }) {
  const cfg = {
    red: { bg: '#fef2f2', border: '#fecaca', text: '#b91c1c' },
    amber: { bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
  }[color];
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: cfg.text, fontWeight: 600, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub, color }) {
  return (
    <div style={SC.statBox}>
      <p style={SC.statLabel}>{label}</p>
      <p style={{ ...SC.statValue, color }}>{value}</p>
      {sub && <p style={SC.statSub}>{sub}</p>}
    </div>
  );
}

function UsageBar({ used, limit, color, label }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const barColor = pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : color;
  return (
    <div>
      {label && <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>}
      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
      <p style={{ fontSize: 10, color: '#94a3b8', margin: '3px 0 0', fontWeight: 600 }}>{pct}% used</p>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite' },

  page: { minHeight: '100vh', background: '#f8f9fc', fontFamily: "'Inter','Segoe UI',sans-serif" },
  inner: { maxWidth: 860, margin: '0 auto', padding: '36px 24px' },

  pageHeader: { marginBottom: 32 },
  pageTitle: { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  pageSub: { fontSize: 14, color: '#64748b', margin: '4px 0 0' },

  section: { marginBottom: 28 },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 },
  sectionIcon: { fontSize: 28 },
  sectionTitle: { fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 },
  sectionSub: { fontSize: 12, color: '#64748b', margin: '2px 0 0' },

  subCard: {
    background: '#fff', border: '1.5px solid #e8edf5',
    borderRadius: 18, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16,
  },
  subCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  subPlanName: { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 },
  subInterval: { fontSize: 12, color: '#94a3b8', margin: '3px 0 0' },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 },

  channelGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 },
  channelCard: {
    background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: 12, padding: '14px', display: 'flex', flexDirection: 'column', gap: 8,
  },
  channelTop: { display: 'flex', alignItems: 'center', gap: 10 },
  channelLabel: { fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 },
  channelStat: { fontSize: 11, color: '#64748b', margin: '2px 0 0', fontWeight: 600 },
  channelReset: { fontSize: 10, color: '#94a3b8', margin: 0, fontWeight: 500 },

  cardActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  renewBtn: {
    padding: '11px 20px', borderRadius: 10,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  outlineBtn: {
    padding: '11px 20px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', background: '#fff',
    color: '#475569', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  primaryBtn: {
    marginTop: 8, padding: '12px 24px', borderRadius: 10,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none', fontWeight: 700, fontSize: 14,
    cursor: 'pointer', fontFamily: 'inherit',
  },

  emptyCard: {
    background: '#fff', border: '1.5px dashed #e2e8f0',
    borderRadius: 18, padding: '40px 24px', textAlign: 'center',
  },
  emptyIcon: { fontSize: 36, margin: '0 0 10px' },
  emptyTitle: { fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' },
  emptySub: { fontSize: 13, color: '#94a3b8', margin: '0 0 16px' },

  // Drawer
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 100, padding: 0,
  },
  drawer: {
    background: '#fff', borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: 680,
    padding: '24px 24px 32px', maxHeight: '85vh', overflowY: 'auto',
  },
  drawerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  drawerTitle: { fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14, color: '#64748b', fontWeight: 700 },
  drawerPlans: { display: 'flex', flexDirection: 'column', gap: 14 },
  drawerPlan: {
    border: '1.5px solid #e8edf5', borderRadius: 14, padding: '18px 20px',
    position: 'relative',
  },
  drawerPlanFeatured: { border: '2px solid #6366f1', background: '#fafafa' },
  drawerBadge: {
    position: 'absolute', top: -10, right: 16,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', fontSize: 10, fontWeight: 800,
    padding: '3px 12px', borderRadius: 20,
  },
  drawerPlanName: { fontSize: 15, fontWeight: 800, color: '#0f172a', margin: '0 0 10px' },
  drawerChannels: { display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' },
  drawerBtns: { display: 'flex', gap: 10 },
  drawerBtn: {
    flex: 1, padding: '10px', borderRadius: 10,
    border: '1.5px solid #6366f1', background: '#fff',
    color: '#4f46e5', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit',
  },
  drawerBtnFilled: {
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none',
  },
  currentLabel: {
    padding: '10px', borderRadius: 10, textAlign: 'center',
    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
    color: '#16a34a', fontWeight: 800, fontSize: 13,
  },
};

const SC = {
  chip: { fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 20, whiteSpace: 'nowrap' },
  statBox: { background: '#f8fafc', border: '1px solid #e8edf5', borderRadius: 12, padding: '14px' },
  statLabel: { fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 4px' },
  statValue: { fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.2 },
  statSub: { fontSize: 11, color: '#94a3b8', margin: '3px 0 0', fontWeight: 500 },
};