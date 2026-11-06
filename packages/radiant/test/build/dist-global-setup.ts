import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { hashDistSources, isDistFresh, REBUILD_COMMAND, writeDistStamp } from './dist-freshness';

const packageRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Vitest `globalSetup` for the projects that read `dist`: rebuilds it when the source content hash changed.
 *
 * @remarks Under `CI` it never rebuilds and only requires `dist` to exist, because CI builds first. A failed
 * rebuild throws with {@link REBUILD_COMMAND} so the author can run it and read the full output.
 */
export default function setup(): void {
	if (isDistFresh()) {
		return;
	}

	if (process.env.CI) {
		throw new Error(`packages/radiant/dist is missing: build it first (${REBUILD_COMMAND})`);
	}

	const hash = hashDistSources();
	const result = spawnSync('pnpm', ['run', 'build:lib'], { cwd: packageRoot, stdio: 'inherit' });

	if (result.status !== 0) {
		throw new Error(`Rebuilding packages/radiant/dist failed: run ${REBUILD_COMMAND}`);
	}

	writeDistStamp(hash);
}
