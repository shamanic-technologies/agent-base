/**
 * Placeholder SQL Parser
 * 
 * Extremely basic parser to extract type, values, filters, and recordId
 * from simple SQL-like queries for the query-table utility.
 * This is NOT a robust SQL parser.
 */

/**
 * Parses a simple SQL-like query string.
 * @param {string} sql - The SQL-like query string.
 * @param {clientUserIdentificationMapping<string, any>} [params={}] - Optional parameters to substitute.
 * @returns {object} - An object containing the parsed components or an error.
 *                     { success: boolean, type?: string, columns?: string[], values?: object, filters?: object, recordId?: string, error?: string }
 */
export function parseSQL(sql: string, params: clientUserIdentificationMapping<string, any> = {}) {
    const normalizedSQL = sql.trim().toLowerCase();
    // Initialize result as any to allow dynamic property assignment
    let result: any = { 
        success: false, 
        type: null, 
        columns: null, 
        values: null, 
        filters: null, 
        recordId: null, 
        error: null 
    }; 
  
    try {
      if (normalizedSQL.startsWith('select')) {
        result.type = 'SELECT';
        // Basic filter extraction (column = :param OR column = 'value')
        const whereMatch = sql.match(/where\s+(.+)/i);
        // Initialize filters as a plain object - this is fine with result: any
        let filters = {}; 
        let recordId = null;
        // Check if whereMatch is not null
        if (whereMatch && whereMatch[1]) { 
          const conditions = whereMatch[1].split(/\s+and\s+/i); // Split by AND
          conditions.forEach(cond => {
            const eqMatch = cond.match(/(\w+)\s*=\s*(.+)/);
            // Check if eqMatch is not null
            if (eqMatch && eqMatch[1] && eqMatch[2]) { 
              const column = eqMatch[1].trim();
              // Initialize value without explicit type annotation
              let value = eqMatch[2].trim(); 
  
              // Substitute param if needed
              if (value.startsWith(':')) {
                const paramName = value.substring(1);
                if (params.hasOwnProperty(paramName)) {
                  value = params[paramName];
                } else {
                  throw new Error(`Missing parameter value for :${paramName}`);
                }
              } else {
                // Basic type conversion (remove quotes, check for bool/number)
                const originalValue = value.replace(/^['"]|['"]$/g, ''); // Remove quotes
                // @ts-ignore - Linter incorrectly flags type change
                if (originalValue.toLowerCase() === 'true') value = true;
                // @ts-ignore - Linter incorrectly flags type change
                else if (originalValue.toLowerCase() === 'false') value = false;
                // @ts-ignore - Linter incorrectly flags type change
                else if (!isNaN(Number(originalValue)) && originalValue.trim() !== '') value = Number(originalValue);
                else value = originalValue; // Assign the cleaned string if not bool/number
              }
              
              if (column === 'id') {
                recordId = String(value); // Assume ID is used for single record operations
              }
              // @ts-ignore - Linter struggles with index signatures here
              filters[column] = value; 
            }
          });
        }
        // Extract columns (e.g., SELECT col1, col2 FROM ...)
         const columnMatch = sql.match(/select\s+(.+?)\s+from/i);
         let columns = ['*']; // Default to all columns
         // Check if columnMatch is not null
         if (columnMatch && columnMatch[1] && columnMatch[1] !== '*') { 
            columns = columnMatch[1].split(',').map(c => c.trim());
         }
        
        // Assign properties to result (which is any)
        result.filters = filters;
        result.recordId = recordId; // Pass ID if found in WHERE
        result.columns = columns;
        result.success = true;
  
      } else if (normalizedSQL.startsWith('insert')) {
        result.type = 'INSERT';
        // Assume values come ONLY from params for simplicity
        result.values = params;
        result.success = true;
        
      } else if (normalizedSQL.startsWith('update')) {
        result.type = 'UPDATE';
        // Extract record ID from WHERE id = :param
        const whereMatch = sql.match(/where\s+id\s*=\s*(:?\w+)/i);
        let recordId = null;
        // Check if whereMatch is not null
        if (whereMatch && whereMatch[1]) { 
          const idValue = whereMatch[1];
           if (idValue.startsWith(':')) {
              const paramName = idValue.substring(1);
              if (params.hasOwnProperty(paramName)) {
                 recordId = String(params[paramName]);
              } else {
                 throw new Error(`Missing parameter value for :${paramName} in WHERE clause`);
              }
           } else {
              // Direct ID not supported by this basic parser in UPDATE WHERE
               throw new Error('UPDATE WHERE clause must use a parameter for ID (e.g., WHERE id = :recordId)');
           }
        } else {
           throw new Error('UPDATE requires a WHERE clause with id = :param');
        }
        // Assume update values come ONLY from params
        // Exclude the ID param itself from the values to be set
        const updateValues = { ...params };
        // Check if whereMatch and capture group exist before accessing
        if(whereMatch && whereMatch[1] && whereMatch[1].startsWith(':')) { 
            delete updateValues[whereMatch[1].substring(1)];
        }
        
        result.values = updateValues;
        result.recordId = recordId;
        result.success = true;
  
      } else if (normalizedSQL.startsWith('delete')) {
        result.type = 'DELETE';
        // Extract record ID from WHERE id = :param
        const whereMatch = sql.match(/where\s+id\s*=\s*(:?\w+)/i);
         let recordId = null;
         // Check if whereMatch is not null
        if (whereMatch && whereMatch[1]) { 
           const idValue = whereMatch[1];
           if (idValue.startsWith(':')) {
              const paramName = idValue.substring(1);
              if (params.hasOwnProperty(paramName)) {
                 recordId = String(params[paramName]);
              } else {
                 throw new Error(`Missing parameter value for :${paramName} in WHERE clause`);
              }
           } else {
              // Direct ID not supported by this basic parser in DELETE WHERE
               throw new Error('DELETE WHERE clause must use a parameter for ID (e.g., WHERE id = :recordId)');
           }
        } else {
           throw new Error('DELETE requires a WHERE clause with id = :param');
        }
        result.recordId = recordId;
        result.success = true;
  
      } else {
        result.error = 'Unsupported SQL query type. Only basic SELECT, INSERT, UPDATE, DELETE are supported.';
      }
  
    // Catch error, type as any
    } catch (e: any) { 
       console.error("[SQL_PARSER] Error:", e.message);
      result.success = false;
      result.error = e.message || 'Failed to parse query.';
    }
  
    return result;
  }