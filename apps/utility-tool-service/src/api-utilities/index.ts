/**
 * Utilities Index
 * 
 * This file imports all utility implementations to ensure they are registered
 */

// Import all utilities
import './datetime/get-current.js';

// Eventually add more imports here as new utilities are created:
// import './github/read-file.js';
// import './github/update-file.js';
// etc.

// Export the registry for convenience
export { registry } from '../registry/registry.js'; 