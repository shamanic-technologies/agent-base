import {
    ExternalUtilityTool,
    UtilitySecret,
    AuthMethod,
    SuccessResponse,
    SetupNeeded,
    UtilityActionConfirmation,
    UtilityInputSecret,
    mapUtilityProviderToOAuthProvider
} from '@agent-base/types';

// Import client functions
import { fetchSecrets } from '../clients/secretServiceClient';
import { checkAuth, CheckAuthResultData } from '../clients/toolAuthServiceClient';

/**
 * Checks prerequisites (Secrets, Actions, OAuth).
 * @param config The tool configuration.
 * @param userId The user ID.
 * @param logPrefix Logging prefix.
 * @returns An object indicating if prerequisites are met, any setup needed response, and credentials.
 */
export const checkPrerequisites = async (
    config: ExternalUtilityTool,
    userId: string,
    logPrefix: string
): Promise<{ 
    prerequisitesMet: boolean; 
    setupNeededResponse?: SuccessResponse<SetupNeeded>; 
    credentials?: { apiKey?: string | null; oauthToken?: string | null };
}> => {
     console.log(`${logPrefix} Checking prerequisites...`);
    let allSecretsAvailable = true;
    let oauthAuthorized = true;
    let fetchedApiKey: string | null = null;
    let fetchedOauthToken: string | null = null;
    let requiredSecretInputs: UtilityInputSecret[] = [];
    let requiredActionConfirmations: UtilityActionConfirmation[] = [];

    // --- Check Secrets and Actions --- 
    if (config.requiredSecrets && config.requiredSecrets.length > 0) {
        try {
            const secretsData = await fetchSecrets(userId, config.utilityProvider, config.requiredSecrets, logPrefix);
            for (const secretKey of config.requiredSecrets) {
                const value = secretsData?.[secretKey];
                if (!value || (secretKey === UtilityActionConfirmation.WEBHOOK_URL_INPUTED && value !== 'true')) {
                    allSecretsAvailable = false;
                    if (secretKey === UtilityActionConfirmation.WEBHOOK_URL_INPUTED) {
                        requiredActionConfirmations.push(secretKey);
                    } else {
                        requiredSecretInputs.push(secretKey);
                    }
                    console.log(`${logPrefix} Missing or invalid secret: ${secretKey}`);
                }
                if (config.authMethod === AuthMethod.API_KEY && config.apiKeyDetails?.secretName === secretKey && value) {
                    fetchedApiKey = value;
                }
            }
        } catch (err) {
            throw err; 
        }
    }

    // --- Check OAuth --- 
    if (config.authMethod === AuthMethod.OAUTH) {
        const oauthProvider = mapUtilityProviderToOAuthProvider(config.utilityProvider);
        if (!config.requiredScopes || config.requiredScopes.length === 0) {
             console.error(`${logPrefix} OAuth tool requires requiredScopes.`);
             throw new Error(`Configuration error: OAuth tool '${config.id}' must define requiredScopes.`);
        }
        try {
            const authResponse = await checkAuth({ userId, oauthProvider, requiredScopes: config.requiredScopes });
            if (!authResponse.success) {
                console.error(`${logPrefix} Auth check client call failed: ${authResponse.error}`);
                throw new Error(`Tool Auth Service communication failed: ${authResponse.error}`);
            }
            const authData = authResponse.data;
            if (!authData.hasAuth) {
                oauthAuthorized = false;
                const authUrl = authData.authUrl;
                console.log(`${logPrefix} OAuth not authorized. Auth URL: ${authUrl}`);
                if (!authUrl) {
                    console.error(`${logPrefix} OAuth requires setup, but no authUrl provided by auth service.`);
                    throw new Error('OAuth setup required, but authorization URL is missing.');
                }
                const setupResponse: SuccessResponse<SetupNeeded> = {
                    success: true,
                    data: {
                        needs_setup: true,
                        utility_provider: config.utilityProvider,
                        oauth_provider: oauthProvider,
                        message: `Authentication required for ${config.utilityProvider}.`, 
                        title: `Connect ${config.utilityProvider}`, 
                        description: config.description,
                        required_secret_inputs: [], 
                        required_action_confirmations: [],
                        required_oauth: authUrl
                    }
                };
                return { prerequisitesMet: false, setupNeededResponse: setupResponse }; 
            }
            fetchedOauthToken = authData.credentials?.[0]?.accessToken ?? null; 
            if (!fetchedOauthToken) {
                console.error(`${logPrefix} OAuth authorized but no access token found in credentials.`);
                throw new Error('OAuth token missing despite successful auth check.');
            }
             console.log(`${logPrefix} OAuth authorized.`);
        } catch (err) {
            throw err;
        }
    }
    
    // --- Determine Overall Status --- 
    const prerequisitesMet = allSecretsAvailable && oauthAuthorized;

    if (!prerequisitesMet) {
        const setupResponse: SuccessResponse<SetupNeeded> = {
            success: true,
            data: {
                needs_setup: true,
                utility_provider: config.utilityProvider,
                message: `Configuration required for ${config.utilityProvider}. Please provide the following details or confirm actions.`, 
                title: `Configure ${config.utilityProvider}`, 
                description: config.description,
                required_secret_inputs: requiredSecretInputs,
                required_action_confirmations: requiredActionConfirmations
            }
        };
        return { prerequisitesMet: false, setupNeededResponse: setupResponse };
    }

    console.log(`${logPrefix} All prerequisites met.`);
    const credentials = {
        apiKey: fetchedApiKey,
        oauthToken: fetchedOauthToken
    };
    return { prerequisitesMet: true, credentials };
}; 