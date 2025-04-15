/**
 * Database Service Integration
 * 
 * Utilities for communicating with the database service.
 */
import axios from 'axios';
import { config } from '../config/env';
import { GetOrCreateUserInput, GetOrCreateUserResponse, UserRecord, mapUserFromDatabase, User, ServiceResponse, ProviderUser } from '@agent-base/types';

const dbServiceUrl = config.databaseServiceUrl;

/**
 * Saves a user to the database service
 * 
 * @param user User information to save
 * @returns Promise resolving to the saved user data
 */
export async function saveUserToDatabase(user: ProviderUser): Promise<ServiceResponse<User>> {
  try {
    console.log(`Saving user data to database service via get-or-create endpoint`);
    
    // Format user data according to the GetOrCreateUserInput interface
    const userData: GetOrCreateUserInput = {
      provider_user_id: user.id,
      email: user.email,
      display_name: user.name,
      profile_image: user.picture
    };
    
    // Use the correct endpoint to handle the save/update logic efficiently
    const response = await axios.post<GetOrCreateUserResponse>(
      `${dbServiceUrl}/users/get-or-create-by-provider-user-id`, 
      userData
    );
    
    if (!response.data?.success) {
      console.error('Error saving user in database:', response.data?.error);
      return {
        success: false,
        error: response.data?.error
      };
    }
    
    // Log appropriate message based on whether user was created or updated
    if (response.data.created) {
      console.log(`Successfully created user with provider ID ${user.id} in database`);
    } else {
      console.log(`Successfully updated user with provider ID ${user.id} in database`);
    }
    
    // Map the database record back to a UserProfile
    const dbUser = response.data.data as UserRecord;
    if (!dbUser) {
      console.error('No user data returned from database service');
      return {
        success: false,
        error: 'No user data returned from database service'
      };
    }
    
    return {
      success: true,
      data: mapUserFromDatabase(dbUser)
    };
  } catch (error: any) {
    console.error('Error saving user in database:', error.message || error);
    return {
      success: false,
      error: error.message || error
    };
  }
} 