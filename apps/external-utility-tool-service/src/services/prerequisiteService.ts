import {
    ExternalUtilityTool,
    UtilitySecret,
    AuthMethod,
    SuccessResponse,
    SetupNeededData
} from '@agent-base/agents';

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
    setupNeededResponse?: SuccessResponse<SetupNeededData>; 
    credentials?: { apiKey?: string | null; oauthToken?: string | null };
}> => {
     console.log(`${logPrefix} Checking prerequisites...`);
    let allSecretsAvailable = true;
    let oauthAuthorized = true;
    let fetchedApiKey: string | null = null;
    let fetchedOauthToken: string | null = null;
    let requiredSecretInputs: UtilitySecret[] = [];
    let requiredActionConfirmations: UtilitySecret[] = [];

    // --- Check Secrets and Actions --- 
    if (config.requiredSecrets && config.requiredSecrets.length > 0) {
        try {
            const secretsData = await fetchSecrets(userId, config.provider, config.requiredSecrets, logPrefix);
            for (const secretKey of config.requiredSecrets) {
                const value = secretsData?.[secretKey];
                if (!value || (secretKey === UtilitySecret.WEBHOOK_URL_INPUTED && value !== 'true')) {
                    allSecretsAvailable = false;
                    if (secretKey === UtilitySecret.WEBHOOK_URL_INPUTED) {
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
        if (!config.requiredScopes || config.requiredScopes.length === 0) {
             console.error(`${logPrefix} OAuth tool requires requiredScopes.`);
             throw new Error(`Configuration error: OAuth tool '${config.id}' must define requiredScopes.`);
        }
        try {
            const authResponse = await checkAuth(userId, config.provider, config.requiredScopes, logPrefix);
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
                const setupResponse: SuccessResponse<SetupNeededData> = {
                    success: true,
                    data: {
                        needs_setup: true,
                        setup_url: authUrl,
                        provider: config.provider,
                        message: `Authentication required for ${config.provider}.`, 
                        title: `Connect ${config.provider}`, 
                        description: config.description,
                        required_secret_inputs: [], 
                        required_action_confirmations: [] 
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
        const setupResponse: SuccessResponse<SetupNeededData> = {
            success: true,
            data: {
                needs_setup: true,
                provider: config.provider,
                message: `Configuration required for ${config.provider}. Please provide the following details or confirm actions.`, 
                title: `Configure ${config.provider}`, 
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