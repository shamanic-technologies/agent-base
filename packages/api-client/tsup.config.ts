import { defineConfig, Options } from 'tsup';

export default defineConfig((options: Options) => ({
  entry: ['src/index.ts'], // Adjust if your entry point is different
  format: ['esm', 'cjs'],  // Generate both ES Module and CommonJS formats
  dts: true,               // Generate declaration files (.d.ts)
  splitting: false,
  sourcemap: true,
  clean: true,             // Clean the dist folder before building
  minify: !options.watch,  // Minify code when not in watch mode
  ...options,
})); 