/**
 * Drops an Ecopages app's `.eco` build cache when app source changes or a workspace
 * dependency is rebuilt after the cache was written.
 *
 * @remarks
 * `.eco/.server-modules` holds pre-bundled page, layout and template modules, and each bundle
 * inlines the `@ecopages/jsx` runtime it was compiled against. A rebuilt workspace dependency
 * can leave modules from both runtimes in one render pass. A changed app script can also get a
 * new bundle while cached page HTML still points at the old one. Generated LLM text exports
 * are excluded because their timestamps advance on every docs build. See
 * {@link ../scripts/ecopages-assert-rendered-html.mts} for the post-build render check.
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
async function newestMtime(
	directory: string,
	includeFile: (filePath: string) => boolean = () => true,
): Promise<number | undefined> {
	let entries: Awaited<ReturnType<typeof readdir>>;
	try {
		entries = await readdir(directory, { recursive: true, withFileTypes: true });
	} catch {
		return undefined;
	}

	let newest: number | undefined;
	for (const entry of entries) {
		if (!entry.isFile()) continue;
		const filePath = path.join(entry.parentPath, entry.name);
		if (!includeFile(filePath)) continue;
		const { mtimeMs } = statSync(filePath);
		if (newest === undefined || mtimeMs > newest) newest = mtimeMs;
	}
	return newest;
}

function isGeneratedLlmExport(filePath: string): boolean {
	const publicDirectory = path.join(appDirectory, 'src', 'public');
	return (
		filePath === path.join(publicDirectory, 'llms.txt') ||
		filePath.startsWith(`${path.join(publicDirectory, 'llms-content')}${path.sep}`)
	);
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

const newestAppSource = await newestMtime(
	path.join(appDirectory, 'src'),
	(filePath) => !isGeneratedLlmExport(filePath),
);
if (newestAppSource !== undefined && newestAppSource > oldestCached) {
	rmSync(cacheDirectory, { recursive: true, force: true });
	console.log(`[ecopages] dropped ${path.relative(repoRoot, cacheDirectory)}: app source is newer`);
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
