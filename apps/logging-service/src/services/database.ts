/**
 * Database Service
 * 
 * Uses database-service for all database operations
 */
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ApiLogEntry, DatabaseApiLogEntry } from '../types';

interface DateFilter {
  $gte?: string;
  $lte?: string;
}

export interface LogFilter {
  user_id?: string;
  api_key?: string;
  endpoint?: string;
  method?: string;
  conversation_id?: string;
  timestamp?: DateFilter;
  [key: string]: any;
}

interface DatabaseResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export class DatabaseService {
  private baseUrl: string;

  constructor() {
    const dbServiceUrl = process.env.DATABASE_SERVICE_URL;
    if (!dbServiceUrl) {
      throw new Error('DATABASE_SERVICE_URL not set');
    }
    this.baseUrl = dbServiceUrl;
  }

  /**
   * Create a new log entry
   */
  async createLog(logEntry: ApiLogEntry): Promise<DatabaseApiLogEntry> {
    try {
      const response = await axios.post<DatabaseResponse<DatabaseApiLogEntry>>(
        `${this.baseUrl}/api-logs/me`,
        {
          data: logEntry
        },
        {
          headers: {
            'x-user-id': logEntry.user_id
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to create log entry');
      }

      return response.data.data;
    } catch (error) {
      console.error('Error creating log:', error);
      throw error;
    }
  }

  /**
   * Get logs with optional filtering
   */
  async getLogs(
    filter: LogFilter = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ items: DatabaseApiLogEntry[]; total: number }> {
    try {
      // Convert filter to query string
      const query = encodeURIComponent(JSON.stringify(filter));
      
      const response = await axios.get<DatabaseResponse<PaginatedResponse<DatabaseApiLogEntry>>>(
        `${this.baseUrl}/api-logs/me`,
        {
          headers: {
            'x-user-id': filter.user_id
          },
          params: {
            query,
            limit,
            offset
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch logs');
      }

      return {
        items: response.data.data.items,
        total: response.data.data.total
      };
    } catch (error) {
      console.error('Error fetching logs:', error);
      throw error;
    }
  }
}

