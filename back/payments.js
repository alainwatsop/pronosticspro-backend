// routes/payments.js
const express = require('express');
const router  = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  initiatePayment,
  handlePaymentNotification,
  checkPaymentStatus,
  PLANS,
} = require('../services/paymentService');

/**
 * POST /api/payments/initiate
 * Initier un paiement VIP (authentification requise)
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plan invalide. Choisir: starter, expert, pro' });

    const result = await initiatePayment(
      req.user._id,
      plan,
      req.body.returnUrl,
      req.body.notifyUrl,
    );

    res.json({
      success:       true,
      paymentUrl:    result.paymentUrl,
      transactionId: result.transactionId,
      plan:          PLANS[plan],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payments/notify
 * Webhook CinetPay (pas d'auth – appelé par CinetPay directement)
 */
router.post('/notify', async (req, res) => {
  try {
    const result = await handlePaymentNotification(req.body);
    if (result.success) {
      console.log(`✅ Paiement confirmé: user ${result.userId}, plan ${result.plan}`);
      res.json({ code: '00', message: 'OK' });
    } else {
      res.status(400).json({ code: '01', message: result.reason });
    }
  } catch (err) {
    console.error('❌ Webhook erreur:', err);
    res.status(500).json({ code: '99', message: err.message });
  }
});

/**
 * GET /api/payments/check/:transactionId
 * Vérifier le statut d'un paiement
 */
router.get('/check/:transactionId', authenticate, async (req, res) => {
  try {
    const status = await checkPaymentStatus(req.params.transactionId);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payments/plans
 * Récupérer les plans disponibles
 */
router.get('/plans', (req, res) => {
  res.json(PLANS);
});

module.exports = router;
