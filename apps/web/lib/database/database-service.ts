/**
 * Database Service Client
 * 
 * A utility for interacting with the database service API
 */

const DB_SERVICE_URL = process.env.NEXT_PUBLIC_DATABASE_SERVICE_URL || 'http://localhost:3006';

/**
 * Get a user by ID from the database service
 * @param userId The ID of the user to fetch
 * @returns The user data or null if not found
 */
export async function getUserById(userId: string) {
  try {
    const response = await fetch(`${DB_SERVICE_URL}/db/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Database service error:', error);
    return null;
  }
}

/**
 * Get items from a collection with optional query parameters
 * @param collection The collection name
 * @param query Optional query parameters
 * @returns Collection items or null if error
 */
export async function getCollection(collection: string, query?: Record<string, any>) {
  try {
    let url = `${DB_SERVICE_URL}/db/${collection}`;
    
    // Add query parameters if provided
    if (query) {
      const queryString = encodeURIComponent(JSON.stringify(query));
      url += `?query=${queryString}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Database service error:', error);
    return null;
  }
}

/**
 * Create a new item in a collection
 * @param collection The collection name
 * @param item The item data to create
 * @returns The created item or null if error
 */
export async function createItem(collection: string, item: any) {
  try {
    const response = await fetch(`${DB_SERVICE_URL}/db/${collection}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(item)
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Database service error:', error);
    return null;
  }
}

/**
 * Update an item in a collection
 * @param collection The collection name
 * @param id The item ID
 * @param updates The updates to apply
 * @returns The updated item or null if error
 */
export async function updateItem(collection: string, id: string, updates: any) {
  try {
    const response = await fetch(`${DB_SERVICE_URL}/db/${collection}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Database service error:', error);
    return null;
  }
} 