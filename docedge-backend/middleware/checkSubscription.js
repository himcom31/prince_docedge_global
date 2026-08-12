const Doctor = require('../models/Doctor');
const Subscription = require('../models/Subscription');

module.exports = async function checkSubscription(req, res, next) {
  try {
    const slug = req.params.slug || req.body.clinicSlug;
    if (!slug) return next();

    const doctor = await Doctor.findOne({ slug }).select('_id');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Clinic not found' });
    }

    const subscription = await Subscription.findOne({
      clinicId: doctor._id,
      status: 'active',
    });

    // No subscription
    if (!subscription) {
      return res.status(403).json({
        success: false,
        code: 'NO_SUBSCRIPTION',
        message: 'No active subscription. Please purchase a plan.',
      });
    }

    // Expiry check
    const now = new Date();
    if (subscription.expiryDate && now > new Date(subscription.expiryDate)) {
      await Subscription.findByIdAndUpdate(subscription._id, { status: 'expired' });
      return res.status(403).json({
        success: false,
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Subscription expired. Please renew to continue booking.',
      });
    }

    // Limit check (0 = unlimited)
    if (
      subscription.patientLimit !== 0 &&
subscription.appointmentsUsed >= subscription.patientLimit
    ) {
      return res.status(403).json({
        success: false,
        code: 'APPOINTMENT_LIMIT_REACHED',
        message: `Appointment limit reached (${subscription.appointmentsUsed}/${subscription.patientLimit}). Please upgrade.`,
      });
    }

    // Subscription attach karo — controller mein use hoga
    req.subscription = subscription;
    next();

  } catch (err) {
    console.error('checkSubscription error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};