/**
 * Type declarations for Vercel AI SDK packages
 */

// declare module '@ai-sdk/anthropic' {
//   export function anthropic(modelName: string, options?: any): any;
// }

/*
Removed to allow TypeScript to use the default types from the 'ai' package.
If issues persist, this section may need to be reinstated with more accurate types.

declare module 'ai' {
  export interface TextStreamFullPart {
    type: string;
    [key: string]: any;
  }
  
  export interface StreamResult {
    fullStream: AsyncIterable<TextStreamFullPart>;
    text: Promise<string>;
    [key: string]: any;
  }
  
  export function streamText(options: {
    model: any;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    tools?: any;
    providerOptions?: any;
    onError?: (options: { error: any }) => void;
  }): StreamResult;
} 
*/ 