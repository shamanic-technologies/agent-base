import { Pool } from '@neondatabase/serverless';
import { InternalUtilityTool, ApiTool } from '@agent-base/types';

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

  const tableName = `tool_${tool.id}`;
  if (!isValidIdentifier(tableName)) {
    throw new Error(`Invalid tool ID for table name: ${tool.id}`);
  }
  
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