import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const guardPath = resolve(testDirectory, '../../../scripts/ecopages-invalidate-stale-cache.mts');
const tsxLoader = fileURLToPath(import.meta.resolve('tsx'));

function withCacheFixture(run) {
	const appDirectory = mkdtempSync(join(tmpdir(), 'radiant-eco-cache-'));
	const cacheDirectory = join(appDirectory, '.eco');
	const cacheFile = join(cacheDirectory, '.server-modules', 'page.js');
	const sourceFile = join(appDirectory, 'src', 'components', 'example.script.tsx');
	const generatedFile = join(appDirectory, 'src', 'public', 'llms-content', 'example.txt');
	const generatedIndex = join(appDirectory, 'src', 'public', 'llms.txt');

	mkdirSync(dirname(cacheFile), { recursive: true });
	mkdirSync(dirname(sourceFile), { recursive: true });
	mkdirSync(dirname(generatedFile), { recursive: true });
	writeFileSync(join(appDirectory, 'package.json'), '{}');
	for (const filePath of [cacheFile, sourceFile, generatedFile, generatedIndex]) {
		writeFileSync(filePath, 'content');
	}

	try {
		run({ appDirectory, cacheDirectory, cacheFile, sourceFile, generatedFile, generatedIndex });
	} finally {
		rmSync(appDirectory, { recursive: true, force: true });
	}
}

function runGuard(appDirectory) {
	const result = spawnSync(process.execPath, ['--import', tsxLoader, guardPath], {
		cwd: appDirectory,
		encoding: 'utf8',
	});
	assert.equal(result.status, 0, result.stderr);
}

test('docs cache guard drops cached page modules after a client script changes', () => {
	withCacheFixture(({ appDirectory, cacheDirectory, cacheFile, sourceFile }) => {
		const now = Date.now();
		utimesSync(cacheFile, new Date(now - 60_000), new Date(now - 60_000));
		utimesSync(sourceFile, new Date(now), new Date(now));

		runGuard(appDirectory);
		assert.equal(existsSync(cacheDirectory), false);
	});
});

test('docs cache guard ignores regenerated LLM text exports', () => {
	withCacheFixture(({ appDirectory, cacheDirectory, cacheFile, sourceFile, generatedFile, generatedIndex }) => {
		const now = Date.now();
		utimesSync(sourceFile, new Date(now - 120_000), new Date(now - 120_000));
		utimesSync(cacheFile, new Date(now - 60_000), new Date(now - 60_000));
		utimesSync(generatedFile, new Date(now), new Date(now));
		utimesSync(generatedIndex, new Date(now), new Date(now));

		runGuard(appDirectory);
		assert.equal(existsSync(cacheDirectory), true);
	});
});
