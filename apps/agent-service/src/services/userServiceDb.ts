// /**
//  * Database Service Client - User Functions
//  * 
//  * Functions for interacting with user-related endpoints in the database-service.
//  */
// import axios from 'axios';
// import { UserRecord, UserResponse, GetOrCreateUserInput, GetOrCreateUserResponse, User } from '@agent-base/types';
// import { handleAxiosError } from '../lib/utils/errorHandlers.js';

// // Ensure the URL points to the correct database service port (e.g., 3006)
// // Consider moving this to a shared config/constants file if used in multiple service files
// const DATABASE_SERVICE_URL = process.env.DATABASE_SERVICE_URL || 'http://localhost:3006';

// /**
//  * Fetches user profile information from the database service.
//  * Uses the /users/me endpoint which relies on the x-user-id header.
//  * Returns UserResponse
//  */
// export async function getUserById(userId: string): Promise<UserResponse> {
//     if (!DATABASE_SERVICE_URL) {
//       const errorMsg = "Database service URL not configured.";
//       console.error(`[Service: Database User] ${errorMsg}`);
//       return { success: false, error: errorMsg };
//     }
//     if (!userId) {
//       const errorMsg = "User ID (for x-user-id header) is required to fetch profile.";
//       console.warn(`[Service: Database User] ${errorMsg}`);
//       return { success: false, error: errorMsg };
//     }
  
//     // Use the correct endpoint found in database-service
//     const url = `${DATABASE_SERVICE_URL}/users/me`; 
  
//     try {
//       // Endpoint returns { success: boolean, data: UserRecord, error?: string }
//       const response = await axios.get<UserResponse>(url, {
//         headers: {
//           'x-user-id': userId // Pass the user ID in the header
//         }
//       }); 
      
//       if (response.data?.success) {
//         return response.data;
//       } else {
//         // Handle cases where success might be false or data is missing
//         const errorMsg = response.data?.error || `Failed to fetch profile via /users/me (status: ${response.status})`;
//         console.warn(`[Service: Database User] Failed fetch for user via header ID ${userId}: ${errorMsg}`);
//         return { success: false, error: String(errorMsg) };
//       }
//     } catch (error) {
//       console.error(`[Service: Database User] Error fetching profile via /users/me for user ID ${userId}:`, error);
//        // Use handleAxiosError which can extract status code etc.
//        // Check for 404 specifically within the catch block for Axios errors
//        if (axios.isAxiosError(error) && error.response?.status === 404) {
//            return { success: false, error: 'User not found' };
//        }
//       const formattedError = handleAxiosError(error, 'Database Service (User Profile /me)'); 
//       return { success: false, error: formattedError.message };
//     }
// } 