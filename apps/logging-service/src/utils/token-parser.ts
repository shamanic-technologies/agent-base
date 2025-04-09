/**
 * Token parsing utilities for Vercel AI SDK responses
 */

// Define ApiLogEntry inline or import from elsewhere
interface ApiLogEntry { [key: string]: any; endpoint: string; response_body?: any } // Placeholder with necessary fields

/**
 * Parse token usage from Vercel AI SDK response body
 * @param responseBody The response body from a streaming call
 * @returns Object containing total input and output tokens
 * @throws Error if token usage information cannot be found
 */
export function parseTokenUsage(responseBody: any): { inputTokens: number, outputTokens: number } {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    // Handle string response (the most common case from the streaming API)
    if (typeof responseBody === 'string') {
      // Vercel AI SDK format has lines like: e:{"finishReason":"stop","usage":{"promptTokens":675,"completionTokens":76}}
      const lines = responseBody.split('\n');
      
      for (const line of lines) {
        // Look for "e:" or "d:" prefixes that contain usage data
        if ((line.startsWith('e:') || line.startsWith('d:')) && line.includes('usage')) {
          try {
            const data = JSON.parse(line.substring(2));
            if (data.usage) {
              if (data.usage.promptTokens && !isNaN(data.usage.promptTokens)) {
                totalInputTokens = data.usage.promptTokens;
              }
              if (data.usage.completionTokens && !isNaN(data.usage.completionTokens)) {
                totalOutputTokens = data.usage.completionTokens;
              }
              // Found valid usage data, no need to continue
              break;
            }
          } catch (error) {
            // Skip this line if we can't parse it as JSON
            console.debug(`[Logging Service] Failed to parse line as JSON: ${line}`);
            continue;
          }
        }
      }
    } 
    // Handle pre-parsed JSON objects
    else if (responseBody && typeof responseBody === 'object') {
      // If it's an array, search for usage in items
      if (Array.isArray(responseBody)) {
        for (const item of responseBody) {
          if (item && item.usage) {
            if (item.usage.promptTokens) totalInputTokens = item.usage.promptTokens;
            if (item.usage.completionTokens) totalOutputTokens = item.usage.completionTokens;
            break;
          }
        }
      } 
      // If it's a direct object with usage
      else if (responseBody.usage) {
        if (responseBody.usage.promptTokens) totalInputTokens = responseBody.usage.promptTokens;
        if (responseBody.usage.completionTokens) totalOutputTokens = responseBody.usage.completionTokens;
      }
    } else {
      throw new Error('[Logging Service] Invalid response body format');
    }
    
    // If no tokens were found, throw an error
    if (totalInputTokens === 0 && totalOutputTokens === 0) {
      console.error('[Logging Service] No token usage information found in response');
      throw new Error('[Logging Service] No token usage information found in response');
    }
    
    console.info(`[Logging Service] Parsed token usage: ${totalInputTokens} input, ${totalOutputTokens} output`);
    return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens };
  } catch (error) {
    console.error('[Logging Service] Error parsing token usage:', error);
    throw error instanceof Error 
      ? error 
      : new Error('[Logging Service] Failed to parse token usage from response');
  }
}

/**
 * Calculate price based on API log entry
 * @param logEntry The API log entry to calculate price for
 * @returns The calculated price in USD
 * @throws Error if token usage cannot be determined for agent endpoints
 */
export function calculatePrice(logEntry: ApiLogEntry): number {
  let price = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  // Calculate price based on endpoint
  if (logEntry.endpoint.startsWith('/utility-tool')) {
    // Fixed price for utility calls
    price = 0.01;
  } else if (logEntry.endpoint.startsWith('/agent/stream')) {
    // Token-based pricing for agent calls
    if (logEntry.response_body) {
      // Parse token usage from the response body
      const tokenUsage = parseTokenUsage(logEntry.response_body);
      inputTokens = tokenUsage.inputTokens;
      outputTokens = tokenUsage.outputTokens;
      
      // Calculate price based on token counts
      // Input tokens: $0.000006 per token
      // Output tokens: $0.00003 per token
      const inputPrice = inputTokens * 0.000006;
      const outputPrice = outputTokens * 0.00003;
      price = inputPrice + outputPrice;
      
      console.info(`[Logging Service] Calculated token-based price for ${logEntry.endpoint}: $${price.toFixed(6)} (${inputTokens} input tokens, ${outputTokens} output tokens)`);
    } else {
      // Throw an error when there is no response body
      throw new Error(`[Logging Service] Cannot calculate price for ${logEntry.endpoint}: No response body available for token counting`);
    }
  } else {
    throw new Error(`[Logging Service] Cannot calculate price for ${logEntry.endpoint}: Not an agent or utility endpoint`);
  }
  
  return price;
} 