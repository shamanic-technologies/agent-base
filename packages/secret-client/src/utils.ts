import { UserType, UtilityInputSecret, UtilityProvider } from '@agent-base/types';

/**
 * Generates a standardized Google Secret Manager (GSM) compatible secret ID.
 * Format varies based on presence of webhookSubscribedEvent:
 * If webhookSubscribedEvent is present: <userType>_<userId>_<utilityProvider>_<webhookSubscribedEvent>_<secretType>
 * If webhookSubscribedEvent is absent:  <userType>_<userId>_<utilityProvider>_<secretType>
 * All parts are converted to lowercase and sanitized.
 *
 * @param userType The type of user (e.g., UserType.Client, UserType.Platform). Must not be empty.
 * @param userId The unique ID of the user. Must be a non-empty string.
 * @param utilityProvider The primary context for the secret (e.g., a UtilityProvider string/enum). Must be non-empty.
 * @param secretType The specific name or type of the secret (e.g., UtilityInputSecret string/enum). Must be non-empty.
 * @param webhookSubscribedEvent Optional specific identifier or sub-context (e.g., tool ID, webhook event). If provided, must be a non-empty string.
 * @returns A sanitized, GSM-compatible secret ID string, truncated to 255 characters.
 * @throws Error if mandatory parameters are invalid.
 */
export const generateSecretManagerId = (
    userType: UserType,
    userId: string,
    utilityProvider: UtilityProvider,
    secretType: UtilityInputSecret,
    webhookSubscribedEvent?: string,
): string => {
    // Validate mandatory parameters
    if (!userType) { // Enums are truthy if a valid enum member is passed
        throw new Error('generateSecretManagerId: userType cannot be null or undefined.');
    }
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('generateSecretManagerId: userId must be a non-empty string.');
    }

    const utilityProviderString = String(utilityProvider);
    if (utilityProviderString.trim() === '') {
        throw new Error('generateSecretManagerId: utilityProvider must be a non-empty string or a valid enum value.');
    }

    const secretTypeString = String(secretType);
    if (secretTypeString.trim() === '') {
        throw new Error('generateSecretManagerId: secretType must be a non-empty string or a valid enum value.');
    }

    const idParts: string[] = [
        String(userType).toLowerCase(),
        userId.trim().toLowerCase(),
        utilityProviderString.trim().toLowerCase(),
    ];

    // Add optional webhookSubscribedEvent if it's a non-empty string
    if (webhookSubscribedEvent && typeof webhookSubscribedEvent === 'string' && webhookSubscribedEvent.trim() !== '') {
        idParts.push(webhookSubscribedEvent.trim().toLowerCase());
    }

    idParts.push(secretTypeString.trim().toLowerCase());

    const baseId = idParts.join('_');
    // Sanitize: replace invalid characters (not alphanumeric, hyphen, or underscore) with a hyphen.
    // Keep underscores from the join operation.
    const sanitizedId = baseId.replace(/[^a-z0-9_-]/g, '-');

    // GSM limit is 255 characters for the secret ID (name).
    return sanitizedId.substring(0, 255);
}; 