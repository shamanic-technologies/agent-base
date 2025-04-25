// Augment Express Request type
declare namespace Express {
    export interface Request {
        platformUserId?: string; // Add platformUserId property
        clientUserId?: string; // Add clientUserId if middleware adds it
        // Add platformApiKey here if middleware adds it directly to req, 
        // otherwise keep accessing via req.headers['x-platform-api-key']
    }
}

// This export statement makes the file a module, which is necessary for augmentation
export {}; 