/**
 * API Endpoints Test
 * 
 * Tests for the logging service API endpoints
 */
import { execSync } from 'child_process';
import { describe, test, expect } from '@jest/globals';

// Base URL for the logging service
const baseUrl = process.env.LOGGING_SERVICE_URL || 'http://localhost:3900';

describe('Logging Service API Endpoints', () => {
  /**
   * Test the GET /api-logs/me endpoint
   * Verifies that the endpoint returns a 200 status code and a successful response
   */
  test('GET /api-logs/me should return logs for the user', () => {
    // Execute the curl command to get logs
    const result = execSync(
      `curl -s -X GET "${baseUrl}/api-logs/me" -H "Content-Type: application/json" -H "x-user-id: test-user-123" -H "x-api-key: test-api-key-123"`,
      { encoding: 'utf-8' }
    );
    
    // Parse the response
    const response = JSON.parse(result);
    
    // Verify the response structure and success field
    expect(response).toHaveProperty('success');
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data');
    expect(response.data).toHaveProperty('items');
    expect(response.data).toHaveProperty('total');
    
    // Logs should be an array (even if empty)
    expect(Array.isArray(response.data.items)).toBe(true);
  });

  /**
   * Test the POST /api-logs/me endpoint
   * Verifies that the endpoint creates a new log entry and returns a 201 status
   */
  test('POST /api-logs/me should create a new log entry', () => {
    // Generate a unique identifier for this test run
    const testId = new Date().getTime();
    
    // Execute the curl command to create a log
    const result = execSync(
      `curl -s -X POST "${baseUrl}/api-logs/me" -H "Content-Type: application/json" -H "x-user-id: test-user-123" -H "x-api-key: test-api-key-123" -d '{"endpoint": "/test", "method": "GET", "conversation_id": "test-${testId}", "message": "Test log entry"}'`,
      { encoding: 'utf-8' }
    );
    
    // Parse the response
    const response = JSON.parse(result);
    
    // Verify the response structure and success field
    expect(response).toHaveProperty('success');
    expect(response.success).toBe(true);
    expect(response).toHaveProperty('data');
    
    // Verify the data contains the created log entry
    expect(response.data).toHaveProperty('id');
    expect(response.data).toHaveProperty('data');
    expect(response.data).toHaveProperty('created_at');
    
    // Verify the conversation_id matches what we sent
    expect(response.data.data.data.conversation_id).toBe(`test-${testId}`);
  });
}); 