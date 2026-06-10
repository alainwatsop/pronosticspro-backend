const express = require('express');
const { authenticate } = require('../middleware/auth');
const {
  initiatePayment,
  handlePaymentNotification,
  checkPaymentStatus,
  PLANS,
} = require('../services/paymentService');

const router = express.Router();

router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ error: 'Plan invalide. Choisir: starter, expert, pro' });

    const result = await initiatePayment(
      req.user._id,
      plan,
      req.body.returnUrl,
      req.body.notifyUrl
    );

    return res.json({
      success: true,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      plan: PLANS[plan],
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notify', async (req, res) => {
  try {
    const result = await handlePaymentNotification(req.body, req.headers);
    if (result.success) {
      return res.json({ code: '00', message: 'OK' });
    }
    return res.status(400).json({ code: '01', message: result.reason || 'Paiement non confirme' });
  } catch (err) {
    return res.status(500).json({ code: '99', message: err.message });
  }
});

router.get('/check/:transactionId', authenticate, async (req, res) => {
  try {
    const status = await checkPaymentStatus(req.params.transactionId);
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/plans', (_req, res) => res.json(PLANS));

module.exports = router;
