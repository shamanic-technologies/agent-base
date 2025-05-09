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
  ServiceResponse,
  UtilityProvider
} from '@agent-base/types';
import { registry } from '../../../registry/registry.js';

// --- Local Type Definitions ---
// Moved from types/index.ts
export interface FireCrawlExtractContentRequest {
  url: string;
  onlyMainContent?: boolean;
  fromLine?: number; // New parameter: starting line (1-indexed)
  toLine?: number;   // New parameter: ending line (1-indexed)
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
    type: 'object',
    properties: {
      url: { 
        type: 'string',
        description: 'The URL to fetch content from (must include http:// or https://)',
        format: 'uri',
        examples: ['https://example.com', 'http://blog.example.com/article']
      },
      onlyMainContent: { 
        type: 'boolean',
        description: 'Whether to extract only the main content without navigation, headers, footers, etc. (default: true)',
        default: true,
        examples: [true, false]
      },
      fromLine: { // Schema for fromLine
        type: 'integer',
        description: 'Optional: The 1-indexed line number to start extracting content from. Defaults to 1 if not provided.',
        minimum: 0,
        default: 0, // Schema default
        examples: [10, 50]
      },
      toLine: { // Schema for toLine
        type: 'integer',
        description: 'Optional: The 1-indexed line number to end extracting content at (inclusive). Defaults to 200 if not provided (or end of content if shorter).',
        minimum: 0,
        default: 199, // Schema default
        examples: [100, 200]
      }
    },
    required: ['url']
  },
  
  execute: async (clientUserId: string, platformUserId: string, platformApiKey: string, conversationId: string, params: FireCrawlExtractContentRequest): Promise<ReadWebPageResponse> => {
    const logPrefix = '🔥 [FIRECRAWL]';
    try {
      // Defaults are now 0-indexed: fromLine=0, toLine=199 (inclusive)
      const { url, onlyMainContent = true, fromLine = 0, toLine = 199 } = params || {};
      
      if (!url || typeof url !== 'string') {
        return { success: false, error: "URL is required and must be a string" } as ErrorResponse;
      }
      if (!url.match(/^https?:\/\/.+/)) {
        return { success: false, error: "Invalid URL format. URL must start with http:// or https://" } as ErrorResponse;
      }
      
      console.log(`${logPrefix} Extracting content from: "${url}" (onlyMainContent: ${onlyMainContent}, fromLine: ${fromLine}, toLine: ${toLine})`);
      
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
          // V1 Structure: move options to top level
          onlyMainContent: onlyMainContent,
          formats: ["markdown"] // Request markdown format
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

      let markdownContent = firecrawlData.data.markdown || ""; // Default to empty string to prevent split error

      if (markdownContent.length > 0) {
        const lines = markdownContent.split('\n');
        const totalLines = lines.length;

        // fromLine and toLine are already 0-indexed from destructuring
        let startIdx = fromLine;
        // toLine is the 0-indexed *inclusive* end. For slice, the end index is *exclusive*.
        let endExclusiveIdx = toLine + 1;

        // Clamp start index: cannot be less than 0, cannot be more than totalLines (slice handles start > end)
        startIdx = Math.max(0, startIdx);
        startIdx = Math.min(startIdx, totalLines);

        // Clamp end index (exclusive for slice): cannot be less than start, cannot be more than totalLines
        endExclusiveIdx = Math.max(startIdx, endExclusiveIdx);
        endExclusiveIdx = Math.min(endExclusiveIdx, totalLines);
        
        if (startIdx < endExclusiveIdx) {
          markdownContent = lines.slice(startIdx, endExclusiveIdx).join('\n');
          console.log(`${logPrefix} Markdown sliced. Params: fromLine=${params?.fromLine}(used ${fromLine}), toLine=${params?.toLine}(used ${toLine}). Effective 0-indexed slice: [${startIdx}-${endExclusiveIdx-1}]. Orig: ${totalLines}, New: ${markdownContent.split('\n').length}`);
        } else {
          // This case covers when the range is invalid (e.g., start >= end after clamping) or content was empty.
          markdownContent = ""; 
          console.log(`${logPrefix} Range results in empty selection or original content was empty. Params: fromLine=${params?.fromLine}(used ${fromLine}), toLine=${params?.toLine}(used ${toLine}). Effective 0-indexed slice: [${startIdx}-${endExclusiveIdx-1}]. Orig: ${totalLines}`);
        }
      } else {
        // markdownContent was initially null or empty, remains empty string.
        markdownContent = ""; 
      }

      // Return the extraction results in standard format
      const successResponse: ReadWebPageSuccessResponse = {
        status: 'success',
        data: {
          url: url,
          title: firecrawlData.data.metadata?.title || firecrawlData.data.title || null,
          favicon: firecrawlData.data.metadata?.ogImage || firecrawlData.data.favicon || null, // Prefer ogImage if available
          markdown: markdownContent, // Use potentially sliced markdown
          language: firecrawlData.data.metadata?.language || null,
          word_count: markdownContent?.split(/\s+/).filter(Boolean).length || 0, // Recalculate word count on potentially sliced markdown
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