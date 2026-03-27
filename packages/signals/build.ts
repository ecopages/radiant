const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
	entrypoints: ['index.ts'],
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'browser',
});

if (!build.success) {
	for (const log of build.logs) {
		console.log('[@ecopages/signals]', log);
	}

	process.exitCode = 1;
}