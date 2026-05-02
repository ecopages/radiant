import { copyFile } from 'node:fs';
import path from 'node:path';

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

if (build.success) {
	copyFile(path.join(import.meta.dir, 'LICENSE'), path.join(import.meta.dir, 'dist', 'LICENSE'), (error) => {
		if (!error) {
			return;
		}

		console.log('[@ecopages/signals]', error);
		process.exitCode = 1;
	});
}
