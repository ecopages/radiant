import { watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';

const publicEntrypoints = ['index.ts', 'client.ts', 'jsx-runtime.ts', 'jsx-dev-runtime.ts'];

function shouldRebuild(filename: string): boolean {
	return (
		filename.endsWith('.ts') &&
		!filename.startsWith('benchmarks/') &&
		!filename.startsWith('dist/') &&
		!filename.startsWith('test/')
	);
}

const watchMode = process.argv.includes('--watch');

const build = await Bun.build({
	entrypoints: publicEntrypoints,
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'browser',
});

if (!build.success) {
	for (const log of build.logs) {
		console.log('[@ecopages/jsx]', log);
	}

	process.exitCode = 1;
}

if (watchMode) {
	console.log('Watching for changes...');
	const watcher = watch(path.resolve(import.meta.dir), async (_eventType, filename) => {
		const normalizedFilename = filename?.replaceAll(path.sep, '/');

		if (!normalizedFilename || !shouldRebuild(normalizedFilename)) {
			return;
		}

		await $`bun run build:lib`;
	});

	process.on('SIGINT', () => {
		console.log('Closing watcher...');
		watcher.close();
		process.exit(0);
	});
}
