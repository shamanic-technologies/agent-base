/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function up(pgm) {
  const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
  const newColumnName = 'platform_organization_id';

  pgm.addColumn(PLATFORM_USER_API_KEY_TABLE, {
    [newColumnName]: { 
      type: 'UUID',
      notNull: false // Or true if it should not allow nulls, and provide a default value
      // If you intend to add a foreign key, you'd add it here or in a separate alterTable call
      // e.g., references: 'platform_organizations', onDelete: 'CASCADE' 
    }
  });

  console.log(`Column "${newColumnName}" added to table "${PLATFORM_USER_API_KEY_TABLE}".`);
}

/**
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function down(pgm) {
  const PLATFORM_USER_API_KEY_TABLE = 'platform_user_api_keys';
  const newColumnName = 'platform_organization_id';

  pgm.dropColumn(PLATFORM_USER_API_KEY_TABLE, newColumnName);

  console.log(`Column "${newColumnName}" dropped from table "${PLATFORM_USER_API_KEY_TABLE}".`);
}
