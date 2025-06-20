/**
 * Types for the Xata client package
 */

/**
 * Interface for a Xata workspace
 */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  unique_id: string;
  role?: string;
  plan?: string;
}

/**
 * Interface for the structure of a single table's info within a database
 */
export interface TableInfo {
  id: string; // Consistent ID format, e.g., table_${tableName}
  name: string;
  description?: string; // Optional description
  schema: Record<string, string>; // Column name -> Xata type
} 