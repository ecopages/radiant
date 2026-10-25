import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import * as esbuild from 'esbuild';
import { beforeAll, describe, expect, test } from 'vitest';
import { assertFreshDist, distRoot } from './dist-app';

const DELEGATED_FOCUS_WARNING = 'Delegated @onEvent listens on the host in the bubble phase, so "focus"';
const PEER_PACKAGES = ['@ecopages/jsx', '@ecopages/jsx/*', '@ecopages/signals', '@ecopages/signals/*'];
const DEVELOPMENT_WARNING_TEXTS = [
	'Delegated @onEvent listens',
	'pass it as the',
	'ignores appended nodes',
	'was defined after a JSX view rendered it',
	"has not received its children from its parent's view",
];
const NODE_ENV_READ = /process\.env\.NODE_ENV/g;
/** Matches the check as the first expression in a `try` block, whether esbuild kept the `if` or minified it to `&&`. */
const GUARDED_NODE_ENV_READ = /try\s*\{\s*(?:if\s*\(\s*)?process\.env\.NODE_ENV\s*!==\s*"production"/g;

/**
 * A consumer app that delegates a `focus` listener, which never bubbles to the host.
 *
 * @remarks The host is a plain object with `nodeType: 1`, so the bundle runs in a bare
 * `vm` context with only an `Element` stub and no `process` global, as a browser page would.
 */
const consumerApp = `
import { createEventListener } from '@ecopages/radiant/helpers/create-event-listener';

const host = {
	nodeType: 1,
	isConnected: true,
	addEventListener() {},
	registerConnectedCallback() {},
	registerCleanupCallback() {},
};

createEventListener(host, { selector: 'input', type: 'focus' }, () => {});
`;

/** Bundles an app module against the published dist, resolved through its `package.json` exports. */
async function bundleApp(contents: string, options: esbuild.BuildOptions): Promise<string> {
	const result = await esbuild.build({
		stdin: { contents, resolveDir: distRoot },
		bundle: true,
		external: PEER_PACKAGES,
		format: 'iife',
		logLevel: 'silent',
		platform: 'browser',
		write: false,
		...options,
	});

	return result.outputFiles?.[0]?.text ?? '';
}

function runInBrowserContext(code: string): string[] {
	const warnings: string[] = [];
	runInNewContext(code, {
		Element: class {},
		console: { warn: (message: string) => warnings.push(message) },
	});

	return warnings;
}

describe('published dist development warnings', () => {
	beforeAll(assertFreshDist);

	test('A development build of an app shows Radiant development warnings', async () => {
		const bundle = await bundleApp(consumerApp, { define: { 'process.env.NODE_ENV': '"development"' } });

		const warnings = runInBrowserContext(bundle);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain(DELEGATED_FOCUS_WARNING);
		expect(warnings[0]).toContain('focusin');
	});

	test('A development build of an app importing @ecopages/radiant keeps every Radiant development warning', async () => {
		const bundle = await bundleApp(`import * as entry from '@ecopages/radiant';\nglobalThis.entry = entry;`, {
			define: { 'process.env.NODE_ENV': '"development"' },
		});

		for (const text of DEVELOPMENT_WARNING_TEXTS) {
			expect(bundle).toContain(text);
		}
	});

	test.for([
		'@ecopages/radiant',
		'@ecopages/radiant/decorators/on-event',
		'@ecopages/radiant/helpers/create-event-listener',
	])('A production build of an app importing %s drops Radiant development warnings', async (entry) => {
		const bundle = await bundleApp(`import * as entry from '${entry}';\nglobalThis.entry = entry;`, {
			define: { 'process.env.NODE_ENV': '"production"' },
			minify: true,
		});

		expect(bundle).toContain('Radiant host target must be an Element');
		for (const text of DEVELOPMENT_WARNING_TEXTS) {
			expect(bundle).not.toContain(text);
		}
	});

	test('A browser load that leaves process.env.NODE_ENV unreplaced does not throw', async () => {
		const bundle = await bundleApp(consumerApp, { define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' } });

		expect(bundle).toContain('process.env.NODE_ENV');
		expect(runInBrowserContext(bundle)).toEqual([]);
	});

	test('every dist file reads process.env.NODE_ENV only inside the guarded block', () => {
		const files = readdirSync(distRoot, { recursive: true, encoding: 'utf8' }).filter((file) =>
			file.endsWith('.js'),
		);

		const unguarded = files.filter((file) => {
			const code = readFileSync(path.join(distRoot, file), 'utf8');
			return (code.match(NODE_ENV_READ)?.length ?? 0) !== (code.match(GUARDED_NODE_ENV_READ)?.length ?? 0);
		});

		expect(files.length).toBeGreaterThan(0);
		expect(unguarded).toEqual([]);
	});
});
