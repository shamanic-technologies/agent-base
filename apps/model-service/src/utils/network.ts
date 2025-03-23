/**
 * Network Utilities for Model Service
 * 
 * This module provides network-related utilities for the Model Service,
 * including request debugging and IPv6/IPv4 handling.
 */

import axios from 'axios';
import { URL } from 'url';

/**
 * Enhances axios with detailed debugging logs for network issues
 * Does not use fallbacks - properly surfaces all network errors
 */
export function setupNetworkDebugger(): void {
  // Save reference to original implementation
  const originalRequest = axios.request;
  
  // Override the request method to add detailed logging
  axios.request = function(...args) {
    const config = args[0];
    
    // Log basic request details
    console.log(`🔍 Request: ${config.method?.toUpperCase() || 'GET'} ${config.url}`);
    
    // Log hostname info to debug DNS resolution
    if (config.url) {
      try {
        const url = new URL(config.url);
        console.log(`🌐 Hostname: ${url.hostname}, Protocol: ${url.protocol}, Port: ${url.port || 'default'}`);
      } catch (e) {
        console.error(`⚠️ Invalid URL: ${config.url}`);
      }
    }
    
    // Add detailed error logging but maintain error propagation
    return originalRequest.apply(this, args).catch(error => {
      // For network errors, add detailed diagnostics
      if (axios.isAxiosError(error) && !error.response) {
        console.error(`❌ Network Error: ${error.message}`);
        
        // Log error code (ECONNREFUSED, etc.)
        if (error.code) {
          console.error(`Error code: ${error.code}`);
        }
        
        // Log underlying system error cause (IPv6 issues, etc.)
        if (error.cause) {
          console.error(`Error cause:`, error.cause);
          
          // Add Railway-specific IPv6 debugging for connection issues
          if (error.message.includes('ECONNREFUSED') && 
              (error.cause as any)?.address?.includes(':')) {
            console.error(`🔄 IPv6 connection error detected in Railway environment`);
          }
        }
        
        // Include request details for debugging
        console.error(`Request details:`, {
          method: config.method,
          url: config.url,
          headers: config.headers,
          timeout: config.timeout
        });
      }
      
      // Re-throw the original error - no fallbacks or swallowing errors
      throw error;
    });
  };
  
  console.log('🔧 Network debugger configured for model service');
}

/**
 * Configures and enhances logging for the server
 * @param server - Express server instance
 */
export function setupServerDebugger(server: any): void {
  // Add error listener
  server.on('error', (error: any) => {
    console.error('💥 Server error:', error);
    
    if ('code' in error) {
      console.error(`Error code: ${error.code}`);
    }
    
    if ('syscall' in error) {
      console.error(`System call: ${error.syscall}`);
    }
    
    if ('address' in error) {
      console.error(`Address: ${error.address}`);
    }
  });
  
  console.log('🔧 Server debugger configured for model service');
} 