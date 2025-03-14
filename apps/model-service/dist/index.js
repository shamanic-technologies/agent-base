"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * LangGraph ReAct Agent Service
 *
 * A simple Express server that implements a Claude ReAct agent.
 * Uses LangGraph for handling the agent's reasoning and acting process.
 */
// Import and configure dotenv first
const dotenv_1 = __importDefault(require("dotenv"));
// Load appropriate environment variables based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
if (nodeEnv === 'production') {
    console.log('🚀 Loading production environment from .env.prod');
    dotenv_1.default.config({ path: '.env.prod' });
}
else {
    console.log('🔧 Loading development environment from .env.local');
    dotenv_1.default.config({ path: '.env.local' });
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const react_agent_1 = require("./lib/react-agent");
// Middleware setup
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        environment: nodeEnv,
        version: process.env.npm_package_version || '1.0.0'
    });
});
// LLM generation endpoint using ReAct agent
app.post('/generate', async (req, res) => {
    const { prompt, thread_id } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        // Process the prompt with our ReAct agent
        console.log(`Received prompt: "${prompt}"`);
        const response = await (0, react_agent_1.processWithReActAgent)(prompt, thread_id);
        // Return the agent's response
        res.status(200).json(response);
    }
    catch (error) {
        console.error('Error processing prompt with ReAct agent:', error);
        res.status(500).json({
            error: 'Failed to process prompt',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`🤖 LangGraph ReAct Agent Service running at http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${nodeEnv}`);
    console.log(`🔑 API Key ${process.env.ANTHROPIC_API_KEY ? 'is' : 'is NOT'} configured`);
});
