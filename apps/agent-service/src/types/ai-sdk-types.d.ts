/**
 * Type declarations for Vercel AI SDK packages
 */

declare module '@ai-sdk/anthropic' {
  export function anthropic(modelName: string, options?: any): any;
}

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