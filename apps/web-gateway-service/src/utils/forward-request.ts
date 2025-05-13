/**
 * Helper function to forward requests to microservices
 */
import { Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

export async function forwardRequest(targetUrl: string, req: Request, res: Response): Promise<void> {
    // Construct the target URL using req.url which excludes the mount point prefix 
    // but includes the query string.
    const targetPathWithQuery = req.url; // e.g., /platform-users/me?param=value
    const requestUrl = `${targetUrl}${targetPathWithQuery}`;
    
    // Log which path is being forwarded
    console.log(`[Web Gateway] Forwarding request to ${new URL(targetUrl).hostname} - ${req.method} ${targetPathWithQuery}`);
    
    try {
      const axiosConfig = {
        method: req.method,
        url: requestUrl,
        data: req.method !== 'GET' ? req.body : undefined,
        headers: {
          ...(req.headers || {}), // Fix: Provide default empty object if headers are undefined
          host: new URL(targetUrl).host
        },
        // Forward cookies for authentication
        withCredentials: true,
        // Never follow redirects, always pass them through to the client
        maxRedirects: 0,
      };
      
      // Log for debugging issues with headers
      if (process.env.DEBUG_HEADERS === 'true') {
        console.log(`[Web Gateway] Request headers:`, 
                    Object.keys(axiosConfig.headers).map(key => 
                      `${key}: ${key === 'authorization' ? 'Bearer ***' : 
                      (key === 'x-user-id' ? (axiosConfig.headers as Record<string, any>)[key] : '***')}`));
      }
      
      const response = await axios(axiosConfig);
      
      // Forward the response status, headers, and data
      res.status(response.status);
      
      // Forward all headers from the response, with special handling for cookies
      Object.entries(response.headers).forEach(([key, value]) => {
        if (value) {
          // For set-cookie headers, ensure they are properly preserved
          if (key.toLowerCase() === 'set-cookie') {
            console.log(`[Web Gateway] Found Set-Cookie header: ${typeof value}`, 
                        Array.isArray(value) ? `Array with ${value.length} items` : 'Single value');
            
            if (Array.isArray(value)) {
              value.forEach((cookie, i) => {
                console.log(`[Web Gateway] Setting cookie[${i}]:`, cookie.substring(0, 30) + '...');
                res.append('Set-Cookie', cookie);
              });
            } else {
              console.log(`[Web Gateway] Setting cookie:`, value.substring(0, 30) + '...');
              res.append('Set-Cookie', value);
            }
          } else {
            res.setHeader(key, value);
          }
        }
      });
      
      // For redirect responses (like OAuth redirects), just send the response without a body
      if (response.status >= 300 && response.status < 400) {
        console.log(`[Web Gateway] Forwarding ${response.status} redirect to: ${response.headers.location}`);
        console.log(`[Web Gateway] Response headers:`, Object.fromEntries(Object.entries(res.getHeaders())));
        res.end();
        return;
      }
      
      res.send(response.data);
      return;
    } catch (error) {
      console.error(`[Web Gateway] Error forwarding request to ${targetUrl}${req.originalUrl}:`, error);
      
      const axiosError = error as AxiosError;
      
      if (axiosError.response) {
        // Forward the error status and response from the microservice
        
        // Preserve any redirect status and headers
        if (axiosError.response.status >= 300 && axiosError.response.status < 400) {
          res.status(axiosError.response.status);
          console.log(`[Web Gateway] Handling error redirect (${axiosError.response.status}) to: ${axiosError.response.headers.location}`);
          
          // Copy all headers from the response
          Object.entries(axiosError.response.headers).forEach(([key, value]) => {
            if (value) {
              // Special handling for Set-Cookie headers
              if (key.toLowerCase() === 'set-cookie') {
                console.log(`[Web Gateway] Found Set-Cookie header: ${typeof value}`, 
                           Array.isArray(value) ? `Array with ${value.length} items` : 'Single value');
                
                if (Array.isArray(value)) {
                  value.forEach((cookie, i) => {
                    console.log(`[Web Gateway] Setting cookie[${i}]:`, cookie.substring(0, 30) + '...');
                    res.append('Set-Cookie', cookie);
                  });
                } else {
                  console.log(`[Web Gateway] Setting cookie:`, typeof value === 'string' ? value.substring(0, 30) + '...' : value);
                  res.append('Set-Cookie', value);
                }
              } else {
                res.setHeader(key, value);
              }
            }
          });
          
          console.log(`[Web Gateway] Response headers after processing:`, Object.fromEntries(Object.entries(res.getHeaders())));
          res.end();
          return;
        }
        
        res.status(axiosError.response.status).send(axiosError.response.data);
        return;
      } else if (axiosError.request) {
        // The request was made but no response was received
        res.status(502).json({
          success: false,
          error: `[Web Gateway] Could not connect to ${new URL(targetUrl).hostname}`
        });
        return;
      } else {
        // Something happened in setting up the request
        res.status(500).json({
          success: false,
          error: '[Web Gateway] Internal error'
        });
        return;
      }
    }
  }
  