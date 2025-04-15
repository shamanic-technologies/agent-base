/**
 * FireCrawl Web Content Extraction Utility
 * 
 * Extracts content from web pages using the FireCrawl API and returns it in markdown format.
 * Useful for fetching clean, LLM-friendly content from websites.
 */
// import { z } from 'zod'; // Import Zod
import { 
  InternalUtilityTool, 
  ErrorResponse,
  JsonSchema
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';

// --- Local Type Definitions ---
// Moved from types/index.ts
export interface FireCrawlExtractContentRequest {
  url: string;
  onlyMainContent?: boolean;
}
// Assuming success response is the complex object returned by FireCrawl
// Define a more specific success response type
interface ReadWebPageSuccessResponse {
    status: 'success';
    data: {
        url: string;
        title?: string | null;
        favicon?: string | null;
        markdown?: string | null;
        language?: string | null;
        word_count?: number;
        detected_content_type?: string | null;
        extracted_at: string;
    };
}

type ReadWebPageResponse = ReadWebPageSuccessResponse | ErrorResponse;
// --- End Local Definitions ---

/**
 * Implementation of the FireCrawl content extraction utility
 */
const readWebPage: InternalUtilityTool = {
  id: 'utility_read_webpage',
  description: 'Read the content of a webpage using Firecrawl API',
  schema: {
    url: { 
      jsonSchema: {
        type: 'string',
        description: 'The URL to fetch content from (must include http:// or https://)',
        format: 'uri', // JSON Schema format for URL
        examples: ['https://example.com', 'http://blog.example.com/article'] // Move examples inside
      } satisfies JsonSchema,
      // examples: ['https://example.com', 'http://blog.example.com/article'] // Remove from here
    },
    onlyMainContent: { 
      jsonSchema: {
        type: 'boolean',
        description: 'Whether to extract only the main content without navigation, headers, footers, etc. (default: true)',
        default: true,
        examples: [true, false] // Move examples inside
      } satisfies JsonSchema,
      // examples: [true, false] // Remove from here
    }
  },
  
  execute: async (userId: string, conversationId: string, params: FireCrawlExtractContentRequest): Promise<ReadWebPageResponse> => {
    const logPrefix = '🔥 [FIRECRAWL]';
    try {
      // Use raw params, assuming validation happens elsewhere
      const { url, onlyMainContent = true } = params || {}; // Use raw params
      
      // Basic validation still useful within execute if not relying on central validation
      if (!url || typeof url !== 'string') {
        return { success: false, error: "URL is required and must be a string" } as ErrorResponse;
      }
      if (!url.match(/^https?:\/\/.+/)) {
        return { success: false, error: "Invalid URL format. URL must start with http:// or https://" } as ErrorResponse;
      }
      
      console.log(`${logPrefix} Extracting content from: "${url}" (onlyMainContent: ${onlyMainContent})`);
      
      // Use FireCrawl API to fetch content from the URL
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        console.error(`${logPrefix} FIRECRAWL_API_KEY not set`);
        return { success: false, error: "Service configuration error: FIRECRAWL_API_KEY is not set." } as ErrorResponse;
      }
      
      console.log('Firecrawl apiKey length:', apiKey.length); // Log length instead of key
      
      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: url,
          pageOptions: { // Use pageOptions as per Firecrawl docs
            onlyMainContent: onlyMainContent,
            formats: ["markdown"] // Keep if markdown is specifically needed
          },
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${logPrefix} FireCrawl API error (${response.status}): ${errorText}`);
        return {
            success: false,
            error: `Webpage scrape failed (HTTP ${response.status})`,
            details: errorText
        } as ErrorResponse;
      }

      const firecrawlData = await response.json();
      
      if (!firecrawlData || !firecrawlData.success || !firecrawlData.data) {
        console.error(`${logPrefix} FireCrawl response indicated failure or missing data:`, firecrawlData);
        return {
            success: false,
            error: 'Failed to extract content from webpage',
            details: firecrawlData?.message || 'FireCrawl API did not return valid data.'
        } as ErrorResponse;
      }

      // Return the extraction results in standard format
      const successResponse: ReadWebPageSuccessResponse = {
        status: 'success',
        data: {
          url: url,
          title: firecrawlData.data.metadata?.title || firecrawlData.data.title || null,
          favicon: firecrawlData.data.metadata?.ogImage || firecrawlData.data.favicon || null, // Prefer ogImage if available
          markdown: firecrawlData.data.markdown || null,
          language: firecrawlData.data.metadata?.language || null,
          word_count: firecrawlData.data.content?.split(' ').length || 0, // Simple word count
          detected_content_type: firecrawlData.data.metadata?.sourceURL?.includes('.pdf') ? 'application/pdf' : 'text/html', // Basic detection
          extracted_at: new Date().toISOString()
        }
      };
      return successResponse;

    } catch (error: any) {
      console.error(`${logPrefix} Error:`, error);
      // Remove Zod error handling
      // Return standard UtilityErrorResponse
      return {
        success: false,
        error: 'Failed to read webpage content',
        details: error instanceof Error ? error.message : String(error)
      } as ErrorResponse;
    }
  }
};

// Register the utility
registry.register(readWebPage);

// Export the utility
export default readWebPage; 