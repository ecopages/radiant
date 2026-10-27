import path from 'node:path';
import * as esbuild from 'esbuild';
import { expect, test } from 'vitest';

test('the client entry graph does not reach the SSR runtime getter', async () => {
	const result = await esbuild.build({
		absWorkingDir: path.resolve(import.meta.dirname, '../..'),
		bundle: true,
		entryPoints: ['./src/index.ts'],
		external: ['@ecopages/*'],
		format: 'esm',
		logLevel: 'silent',
		platform: 'browser',
		write: false,
	});

	expect(result.outputFiles[0]?.text).not.toContain('getRadiantElementSsrRuntime');
});
