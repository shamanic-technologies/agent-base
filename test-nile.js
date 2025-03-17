// test-nile.js
const axios = require('axios');

// Configuration from .env.local
const NILE_API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RoZW5pbGUuZGV2IiwiYXVkIjpbIm5pbGUiLCJ3b3Jrc3BhY2U6MDE5NTlmMTYtYjUwNS03NWVlLThmYTktYzFlZjM2MzIwOWRiIl0sImlhdCI6MTc0MjEzMTg4OCwiZXhwIjoyMDU3NTI5NTk5LCJzdWIiOiIwMTk1OWYyNi1mZmIxLTdjZDUtYjI5Yi0wNGY0NzY1MDViOGEiLCJqdGkiOiJlZDExMzNhZC05M2U0LTQ3ZTgtOWY1Yi0xYzEwZmRjMThiNWEiLCJzY29wZSI6ImFwaSIsImF1dGhvcml6ZWRfc2NvcGVzIjoiYWxsIn0.sVpUVUa6InEz0U0YMYut0CX1Po8Y2UqT6BgKu4MKn0VETrjggFUfiUDWErTXERtC2yYAXCilewQ2yMwKCosLQVCtgisHm1JaeslQ3WmF3GZAou392_Z_hyeIBevFquptNpathNhJF3I1j6wfJ8DLJmAEiQIK7vwYesM5bsMCDJ2pdy-Hm7diPa9tH6Snx_dhfujutXN_WGSMLAgEj--pUOIFt5gdlkpGf85Bi0Cl6ZQvZLoTX5JRbgFwFkq30qKBIurTewUb8zDy4ooBBMPcwh-YeOLW-6I8JHEGZ7f0ASiYUubCRHWPLTbHjV-4WfkFV11kLlmSCjn0cCZjMlc1mA';

// Essayer avec différentes variations de workspace IDs
const WORKSPACE_IDS = [
  '01959f16-b505-75ee-8fa9-c1ef363209db',         // ID original extrait du token
  'workspace:01959f16-b505-75ee-8fa9-c1ef363209db', // Avec le préfixe 'workspace:'
  'ws_01959f16-b505-75ee-8fa9-c1ef363209db'        // Avec le préfixe 'ws_'
];

// Essayer différents endpoints
const API_ENDPOINTS = [
  'https://api.thenile.dev',      // API de production
  'https://api.dev.thenile.dev',  // Possible environnement de dev
  'https://dev.thenile.dev'       // Autre possibilité
];

// Headers for all requests
const headers = {
  'Authorization': `Bearer ${NILE_API_TOKEN}`,
  'Content-Type': 'application/json'
};

// Test function to list workspaces
async function listWorkspaces() {
  try {
    console.log('Attempting to list workspaces...');
    const response = await axios.get(`${NILE_API_ENDPOINT}/workspaces`, {
      headers
    });
    console.log('Workspaces:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error listing workspaces:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    return null;
  }
}

// Test function to list databases in a workspace
async function listDatabases() {
  try {
    console.log(`Attempting to list databases for workspace ${ORIGINAL_WORKSPACE}...`);
    const response = await axios.get(`${NILE_API_ENDPOINT}/workspaces/${ORIGINAL_WORKSPACE}/databases`, {
      headers
    });
    console.log('Databases:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error listing databases:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    return null;
  }
}

// Test function to create a database
async function createDatabase(databaseName) {
  try {
    console.log(`Attempting to create database ${databaseName}...`);
    const response = await axios.post(`${NILE_API_ENDPOINT}/workspaces/${ORIGINAL_WORKSPACE}/databases`, {
      name: databaseName
    }, {
      headers
    });
    console.log('Created database:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating database:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    console.error('Headers:', error.response?.headers);
    return null;
  }
}

// Try different API paths to find the correct one
async function tryApiCombinations() {
  const paths = [
    '/workspaces',
    '/v1/workspaces',
    '/api/workspaces',
    '/databases',
    '/tenants'
  ];
  
  for (const apiEndpoint of API_ENDPOINTS) {
    console.log(`\n===== Testing avec API Endpoint: ${apiEndpoint} =====`);
    
    // Tester les endpoints directs
    for (const path of paths) {
      try {
        console.log(`Trying: ${apiEndpoint}${path}`);
        const response = await axios.get(`${apiEndpoint}${path}`, {
          headers
        });
        console.log(`Success with path ${path}:`, response.data);
      } catch (error) {
        console.error(`Error with path ${path}:`, 
          error.response ? `${error.response.status} ${JSON.stringify(error.response.data)}` : error.message);
      }
    }
    
    for (const workspace of WORKSPACE_IDS) {
      console.log(`\n----- Testing avec workspace: ${workspace} -----`);
      
      // Tester les endpoints avec le workspace ID
      for (const path of ['/databases', '/tenants']) {
        const workspacePath = `/workspaces/${workspace}${path}`;
        try {
          console.log(`Trying: ${apiEndpoint}${workspacePath}`);
          const response = await axios.get(`${apiEndpoint}${workspacePath}`, {
            headers
          });
          console.log(`Success with path ${workspacePath}:`, response.data);
        } catch (error) {
          console.error(`Error with path ${workspacePath}:`, 
            error.response ? `${error.response.status} ${JSON.stringify(error.response.data)}` : error.message);
        }
      }
    }
  }
}

// Run tests
async function runTests() {
  console.log('Testing Nile API with multiple combinations...');
  
  await tryApiCombinations();
  
  console.log('\nTest terminé');
}

runTests(); 