/**
 * Test script to check if environment variables are loaded correctly
 */

// Load dotenv
require('dotenv').config();

// Log environment variables
console.log('Available environment variables:');
console.log('PORT:', process.env.PORT);
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 
  `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...` : 'undefined');

// Try loading with .env.local specifically
console.log('\nTrying to load .env.local specifically:');
require('dotenv').config({ path: '.env.local' });
console.log('PORT:', process.env.PORT);
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? 
  `${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...` : 'undefined'); 