/**
 * Routes configuration for the payment service
 */
import express from 'express';
import * as customerController from '../controllers/customerController';
import * as creditController from '../controllers/creditController';
import * as planController from '../controllers/planController';

// Create the router
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Plan endpoints
router.get('/payment/plans', planController.getPlans);
router.get('/payment/plans/:id', planController.getPlanById);

// Customer endpoints
router.post('/payment/customers', customerController.getOrCreateCustomer);
router.get('/payment/customers/:userId/credit', customerController.getCustomerCreditByUserId);
router.get('/payment/customers-direct/:customerId', customerController.getCustomerById);
router.get('/payment/customers-direct/:customerId/credit', customerController.getCustomerCreditById);
router.get('/payment/customers-direct/:customerId/transactions', customerController.getCustomerTransactions);

// Credit endpoints
router.post('/payment/validate-credit', creditController.validateCredit);
router.post('/payment/add-credit', creditController.addCreditByUserId);
router.post('/payment/add-credit-direct', creditController.addCreditById);
router.post('/payment/deduct-credit', creditController.deductCreditByUserId);
router.post('/payment/deduct-credit-direct', creditController.deductCreditById);

export default router; 