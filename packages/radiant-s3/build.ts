import { watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';
import esbuild from 'esbuild';

const glob = new Bun.Glob('src/**/*.ts');
const files = await Array.fromAsync(glob.scan({ cwd: '.' }));

const watchMode = process.argv.includes('--watch');

const build = await esbuild.build({
  entryPoints: files,
  outdir: 'dist',
  sourceRoot: './src',
  target: 'es2022',
  minify: watchMode,
  format: 'esm',
  splitting: !watchMode,
  sourcemap: 'external',
});

if (build.errors.length > 0) {
  for (const log of build.errors) {
    console.log('[@ecopages/radiant-s3]', log);
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
