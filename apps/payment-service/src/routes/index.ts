/**
 * Routes configuration for the payment service
 */
import express from 'express';
import * as customerController from '../controllers/customerController.js';
import * as creditController from '../controllers/creditController.js';
import * as checkoutController from '../controllers/checkoutController.js';
import * as webhookController from '../controllers/webhookController.js';

// Create the router
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Customer endpoints
router.post('/customer', customerController.getOrCreateCustomer);
router.get('/customer/credit', customerController.getStripeCustomerCreditByPlatformUserId);
router.get('/customer/:stripeCustomerId', customerController.getStripeCustomerByStripeCustomerId);
router.get('/customer/credit/:stripeCustomerId', customerController.getStripeCustomerCreditByStripeCustomerId);
router.get('/customer/transactions/:stripeCustomerId', customerController.getStripeTransactionsByStripeCustomerId);

// Auto-recharge endpoints
router.get('/auto-recharge', customerController.getAutoRechargeSettings);
router.post('/auto-recharge', customerController.updateAutoRechargeSettings);

// Credit endpoints
router.post('/validate-credit', creditController.validateCredit);
router.post('/deduct-credit', creditController.deductCreditByPlatformUserId);
router.post('/deduct-credit/:stripeCustomerId', creditController.deductCreditByStripeCustomerId);

// Checkout endpoints
router.post('/create-checkout-session', checkoutController.createCheckoutSession);

// Webhook endpoints
router.post('/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

export default router; 