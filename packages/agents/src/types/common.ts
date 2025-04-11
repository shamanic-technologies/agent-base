/**
 * Common base types for the agent system.
 */

/**
 * Generic success/error response structure.
 */
export interface BaseResponse {
  success: boolean;
  error?: string;
  message?: string;
  details?: string;
}

/**
 * Generic service response with typed data payload
 * Used for internal service-to-service communication
 */

  export interface SuccessResponse<T> extends BaseResponse {
    success: true;
    data: T;
    error?: never;
  }

  export interface ErrorResponse extends BaseResponse {
    success: false;
    data?: never;
    error: string;
  }

  export type ServiceResponse<T> = SuccessResponse<T> | ErrorResponse;

