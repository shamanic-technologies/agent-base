// import axios from 'axios';
// import { UserType, UtilityProvider, UtilitySecret } from '@agent-base/types';
// import { getSecretApiClient } from '@agent-base/api-client';

// /**
//  * Fetches specified secrets for a user and provider from the Secret Service.
//  * Calls the /api/get-secret endpoint individually for each requested secret.
//  * 
//  * @param userId - The ID of the user.
//  * @param provider - The utility provider (currently unused by the endpoint, but kept for consistency).
//  * @param secretKeys - An array of secret keys (secret types) to fetch.
//  * @param logPrefix - Optional prefix for logging.
//  * @returns A promise resolving to an object mapping secret keys to their fetched values (or null if not found/error).
//  * @throws Throws an error if the SECRET_SERVICE_URL is not configured or if a critical error occurs during API calls.
//  */
// export const fetchSecrets = async (
//     userId: string, 
//     provider: UtilityProvider,
//     secretKeys: UtilitySecret[],
//     logPrefix: string = '[SecretServiceClient]'
// ): Promise<Record<string, string | null>> => {
    
//     const secretServiceUrl = process.env.SECRET_SERVICE_URL;
//     if (!secretServiceUrl) {
//         console.error(`${logPrefix} SECRET_SERVICE_URL not set.`);
//         throw new Error('Secret Service URL is not configured.');
//     }

//     console.log(`${logPrefix} Fetching secrets: ${secretKeys.join(', ')} for user ${userId} via ${secretServiceUrl}`);

//     const results: Record<string, string | null> = {};

//     for (const secretKey of secretKeys) {
//         console.log(`${logPrefix} Fetching individual secret: ${secretKey}`);
//         try {
//             const response = await getSecretApiClient(
//                 { userType: UserType.Platform, secretType: secretKey },
//                 userId,
//                 platformApiKey,
//                 clientUserId
//             );

//             // const response = await axios.get<GetSecretResponse>(
//             //     `${secretServiceUrl}/api/get-secret`,
//             //     {
//             //         params: { secretType: secretKey },
//             //         headers: { 'x-user-id': userId }
//             //     }
//             // );

//             if (response.data?.success && response.data.data) {
//                 const value = typeof response.data.data.value === 'object' 
//                               ? JSON.stringify(response.data.data.value) 
//                               : String(response.data.data.value);
//                 results[secretKey] = value;
//                 console.log(`${logPrefix} Successfully fetched secret: ${secretKey}`);
//             } else {
//                 console.warn(`${logPrefix} Secret not found or fetch failed for key ${secretKey}:`, response.data?.error);
//                 results[secretKey] = null;
//             }

//         } catch (err) {
//             console.error(`${logPrefix} Error fetching individual secret ${secretKey}:`, err);
//             let detail = err instanceof Error ? err.message : String(err);
//             if (axios.isAxiosError(err) && err.response) {
//                 detail = `Status: ${err.response.status}, Data: ${JSON.stringify(err.response.data)}`;
//                 if (err.response.status === 404) {
//                     console.warn(`${logPrefix} Secret ${secretKey} explicitly not found (404).`);
//                     results[secretKey] = null;
//                     continue;
//                 }
//             } 
//             results[secretKey] = null; 
//         }
//     }

//     console.log(`${logPrefix} Finished fetching secrets. Result keys: ${Object.keys(results).join(', ')}`);
//     return results;
// }; 