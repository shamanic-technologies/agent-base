/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function up(pgm) {
  const CLIENT_USERS_TABLE = 'client_users';
  // Default constraint name for UNIQUE (auth_user_id) as defined in 001_initial_schema_setup.js
  // The table creation was: auth_user_id VARCHAR(255) NOT NULL UNIQUE
  // PostgreSQL typically names this ${tableName}_${columnName}_key
  const OLD_CONSTRAINT_NAME = 'client_users_auth_user_id_key'; 
  const NEW_CONSTRAINT_COLUMNS = ['platform_user_id', 'auth_user_id'];
  const NEW_CONSTRAINT_NAME = 'client_users_platform_user_id_auth_user_id_unique';

  // 1. Drop the old unique constraint on just auth_user_id
  try {
    pgm.dropConstraint(CLIENT_USERS_TABLE, OLD_CONSTRAINT_NAME, { ifExists: true });
    console.log(`Old unique constraint "${OLD_CONSTRAINT_NAME}" dropped from table "${CLIENT_USERS_TABLE}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not drop constraint "${OLD_CONSTRAINT_NAME}" from table "${CLIENT_USERS_TABLE}" (it might not exist or have a different name). Error: ${message}`);
    // If this fails, the next step will likely fail too if the old constraint conflicts.
    // Consider re-throwing or handling more robustly if this is a concern.
  }
  
  // 2. Add the new unique constraint on (platform_user_id, auth_user_id)
  pgm.addConstraint(CLIENT_USERS_TABLE, NEW_CONSTRAINT_NAME, {
    unique: NEW_CONSTRAINT_COLUMNS
  });
  console.log(`New unique constraint "${NEW_CONSTRAINT_NAME}" on (${NEW_CONSTRAINT_COLUMNS.join(', ')}) added to table "${CLIENT_USERS_TABLE}".`);
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function down(pgm) {
  const CLIENT_USERS_TABLE = 'client_users';
  const OLD_CONSTRAINT_NAME = 'client_users_auth_user_id_key'; 
  const NEW_CONSTRAINT_NAME = 'client_users_platform_user_id_auth_user_id_unique';
  const NEW_CONSTRAINT_COLUMNS = ['platform_user_id', 'auth_user_id']; // For logging clarity

  // 1. Drop the new unique constraint on (platform_user_id, auth_user_id)
  try {
    pgm.dropConstraint(CLIENT_USERS_TABLE, NEW_CONSTRAINT_NAME, { ifExists: true });
    console.log(`New unique constraint "${NEW_CONSTRAINT_NAME}" on (${NEW_CONSTRAINT_COLUMNS.join(', ')}) dropped from table "${CLIENT_USERS_TABLE}".`);
  } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Could not drop unique constraint "${NEW_CONSTRAINT_NAME}" from table "${CLIENT_USERS_TABLE}". Error: ${message}`);
  }

  // 2. Add back the old unique constraint on just auth_user_id
  pgm.addConstraint(CLIENT_USERS_TABLE, OLD_CONSTRAINT_NAME, { 
    unique: 'auth_user_id'
  });
  console.log(`Old unique constraint "${OLD_CONSTRAINT_NAME}" on (auth_user_id) re-added to table "${CLIENT_USERS_TABLE}".`);
}
