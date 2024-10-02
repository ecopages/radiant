import { exec } from 'node:child_process';
import { watch } from 'node:fs';
import path from 'node:path';
import tsup from 'tsup';

const watchMode = process.argv.includes('--watch');

export default tsup.defineConfig({
  splitting: true,
  sourcemap: true,
  clean: true,
  entryPoints: ['src/index.ts'],
  outDir: 'public',
  target: 'es2020',
  format: ['esm'],
  // dts: true,
  tsconfig: 'tsconfig.json',
});

if (watchMode) {
  console.log('Watching for changes...');
  const watcher = watch(path.resolve(__dirname, 'src'), { recursive: true }, () => {
    exec('bun run build:lib');
  });

  process.on('SIGINT', () => {
    console.log('Closing watcher...');
    watcher.close();
    process.exit(0);
  });
}
