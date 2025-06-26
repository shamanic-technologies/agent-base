/**
 * Routes configuration for the payment service
 */
import express from 'express';
import { getStripeCustomerCreditByPlatformUserId, getStripeTransactionsByStripeCustomerId, getStripeTransactions, getAutoRechargeSettings, updateAutoRechargeSettings } from '../controllers/customerController.js';
import { validateCredit, deductCreditByPlatformUserId } from '../controllers/creditController.js';
import { createCheckoutSession } from '../controllers/checkoutController.js';
import { handleWebhook } from '../controllers/webhookController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// Create the router
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Customer endpoints
router.get('/customer/credit', authMiddleware, getStripeCustomerCreditByPlatformUserId);
router.get('/customer/transactions/:stripeCustomerId', getStripeTransactionsByStripeCustomerId);
router.get('/customer/transactions', authMiddleware, getStripeTransactions);

// Auto-recharge endpoints
router.get('/auto-recharge', authMiddleware, getAutoRechargeSettings);
router.post('/auto-recharge', authMiddleware, updateAutoRechargeSettings);

// Credit endpoints
router.post('/validate-credit', authMiddleware, validateCredit);
router.post('/deduct-credit', authMiddleware, deductCreditByPlatformUserId);

// Checkout endpoints
router.post('/create-checkout-session', authMiddleware, createCheckoutSession);

// Webhook endpoints
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router; 