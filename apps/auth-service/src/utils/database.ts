/**
 * Database Service Integration
 * 
 * Utilities for communicating with the database service.
 */
import axios from 'axios';
import { UserProfile } from './passport';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

const dbServiceUrl = config.databaseServiceUrl;

/**
 * Saves a user to the database service
 * 
 * @param user User information to save
 * @returns Promise resolving to the saved user data
 */
export async function saveUserToDatabase(user: UserProfile): Promise<UserProfile | null> {
  try {
    console.log(`Sending user data to database service: ${dbServiceUrl}/db/users`);
    
    // Get all users and filter manually since the database service doesn't support JSONB path queries yet
    try {
      const response = await axios.get(`${dbServiceUrl}/db/users`);
      
      if (response.data?.success && response.data?.data?.items?.length > 0) {
        // Find user by provider ID in the data field
        const existingUser = response.data.data.items.find(
          (item: any) => item.data && item.data.providerId === user.id
        );
        
        if (existingUser) {
          // User exists, update them
          console.log(`User with provider ID ${user.id} exists, updating...`);
          
          // Format user data according to the database schema
          const userData = {
            data: {
              providerId: user.id,
              email: user.email,
              name: user.name,
              picture: user.picture,
              provider: user.provider,
              last_login: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          };
          
          const updateResponse = await axios.put(`${dbServiceUrl}/db/users/${existingUser.id}`, userData);
          
          if (updateResponse.data?.success) {
            console.log(`Successfully updated user with provider ID ${user.id} in database`);
            return updateResponse.data?.data || null;
          }
        } else {
          console.log(`User with provider ID ${user.id} doesn't exist, creating...`);
        }
      }
    } catch (error: any) {
      console.error('Error checking if user exists:', error.message);
    }
    
    // Create the user if they don't exist or get failed
    // Generate a proper UUID for the database
    const userData = {
      id: uuidv4(),
      data: {
        providerId: user.id,  // Store the Google ID in the data field
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: user.provider,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString()
      }
    };
    
    const createResponse = await axios.post(`${dbServiceUrl}/db/users`, userData);
    
    if (createResponse.data?.success) {
      console.log(`Successfully created user with provider ID ${user.id} in database`);
      return createResponse.data?.data || null;
    } else {
      console.error('Error creating user in database:', createResponse.data?.error);
      return null;
    }
  } catch (error: any) {
    console.error('Error creating user in database:', error);
    throw error;
  }
} 