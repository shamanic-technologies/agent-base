/**
 * Health Check Routes
 * 
 * Routes for checking the health of the service and its dependencies.
 */
import express from 'express';
import axios from 'axios';

/**
 * Configure health check routes
 * 
 * @param router Express router
 * @param serviceUrls Object containing URLs of dependent services
 */
export const configureHealthRoutes = (
  router: express.Router,
  serviceUrls: {
    model: string;
    utility: string;
    key: string;
    logging?: string;
  }
) => {
  /**
   * Health check endpoint
   * Returns the status of the API gateway service and its connections
   */
  router.get('/', (req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'healthy',
      services: {
        model: serviceUrls.model,
        utility: serviceUrls.utility,
        key: serviceUrls.key,
        ...(serviceUrls.logging && { logging: serviceUrls.logging })
      }
    });
  });

  /**
   * Test model service connection endpoint
   * Directly tests connectivity to the model service and returns detailed results
   */
  router.get('/test-model-connection', async (req: express.Request, res: express.Response) => {
    try {
      const modelServiceUrl = serviceUrls.model;
      console.log(`📡 Testing connection to model service at: ${modelServiceUrl}`);
      
      // Try to parse URL components to verify format
      try {
        const url = new URL(modelServiceUrl);
        console.log(`URL components: protocol=${url.protocol}, hostname=${url.hostname}, port=${url.port || 'default'}`);
      } catch (parseError) {
        console.error(`⚠️ Invalid URL format: ${modelServiceUrl}`, parseError);
      }
      
      // DNS lookup check
      console.log(`🔍 Attempting to connect to model service...`);
      
      // Manually construct the URL if it uses the internal naming convention
      const requestUrl = modelServiceUrl.includes('.railway.internal') 
        ? modelServiceUrl.replace('.railway.internal', '')
        : modelServiceUrl;
      
      console.log(`🔗 Using request URL: ${requestUrl}/health`);
      
      // Test connection with timeout and detailed error tracking
      const result = await axios.get(`${requestUrl}/health`, {
        timeout: 5000,
        headers: {
          'Connection-Test': 'true'
        },
        // Force IPv4
        family: 4
      });
      
      console.log(`✅ Successfully connected to model service. Status: ${result.status}`);
      
      res.json({
        success: true, 
        modelServiceUrl: requestUrl,
        status: result.status,
        response: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Connection to model service failed:`, error);
      
      // Extract detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        stack: error.stack,
        isAxiosError: axios.isAxiosError(error),
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        hostname: error.request?.host,
        method: error.request?.method,
        path: error.request?.path,
        protocol: error.request?.protocol,
        port: error.request?.port,
      };
      
      console.error(`📊 Detailed connection error:`, JSON.stringify(errorDetails, null, 2));
      
      res.status(500).json({
        success: false,
        modelServiceUrl: serviceUrls.model,
        error: `Connection failed: ${error.message}`,
        errorDetails,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Test utility service connection endpoint
   * Directly tests connectivity to the utility service and returns detailed results
   */
  router.get('/test-utility-connection', async (req: express.Request, res: express.Response) => {
    try {
      const utilityServiceUrl = serviceUrls.utility;
      console.log(`📡 Testing connection to utility service at: ${utilityServiceUrl}`);
      
      // Try to parse URL components to verify format
      try {
        const url = new URL(utilityServiceUrl);
        console.log(`URL components: protocol=${url.protocol}, hostname=${url.hostname}, port=${url.port || 'default'}`);
      } catch (parseError) {
        console.error(`⚠️ Invalid URL format: ${utilityServiceUrl}`, parseError);
      }
      
      // DNS lookup check
      console.log(`🔍 Attempting to connect to utility service...`);
      
      // Manually construct the URL if it uses the internal naming convention
      const requestUrl = utilityServiceUrl.includes('.railway.internal') 
        ? utilityServiceUrl.replace('.railway.internal', '')
        : utilityServiceUrl;
      
      console.log(`🔗 Using request URL: ${requestUrl}/health`);
      
      // Test connection with timeout and detailed error tracking
      const result = await axios.get(`${requestUrl}/health`, {
        timeout: 5000,
        headers: {
          'Connection-Test': 'true'
        },
        // Force IPv4
        family: 4
      });
      
      console.log(`✅ Successfully connected to utility service. Status: ${result.status}`);
      
      res.json({
        success: true, 
        utilityServiceUrl: requestUrl,
        status: result.status,
        response: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Connection to utility service failed:`, error);
      
      // Extract detailed error information
      const errorDetails = {
        message: error.message,
        code: error.code,
        stack: error.stack,
        isAxiosError: axios.isAxiosError(error),
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        hostname: error.request?.host,
        method: error.request?.method,
        path: error.request?.path,
        protocol: error.request?.protocol,
        port: error.request?.port,
      };
      
      console.error(`📊 Detailed connection error:`, JSON.stringify(errorDetails, null, 2));
      
      res.status(500).json({
        success: false,
        utilityServiceUrl: serviceUrls.utility,
        error: `Connection failed: ${error.message}`,
        errorDetails,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}; 