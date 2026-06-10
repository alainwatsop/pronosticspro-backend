const axios = require('axios');
const { User, Subscription } = require('../models');

const CINETPAY_API_KEY = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID = process.env.CINETPAY_SITE_ID;
const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2';

const PLANS = {
  starter: { label: 'VIP Starter', amount: 5000, currency: 'XAF', durationDays: 30 },
  expert: { label: 'VIP Expert', amount: 15000, currency: 'XAF', durationDays: 30 },
  pro: { label: 'VIP Pro', amount: 35000, currency: 'XAF', durationDays: 90 },
};

async function initiatePayment(userId, plan, returnUrl, notifyUrl) {
  const planData = PLANS[plan];
  if (!planData) throw new Error('Plan inconnu');
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) throw new Error('CinetPay non configure');

  const transactionId = `PP_${userId}_${Date.now()}`;
  const payload = {
    apikey: CINETPAY_API_KEY,
    site_id: CINETPAY_SITE_ID,
    transaction_id: transactionId,
    amount: planData.amount,
    currency: planData.currency,
    description: `PronosticsPro - ${planData.label}`,
    return_url: returnUrl || `${process.env.FRONTEND_URL}/?payment=success`,
    notify_url: notifyUrl || `${process.env.BACKEND_URL}/api/payments/notify`,
    channels: 'MOBILE_MONEY,CREDIT_CARD',
    lang: 'fr',
    metadata: JSON.stringify({ userId: String(userId), plan }),
  };

  const res = await axios.post(`${CINETPAY_BASE_URL}/payment`, payload);
  const data = res.data;
  if (data.code !== '201') throw new Error(data.message || 'Erreur CinetPay');

  await Subscription.create({
    userId,
    plan,
    amount: planData.amount,
    currency: planData.currency,
    paymentMethod: 'mobile_money',
    status: 'pending',
    externalRef: transactionId,
  });

  return { paymentUrl: data.data.payment_url, transactionId };
}

async function checkPaymentStatus(transactionId) {
  if (!CINETPAY_API_KEY || !CINETPAY_SITE_ID) throw new Error('CinetPay non configure');
  const res = await axios.post(`${CINETPAY_BASE_URL}/payment/check`, {
    apikey: CINETPAY_API_KEY,
    site_id: CINETPAY_SITE_ID,
    transaction_id: transactionId,
  });
  return res.data;
}

async function handlePaymentNotification(body) {
  const transactionId = body?.transaction_id || body?.cpm_trans_id || body?.transactionId;
  if (!transactionId) return { success: false, reason: 'transaction_id manquant' };

  const pendingSub = await Subscription.findOne({ externalRef: transactionId, status: 'pending' });
  if (!pendingSub) return { success: false, reason: 'Transaction inconnue ou deja traitee' };

  // Verification reelle serveur-a-serveur: on ne fait jamais confiance au body webhook
  const check = await checkPaymentStatus(transactionId);
  const paymentStatus = check?.data?.status || check?.data?.payment_status || check?.code;
  if (!['ACCEPTED', 'SUCCESS', '00'].includes(String(paymentStatus).toUpperCase())) {
    return { success: false, reason: `Paiement non confirme (${paymentStatus || 'unknown'})` };
  }

  const planData = PLANS[pendingSub.plan];
  if (!planData) return { success: false, reason: 'Plan inconnu' };

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + planData.durationDays);

  await Subscription.updateOne(
    { _id: pendingSub._id },
    { status: 'active', startDate, endDate }
  );

  await User.findByIdAndUpdate(pendingSub.userId, {
    role: 'vip',
    'vip.active': true,
    'vip.plan': pendingSub.plan,
    'vip.startDate': startDate,
    'vip.endDate': endDate,
  });

  return { success: true, userId: pendingSub.userId, plan: pendingSub.plan, endDate };
}

async function deactivateExpiredSubscriptions() {
  const now = new Date();
  const expired = await Subscription.find({ status: 'active', endDate: { $lt: now } });
  for (const sub of expired) {
    await Subscription.findByIdAndUpdate(sub._id, { status: 'expired' });
    await User.findByIdAndUpdate(sub.userId, { role: 'user', 'vip.active': false });
  }
  return expired.length;
}

module.exports = {
  initiatePayment,
  handlePaymentNotification,
  checkPaymentStatus,
  deactivateExpiredSubscriptions,
  PLANS,
};
