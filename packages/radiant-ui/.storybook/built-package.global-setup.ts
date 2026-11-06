import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import type { TestProject } from 'vitest/node';

const packageRoot = path.resolve(import.meta.dirname, '..');
const REBUILD_COMMAND = 'pnpm --filter @ecopages/radiant-ui build:lib';
const SOURCE_FILE = /\.(?:tsx?|css)$/;
const NOT_SHIPPED = /\.(?:test|stories)\.tsx?$|\.fixture\.tsx?$/;

declare module 'vitest' {
	interface ProvidedContext {
		builtPackageProblem: string | null;
	}
}

/** Returns why `dist/` cannot be trusted, or `null` when it exists and is newer than every shipped source. */
function findDistProblem(): string | null {
	const dist = path.join(packageRoot, 'dist');
	let builtAt: number;

	try {
		builtAt = Math.min(statSync(path.join(dist, 'index.js')).mtimeMs, statSync(path.join(dist, 'chunks')).mtimeMs);
	} catch {
		return `built-package tests need packages/radiant-ui/dist and dist/chunks: run ${REBUILD_COMMAND}`;
	}

	const newer = readdirSync(path.join(packageRoot, 'src'), { recursive: true, encoding: 'utf8' })
		.filter((file) => SOURCE_FILE.test(file) && !NOT_SHIPPED.test(file))
		.find((file) => statSync(path.join(packageRoot, 'src', file)).mtimeMs > builtAt);

	return newer ? `packages/radiant-ui/dist is older than src/${newer}: run ${REBUILD_COMMAND}` : null;
}

/**
 * Vitest `globalSetup` for the `built-package` project: provides why `dist/` or `dist/chunks` is missing or
 * older than a shipped source file, which `built-package.setup.ts` turns into a failing `beforeAll`.
 *
 * @remarks Throwing here would abort every project in the run, so a bare `pnpm test` could not run `unit`
 * without a build. Freshness compares mtimes, so a formatting-only edit asks for a rebuild too; `dist/` is
 * the subject of these tests, and a stale one would pass against old code.
 */
export default function setup(project: TestProject): void {
	project.provide('builtPackageProblem', findDistProblem());
}
