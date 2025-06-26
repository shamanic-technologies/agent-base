import { z } from 'zod';

// Source for a single metric: a static value or a query returning one value.
export const singleValueSourceSchema = z.union([
    z.object({ value: z.string(), query: z.undefined().optional() }).strict().describe("A static string value."),
    z.object({ query: z.string(), value: z.undefined().optional() }).strict().describe("A SQL query that returns a single value.")
]);

// Source for structured data: a static array of data or a query returning a list.
export const tabularDataSourceSchema = z.union([
    z.object({ data: z.array(z.record(z.any())), query: z.undefined().optional() }).strict().describe("A static array of JSON objects."),
    z.object({ query: z.string(), data: z.undefined().optional() }).strict().describe("A SQL query that returns a list of records.")
]);

// Schema for MetricCard
export const metricCardConfigSchema = z.object({
    type: z.literal('MetricCard'),
    title: z.string(),
    source: singleValueSourceSchema,
    change: z.string().optional(),
    changeType: z.enum(['positive', 'negative']).optional(),
}).strict();

// Schema for chart props
const chartPropsSchema = z.object({
    index: z.string(),
    categories: z.array(z.string()),
    colors: z.array(z.string()).optional(),
}).strict();

// Schema for BarChart
export const barChartConfigSchema = z.object({
    type: z.literal('BarChart'),
    title: z.string(),
    source: tabularDataSourceSchema,
    props: chartPropsSchema
}).strict();

// Schema for LineChart
export const lineChartConfigSchema = z.object({
    type: z.literal('LineChart'),
    title: z.string(),
    source: tabularDataSourceSchema,
    props: chartPropsSchema
}).strict();

// Schema for DonutChart
export const donutChartConfigSchema = z.object({
    type: z.literal('DonutChart'),
    title: z.string(),
    source: tabularDataSourceSchema,
    props: z.object({
        index: z.string(),
        category: z.string(),
    }).strict(),
}).strict();

// Schema for ProgressCard
export const progressCardConfigSchema = z.object({
    type: z.literal('ProgressCard'),
    title: z.string(),
    metric: z.string(),
    metricDescription: z.string().optional(),
    content: z.array(z.object({
        label: z.string(),
        value: z.string(),
        target: z.string(),
        query: z.string().optional(),
    }).strict()),
}).strict();

// Schema for Table
export const tableConfigSchema = z.object({
    type: z.literal('Table'),
    title: z.string(),
    source: tabularDataSourceSchema,
}).strict();

// Schema for Text
export const textConfigSchema = z.object({
    type: z.literal('Text'),
    content: z.string(),
    props: z.object({
        className: z.string().optional(),
        variant: z.enum(['title', 'subtitle', 'body', 'caption', 'default']).optional(),
    }).strict().optional(),
}).strict();

// Schema for Callout
export const calloutConfigSchema = z.object({
    type: z.literal('Callout'),
    title: z.string(),
    content: z.string(),
    props: z.object({
        color: z.string().optional(),
        icon: z.string().optional(),
    }).strict().optional(),
}).strict();

// --- Recursive Grid, Union, and Layout ---

// Base for the grid schema (no recursion yet)
const gridConfigBaseSchema = z.object({
    type: z.literal('Grid'),
    props: z.object({
        columns: z.number().optional()
    }).strict().optional(),
}).strict();

// Forward-declare the TypeScript type for a single block config.
// This is necessary for the recursive definition of the grid.
export type DashboardBlockConfig =
  | z.infer<typeof metricCardConfigSchema>
  | z.infer<typeof barChartConfigSchema>
  | z.infer<typeof lineChartConfigSchema>
  | z.infer<typeof donutChartConfigSchema>
  | z.infer<typeof progressCardConfigSchema>
  | z.infer<typeof tableConfigSchema>
  | z.infer<typeof textConfigSchema>
  | z.infer<typeof calloutConfigSchema>
  // The grid contains an array of other blocks.
  | (z.infer<typeof gridConfigBaseSchema> & { children: DashboardBlockConfig[] });

// The schema for any individual dashboard block.
// This is used to validate the `children` array of a grid.
export const dashboardBlockConfigSchema: z.ZodType<DashboardBlockConfig> = z.lazy(() =>
  z.discriminatedUnion('type', [
    metricCardConfigSchema,
    barChartConfigSchema,
    lineChartConfigSchema,
    donutChartConfigSchema,
    progressCardConfigSchema,
    tableConfigSchema,
    textConfigSchema,
    calloutConfigSchema,
    // The grid schema is extended here with its recursive 'children' property.
    gridConfigBaseSchema.extend({
      children: z.array(dashboardBlockConfigSchema),
    }),
  ])
);

// A dashboard layout MUST be a grid at its root.
export const gridConfigSchema = gridConfigBaseSchema.extend({
    children: z.array(dashboardBlockConfigSchema),
});
export const dashboardLayoutSchema = gridConfigSchema;

// Inferred type for a full dashboard layout.
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>; 