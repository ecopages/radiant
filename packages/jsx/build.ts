import { watch } from 'node:fs';
import path from 'node:path';
import { $ } from 'bun';

const browserEntrypoints = ['index.ts', 'client.ts', 'jsx-runtime.ts', 'jsx-dev-runtime.ts'];
const serverEntrypoints = ['server.ts'];

function shouldRebuild(filename: string): boolean {
	return (
		filename.endsWith('.ts') &&
		!filename.startsWith('benchmarks/') &&
		!filename.startsWith('dist/') &&
		!filename.startsWith('test/')
	);
}

const watchMode = process.argv.includes('--watch');

const browserBuild = await Bun.build({
	entrypoints: browserEntrypoints,
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'browser',
});

const serverBuild = await Bun.build({
	entrypoints: serverEntrypoints,
	format: 'esm',
	minify: !watchMode,
	outdir: 'dist',
	sourcemap: 'external',
	target: 'node',
});

for (const build of [browserBuild, serverBuild]) {
	if (build.success) {
		continue;
	}

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
