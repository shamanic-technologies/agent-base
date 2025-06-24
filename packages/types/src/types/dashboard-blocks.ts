/**
 * @fileoverview
 * This file serves as the single source of truth for all available dashboard block types.
 * It defines their metadata (name, description) and associates them with their
 * corresponding Zod validation schema.
 */

import { z } from 'zod';
import {
  metricCardConfigSchema,
  barChartConfigSchema,
  lineChartConfigSchema,
  donutChartConfigSchema,
  progressCardConfigSchema,
  tableConfigSchema,
  gridConfigSchema,
  textConfigSchema,
  calloutConfigSchema,
} from '../schemas/dashboard.schema.js';


// Define a type for our block definitions for strong typing.
export interface DashboardBlockData {
    name: string;
    description: string;
    type: string;
    schema: z.Schema<any>;
}

// Define a type for our block definitions for strong typing.
export interface DashboardBlock extends DashboardBlockData {
    id: string;
}

// Define a type for our block definitions for strong typing.
export interface DashboardBlockInfo {
    id: string;
    name: string;
    description: string;
    type: string;
}

// Define a type for our block definitions for strong typing.
export interface DashboardBlockInfoWithSchema extends DashboardBlockInfo {
  schema: object;
}


export const DASHBOARD_BLOCKS: DashboardBlock[] = [
  {
    id: 'metric-card',
    name: 'Metric Card',
    description: 'Displays a single key metric, with an optional change indicator.',
    type: 'MetricCard',
    schema: metricCardConfigSchema,
  },
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'A standard bar chart to compare values across different categories.',
    type: 'BarChart',
    schema: barChartConfigSchema,
  },
  {
    id: 'line-chart',
    name: 'Line Chart',
    description: 'A standard line chart, ideal for showing trends over time.',
    type: 'LineChart',
    schema: lineChartConfigSchema,
  },
  {
    id: 'donut-chart',
    name: 'Donut Chart',
    description: 'A donut chart to show the breakdown of a total.',
    type: 'DonutChart',
    schema: donutChartConfigSchema,
  },
  {
    id: 'progress-card',
    name: 'Progress Card',
    description: 'A card containing multiple progress bars, ideal for tracking goals or capacity.',
    type: 'ProgressCard',
    schema: progressCardConfigSchema,
  },
  {
    id: 'table',
    name: 'Simple Table',
    description: 'A simple table to display raw data.',
    type: 'Table',
    schema: tableConfigSchema,
  },
  {
    id: 'grid',
    name: 'Grid Layout',
    description: 'A layout component to organize other blocks into responsive columns.',
    type: 'Grid',
    schema: gridConfigSchema,
  },
  {
    id: 'text',
    name: 'Text Header',
    description: 'A simple text block for titles or descriptions.',
    type: 'Text',
    schema: textConfigSchema,
  },
  {
    id: 'callout',
    name: 'Callout',
    description: 'A callout box to display important information or alerts.',
    type: 'Callout',
    schema: calloutConfigSchema,
  }
]; 