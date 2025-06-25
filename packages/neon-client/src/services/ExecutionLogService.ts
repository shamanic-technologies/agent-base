import { Pool } from '@neondatabase/serverless';
import { InternalUtilityTool, ApiTool } from '@agent-base/types';
import JSZip from 'jszip';

// A mapping from JSON schema types to PostgreSQL types.
const typeMapping: Record<string, string> = {
  'string': 'TEXT',
  'integer': 'INTEGER',
  'number': 'REAL',
  'boolean': 'BOOLEAN',
  'object': 'JSONB',
  'array': 'JSONB'
};

const isValidIdentifier = (name: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const result = await pool.query({
    text: `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = $1
      );
    `,
    values: [tableName]
  });
  return result.rows[0].exists;
}

async function createLogTable(pool: Pool, tableName: string, schema: any): Promise<void> {
  const columnDefinitions: string[] = [
    'id SERIAL PRIMARY KEY',
    'created_at TIMESTAMPTZ DEFAULT NOW()',
    'updated_at TIMESTAMPTZ DEFAULT NOW()',
    'execution_result JSONB'
  ];

  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      if (!isValidIdentifier(key)) {
        console.warn(`[ExecutionLogService] Invalid identifier for column name: ${key}. Skipping.`);
        continue;
      }
      const prop = value as { type: string };
      const pgType = typeMapping[prop.type] || 'TEXT';
      columnDefinitions.push(`"${key}" ${pgType}`);
    }
  }

  const finalQuery = `CREATE TABLE "${tableName}" (${columnDefinitions.join(', ')})`;
  await pool.query(finalQuery);
}

/**
 * Constructs a sanitized, valid table name from an ApiTool's info.
 * @param tool - The ApiTool object.
 * @returns A string representing the safe table name.
 * @throws If the constructed table name is invalid.
 */
export function getTableNameForApiTool(tool: ApiTool): string {
  const title = tool.openapiSpecification.info.title.toLowerCase().replace(/\s/g, '_');
  const version = tool.openapiSpecification.info.version.toLowerCase().replace(/\s/g, '_');
  const tableName = `tool_${title}_${version}`;
  
  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid constructed table name from tool info: ${tableName}`);
  }
  return tableName;
}

async function handleZipResult(result: any): Promise<any> {
  if (typeof result === 'object' && result !== null && result.encoding === 'base64' && result.contentType === 'application/zip') {
    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(result.content, { base64: true });
      const filesInZip = Object.values(zipContent.files).filter(file => !file.dir);

      if (filesInZip.length === 1) {
        const singleFile = filesInZip[0];
        if (!singleFile) {
          // This case should not be reached due to the length check, but it satisfies the linter.
          return result;
        }
        console.log(`[ExecutionLogService] Found a single file in zip: ${singleFile.name}`);

        const fileContent = await singleFile.async('nodebuffer');

        // Check if the single file is JSON
        if (singleFile.name.toLowerCase().endsWith('.json')) {
          try {
            return JSON.parse(fileContent.toString('utf-8'));
          } catch (e) {
            console.warn(`[ExecutionLogService] Failed to parse JSON from single file in zip: ${singleFile.name}. Storing as binary.`);
          }
        }

        // For other file types (images, etc.), return as a new Base64 object
        // We need to guess the content type or use a generic one.
        // For simplicity, we'll use a generic one but ideally, we'd map extensions.
        const newContentType = 'application/octet-stream'; // A generic content type
        return {
          encoding: 'base64',
          contentType: newContentType, // Or derive from file extension
          content: fileContent.toString('base64'),
        };
      }
      
      console.log(`[ExecutionLogService] Zip contains ${filesInZip.length} files. Storing the zip as is.`);
    } catch (error) {
      console.error('[ExecutionLogService] Error processing zip file. Storing the original zip.', error);
      return result; // Return original zip if processing fails
    }
  }
  return result; // Return original result if not a zip file
}

export async function logInternalToolExecution(tool: InternalUtilityTool, params: any, result: any): Promise<void> {
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('NEON_DATABASE_URL is not set in the environment variables.');
  }

  const tableName = `tool_${tool.id}`;
  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid tool ID for table name: ${tool.id}`);
  }

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const exists = await tableExists(pool, tableName);
    if (!exists) {
      await createLogTable(pool, tableName, tool.schema);
    }

    const paramKeys = tool.schema.properties ? Object.keys(tool.schema.properties) : [];
    const columns = ['execution_result', ...paramKeys].filter(isValidIdentifier);
    const values = [JSON.stringify(result), ...paramKeys.map(key => params[key])];
    const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${valuePlaceholders})`;

    await pool.query({
      text: insertQuery,
      values: values
    });

  } finally {
    await pool.end();
  }
}

export async function logApiToolExecution(tool: ApiTool, params: any, result: any): Promise<void> {
  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    throw new Error('NEON_DATABASE_URL is not set in the environment variables.');
  }

  const tableName = getTableNameForApiTool(tool);
  
  // Handle potential zip file in the result
  const processedResult = await handleZipResult(result);
  
  // Extract schema from OpenAPI spec
  const path = Object.keys(tool.openapiSpecification.paths)[0];
  if (!path) {
    console.error(`[ExecutionLogService] No path found in OpenAPI spec for tool ${tool.id}`);
    return;
  }
  const pathItem = tool.openapiSpecification.paths[path];
  if (!pathItem) {
    console.error(`[ExecutionLogService] Could not find path item for tool ${tool.id}`);
    return;
  }

  const method = Object.keys(pathItem)[0] as 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace';
  if (!method) {
      console.error(`[ExecutionLogService] Could not determine method to log execution for ${tool.id}`);
      return;
  }
  
  const operation = pathItem[method];
  if (!operation) {
    console.error(`[ExecutionLogService] Could not find operation for path ${path} and method ${method}`);
    return;
  }

  const schema = operation.parameters || {};

  const pool = new Pool({ connectionString: dbUrl });

  try {
    const exists = await tableExists(pool, tableName);
    if (!exists) {
      // Create a simplified schema for logging purposes.
      const logSchema: { properties: Record<string, { type: string }> } = { properties: {} };
      if(Array.isArray(schema)) {
        schema.forEach(p => {
          if ('name' in p && 'schema' in p && p.schema && 'type' in p.schema) {
            logSchema.properties[p.name] = { type: p.schema.type as string };
          }
        });
      }
      await createLogTable(pool, tableName, logSchema);
    }

    const paramKeys = Array.isArray(schema) ? schema.map(p => 'name' in p ? p.name : '').filter(name => name) : [];
    const columns = ['execution_result', ...paramKeys].filter(isValidIdentifier);
    const values = [JSON.stringify(processedResult), ...paramKeys.map(key => params[key])];
    const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const insertQuery = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${valuePlaceholders})`;

    await pool.query({
      text: insertQuery,
      values: values
    });

  } finally {
    await pool.end();
  }
} 