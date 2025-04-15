import Ajv, { ErrorObject } from 'ajv';
// Use require for ajv-formats
const addFormats = require('ajv-formats'); 
import { ExternalUtilityTool, ErrorResponse } from '@agent-base/types';

// Initialize AJV
const ajv = new Ajv({ allErrors: true });
addFormats(ajv); // Add formats like email, date-time, etc.

/**
 * Validates input parameters against the tool's JSON Schema.
 * @param config The tool configuration.
 * @param params The input parameters.
 * @param logPrefix Logging prefix.
 * @returns The validated parameters or an ErrorResponse if validation fails.
 */
export const validateInputParameters = (
    config: ExternalUtilityTool,
    params: Record<string, any>,
    logPrefix: string
): { validatedParams: Record<string, any> } | ErrorResponse => {
    try {
        // Construct the complete JSON Schema for the input object
        const combinedSchema: any = {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false // Disallow extra properties by default
        };

        const requiredFields: string[] = [];
        for (const key in config.schema) {
            combinedSchema.properties[key] = config.schema[key].jsonSchema;
            // Check for a non-standard _isRequired flag for simplicity
            if ((config.schema[key].jsonSchema as any)._isRequired === true) {
               requiredFields.push(key);
            }
        }
        
        // If the explicit required array exists in the schema, use it
        if (Array.isArray(config.schema?.required)) { 
            combinedSchema.required = config.schema.required;
        } else if (requiredFields.length > 0) { // Otherwise, use the collected required fields
            combinedSchema.required = requiredFields;
        } else { // Default: make all defined properties OPTIONAL if nothing else specified
             combinedSchema.required = []; // Empty array means no fields are required by default
        }

        // Handle case where there is no schema defined
        if (Object.keys(combinedSchema.properties).length === 0) {
            console.log(`${logPrefix} No input schema defined. Skipping validation.`);
            return { validatedParams: {} }; // Return empty object for validation success
        } else {
            // Compile and validate
            const validate = ajv.compile(combinedSchema);
            if (validate(params)) {
                console.log(`${logPrefix} Input parameters validated successfully.`);
                return { validatedParams: params }; // Validation successful
            } else {
                console.error(`${logPrefix} Input parameter validation failed:`, validate.errors);
                const errorDetails = (validate.errors ?? []).map((e: ErrorObject) => ({ 
                    path: e.instancePath || '/' + e.schemaPath.split('/').slice(2).join('.'),
                    message: e.message
                }));
                const errorResponse: ErrorResponse = {
                    success: false,
                    error: 'Input validation failed.',
                    details: JSON.stringify(errorDetails)
                };
                return errorResponse;
            }
        }

    } catch (error) {
        // Catch errors during schema compilation or unexpected issues
        console.error(`${logPrefix} Error during AJV validation setup or execution:`, error);
        const errorResponse: ErrorResponse = {
            success: false,
            error: 'Schema validation setup failed.',
            details: error instanceof Error ? error.message : String(error)
        };
        return errorResponse;
    }
}; 