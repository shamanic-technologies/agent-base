// test-nile-client.js
// Test de notre classe NileDatabaseClient mise à jour (approche API)

// Importer la classe manuellement pour éviter les problèmes ESM
const NileDatabaseClient = require('./apps/utility-service/src/lib/utilities/nile-database-client').NileDatabaseClient;

// Configuration d'environnement
process.env.NILE_API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RoZW5pbGUuZGV2IiwiYXVkIjpbIm5pbGUiLCJ3b3Jrc3BhY2U6MDE5NTlmMTYtYjUwNS03NWVlLThmYTktYzFlZjM2MzIwOWRiIl0sImlhdCI6MTc0MjEzMTg4OCwiZXhwIjoyMDU3NTI5NTk5LCJzdWIiOiIwMTk1OWYyNi1mZmIxLTdjZDUtYjI5Yi0wNGY0NzY1MDViOGEiLCJqdGkiOiJlZDExMzNhZC05M2U0LTQ3ZTgtOWY1Yi0xYzEwZmRjMThiNWEiLCJzY29wZSI6ImFwaSIsImF1dGhvcml6ZWRfc2NvcGVzIjoiYWxsIn0.sVpUVUa6InEz0U0YMYut0CX1Po8Y2UqT6BgKu4MKn0VETrjggFUfiUDWErTXERtC2yYAXCilewQ2yMwKCosLQVCtgisHm1JaeslQ3WmF3GZAou392_Z_hyeIBevFquptNpathNhJF3I1j6wfJ8DLJmAEiQIK7vwYesM5bsMCDJ2pdy-Hm7diPa9tH6Snx_dhfujutXN_WGSMLAgEj--pUOIFt5gdlkpGf85Bi0Cl6ZQvZLoTX5JRbgFwFkq30qKBIurTewUb8zDy4ooBBMPcwh-YeOLW-6I8JHEGZ7f0ASiYUubCRHWPLTbHjV-4WfkFV11kLlmSCjn0cCZjMlc1mA';
process.env.NILE_WORKSPACE = '01959f16-b505-75ee-8fa9-c1ef363209db';
process.env.NILE_API_ENDPOINT = 'https://api.thenile.dev';

// Tests à exécuter
async function main() {
  try {
    console.log('Création d\'une instance NileDatabaseClient...');
    const client = new NileDatabaseClient();
    
    // Test 1: Création de la base de données et du tenant pour un projet
    console.log('\nTest 1: getOrCreateProjectDatabase');
    const projectId = 'test-proj-' + Date.now();
    const projectName = 'Test Project';
    
    try {
      const result = await client.getOrCreateProjectDatabase(projectId, projectName);
      console.log('Résultat:', result);
    } catch (error) {
      console.error('Erreur lors du test 1:', error);
    }
    
    // Test 2: Méthode de compatibilité createDatabase
    console.log('\nTest 2: createDatabase (méthode de compatibilité)');
    try {
      const tenantId = await client.createDatabase(projectId, projectName);
      console.log('ID du tenant créé:', tenantId);
    } catch (error) {
      console.error('Erreur lors du test 2:', error);
    }
    
    // Test 3: Requête SQL (devrait renvoyer des données fictives)
    console.log('\nTest 3: executeQuery (données fictives)');
    try {
      const results = await client.executeQuery('any-tenant-id', 'SELECT * FROM information_schema.tables');
      console.log('Résultats de requête:', results);
    } catch (error) {
      console.error('Erreur lors du test 3:', error);
    }
    
    // Test 4: Informations sur la base de données (devrait renvoyer des données fictives)
    console.log('\nTest 4: getDatabaseInfo (données fictives)');
    try {
      const dbInfo = await client.getDatabaseInfo('any-tenant-id');
      console.log('Informations de la base de données:', dbInfo);
    } catch (error) {
      console.error('Erreur lors du test 4:', error);
    }
    
    console.log('\nTests terminés');
  } catch (error) {
    console.error('Erreur globale:', error);
  }
}

// Exécution des tests
main(); 