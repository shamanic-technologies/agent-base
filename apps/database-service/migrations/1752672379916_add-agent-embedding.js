/* eslint-disable @typescript-eslint/naming-convention */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function up(pgm) {
  await pgm.sql(`CREATE EXTENSION IF NOT EXISTS vector;`);
  await pgm.sql(`ALTER TABLE "agents" ADD COLUMN "embedding" vector(1536);`);
  await pgm.sql(`CREATE INDEX agents_embedding_idx ON agents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);`);
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export async function down(pgm) {
  // Use IF EXISTS for the index to avoid errors if it was never created
  await pgm.sql(`DROP INDEX IF EXISTS agents_embedding_idx;`);
  // Use IF EXISTS for the column as well for safety
  await pgm.sql(`ALTER TABLE "agents" DROP COLUMN IF EXISTS "embedding";`);
}
