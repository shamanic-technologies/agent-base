/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function up(pgm) {
  const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
  const OLD_CONSTRAINT_NAME = 'platform_user_api_keys_platform_user_id_name_key'; 
  const NEW_CONSTRAINT_NAME = 'platform_user_api_keys_user_org_name_unique'; // Explicit name for the new constraint
  const NEW_CONSTRAINT_COLUMNS = ['platform_user_id', 'platform_organization_id', 'name'];

  // 0. Delete rows where platform_organization_id is NULL
  // THIS IS A DESTRUCTIVE OPERATION. MAKE SURE THIS IS INTENDED.
  try {
    const deleteResult = await pgm.db.query(`DELETE FROM "${PLATFORM_USER_API_KEY_TABLE}" WHERE "platform_organization_id" IS NULL;`);
    // @ts-ignore deleteResult might not have rowCount in all pg versions/drivers, but often does
    const deletedRows = typeof deleteResult.rowCount === 'number' ? deleteResult.rowCount : 'unknown'; 
    console.log(`Deleted ${deletedRows} rows from "${PLATFORM_USER_API_KEY_TABLE}" where platform_organization_id was NULL.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error deleting rows with NULL platform_organization_id: ${message}`);
    // Re-throw the error to stop the migration if deletion fails, as subsequent steps depend on it
    throw error;
  }

  // 1. Make platform_organization_id NOT NULL
  pgm.alterColumn(PLATFORM_USER_API_KEY_TABLE, 'platform_organization_id', {
    notNull: true,
  });
  console.log(`Column "platform_organization_id" in table "${PLATFORM_USER_API_KEY_TABLE}" altered to NOT NULL.`);

  // 2. Drop the old unique constraint
  try {
    pgm.dropConstraint(PLATFORM_USER_API_KEY_TABLE, OLD_CONSTRAINT_NAME, { ifExists: true });
    console.log(`Old unique constraint "${OLD_CONSTRAINT_NAME}" dropped from table "${PLATFORM_USER_API_KEY_TABLE}".`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Could not drop constraint "${OLD_CONSTRAINT_NAME}" (it might not exist or have a different name). Error: ${message}`);
  }
  
  // 3. Add the new unique constraint with an explicit name
  pgm.addConstraint(PLATFORM_USER_API_KEY_TABLE, NEW_CONSTRAINT_NAME, {
    unique: NEW_CONSTRAINT_COLUMNS
  });
  console.log(`New unique constraint "${NEW_CONSTRAINT_NAME}" on (${NEW_CONSTRAINT_COLUMNS.join(', ')}) added to table "${PLATFORM_USER_API_KEY_TABLE}".`);
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function down(pgm) {
  const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
  const OLD_CONSTRAINT_NAME = 'platform_user_api_keys_platform_user_id_name_key'; 
  const OLD_CONSTRAINT_COLUMNS = ['platform_user_id', 'name'];
  const NEW_CONSTRAINT_NAME = 'platform_user_api_keys_user_org_name_unique'; // Use the same explicit name

  // Note: The down migration does not re-insert the deleted rows.
  // This is a common characteristic of destructive operations in up migrations.

  // 1. Drop the new unique constraint using its explicit name
  try {
    pgm.dropConstraint(PLATFORM_USER_API_KEY_TABLE, NEW_CONSTRAINT_NAME, { ifExists: true });
    console.log(`New unique constraint "${NEW_CONSTRAINT_NAME}" dropped from table "${PLATFORM_USER_API_KEY_TABLE}".`);
  } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Could not drop unique constraint "${NEW_CONSTRAINT_NAME}". Error: ${message}`);
  }

  // 2. Add back the old unique constraint (can use the old name or let it be auto-named)
  pgm.addConstraint(PLATFORM_USER_API_KEY_TABLE, OLD_CONSTRAINT_NAME, { 
    unique: OLD_CONSTRAINT_COLUMNS
  });
  console.log(`Old unique constraint "${OLD_CONSTRAINT_NAME}" on (${OLD_CONSTRAINT_COLUMNS.join(', ')}) re-added to table "${PLATFORM_USER_API_KEY_TABLE}".`);

  // 3. Revert platform_organization_id to allow NULLs
  pgm.alterColumn(PLATFORM_USER_API_KEY_TABLE, 'platform_organization_id', {
    notNull: false,
  });
  console.log(`Column "platform_organization_id" in table "${PLATFORM_USER_API_KEY_TABLE}" reverted to allow NULLs.`);
}
