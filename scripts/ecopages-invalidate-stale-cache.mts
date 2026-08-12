/**
 * Drops an Ecopages app's `.eco` build cache when a workspace dependency has been rebuilt
 * since the cache was written.
 *
 * @remarks
 * `.eco/.server-modules` holds pre-bundled page, layout and template modules, and each bundle
 * inlines the `@ecopages/jsx` runtime it was compiled against. The cache keys on app source
 * only, so `pnpm build:all` followed by an app build leaves modules from *both* runtimes in
 * one render pass. Renderables built by the older runtime lack the fields the newer
 * `renderToString` matches on, so they serialize as `[object Object]` — silently, with a
 * successful exit code. See {@link ../scripts/ecopages-assert-rendered-html.mts} for the
 * post-build check that catches whatever slips past this one.
 *
 * Usage: `tsx ../../scripts/ecopages-invalidate-stale-cache.mts` from the app directory.
 */
import { readFileSync, rmSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const appDirectory = process.cwd();
const repoRoot = path.resolve(import.meta.dirname, '..');
const cacheDirectory = path.join(appDirectory, '.eco');

/** Newest mtime under `directory`, or `undefined` when it does not exist. */
async function newestMtime(directory: string): Promise<number | undefined> {
	let entries: Awaited<ReturnType<typeof readdir>>;
	try {
		entries = await readdir(directory, { recursive: true, withFileTypes: true });
	} catch {
		return undefined;
	}

	let newest: number | undefined;
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const { mtimeMs } = statSync(path.join(entry.parentPath, entry.name));
		if (newest === undefined || mtimeMs > newest) newest = mtimeMs;
	}
	return newest;
}

/** Oldest mtime under `directory`, or `undefined` when it does not exist. */
async function oldestMtime(directory: string): Promise<number | undefined> {
	let entries: Awaited<ReturnType<typeof readdir>>;
	try {
		entries = await readdir(directory, { recursive: true, withFileTypes: true });
	} catch {
		return undefined;
	}

	let oldest: number | undefined;
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const { mtimeMs } = statSync(path.join(entry.parentPath, entry.name));
		if (oldest === undefined || mtimeMs < oldest) oldest = mtimeMs;
	}
	return oldest;
}

/** `dist` directories of every `workspace:*` dependency this app declares. */
function workspaceDistDirectories(): string[] {
	const manifest = JSON.parse(readFileSync(path.join(appDirectory, 'package.json'), 'utf8')) as {
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};

	return Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })
		.filter(([, range]) => range.startsWith('workspace:'))
		.map(([name]) => path.join(repoRoot, 'packages', name.replace('@ecopages/', ''), 'dist'));
}

/*
 * Compared against the *oldest* cached module, not the newest: one build refreshes only the
 * modules it recompiles, so a newest-vs-newest comparison is satisfied by a single fresh entry
 * while stale siblings survive alongside it.
 */
const oldestCached = await oldestMtime(path.join(cacheDirectory, '.server-modules'));
if (oldestCached === undefined) {
	process.exit(0);
}

for (const distDirectory of workspaceDistDirectories()) {
	const built = await newestMtime(distDirectory);
	if (built !== undefined && built > oldestCached) {
		rmSync(cacheDirectory, { recursive: true, force: true });
		console.log(
			`[ecopages] dropped ${path.relative(repoRoot, cacheDirectory)}: ${path.relative(repoRoot, distDirectory)} is newer`,
		);
		break;
	}
}
