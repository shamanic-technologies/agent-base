"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * HelloWorld Proxy Service
 *
 * A service that validates API keys and forwards requests to the Model Service.
 * This acts as a security layer between clients and the actual model.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT;
const MODEL_SERVICE_URL = process.env.MODEL_SERVICE_URL;
const KEY_SERVICE_URL = process.env.KEY_SERVICE_URL;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
/**
 * Validates an API key against the Key Service
 * Returns the validation result and user ID if valid
 */
const validateApiKey = async (apiKey) => {
    try {
        const response = await axios_1.default.post(`${KEY_SERVICE_URL}/keys/validate`, { apiKey });
        if (response.data.success) {
            return {
                valid: true,
                userId: response.data.data.userId
            };
        }
        return { valid: false };
    }
    catch (error) {
        console.error('Proxy Service: Error validating API key:', error);
        return { valid: false };
    }
};
/**
 * Health check endpoint
 * Returns the status of the proxy service and its connections
 */
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        services: {
            model: MODEL_SERVICE_URL,
            key: KEY_SERVICE_URL
        }
    });
});
/**
 * Generate endpoint
 * Validates API key and forwards request to model service
 * Requires both API key and conversation_id
 */
app.post('/generate', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    const { conversation_id } = req.body;
    // Check if API key is provided
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            error: 'Proxy Service: API key is required'
        });
    }
    // Check if conversation_id is provided
    if (!conversation_id) {
        return res.status(400).json({
            success: false,
            error: 'Proxy Service: conversation_id is required'
        });
    }
    // Validate the API key
    const validation = await validateApiKey(apiKey);
    if (!validation.valid) {
        return res.status(401).json({
            success: false,
            error: 'Proxy Service: Invalid API key'
        });
    }
    try {
        // Create a new request body that includes the user ID and conversation_id
        const enrichedRequestBody = {
            ...req.body,
            user_id: validation.userId,
            conversation_id
        };
        console.log(`Forwarding request for user ID: ${validation.userId}, conversation ID: ${conversation_id}`);
        // Forward the enriched request to the model service
        const response = await axios_1.default.post(`${MODEL_SERVICE_URL}/generate`, enrichedRequestBody);
        // Add user ID tracking info (in case it's not already included in response)
        if (response.data) {
            response.data.user_id = validation.userId;
        }
        // Return the model service response
        res.status(200).json(response.data);
    }
    catch (error) {
        console.error('Error forwarding request to model service:', error);
        // Check if it's a connection error
        if (axios_1.default.isAxiosError(error) && !error.response) {
            return res.status(502).json({
                success: false,
                error: 'Proxy Service: Could not connect to Model Service'
            });
        }
        // Forward the status code from the Model Service
        const status = axios_1.default.isAxiosError(error) ? error.response?.status || 500 : 500;
        res.status(status).json({
            success: false,
            error: 'Proxy Service: Error communicating with model service',
            details: axios_1.default.isAxiosError(error)
                ? error.response?.data || error.message
                : error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`🔐 Proxy Service running on port ${PORT}`);
    console.log(`🔄 Forwarding requests to Model Service at ${MODEL_SERVICE_URL}`);
    console.log(`🔑 Using Key Service at ${KEY_SERVICE_URL}`);
});
