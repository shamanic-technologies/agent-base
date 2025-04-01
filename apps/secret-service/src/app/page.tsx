/**
 * Secret Service Home Page
 * 
 * Provides information about the secret service
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">Secret Service</h1>
        <p className="text-xl mb-8">
          Secure credential management service for Agent Base
        </p>
        
        <div className="bg-white p-6 rounded-lg shadow-md text-left mb-6">
          <h2 className="text-2xl font-semibold mb-4">Service Information</h2>
          <p className="mb-4">
            This service provides secure storage and retrieval of API keys and other sensitive
            credentials using Google Secret Manager.
          </p>
          <p className="mb-4">
            The service is primarily designed to be used via iframes embedded in the main application,
            allowing users to securely input their credentials without exposing them directly to the AI agent.
          </p>
          <p>
            Current API endpoints:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li className="mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">/api/health</code> - Service health check
            </li>
            <li className="mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">/api/store-secret</code> - Store a secret in Google Secret Manager
            </li>
            <li className="mb-2">
              <code className="bg-gray-100 px-2 py-1 rounded">/api/get-secret</code> - Retrieve a secret from Google Secret Manager
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">/api/check-secret</code> - Check if a secret exists
            </li>
          </ul>
        </div>
        
        <div className="text-sm text-gray-500">
          Secret Service v1.0.0
        </div>
      </div>
    </main>
  );
} 