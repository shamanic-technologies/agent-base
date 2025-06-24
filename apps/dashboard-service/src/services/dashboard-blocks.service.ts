import { DASHBOARD_BLOCKS, DashboardBlockInfo, DashboardBlock, DashboardBlockInfoWithSchema } from '@agent-base/types';
import { ServiceResponse } from '@agent-base/types';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Lists all available dashboard block definitions.
 */
export async function listDashboardBlocks(): Promise<ServiceResponse<DashboardBlockInfo[]>> {
    try {
        const blocksInfo: DashboardBlockInfo[] = DASHBOARD_BLOCKS.map(block => ({
            id: block.id,
            name: block.name,
            description: block.description,
            type: block.type,
        }));
        return { success: true, data: blocksInfo };
    } catch (error: any) {
        return { success: false, error: 'Failed to list dashboard blocks', details: error.message };
    }
}

/**
 * Gets the full definition for a single dashboard block by its ID.
 */
export async function getDashboardBlockById(id: string): Promise<ServiceResponse<DashboardBlockInfoWithSchema>> {
    try {
        const block = DASHBOARD_BLOCKS.find(b => b.id === id);

        if (!block) {
            return { success: false, error: 'Dashboard block not found' };
        }
        
        const jsonSchema = zodToJsonSchema(block.schema, {
            name: block.id,
            $refStrategy: 'none',
        });

        const responseBlock: DashboardBlockInfoWithSchema = {
            id: block.id,
            name: block.name,
            description: block.description,
            type: block.type,
            schema: jsonSchema,
        };

        return { success: true, data: responseBlock };
    } catch (error: any) {
        return { success: false, error: 'Failed to get dashboard block', details: error.message };
    }
}
