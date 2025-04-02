/**
 * Error handler utility
 */
import { Response } from 'express';
import { createCollection } from '../db.js';

/**
 * Handle database errors and send appropriate response
 */
export function handleDatabaseError(error: any, res: Response, collection?: string): void {
  console.error('Database error:', error);
  
  // Check if the error is about a relation not existing (table not found)
  if (error.code === '42P01' && collection) {
    // Try to create the table
    createCollection(collection)
      .then(() => {
        res.status(404).json({
          success: false,
          error: `Collection "${collection}" not found but has been created. Please try again.`
        });
      })
      .catch(createErr => {
        console.error('Error creating collection:', createErr);
        res.status(500).json({
          success: false,
          error: `Failed to create collection: ${createErr.message}`
        });
      });
    return;
  }
  
  res.status(500).json({
    success: false,
    error: error.message || 'Database operation failed'
  });
} 