/**
 * Routes configuration for the payment service
 */
import express from 'express';
import * as customerController from '../controllers/customerController.js';
import * as creditController from '../controllers/creditController.js';
import * as checkoutController from '../controllers/checkoutController.js';
import * as webhookController from '../controllers/webhookController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

// Create the router
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Customer endpoints
// router.post('/customer', authMiddleware, customerController.getOrCreateCustomer);
router.get('/customer/credit', authMiddleware, customerController.getStripeCustomerCreditByPlatformUserId);
// router.get('/customer/:stripeCustomerId', customerController.getStripeCustomerByStripeCustomerId);
// router.get('/customer/credit/:stripeCustomerId', customerController.getStripeCustomerCreditByStripeCustomerId);
// router.get('/customer/transactions/:stripeCustomerId', customerController.getStripeTransactionsByStripeCustomerId);
router.get('/customer/transactions', customerController.getStripeTransactions);

// Auto-recharge endpoints
router.get('/auto-recharge', authMiddleware, customerController.getAutoRechargeSettings);
router.post('/auto-recharge', authMiddleware, customerController.updateAutoRechargeSettings);

// Credit endpoints
router.post('/validate-credit', authMiddleware, creditController.validateCredit);
router.post('/deduct-credit', authMiddleware, creditController.deductCreditByPlatformUserId);
// router.post('/deduct-credit/:stripeCustomerId', creditController.deductCreditByStripeCustomerId);

// Checkout endpoints
router.post('/create-checkout-session', authMiddleware, checkoutController.createCheckoutSession);

// Webhook endpoints
router.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

export default router; 