/**
 * Forwards an incoming HTTP request to a specified target URL and sends the target's response back to the original client.
 * This function aims to be a simple and direct proxy, forwarding the request method, path, query parameters, headers, and body.
 * It also forwards the response status, headers, and body from the target service.
 *
 * @param {string} targetUrl - The base URL of the target service (e.g., http://localhost:3001).
 * @param {Request} req - The original Express request object.
 * @param {Response} res - The original Express response object.
 * @returns {Promise<void>} A promise that resolves when the forwarding is complete or an error response has been sent.
 */
import { Request, Response } from 'express';
import axios, { AxiosError, Method, RawAxiosRequestHeaders } from 'axios';

export async function forwardRequest(targetUrl: string, req: Request, res: Response): Promise<void> {
    // Construct the target URL path including query string from the original request.
    // req.url already contains the path and query string, e.g., "/users/search?name=foo"
    const targetPathWithQuery = req.url;
    const requestUrl = `${targetUrl}${targetPathWithQuery}`;

    console.log(`[Web Gateway] Forwarding ${req.method} request from ${req.originalUrl} to ${requestUrl}`);

    // Prepare headers for Axios, ensuring all values are suitable (string, number, or boolean)
    // IncomingHttpHeaders can have string | string[] | undefined.
    const headersToForward: RawAxiosRequestHeaders = {};
    for (const key in req.headers) {
        if (Object.prototype.hasOwnProperty.call(req.headers, key)) {
            const value = req.headers[key];
            // Axios expects string, number or boolean for header values in RawAxiosRequestHeaders.
            // We'll take the first element if it's an array (common for some headers, though less so for forwarding).
            // Exclude undefined values.
            if (value !== undefined) {
                headersToForward[key] = Array.isArray(value) ? value[0] : value;
            }
        }
    }
    // Override/set specific headers for the forwarded request
    headersToForward['host'] = new URL(targetUrl).host;
    headersToForward['x-forwarded-for'] = req.ip;
    headersToForward['x-forwarded-proto'] = req.protocol;
    // Remove connection header as it's hop-by-hop
    delete headersToForward['connection'];

    try {
        const axiosConfig = {
            method: req.method as Method,
            url: requestUrl,
            data: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
            headers: headersToForward, // Use the processed headers
            maxRedirects: 0,
            validateStatus: function (status: number) {
                return status >= 100 && status < 600;
            },
        };

        const response = await axios(axiosConfig);

        res.status(response.status);

        Object.entries(response.headers).forEach(([key, value]) => {
            if (value) {
                res.setHeader(key, value as string | string[]);
            }
        });

        res.send(response.data);
        return;

    } catch (error) {
        const axiosError = error as AxiosError;
        console.error(`[Web Gateway] Error forwarding request to ${requestUrl}:`, axiosError.message);

        if (axiosError.response) {
            res.status(axiosError.response.status).send(axiosError.response.data);
        } else if (axiosError.request) {
            res.status(502).json({
                success: false,
                error: `[Web Gateway] No response from target service at ${new URL(targetUrl).hostname}`,
                details: axiosError.message,
            });
        } else {
            res.status(500).json({
                success: false,
                error: '[Web Gateway] Internal server error while forwarding request',
                details: axiosError.message,
            });
        }
        return;
    }
}
  