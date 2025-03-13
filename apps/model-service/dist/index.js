"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * HelloWorld Model Service
 *
 * A simple Express server that simulates an LLM agent response.
 * In a real implementation, this would call an actual LLM API.
 */
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});
// LLM generation endpoint
app.post('/generate', (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    // In a real implementation, this would call an actual LLM API
    // For now, we'll just return a simple response
    const response = {
        model: 'hello-world-llm',
        generated_text: `Hello, World! You asked: "${prompt}". This is a simple AI response.`,
        tokens: {
            prompt_tokens: prompt.split(' ').length,
            completion_tokens: 20,
            total_tokens: prompt.split(' ').length + 20
        },
        request_id: `req_${Date.now()}`
    };
    // Simulate some processing time
    setTimeout(() => {
        res.status(200).json(response);
    }, 500);
});
// Start server
app.listen(PORT, () => {
    console.log(`🤖 Model Service running at http://localhost:${PORT}`);
});
