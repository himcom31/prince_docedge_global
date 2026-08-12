// pages/RenewPlan.jsx
// Route: /:slug/dashboard/renew-plan
// Navigate here from MyPlans.jsx "Renew / Upgrade Plan →" button

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
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

export default function RenewPlan() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const token    = localStorage.getItem('doctorToken');
  const authH    = { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };

  const [currentSub, setCurrentSub] = useState(null);
  const [plans,      setPlans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [paying,     setPaying]     = useState(null); // `${planId}_${interval}`

  useEffect(() => {
    Promise.all([fetchCurrentSub(), fetchPlans()]).finally(() => setLoading(false));
  }, []);

  const fetchCurrentSub = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/subscriptions/status/${slug}`);
      if (data.success && data.hasSubscription) setCurrentSub(data.subscription);
    } catch {}
  };

  const fetchPlans = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/api/plans`);
      const list = Array.isArray(data) ? data : (data.plans || data.data || []);
      setPlans(list.filter(p => p.isActive !== false));
    } catch {}
  };

  const handleRenew = async (planId, interval) => {
    const key = `${planId}_${interval}`;
    setPaying(key);
    try {
      const { data } = await axios.post(
        `${API_BASE}/api/subscriptions/renew`,
        { planId, interval },
        authH
      );
      if (!data.success || !data.paymentSessionId) {
        alert(data.message || 'Order could not be created. Please try again.');
        return;
      }
      await loadCashfree();
      const cf = window.Cashfree({ mode: import.meta.env.VITE_CF_MODE || 'sandbox' });
      cf.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' });
    } catch (err) {
      alert(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setPaying(null);
    }
  };

  if (loading)
    return (
      <div style={S.center}>
        <div style={S.spinner} />
      </div>
    );

  const currentPlanId = currentSub?.plan?._id || currentSub?.plan?.id;
  const sortedPlans   = [...plans].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  return (
    <div style={S.page}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        .pcard             { animation: fadeUp 0.38s ease both; }
        .pcard:nth-child(1){ animation-delay: 0s   }
        .pcard:nth-child(2){ animation-delay: .07s }
        .pcard:nth-child(3){ animation-delay: .14s }
        .pcard:nth-child(4){ animation-delay: .21s }
        .rbtn:hover        { opacity:.88; transform:translateY(-1px); }
        .rbtn              { transition: opacity .15s, transform .15s; }
      `}</style>

      <div style={S.inner}>

        {/* Back */}
        <button style={S.back} onClick={() => navigate(-1)}>← Go Back</button>

        {/* Header */}
        <div style={S.pageHeader}>
          <h1 style={S.pageTitle}>Renew / Upgrade Plan</h1>
          <p style={S.pageSub}>
            View your current plan or choose a new plan to renew.
          </p>
        </div>

        {/* Current Subscription Banner */}
        {currentSub && (
          <div style={S.banner}>
            <div style={S.bannerLeft}>
              <span style={S.bannerIcon}>🏥</span>
              <div>
                <p style={S.bannerTitle}>
                  Current Plan: <span style={{ color: '#4f46e5' }}>{currentSub.plan?.name}</span>
                </p>
                <p style={S.bannerSub}>
                  {currentSub.interval === 'yearly' ? 'Annual' : 'Monthly'} ·{' '}
                  {currentSub.isExpired
                    ? `Expired on ${fmt(currentSub.expiryDate)}`
                    : `Expires ${fmt(currentSub.expiryDate)} — ${currentSub.daysLeft} days left`}
                  {currentSub.renewalCount > 0 && ` · Renewed ${currentSub.renewalCount} time${currentSub.renewalCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <StatusChip
              expired={currentSub.isExpired}
              expiring={!currentSub.isExpired && currentSub.daysLeft <= 7}
              daysLeft={currentSub.daysLeft}
            />
          </div>
        )}

        {/* Plans Grid */}
        {sortedPlans.length === 0 ? (
          <div style={S.empty}>
            <p style={{ fontSize: 36, margin: 0 }}>📋</p>
            <p style={S.emptyTitle}>No plans available</p>
            <p style={S.emptySub}>Please contact admin.</p>
          </div>
        ) : (
          <div style={S.grid}>
            {sortedPlans.map((plan) => {
              const planId        = plan._id || plan.id;
              const isCurrent     = planId === currentPlanId;
              const currentPrice  = currentSub?.plan?.monthlyPrice ?? 0;
              const isUpgrade     = !isCurrent && (plan.monthlyPrice ?? 0) > currentPrice;
              const isDowngrade   = !isCurrent && currentPrice > 0 && (plan.monthlyPrice ?? 0) < currentPrice;
              const hasMonthly    = plan.monthlyPrice > 0;
              const hasYearly     = plan.yearlyPrice  > 0;
              const payingMonthly = paying === `${planId}_monthly`;
              const payingYearly  = paying === `${planId}_yearly`;
              const anyPaying     = payingMonthly || payingYearly;

              return (
                <div
                  key={planId}
                  className="pcard"
                  style={{
                    ...S.card,
                    ...(isCurrent ? S.cardCurrent : {}),
                    ...(plan.isFeatured && !isCurrent ? S.cardFeatured : {}),
                  }}
                >
                  {/* Badges */}
                  {isCurrent && (
                    <span style={{ ...S.badge, background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                      ✓ Current Plan
                    </span>
                  )}
                  {!isCurrent && plan.badge && (
                    <span style={{ ...S.badge, background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
                      {plan.badge}
                    </span>
                  )}
                  {!isCurrent && isUpgrade && !plan.badge && (
                    <span style={{ ...S.badge, background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                      ⬆ Upgrade
                    </span>
                  )}
                  {!isCurrent && isDowngrade && !plan.badge && (
                    <span style={{ ...S.badge, background: 'linear-gradient(135deg,#64748b,#94a3b8)' }}>
                      ⬇ Downgrade
                    </span>
                  )}

                  {/* Name + Desc */}
                  <p style={{
                    ...S.planName,
                    color: isCurrent ? '#4f46e5' : '#0f172a',
                    paddingTop: (plan.badge || isCurrent || isUpgrade || isDowngrade) ? 10 : 0,
                  }}>
                    {plan.name}
                  </p>
                  {plan.description && <p style={S.planDesc}>{plan.description}</p>}

                  {/* Features */}
                  {plan.features?.length > 0 && (
                    <ul style={S.featureList}>
                      {plan.features.map((f, i) => {
                        const label = typeof f === 'string' ? f : (f?.text || f?.name || f?.label || JSON.stringify(f));
                        return (
                          <li key={`${planId}-f-${i}`} style={S.featureItem}>
                            <span style={{ color: '#16a34a', fontWeight: 800, flexShrink: 0 }}>✓</span>
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {/* Pills */}
                  <div style={S.pillsRow}>
                    <Pill
                      icon="👤"
                      label={plan.patientLimit > 0
                        ? `${plan.patientLimit.toLocaleString('en-IN')} patients`
                        : 'Unlimited patients'}
                      highlight={plan.patientLimit === 0}
                    />
                    <Pill icon="📅" label={`${plan.durationDays || 30} days`} />
                    {plan.doctorLimit > 1 && <Pill icon="👨‍⚕️" label={`${plan.doctorLimit} doctors`} />}
                  </div>

                  <div style={S.divider} />

                  {/* Prices */}
                  <div style={S.priceRow}>
                    {hasMonthly && (
                      <div style={S.priceBlock}>
                        <span style={S.priceAmt}>₹{plan.monthlyPrice.toLocaleString('en-IN')}</span>
                        <span style={S.pricePer}>/mo</span>
                      </div>
                    )}
                    {hasYearly && (
                      <div style={S.priceBlock}>
                        <span style={S.priceAmt}>₹{plan.yearlyPrice.toLocaleString('en-IN')}</span>
                        <span style={S.pricePer}>/yr</span>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div style={S.btnCol}>
                    {hasMonthly && (
                      <button
                        className="rbtn"
                        style={isCurrent || plan.isFeatured ? S.btnFilled : S.btnOutline}
                        disabled={anyPaying}
                        onClick={() => handleRenew(planId, 'monthly')}
                      >
                        {payingMonthly ? <BtnSpinner /> : (
                          isCurrent
                            ? `🔄 Renew Monthly — ₹${plan.monthlyPrice.toLocaleString('en-IN')}`
                            : `Monthly — ₹${plan.monthlyPrice.toLocaleString('en-IN')}`
                        )}
                      </button>
                    )}
                    {hasYearly && (
                      <button
                        className="rbtn"
                        style={S.btnFilled}
                        disabled={anyPaying}
                        onClick={() => handleRenew(planId, 'yearly')}
                      >
                        {payingYearly ? <BtnSpinner /> : (
                          isCurrent
                            ? `🔄 Renew Yearly — ₹${plan.yearlyPrice.toLocaleString('en-IN')}`
                            : `Yearly — ₹${plan.yearlyPrice.toLocaleString('en-IN')}`
                        )}
                      </button>
                    )}
                    {hasYearly && hasMonthly && (
                      <p style={S.savingNote}>
                        💰 Save ₹{((plan.monthlyPrice * 12) - plan.yearlyPrice).toLocaleString('en-IN')} with yearly
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={S.footNote}>
          💡 After renewal, your subscription will be automatically extended. No data will be lost.
        </p>

      </div>
    </div>
  );
}

// Sub-components
function StatusChip({ expired, expiring, daysLeft }) {
  const bg    = expired ? '#fee2e2' : expiring ? '#fef3c7' : '#dcfce7';
  const color = expired ? '#dc2626' : expiring ? '#d97706' : '#16a34a';
  const label = expired ? 'Expired' : expiring ? `Expiring in ${daysLeft}d` : 'Active';
  return (
    <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 14px', borderRadius: 20, background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function Pill({ icon, label, highlight }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
      background: highlight ? '#eef2ff' : '#f1f5f9',
      color:      highlight ? '#4f46e5' : '#64748b',
      border:     highlight ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
    }}>
      {icon} {label}
    </span>
  );
}

function BtnSpinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTop: '2px solid #fff',
      borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      verticalAlign: 'middle',
    }} />
  );
}

const S = {
  center:  { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite' },
  page:    { minHeight: '100vh', background: '#f8f9fc', fontFamily: "'Inter','Segoe UI',sans-serif" },
  inner:   { maxWidth: 980, margin: '0 auto', padding: '32px 24px 64px' },
  back:    { background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 13, fontWeight: 700, padding: '0 0 20px', fontFamily: 'inherit' },
  pageHeader: { marginBottom: 24 },
  pageTitle:  { fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 },
  pageSub:    { fontSize: 14, color: '#64748b', margin: '4px 0 0' },
  banner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: '#eef2ff', border: '1.5px solid #c7d2fe',
    borderRadius: 14, padding: '16px 20px', marginBottom: 28,
    gap: 12, flexWrap: 'wrap',
  },
  bannerLeft:  { display: 'flex', alignItems: 'center', gap: 12 },
  bannerIcon:  { fontSize: 26 },
  bannerTitle: { fontSize: 15, fontWeight: 800, color: '#1e1b4b', margin: 0 },
  bannerSub:   { fontSize: 12, color: '#6366f1', margin: '2px 0 0', fontWeight: 500 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 20, marginBottom: 24 },
  card: {
    background: '#fff', border: '1.5px solid #e8edf5', borderRadius: 18,
    padding: '22px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative',
  },
  cardCurrent:  { border: '2px solid #6366f1', background: '#fafafe', boxShadow: '0 0 0 4px rgba(99,102,241,0.08)' },
  cardFeatured: { border: '2px solid #7c3aed', background: '#fdf9ff', boxShadow: '0 4px 20px rgba(124,58,237,0.10)' },
  badge: { position: 'absolute', top: -11, left: 18, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 12px', borderRadius: 20 },
  planName:    { fontSize: 18, fontWeight: 800, margin: 0 },
  planDesc:    { fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 },
  featureList: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 },
  featureItem: { fontSize: 12, color: '#334155', display: 'flex', alignItems: 'flex-start', gap: 6 },
  pillsRow:    { display: 'flex', gap: 6, flexWrap: 'wrap' },
  divider:     { height: 1, background: '#f1f5f9' },
  priceRow:    { display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' },
  priceBlock:  { display: 'flex', alignItems: 'baseline', gap: 2 },
  priceAmt:    { fontSize: 22, fontWeight: 800, color: '#0f172a' },
  pricePer:    { fontSize: 12, color: '#94a3b8', fontWeight: 600 },
  btnCol:      { display: 'flex', flexDirection: 'column', gap: 8 },
  btnFilled: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 16px', borderRadius: 10,
    background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  },
  btnOutline: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 16px', borderRadius: 10,
    border: '1.5px solid #6366f1', background: '#fff',
    color: '#4f46e5', fontWeight: 700, fontSize: 13,
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  },
  savingNote: { fontSize: 11, color: '#16a34a', fontWeight: 700, textAlign: 'center', margin: 0 },
  empty:      { textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 18, border: '1.5px dashed #e2e8f0' },
  emptyTitle: { fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '10px 0 6px' },
  emptySub:   { fontSize: 13, color: '#94a3b8', margin: 0 },
  footNote:   { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
};