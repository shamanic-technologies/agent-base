// test-nile-sdk.js - Test avec le SDK officiel
// À exécuter avec Node.js ESM: node --experimental-modules test-nile-sdk.js

// Import direct du SDK pour éviter les problèmes de compatibilité
import('@niledatabase/server').then(async ({ Nile }) => {
  try {
    console.log('Initialisation du SDK Nile...');
    
    // Configuration
    const NILE_API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3RoZW5pbGUuZGV2IiwiYXVkIjpbIm5pbGUiLCJ3b3Jrc3BhY2U6MDE5NTlmMTYtYjUwNS03NWVlLThmYTktYzFlZjM2MzIwOWRiIl0sImlhdCI6MTc0MjEzMTg4OCwiZXhwIjoyMDU3NTI5NTk5LCJzdWIiOiIwMTk1OWYyNi1mZmIxLTdjZDUtYjI5Yi0wNGY0NzY1MDViOGEiLCJqdGkiOiJlZDExMzNhZC05M2U0LTQ3ZTgtOWY1Yi0xYzEwZmRjMThiNWEiLCJzY29wZSI6ImFwaSIsImF1dGhvcml6ZWRfc2NvcGVzIjoiYWxsIn0.sVpUVUa6InEz0U0YMYut0CX1Po8Y2UqT6BgKu4MKn0VETrjggFUfiUDWErTXERtC2yYAXCilewQ2yMwKCosLQVCtgisHm1JaeslQ3WmF3GZAou392_Z_hyeIBevFquptNpathNhJF3I1j6wfJ8DLJmAEiQIK7vwYesM5bsMCDJ2pdy-Hm7diPa9tH6Snx_dhfujutXN_WGSMLAgEj--pUOIFt5gdlkpGf85Bi0Cl6ZQvZLoTX5JRbgFwFkq30qKBIurTewUb8zDy4ooBBMPcwh-YeOLW-6I8JHEGZ7f0ASiYUubCRHWPLTbHjV-4WfkFV11kLlmSCjn0cCZjMlc1mA';
    const NILE_WORKSPACE = '01959f16-b505-75ee-8fa9-c1ef363209db';
    
    // Informations d'accès à la base de données
    // Ces valeurs devront être configurées avec vos vraies informations
    const DB_USER = "nile_user";         // Utilisateur de base de données
    const DB_PASSWORD = "password123";   // Mot de passe (fictif)
    const DB_HOST = "db.thenile.dev";    // Host de la base de données
    const DB_PORT = "5432";              // Port PostgreSQL standard

    // Initialiser l'instance Nile avec des configs de DB
    const nile = await Nile({
      workspace: NILE_WORKSPACE,
      api: {
        token: NILE_API_TOKEN
      },
      user: DB_USER,                    // Ajout de l'utilisateur DB
      password: DB_PASSWORD,            // Ajout du mot de passe DB
      host: DB_HOST,                    // Ajout de l'hôte DB
      port: DB_PORT                     // Ajout du port DB
    });
    
    console.log('SDK Nile initialisé');
    
    // Test simple des fonctions API sans accès à la DB
    try {
      console.log('\nTest des fonctions API:');
      
      // Essayer de créer une database
      const dbName = `test-db-${Date.now()}`;
      console.log(`\nCréation d'une nouvelle database: ${dbName}`);
      
      // Méthode API uniquement (pas d'accès DB requis)
      const newDb = await nile.api.databases.createDatabase({ name: dbName });
      console.log('Résultat:', newDb);
      
      console.log('\nAPI tests terminés');
    } catch (error) {
      console.error('Erreur lors des tests API:', error);
    }
    
    // Éviter d'exécuter les tests DB puisque nous n'avons probablement pas les vraies identifiants
    console.log('\nTests DB ignorés - nécessite des identifiants valides');
    
    console.log('\nTests terminés');
  } catch (error) {
    console.error('Erreur globale:', error);
  }
}).catch(error => {
  console.error('Erreur lors de l\'importation du SDK Nile:', error);
}); 