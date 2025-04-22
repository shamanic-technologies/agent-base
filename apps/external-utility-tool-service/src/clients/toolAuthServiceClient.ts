// import { makeServiceRequest, OAuthProvider } from '@agent-base/api-client';
// // Import types directly from their definition files if not exported at root
// import { UtilityProvider, ServiceResponse } from '@agent-base/types';
// import { OAuth, CheckAuthInput } from '@agent-base/types';

// // const toolAuthServiceUrl = process.env.TOOL_AUTH_SERVICE_URL; // REMOVE: Read dynamically

// // Define the expected structure of the credential object from the auth service
// interface AuthCredential {
//     accessToken: string;
//     // Add other relevant fields like scope, expiry, etc., if needed
// }

// // Define the expected response structure from the check-auth endpoint
// interface CheckAuthResponse {
//     success: boolean;
//     hasAuth: boolean;
//     authUrl?: string;
//     credentials?: AuthCredential[];
//     error?: string;
// }

// // Define the expected success data structure when auth is present
// interface CheckAuthSuccessData {
//     hasAuth: true;
//     credentials: OAuth[];
// }

// // Define the expected success data structure when auth is needed
// interface CheckAuthNeededData {
//     hasAuth: false;
//     authUrl: string;
// }

// // Combined type for the data part of a successful ServiceResponse from check-auth
// export type CheckAuthResultData = CheckAuthSuccessData | CheckAuthNeededData;

// /**
//  * Checks the authorization status for a user, provider, and scopes with the Tool Auth Service.
//  * Uses the shared makeServiceRequest utility.
//  * 
//  * @param userId - The ID of the user.
//  * @param provider - The utility provider.
//  * @param requiredScopes - An array of required OAuth scopes.
//  * @param logPrefix - Optional prefix for logging.
//  * @returns A promise resolving to the ServiceResponse containing CheckAuthResultData on success.
//  * @throws Throws an error if the service call fails critically.
//  */
// export const checkAuth = async ( input: CheckAuthInput): Promise<ServiceResponse<CheckAuthResultData>> => {
//     const logPrefix: string = '[ToolAuthClient]';
//     const { userId, oauthProvider, requiredScopes } = input;
//     const toolAuthServiceUrl = process.env.TOOL_AUTH_SERVICE_URL;
//     if (!toolAuthServiceUrl) {
//         console.error(`${logPrefix} TOOL_AUTH_SERVICE_URL not set.`);
//         // Return an error compliant with ServiceResponse structure
//         return { success: false, error: 'Tool Auth Service URL is not configured.' };
//     }

//     console.log(`${logPrefix} Checking auth scopes: ${requiredScopes.join(', ')} for provider ${oauthProvider} via ${toolAuthServiceUrl}`);


//     // Use the shared HTTP client utility
//     // Note: We pass undefined for userId header as makeServiceRequest adds it if needed,
//     // but this endpoint expects userId in the body.
//     const response = await makeServiceRequest<CheckAuthResultData>(
//         toolAuthServiceUrl,
//         'POST',
//         '/api/check-auth',
//         userId, // Let makeServiceRequest handle x-user-id if needed, though not used by this endpoint
//         input
//     );

//     if (response.success) {
//         console.log(`${logPrefix} Auth check successful. Has auth: ${response.data.hasAuth}`);
//     } else {
//         console.error(`${logPrefix} Auth check failed: ${response.error}`);
//     }

//     return response;
// }; 