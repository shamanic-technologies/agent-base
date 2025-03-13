/**
 * Model Service Integration Tests
 * 
 * This file contains automated tests for the Model Service API endpoints
 * using Jest as the testing framework.
 * 
 * To run these tests:
 * 1. Make sure the Model Service is running (cd apps/model-service && tsx watch src/index.ts)
 * 2. Install Jest: npm install --save-dev jest
 * 3. Run the tests: npx jest test-model-service.test.js
 */

const fetch = require('node-fetch');

// Test configuration
const MODEL_SERVICE_URL = 'http://localhost:3001';

// Helper function to make API requests
async function callModelService(endpoint, payload) {
  const response = await fetch(`${MODEL_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  return {
    status: response.status,
    headers: response.headers,
    body: await response.json(),
  };
}

// Basic health check test
describe('Model Service Health', () => {
  test('Server is running', async () => {
    try {
      const response = await fetch(`${MODEL_SERVICE_URL}/health`);
      expect(response.status).toBe(200);
    } catch (error) {
      throw new Error(`Model Service is not running at ${MODEL_SERVICE_URL}. Start it before running tests.`);
    }
  });
});

// Text generation tests
describe('Text Generation', () => {
  test('Should generate text from a simple prompt', async () => {
    // Arrange
    const prompt = 'Hello, World!';
    
    // Act
    const response = await callModelService('/generate', { prompt });
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('generated_text');
    expect(response.body).toHaveProperty('model');
    expect(response.body).toHaveProperty('tokens');
    expect(response.body).toHaveProperty('request_id');
    expect(typeof response.body.generated_text).toBe('string');
    expect(response.body.tokens.total).toBeGreaterThan(0);
  });

  test('Should handle empty prompts', async () => {
    // Arrange
    const prompt = '';
    
    // Act
    const response = await callModelService('/generate', { prompt });
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('generated_text');
  });

  test('Should accept and use different model parameters', async () => {
    // Arrange
    const payload = {
      prompt: 'Tell me about AI',
      temperature: 0.2,
      max_tokens: 50
    };
    
    // Act
    const response = await callModelService('/generate', payload);
    
    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('generated_text');
    // The response should be somewhat bounded by our max_tokens parameter
    expect(response.body.tokens.completion).toBeLessThanOrEqual(60); // Allow some margin
  });
});

// Error handling tests
describe('Error Handling', () => {
  test('Should return an appropriate error for invalid JSON', async () => {
    // Arrange & Act
    const response = await fetch(`${MODEL_SERVICE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{invalid-json',
    });
    
    // Assert
    expect(response.status).toBe(400);
  });

  test('Should handle missing prompt parameter', async () => {
    // Arrange & Act
    const response = await callModelService('/generate', {});
    
    // Assert
    expect(response.status).toBe(400);
  });
});

// Performance test
describe('Performance', () => {
  test('Should respond within a reasonable time', async () => {
    // Arrange
    const prompt = 'Hello, World!';
    const start = Date.now();
    
    // Act
    await callModelService('/generate', { prompt });
    const duration = Date.now() - start;
    
    // Assert
    console.log(`Request completed in ${duration}ms`);
    expect(duration).toBeLessThan(5000); // 5 seconds max
  }, 10000); // Longer timeout for this test
});

// Additional tests can be added for other endpoints or functionalities 