import { UserType } from '@agent-base/types';

/**
 * Generates a standardized Google Secret Manager (GSM) compatible secret ID.
 * Format: <userType>_<userId>_<contextProvider>_<contextIdentifier>_<secretNameOrType>
 * All parts are converted to lowercase and sanitized.
 *
 * @param userType The type of user (e.g., UserType.Client, UserType.Platform).
 * @param userId The unique ID of the user.
 * @param contextProvider The primary context for the secret (e.g., a UtilityProvider string, or a service name like 'webhook').
 * @param contextIdentifier A specific identifier within that context (e.g., tool ID, webhook provider ID, event ID).
 * @param secretNameOrType The specific name or type of the secret being stored (e.g., 'api_key', 'bearer_token', 'stripe_api_key').
 * @returns A sanitized, GSM-compatible secret ID string, truncated to 255 characters.
 */
export const generateSecretManagerId = (
    userType: UserType,
    userId: string,
    contextProvider: string, 
    contextIdentifier: string,
    secretNameOrType: string 
): string => {
    const parts = [
        userType,
        userId,
        contextProvider,
        contextIdentifier,
        secretNameOrType,
    ];
    // Ensure all parts are strings before attempting to call toLowerCase or join
    const stringParts = parts.map(part => {
        if (part === null || part === undefined) {
            // Or throw an error if parts cannot be null/undefined
            console.warn(`generateSecretManagerId received null or undefined part, replacing with empty string.`);
            return ''; 
        }
        return String(part);
    });

    const baseId = stringParts.map(part => part.toLowerCase()).join('_');
    // Sanitize: replace invalid characters (not alphanumeric, hyphen, or underscore) with a hyphen.
    // Keep underscores from the join operation.
    const sanitizedId = baseId.replace(/[^a-z0-9_-]/g, '-');
    return sanitizedId.substring(0, 255); // GSM limit
}; 