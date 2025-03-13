"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * HelloWorld Payment Service
 *
 * A simple service for handling payments and subscriptions.
 * Uses in-memory storage for demonstration purposes.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3007;
// In-memory storage
const plans = [
    {
        id: 'plan_basic',
        name: 'Basic',
        price: 9.99,
        tokenLimit: 100000,
        description: 'Basic plan with limited tokens',
        active: true
    },
    {
        id: 'plan_pro',
        name: 'Professional',
        price: 29.99,
        tokenLimit: 500000,
        description: 'Professional plan with more tokens',
        active: true
    },
    {
        id: 'plan_enterprise',
        name: 'Enterprise',
        price: 99.99,
        tokenLimit: 2000000,
        description: 'Enterprise plan with maximum tokens',
        active: true
    }
];
const subscriptions = [];
const transactions = [];
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
/**
 * Get available plans
 */
app.get('/payment/plans', (req, res) => {
    try {
        const activePlans = plans.filter(plan => plan.active);
        return res.status(200).json({
            success: true,
            data: activePlans
        });
    }
    catch (error) {
        console.error('Error retrieving plans:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve plans'
        });
    }
});
/**
 * Get a specific plan
 */
app.get('/payment/plans/:id', (req, res) => {
    try {
        const { id } = req.params;
        const plan = plans.find(p => p.id === id && p.active);
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }
        return res.status(200).json({
            success: true,
            data: plan
        });
    }
    catch (error) {
        console.error('Error retrieving plan:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve plan'
        });
    }
});
/**
 * Create a subscription
 *
 * Request body:
 * - userId: ID of the user
 * - planId: ID of the plan
 * - paymentMethod: Payment method details
 */
app.post('/payment/subscriptions', (req, res) => {
    try {
        const { userId, planId, paymentMethod } = req.body;
        if (!userId || !planId || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'User ID, plan ID, and payment method are required'
            });
        }
        // Check if plan exists
        const plan = plans.find(p => p.id === planId && p.active);
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }
        // Check if user already has an active subscription
        const existingSubscription = subscriptions.find(sub => sub.userId === userId && sub.status === 'active');
        if (existingSubscription) {
            return res.status(409).json({
                success: false,
                error: 'User already has an active subscription',
                data: {
                    subscriptionId: existingSubscription.id
                }
            });
        }
        // Create subscription
        const subscriptionId = `sub_${(0, uuid_1.v4)()}`;
        const now = new Date();
        const subscription = {
            id: subscriptionId,
            userId,
            planId,
            planName: plan.name,
            status: 'active',
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: new Date(now.setMonth(now.getMonth() + 1)).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        // Add to subscriptions
        subscriptions.push(subscription);
        // Create transaction record
        const transactionId = `txn_${(0, uuid_1.v4)()}`;
        const transaction = {
            id: transactionId,
            userId,
            subscriptionId,
            amount: plan.price,
            currency: 'USD',
            status: 'succeeded',
            description: `Subscription to ${plan.name} plan`,
            createdAt: new Date().toISOString()
        };
        // Add to transactions
        transactions.push(transaction);
        return res.status(201).json({
            success: true,
            data: {
                subscription,
                transaction
            }
        });
    }
    catch (error) {
        console.error('Error creating subscription:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create subscription'
        });
    }
});
/**
 * Get a user's subscriptions
 */
app.get('/payment/subscriptions/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userSubscriptions = subscriptions.filter(sub => sub.userId === userId);
        return res.status(200).json({
            success: true,
            data: userSubscriptions
        });
    }
    catch (error) {
        console.error('Error retrieving subscriptions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve subscriptions'
        });
    }
});
/**
 * Cancel a subscription
 */
app.post('/payment/subscriptions/:id/cancel', (req, res) => {
    try {
        const { id } = req.params;
        const subscriptionIndex = subscriptions.findIndex(sub => sub.id === id);
        if (subscriptionIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Subscription not found'
            });
        }
        // Update subscription status
        subscriptions[subscriptionIndex] = {
            ...subscriptions[subscriptionIndex],
            status: 'cancelled',
            updatedAt: new Date().toISOString(),
            cancelledAt: new Date().toISOString()
        };
        return res.status(200).json({
            success: true,
            data: subscriptions[subscriptionIndex]
        });
    }
    catch (error) {
        console.error('Error cancelling subscription:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to cancel subscription'
        });
    }
});
/**
 * Get a user's transactions
 */
app.get('/payment/transactions/user/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const userTransactions = transactions.filter(txn => txn.userId === userId);
        return res.status(200).json({
            success: true,
            data: userTransactions
        });
    }
    catch (error) {
        console.error('Error retrieving transactions:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve transactions'
        });
    }
});
/**
 * Create a one-time payment
 *
 * Request body:
 * - userId: ID of the user
 * - amount: Amount to charge
 * - description: Description of the payment
 * - paymentMethod: Payment method details
 */
app.post('/payment/charge', (req, res) => {
    try {
        const { userId, amount, description, paymentMethod } = req.body;
        if (!userId || !amount || !description || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'User ID, amount, description, and payment method are required'
            });
        }
        // Create transaction record
        const transactionId = `txn_${(0, uuid_1.v4)()}`;
        const transaction = {
            id: transactionId,
            userId,
            amount,
            currency: 'USD',
            status: 'succeeded',
            description,
            createdAt: new Date().toISOString()
        };
        // Add to transactions
        transactions.push(transaction);
        return res.status(201).json({
            success: true,
            data: transaction
        });
    }
    catch (error) {
        console.error('Error creating charge:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create charge'
        });
    }
});
/**
 * Get token usage for a user
 *
 * Query params:
 * - period: 'day', 'week', 'month' (default: 'month')
 */
app.get('/payment/usage/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        const { period = 'month' } = req.query;
        // Find active subscription for the user
        const subscription = subscriptions.find(sub => sub.userId === userId && sub.status === 'active');
        if (!subscription) {
            return res.status(404).json({
                success: false,
                error: 'No active subscription found'
            });
        }
        // Find the plan
        const plan = plans.find(p => p.id === subscription.planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                error: 'Plan not found'
            });
        }
        // Generate example usage data
        const totalUsage = Math.floor(Math.random() * plan.tokenLimit * 0.8);
        // Create mock usage data
        const usage = {
            userId,
            planId: plan.id,
            planName: plan.name,
            period: period,
            tokenLimit: plan.tokenLimit,
            tokenUsage: totalUsage,
            remainingTokens: plan.tokenLimit - totalUsage,
            usagePercentage: (totalUsage / plan.tokenLimit) * 100,
            lastUpdated: new Date().toISOString()
        };
        return res.status(200).json({
            success: true,
            data: usage
        });
    }
    catch (error) {
        console.error('Error retrieving usage:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve usage'
        });
    }
});
// Start the server
app.listen(PORT, () => {
    console.log(`💰 Payment Service running on port ${PORT}`);
});
