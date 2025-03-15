/**
 * API route to handle streaming proxy requests to the Agent Base
 * This keeps the API key secure on the server side
 */
import { NextRequest } from 'next/server';
import { callServerProxyApi } from '../../../../lib/api';

// Define response headers for Server-Sent Events (SSE)
const sseHeaders = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
};

// GET handler for streaming proxy requests
export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint');
  const dataStr = searchParams.get('data');
  
  // Exit early if required parameters are missing
  if (!endpoint) {
    return new Response(
      createSSEMessage(JSON.stringify({ error: 'Missing required field: endpoint' })),
      { 
        status: 400, 
        headers: sseHeaders 
      }
    );
  }
  
  // Parse the data if provided
  let data;
  if (dataStr) {
    try {
      data = JSON.parse(dataStr);
    } catch (error) {
      return new Response(
        createSSEMessage(JSON.stringify({ error: 'Invalid data format' })),
        { 
          status: 400, 
          headers: sseHeaders 
        }
      );
    }
  }
  
  try {
    // Create a TransformStream to forward the proxy service's SSE responses
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Start the streaming request to the proxy service
    const proxyEndpoint = '/api/generate/stream';
    const proxyUrl = process.env.NEXT_PUBLIC_AGENT_BASE_URL + proxyEndpoint;
    const apiKey = process.env.AGENT_BASE_API_KEY || '';
    
    if (!apiKey) {
      await writer.write(encoder.encode(createSSEMessage(JSON.stringify({
        error: 'API key not found in environment variables'
      }))));
      await writer.write(encoder.encode(createSSEMessage('[DONE]')));
      await writer.close();
      return new Response(stream.readable, { headers: sseHeaders });
    }
    
    // Make the request to the proxy service
    const fetchController = new AbortController();
    const fetchPromise = fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        prompt: data?.prompt,
        thread_id: data?.thread_id,
        stream_modes: data?.stream_modes || ['messages', 'events']
      }),
      signal: fetchController.signal,
    });
    
    // Set up a request timeout
    const timeoutId = setTimeout(() => {
      fetchController.abort();
    }, 60000); // 60 second timeout
    
    const response = await fetchPromise;
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      await writer.write(encoder.encode(createSSEMessage(JSON.stringify({
        error: `Proxy service error: ${response.status} ${response.statusText}`
      }))));
      await writer.write(encoder.encode(createSSEMessage('[DONE]')));
      await writer.close();
      return new Response(stream.readable, { headers: sseHeaders });
    }
    
    // Set up the response stream reader
    const reader = response.body!.getReader();
    
    // Forward chunks from the proxy service to the client
    try {
      // Process stream chunks
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process any complete messages in the buffer
        let lineEnd;
        while ((lineEnd = buffer.indexOf('\n\n')) >= 0) {
          const line = buffer.slice(0, lineEnd);
          buffer = buffer.slice(lineEnd + 2);
          
          // If it's a data line, forward it
          if (line.startsWith('data: ')) {
            await writer.write(encoder.encode(line + '\n\n'));
          }
        }
      }
      
      // Handle any remaining data in the buffer
      if (buffer.length > 0 && buffer.startsWith('data: ')) {
        await writer.write(encoder.encode(buffer + '\n\n'));
      }
      
      // Signal end of stream
      await writer.write(encoder.encode(createSSEMessage('[DONE]')));
    } catch (error) {
      console.error('Stream processing error:', error);
      await writer.write(encoder.encode(createSSEMessage(JSON.stringify({
        error: 'Stream processing error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }))));
      await writer.write(encoder.encode(createSSEMessage('[DONE]')));
    } finally {
      await writer.close();
    }
    
    return new Response(stream.readable, { headers: sseHeaders });
  } catch (error) {
    console.error('Proxy API error:', error);
    
    return new Response(
      createSSEMessage(JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred while calling the proxy service'
      })) + createSSEMessage('[DONE]'),
      { 
        status: 500, 
        headers: sseHeaders 
      }
    );
  }
}

// Helper function to create SSE message format
const encoder = new TextEncoder();
function createSSEMessage(data: string): string {
  return `data: ${data}\n\n`;
} 