import fs from 'node:fs';
import esbuild from 'esbuild';
const glob = new Bun.Glob('src/**/*.ts');
const files = await Array.fromAsync(glob.scan({ cwd: '.' }));

export const build = await esbuild.build({
  entryPoints: files,
  outdir: 'dist',
  sourceRoot: './src',
  bundle: true,
  target: 'es2023',
  platform: 'browser',
  minify: true,
  format: 'esm',
  splitting: true,
  sourcemap: 'external',
});

if (build.errors.length) {
  for (const log of build.errors) {
    console.log('[@ecopages/radiant]', log);
  }
}

const www = fs.readdirSync('www');
for (const file of www) {
  fs.copyFileSync(`www/${file}`, `dist/${file}`);
}
