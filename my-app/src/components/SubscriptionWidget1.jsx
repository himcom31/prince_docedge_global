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
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 animate-pulse">
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-2 bg-slate-100 rounded w-1/3" />
    </div>
  );

  if (!data?.hasSubscription) return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
      <p className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">No Subscription</p>
      <p className="text-[11px] text-rose-400 font-medium">Purchase a plan to start booking appointments.</p>
      <a href="/pricing" className="mt-2 inline-block text-[10px] font-black text-white bg-rose-500 px-3 py-1.5 rounded-lg">
        View Plans →
      </a>
    </div>
  );

  const sub  = data.subscription;
  const warn = data.warnings;

  const apptLimit = sub.appointmentLimit ?? 0;
  const apptUsed  = sub.appointmentsUsed  ?? 0;
  const apptLeft  = sub.appointmentsLeft;
  const hasLimit  = apptLimit > 0;

  const accent = warn.isExpired || warn.limitReached
    ? { border: 'border-rose-200',    bg: 'bg-rose-50',    dot: 'bg-rose-500',    text: 'text-rose-600',    label: 'EXPIRED',       labelBg: 'bg-rose-100 text-rose-600'       }
    : warn.expiryWarning || warn.limitWarning
    ? { border: 'border-amber-200',   bg: 'bg-amber-50',   dot: 'bg-amber-400',   text: 'text-amber-600',   label: 'EXPIRING SOON', labelBg: 'bg-amber-100 text-amber-600'     }
    : { border: 'border-emerald-200', bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-600', label: 'ACTIVE',        labelBg: 'bg-emerald-100 text-emerald-600' };

  const usagePct = hasLimit
    ? Math.min(100, Math.round((apptUsed / apptLimit) * 100))
    : 0;

  const barColor = usagePct >= 90 ? 'bg-rose-500'
                 : usagePct >= 70 ? 'bg-amber-400'
                 : 'bg-blue-500';

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${accent.border}`}>

      {/* Header strip */}
      <div className={`${accent.bg} px-4 py-2.5 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accent.dot} animate-pulse`} />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            {sub.plan?.name || 'Plan'} — {sub.interval === 'yearly' ? 'Annual' : 'Monthly'}
          </span>
        </div>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${accent.labelBg}`}>
          {accent.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">

        {/* Warning banners */}
        {(warn.isExpired || warn.limitReached) && (
          <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-[11px] text-rose-600 font-semibold">
            🚫 {warn.isExpired
              ? `Expired on ${formatDate(sub.expiryDate)}. Booking blocked.`
              : `Appointment limit reached (${apptUsed}/${apptLimit}). Upgrade now.`}
          </div>
        )}
        {(warn.expiryWarning || warn.limitWarning) && !warn.isExpired && !warn.limitReached && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-[11px] text-amber-600 font-semibold">
            ⚠️ {warn.expiryWarning
              ? `Expires in ${sub.daysLeft} day${sub.daysLeft !== 1 ? 's' : ''}.`
              : `Only ${apptLeft} appointments left.`}
          </div>
        )}

        {/* 3 inline stats */}
        <div className="grid grid-cols-3 gap-2 text-center">

          {/* Expiry */}
          <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Expires</p>
            <p className={`text-[11px] font-black leading-tight ${accent.text}`}>
              {sub.expiryDate ? formatDate(sub.expiryDate) : '—'}
            </p>
            {sub.daysLeft !== null && (
              <p className="text-[8px] text-slate-400 mt-0.5">{sub.daysLeft}d left</p>
            )}
          </div>

          {/* Appointments */}
          <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Appoint.</p>
            <p className="text-[11px] font-black text-blue-600 leading-tight">
              {apptUsed}
              {hasLimit && (
                <span className="text-slate-400 font-medium"> / {apptLimit}</span>
              )}
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5">
              {hasLimit ? `${apptLeft ?? 0} left` : 'Unlimited'}
            </p>
          </div>

          {/* Paid */}
          <div className="bg-slate-50 rounded-lg px-2 py-2 border border-slate-100">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Paid</p>
            <p className="text-[11px] font-black text-indigo-600 leading-tight">
              ₹{(sub.paidAmount || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-[8px] text-slate-400 mt-0.5 capitalize">{sub.interval}</p>
          </div>

        </div>

        {/* Usage bar — sirf tab jab limit set ho */}
        {hasLimit && (
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-slate-400 font-semibold">Usage</span>
              <span className="text-[9px] font-black text-slate-600">{usagePct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}

        {/* Renew button — warning hone pe dikhao */}
        {(warn.isExpired || warn.expiryWarning || warn.limitReached || warn.limitWarning) && (
          <a
            href={`/${slug}/dashboard/renew-plan`}
            className="block text-center text-[10px] font-black text-white bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            🔄 Renew / Upgrade Plan
          </a>
        )}

      </div>
    </div>
  );
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';