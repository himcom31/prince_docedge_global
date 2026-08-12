const Plan = require('../models/Plan');

const DEFAULT_WHATSAPP_LINK =
  'https://wa.me/919382555796?text=Hi%2C%20I%20need%20Enterprise%20pricing%20for%20DocEdge';

// ── Helper: DB plan → display card ──────────────────────────────────────────
function buildDisplayCard(plan) {
  let amount = 'Custom';
  let isCurrencyless = true;
  let period = 'Volume discounts available';
  let annualText = 'Always open for negotiation';

  if (!plan.isCustomPricing) {
    period = 'Billed annually';
    annualText = 'Billed annually';

    if (plan.yearlyPrice) {
      amount = Math.round(plan.yearlyPrice / 365).toString();
      isCurrencyless = false;
    } else if (plan.monthlyPrice) {
      amount = Math.round(plan.monthlyPrice / 30).toString();
      isCurrencyless = false;
    }

    if (plan.monthlyPrice && plan.yearlyPrice) {
      const yearlyEquivIfMonthly = plan.monthlyPrice * 12;
      const savings = Math.round(
        ((yearlyEquivIfMonthly - plan.yearlyPrice) / yearlyEquivIfMonthly) * 100
      );
      annualText = savings > 0 ? `Save ${savings}% vs monthly` : 'Billed annually';
    } else if (plan.monthlyPrice) {
      annualText = 'Billed monthly';
    }
  }

  const priceLines = [];
  if (!plan.isCustomPricing) {
    if (plan.monthlyPrice)
      priceLines.push({ label: 'Monthly', value: `₹${plan.monthlyPrice.toLocaleString('en-IN')}/mo` });
    if (plan.yearlyPrice)
      priceLines.push({ label: 'Yearly', value: `₹${plan.yearlyPrice.toLocaleString('en-IN')}/yr` });
  }

  const featureList = [];
  if (plan.doctorLimit && !plan.isCustomPricing) {
    featureList.push({
      text: plan.doctorLimit === 1 ? '1 Doctor Profile' : `Up to ${plan.doctorLimit} Doctors`,
    });
  }
  (plan.features || []).forEach((f) => featureList.push({ text: f }));
  if (plan.patientLimit)
    featureList.push({ text: `Patient Records (upto ${plan.patientLimit})` });

  const cta = plan.isCustomPricing
    ? {
        label: plan.ctaLabel || 'Talk to Sales',
        href: plan.ctaHref || DEFAULT_WHATSAPP_LINK,
        external: true,
        variant: 'outline',
      }
    : {
        label: plan.ctaLabel || (plan.isFeatured ? 'Book Free Demo' : 'Start Free Trial'),
        href: plan.ctaHref || '#lead',
        external: plan.ctaExternal || false,
        variant: plan.isFeatured ? 'filled' : 'outline',
      };

  return {
    id:            plan._id,
    name:          plan.name,
    description:   plan.description,
    amount,
    isCurrencyless,
    period,
    annual:        annualText,
    monthlyPrice:  plan.monthlyPrice || null,
    yearlyPrice:   plan.yearlyPrice  || null,
    priceLines,
    features:      featureList,
    cta,
    featured:      !!plan.isFeatured,
    badge:         plan.isFeatured ? plan.badge : null,
    displayOrder:  plan.displayOrder || 0,
  };
}

// ── POST /api/plans ── SuperAdmin plan banaye ────────────────────────────────
exports.createPlan = async (req, res) => {
  try {
    const {
      name, description, features,
      monthlyPrice, yearlyPrice,
      doctorLimit, patientLimit,
      isFeatured, badge, ctaLabel,
      isCustomPricing, displayOrder,
      ctaHref, ctaExternal,
    } = req.body;

    if (!monthlyPrice && !yearlyPrice && !isCustomPricing)
      return res.status(400).json({ message: 'Kam se kam ek price do, ya custom pricing mark karo' });

    const plan = await Plan.create({
      name, description,
      features:        features || [],
      monthlyPrice:    monthlyPrice || null,
      yearlyPrice:     yearlyPrice  || null,
      doctorLimit:     doctorLimit  || 1,
      patientLimit:    patientLimit || null,
      isFeatured:      isFeatured      || false,
      badge:           badge           || null,
      ctaLabel:        ctaLabel        || 'Start Free Trial',
      isCustomPricing: isCustomPricing || false,
      displayOrder:    displayOrder    || 0,
      ctaHref:         ctaHref         || null,
      ctaExternal:     ctaExternal     || false,
    });

    res.status(201).json({ success: true, plan });
  } catch (err) {
    console.error('Plan create error:', err);
    res.status(500).json({ message: 'Plan create failed', error: err.message });
  }
};

// ── GET /api/plans ── Public — landing page ──────────────────────────────────
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort('displayOrder monthlyPrice');
    res.json({ success: true, plans: plans.map(buildDisplayCard) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/plans/all ── SuperAdmin — raw data ──────────────────────────────
exports.getAllPlans = async (req, res) => {
  try {
    const plans = await Plan.find().sort('displayOrder -createdAt');
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/plans/:id ── Single plan (signup form ke liye) ─────────────────
exports.getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, plan: buildDisplayCard(plan) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── PUT /api/plans/:id ── Update ─────────────────────────────────────────────
exports.updatePlan = async (req, res) => {
  try {
    const {
      name, description, features, doctorLimit, patientLimit, isActive,
      isFeatured, badge, ctaLabel, isCustomPricing, displayOrder,
      ctaHref, ctaExternal, monthlyPrice, yearlyPrice,
    } = req.body;

    const existingPlan = await Plan.findById(req.params.id);
    if (!existingPlan) return res.status(404).json({ message: 'Plan not found' });

    const plan = await Plan.findByIdAndUpdate(
      req.params.id,
      {
        name, description, features, doctorLimit, patientLimit, isActive,
        isFeatured, badge, ctaLabel, isCustomPricing, displayOrder,
        ctaHref, ctaExternal,
        monthlyPrice: monthlyPrice ? Number(monthlyPrice) : null,
        yearlyPrice:  yearlyPrice  ? Number(yearlyPrice)  : null,
      },
      { new: true }
    );

    res.json({ success: true, plan });
  } catch (err) {
    console.error('Plan update error:', err);
    res.status(500).json({ message: 'Plan update failed', error: err.message });
  }
};

// ── DELETE /api/plans/:id ── Soft delete ─────────────────────────────────────
exports.deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Plan deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};