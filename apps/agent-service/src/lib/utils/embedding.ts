/**
 * @file OpenAI Embedding Utilities
 * @description Provides a utility function to generate embeddings using the OpenAI API.
 */
import OpenAI from 'openai';

// Declare openaiClient, to be initialized lazily when needed
let openaiClient: OpenAI | null = null;

/**
 * Generates an embedding for a given string using a specified OpenAI model.
 *
 * @param {string} text - The input text to embed.
 * @returns {Promise<number[] | undefined>} The embedding vector or undefined if an error occurs.
 */
export const generateEmbedding = async (text: string): Promise<number[] | undefined> => {
    const logPrefix = '[EmbeddingUtil]';

    if (!process.env.OPENAI_API_KEY) {
        console.error(`${logPrefix} OPENAI_API_KEY not found in environment variables. Skipping embedding generation.`);
        return undefined;
    }

    // Initialize client if it hasn't been already
    if (!openaiClient) {
        try {
            openaiClient = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        } catch (initError) {
            console.error(`${logPrefix} Failed to initialize OpenAI client:`, initError);
            return undefined; // Cannot proceed without a client
        }
    }

    try {
        // OpenAI recommends replacing newlines with spaces for best performance.
        const inputString = text.replace(/\\n/g, ' ');

        const response = await openaiClient.embeddings.create({
            model: 'text-embedding-3-small', // Using a small, efficient model
            input: inputString,
        });

        if (response.data && response.data.length > 0 && response.data[0].embedding) {
            return response.data[0].embedding;
        } else {
            console.error(`${logPrefix} Failed to generate embedding. No embedding data in OpenAI response.`);
            return undefined;
        }
    } catch (error) {
        console.error(`${logPrefix} Error generating OpenAI embedding:`, error);
        return undefined;
    }
}; 