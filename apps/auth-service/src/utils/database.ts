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
    console.log(`Saving user data to database service via get-or-create endpoint`);
    
    // Format user data according to the database schema
    const userData = {
      id: uuidv4(),
      data: {
        providerId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: user.provider,
        last_login: new Date().toISOString()
      }
    };
    
    // Use the get-or-create-user endpoint to handle the save/update logic efficiently
    const response = await axios.post(`${dbServiceUrl}/db/users/get-or-create-user`, userData);
    
    if (response.data?.success) {
      if (response.data?.created) {
        console.log(`Successfully created user with provider ID ${user.id} in database`);
      } else {
        console.log(`Successfully updated user with provider ID ${user.id} in database`);
      }
      return response.data?.data || null;
    } else {
      console.error('Error saving user in database:', response.data?.error);
      return null;
    }
  } catch (error: any) {
    console.error('Error saving user in database:', error);
    throw error;
  }
} 