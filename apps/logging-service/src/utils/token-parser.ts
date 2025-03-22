/**
 * Token parsing utilities
 */
import pino from 'pino';
import { ApiLogEntry } from '../types/index.js';

// Get the logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
  },
});

/**
 * Parse token usage from LangChain response body
 * @param responseBody The response body from a /generate call
 * @returns Object containing total input and output tokens
 */
export function parseTokenUsage(responseBody: any): { inputTokens: number, outputTokens: number } {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Check if responseBody has the expected structure
    if (!responseBody || !responseBody.messages || !Array.isArray(responseBody.messages)) {
      logger.warn('Response body does not have expected structure for token counting');
      return { inputTokens: 0, outputTokens: 0 };
    }

    // Iterate through all messages
    for (const message of responseBody.messages) {
      // Look for AIMessageChunk objects which contain usage metadata
      if (message?.id && 
          Array.isArray(message.id) && 
          message.id.includes("AIMessageChunk") &&
          message?.kwargs?.usage_metadata) {
        
        const metadata = message.kwargs.usage_metadata;
        
        // Extract token counts, if they're not redacted
        if (metadata.input_tokens && metadata.input_tokens !== "[REDACTED]") {
          const inputTokens = parseInt(metadata.input_tokens, 10);
          if (!isNaN(inputTokens)) {
            totalInputTokens += inputTokens;
            logger.debug(`Found ${inputTokens} input tokens in message ${message.kwargs?.id || 'unknown'}`);
          }
        }
        
        if (metadata.output_tokens && metadata.output_tokens !== "[REDACTED]") {
          const outputTokens = parseInt(metadata.output_tokens, 10);
          if (!isNaN(outputTokens)) {
            totalOutputTokens += outputTokens;
            logger.debug(`Found ${outputTokens} output tokens in message ${message.kwargs?.id || 'unknown'}`);
          }
        }
      }
    }
    
    // If we couldn't parse any tokens but found [REDACTED] values, log this information
    const foundRedactedValues = responseBody.messages.some(
      (msg: any) => msg?.kwargs?.usage_metadata?.input_tokens === "[REDACTED]" || 
                   msg?.kwargs?.usage_metadata?.output_tokens === "[REDACTED]"
    );
    
    if (totalInputTokens === 0 && totalOutputTokens === 0 && foundRedactedValues) {
      logger.info('Token counts are redacted in the response. Using estimation based on message length.');
      
      // Simple estimation based on human-readable content length
      // This is a fallback when token counts are redacted
      for (const message of responseBody.messages) {
        if (message?.kwargs?.content) {
          // Estimate tokens from content - rough approximation (~4 chars per token)
          const content = Array.isArray(message.kwargs.content) 
            ? message.kwargs.content.map((c: any) => c.text || "").join("")
            : String(message.kwargs.content);
            
          const estimatedTokens = Math.ceil(content.length / 4);
          
          if (message.id && Array.isArray(message.id)) {
            if (message.id.includes("HumanMessage")) {
              totalInputTokens += estimatedTokens;
            } else if (message.id.includes("AIMessageChunk")) {
              totalOutputTokens += estimatedTokens;
            }
          }
        }
      }
      
      logger.info(`Estimated tokens: ${totalInputTokens} input, ${totalOutputTokens} output`);
    }
    
    return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
  } catch (error) {
    logger.error('Error parsing token usage:', error);
    return { inputTokens: 0, outputTokens: 0 };
  }
}

/**
 * Calculate price based on API log entry
 * @param logEntry The API log entry to calculate price for
 * @returns The calculated price in USD
 */
export function calculatePrice(logEntry: ApiLogEntry): number {
  let price = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  // Calculate price based on endpoint
  if (logEntry.endpoint.startsWith('/utility')) {
    // Fixed price for utility calls
    price = 0.01;
  } else if (logEntry.endpoint.startsWith('/generate')) {
    // Token-based pricing for generate calls
    if (logEntry.responseBody) {
      // Parse token usage from the response body
      const tokenUsage = parseTokenUsage(logEntry.responseBody);
      inputTokens = tokenUsage.inputTokens;
      outputTokens = tokenUsage.outputTokens;
      
      // Calculate price based on token counts
      // Input tokens: $0.000006 per token
      // Output tokens: $0.00003 per token
      const inputPrice = inputTokens * 0.000006;
      const outputPrice = outputTokens * 0.00003;
      price = inputPrice + outputPrice;
      
      logger.info(`Calculated token-based price for ${logEntry.endpoint}: $${price.toFixed(6)} (${inputTokens} input tokens, ${outputTokens} output tokens)`);
    } else {
      // Fallback to fixed price if response body parsing fails
      price = 0.20;
      logger.warn(`Using fallback fixed price for ${logEntry.endpoint}: $${price.toFixed(2)} (no token data available)`);
    }
  }
  
  return price;
} 