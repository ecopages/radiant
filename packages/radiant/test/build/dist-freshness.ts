import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '../..');
const distRoot = path.join(packageRoot, 'dist');
const stampFile = path.join(packageRoot, 'node_modules/.cache/dist-source-hash');

/** The narrow command that rebuilds the dist the build tests read. */
export const REBUILD_COMMAND = 'pnpm --filter @ecopages/radiant build:lib';

/**
 * Hashes the files `build:lib` reads from this package, by content.
 *
 * @remarks Content, not mtime, so a formatting-only edit that reverts, or a checkout that touches every file,
 * does not look like a source change.
 */
export function hashDistSources(): string {
	const files = [
		'build.ts',
		'package.json',
		'tsconfig.build.json',
		...readdirSync(path.join(packageRoot, 'src'), { recursive: true, encoding: 'utf8' })
			.filter((file) => /\.tsx?$/.test(file))
			.map((file) => path.join('src', file)),
	].sort();
	const hash = createHash('sha256');

	for (const file of files) {
		hash.update(`${file}\0`)
			.update(readFileSync(path.join(packageRoot, file)))
			.update('\0');
	}

	return hash.digest('hex');
}

function readStamp(): string | undefined {
	try {
		return readFileSync(stampFile, 'utf8').trim();
	} catch {
		return undefined;
	}
}

function distExists(): boolean {
	try {
		readFileSync(path.join(distRoot, 'index.js'));
		return true;
	} catch {
		return false;
	}
}

/** Records that `dist` was built from the sources that hash to `hash`. */
export function writeDistStamp(hash: string): void {
	mkdirSync(path.dirname(stampFile), { recursive: true });
	writeFileSync(stampFile, hash);
}

/**
 * Whether `dist` is present and was built from the current sources.
 *
 * @remarks CI builds before it tests and never writes a stamp, so there `dist` only has to exist.
 */
export function isDistFresh(): boolean {
	if (!distExists()) {
		return false;
	}

	return process.env.CI ? true : readStamp() === hashDistSources();
}

/** Throws with the narrow rebuild command when {@link isDistFresh} is false. */
export function assertFreshDist(): void {
	if (!isDistFresh()) {
		throw new Error(`packages/radiant/dist is missing or older than src: rebuild it (${REBUILD_COMMAND})`);
	}
}
