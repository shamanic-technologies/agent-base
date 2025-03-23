/**
 * Network Utilities for Model Service
 * 
 * This module provides network-related utilities for the Model Service,
 * including server debugging functionality.
 */

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