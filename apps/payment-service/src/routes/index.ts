/**
 * Routes configuration for the payment service
 */
import express from 'express';
import * as customerController from '../controllers/customerController';
import * as creditController from '../controllers/creditController';
import * as checkoutController from '../controllers/checkoutController';
import * as webhookController from '../controllers/webhookController';

// Create the router
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Customer endpoints
router.post('/payment/customers', customerController.getOrCreateCustomer);
router.get('/payment/customer/credit', customerController.getCustomerCreditByUserId);
router.get('/payment/customers-direct/:customerId', customerController.getCustomerById);
router.get('/payment/customers-direct/:customerId/credit', customerController.getCustomerCreditById);
router.get('/payment/customers-direct/:customerId/transactions', customerController.getCustomerTransactions);

// Auto-recharge endpoints
router.get('/payment/auto-recharge', customerController.getAutoRechargeSettings);
router.post('/payment/auto-recharge', customerController.updateAutoRechargeSettings);

// Credit endpoints
router.post('/payment/validate-credit', creditController.validateCredit);
router.post('/payment/deduct-credit', creditController.deductCreditByUserId);
router.post('/payment/deduct-credit-direct', creditController.deductCreditById);

// Checkout endpoints
router.post('/payment/create-checkout-session', checkoutController.createCheckoutSession);

// Webhook endpoints
router.post('/payment/webhook', express.raw({ type: 'application/json' }), webhookController.handleWebhook);

export default router; 