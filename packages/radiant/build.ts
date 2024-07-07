const glob = new Bun.Glob('src/**/*.ts');
const files = await Array.fromAsync(glob.scan({ cwd: '.' }));

export const build = await Bun.build({
  entrypoints: files,
  outdir: 'dist',
  root: './src',
  target: 'browser',
  minify: true,
  format: 'esm',
  splitting: true,
  sourcemap: 'external',
});

if (!build.success) {
  for (const log of build.logs) {
    console.log('[@ecopages/radiant]', log);
  }
}
