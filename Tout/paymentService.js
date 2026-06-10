// services/paymentService.js
const axios = require('axios');
const { User, Subscription } = require('../models');

const CINETPAY_API_KEY  = process.env.CINETPAY_API_KEY;
const CINETPAY_SITE_ID  = process.env.CINETPAY_SITE_ID;
const CINETPAY_BASE_URL = 'https://api-checkout.cinetpay.com/v2';

const PLANS = {
  starter: { label: 'VIP Starter',  amount: 5000,  currency: 'XAF', durationDays: 30  },
  expert:  { label: 'VIP Expert',   amount: 15000, currency: 'XAF', durationDays: 30  },
  pro:     { label: 'VIP Pro',      amount: 35000, currency: 'XAF', durationDays: 90  },
};

/**
 * Initier un paiement CinetPay (MTN/Orange Money, Visa, etc.)
 */
async function initiatePayment(userId, plan, returnUrl, notifyUrl) {
  const planData = PLANS[plan];
  if (!planData) throw new Error('Plan inconnu');

  const transactionId = `PP_${userId}_${Date.now()}`;

  const payload = {
    apikey:         CINETPAY_API_KEY,
    site_id:        CINETPAY_SITE_ID,
    transaction_id: transactionId,
    amount:         planData.amount,
    currency:       planData.currency,
    description:    `PronosticsPro – ${planData.label}`,
    return_url:     returnUrl  || `${process.env.FRONTEND_URL}/?payment=success`,
    notify_url:     notifyUrl  || `${process.env.BACKEND_URL}/api/payments/notify`,
    channels:       'MOBILE_MONEY,CREDIT_CARD',
    lang:           'fr',
    metadata:       JSON.stringify({ userId, plan }),
  };

  try {
    const res = await axios.post(`${CINETPAY_BASE_URL}/payment`, payload);
    const data = res.data;

    if (data.code !== '201') {
      throw new Error(data.message || 'Erreur CinetPay');
    }

    // Créer une subscription en attente
    await Subscription.create({
      userId,
      plan,
      amount:          planData.amount,
      currency:        planData.currency,
      paymentMethod:   'mobile_money',
      status:          'pending',
      externalRef:     transactionId,
    });

    return {
      paymentUrl:    data.data.payment_url,
      transactionId,
    };
  } catch (err) {
    throw new Error(`Paiement échoué: ${err.message}`);
  }
}

/**
 * Webhook CinetPay – appelé automatiquement après paiement
 */
async function handlePaymentNotification(body) {
  const { transaction_id, status, metadata } = body;

  if (status !== 'ACCEPTED') return { success: false, reason: 'Paiement non accepté' };

  let parsedMeta;
  try { parsedMeta = JSON.parse(metadata); }
  catch { return { success: false, reason: 'Metadata invalide' }; }

  const { userId, plan } = parsedMeta;
  const planData = PLANS[plan];
  if (!planData) return { success: false, reason: 'Plan inconnu' };

  // Calculer la date d'expiration
  const startDate = new Date();
  const endDate   = new Date();
  endDate.setDate(endDate.getDate() + planData.durationDays);

  // Mettre à jour l'abonnement
  await Subscription.findOneAndUpdate(
    { externalRef: transaction_id },
    { status: 'active', startDate, endDate },
  );

  // Activer le VIP sur l'utilisateur
  await User.findByIdAndUpdate(userId, {
    role: 'vip',
    'vip.active':    true,
    'vip.plan':      plan,
    'vip.startDate': startDate,
    'vip.endDate':   endDate,
  });

  return { success: true, userId, plan, endDate };
}

/**
 * Vérifier l'état d'un paiement manuellement
 */
async function checkPaymentStatus(transactionId) {
  try {
    const res = await axios.post(`${CINETPAY_BASE_URL}/payment/check`, {
      apikey:         CINETPAY_API_KEY,
      site_id:        CINETPAY_SITE_ID,
      transaction_id: transactionId,
    });
    return res.data;
  } catch (err) {
    throw new Error(`Vérification impossible: ${err.message}`);
  }
}

/**
 * Cron job hebdomadaire: désactiver les abonnements expirés
 */
async function deactivateExpiredSubscriptions() {
  const now = new Date();
  const expired = await Subscription.find({ status: 'active', endDate: { $lt: now } });

  for (const sub of expired) {
    await Subscription.findByIdAndUpdate(sub._id, { status: 'expired' });
    await User.findByIdAndUpdate(sub.userId, {
      role: 'user',
      'vip.active': false,
    });
    console.log(`ℹ️ Abonnement expiré désactivé: user ${sub.userId}`);
  }

  console.log(`✅ ${expired.length} abonnement(s) expiré(s) désactivé(s)`);
}

module.exports = {
  initiatePayment,
  handlePaymentNotification,
  checkPaymentStatus,
  deactivateExpiredSubscriptions,
  PLANS,
};
