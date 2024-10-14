import { watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';
const glob = new Bun.Glob('src/**/*.ts');
const files = await Array.fromAsync(glob.scan({ cwd: '.' }));

const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
  entrypoints: files,
  outdir: 'dist',
  root: './src',
  target: 'browser',
  minify: !watchMode,
  format: 'esm',
  splitting: !watchMode,
  sourcemap: 'external',
});

if (!build.success) {
  for (const log of build.logs) {
    console.log('[@ecopages/radiant]', log);
  }
}

if (process.argv.includes('--watch')) {
  console.log('Watching for changes...');
  const watcher = watch(path.resolve(__dirname, 'src'), { recursive: true }, async () => {
    await $`bun run build:lib`;
  });

  process.on('SIGINT', () => {
    console.log('Closing watcher...');
    watcher.close();
    process.exit(0);
  });
}
