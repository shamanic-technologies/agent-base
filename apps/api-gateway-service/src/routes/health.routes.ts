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
    agent: string;
    utilityTool: string;
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
        agent: serviceUrls.agent,
        utilityTool: serviceUrls.utilityTool,
        key: serviceUrls.key,
        ...(serviceUrls.logging && { logging: serviceUrls.logging })
      }
    });
  });

  /**
   * Test agent service connection endpoint
   * Directly tests connectivity to the agent service and returns detailed results
   */
  router.get('/test-agent-connection', async (req: express.Request, res: express.Response) => {
    try {
      const agentServiceUrl = serviceUrls.agent;
      console.log(`📡 [API GATEWAY] Testing connection to agent service at: ${agentServiceUrl}`);
      
      // Get server information for debugging - safely accessing server info
      let serverInfo = null;
      try {
        // Use any for server access to avoid TypeScript errors
        const serverObj = (req as any).socket?.server || (req as any).connection?.server || (res as any).connection?.server;
        if (serverObj && typeof serverObj.address === 'function') {
          serverInfo = serverObj.address();
        }
      } catch (serverError) {
        console.error(`⚠️ [API GATEWAY] Error getting server info:`, serverError);
      }
      console.log(`🔌 [API GATEWAY] API Gateway server info:`, JSON.stringify(serverInfo, null, 2));
      
      // Get client information
      console.log(`👤 [API GATEWAY] Client request from: ${req.ip}, headers:`, 
        JSON.stringify({
          host: req.headers.host,
          'user-agent': req.headers['user-agent'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip']
        }, null, 2)
      );
      
      // Try to parse URL components to verify format
      try {
        const url = new URL(agentServiceUrl);
        console.log(`🔍 [API GATEWAY] URL components:`, JSON.stringify({
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || 'default',
          pathname: url.pathname
        }, null, 2));
        
        // Try DNS lookup simulation
        console.log(`🔎 [API GATEWAY] Attempting DNS lookup simulation...`);
        const { lookup } = await import('dns/promises');
        try {
          const addresses = await lookup(url.hostname, { all: true });
          console.log(`✅ [API GATEWAY] DNS lookup results:`, JSON.stringify(addresses, null, 2));
        } catch (dnsError) {
          console.error(`❌ [API GATEWAY] DNS lookup failed:`, dnsError);
        }
      } catch (parseError) {
        console.error(`⚠️ [API GATEWAY] Invalid URL format: ${agentServiceUrl}`, parseError);
      }
      
      // DNS lookup check
      console.log(`🔍 [API GATEWAY] Attempting to connect to agent service...`);
      
      // Use the full URL as provided in the configuration
      console.log(`🔗 [API GATEWAY] Using request URL: ${agentServiceUrl}/health`);
      
      // Test connection with timeout and detailed error tracking
      const result = await axios.get(`${agentServiceUrl}/health`, {
        timeout: 5000,
        headers: {
          'Connection-Test': 'true',
          'X-Debug-Info': 'API-Gateway-Test',
          'User-Agent': 'API-Gateway-Health-Check/1.0'
        }
      });
      
      console.log(`✅ [API GATEWAY] Successfully connected to agent service. Status: ${result.status}`);
      console.log(`📊 [API GATEWAY] Response data:`, JSON.stringify(result.data, null, 2));
      
      res.json({
        success: true, 
        agentServiceUrl,
        status: result.status,
        response: result.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ [API GATEWAY] Connection to agent service failed:`, error);
      
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
      
      console.error(`📊 [API GATEWAY] Detailed connection error:`, JSON.stringify(errorDetails, null, 2));
      
      res.status(500).json({
        success: false,
        agentServiceUrl: serviceUrls.agent,
        error: `Connection failed: ${error.message}`,
        errorDetails,
        gatewayServer: (() => {
          try {
            // Use any for server access to avoid TypeScript errors
            const serverObj = (req as any).socket?.server || (req as any).connection?.server || (res as any).connection?.server;
            return serverObj && typeof serverObj.address === 'function' ? serverObj.address() : null;
          } catch (e) {
            return null;
          }
        })(),
        clientInfo: {
          ip: req.ip,
          headers: {
            host: req.headers.host,
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for']
          }
        },
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
      const utilityServiceUrl = serviceUrls.utilityTool;
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
      
      // Use the full URL as provided in the configuration
      console.log(`🔗 Using request URL: ${utilityServiceUrl}/health`);
      
      // Test connection with timeout and detailed error tracking
      const result = await axios.get(`${utilityServiceUrl}/health`, {
        timeout: 5000,
        headers: {
          'Connection-Test': 'true'
        }
      });
      
      console.log(`✅ Successfully connected to utility service. Status: ${result.status}`);
      
      res.json({
        success: true, 
        utilityServiceUrl,
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
        utilityServiceUrl: serviceUrls.utilityTool,
        error: `Connection failed: ${error.message}`,
        errorDetails,
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}; 