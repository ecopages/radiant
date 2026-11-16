import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Packs the published packages, unpacks the tarballs into an empty project's `node_modules` (no
 * network, no dependency install) and type-checks a consumer file with `skipLibCheck: false`.
 * Run `pnpm run build:all` first. The Vite-based packages are left out because their peer
 * dependencies (`vite`, `nitro`, Storybook) are not unpacked here; their declarations are covered by the dist check. Pass a directory as the first argument to keep the project.
 */
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packages = ['jsx', 'signals', 'radiant', 'radiant-ui'];
const work = process.argv[2] ? resolve(process.argv[2]) : mkdtempSync(join(tmpdir(), 'dts-consumer-'));
const tsc = join(root, 'node_modules/typescript/bin/tsc');

const repro = `import { RuiIconAlertCircle, withDefaultAriaLabel } from '@ecopages/radiant-ui';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RadiantElement } from '@ecopages/radiant';
import { createContext } from '@ecopages/radiant/context';
import { computed } from '@ecopages/signals';
import { render } from '@ecopages/jsx';
import { hydrate } from '@ecopages/jsx/client';

export const a: symbol = withDefaultAriaLabel;
export const b: symbol = RuiButton;
export const c: symbol = RadiantElement;
export const d: symbol = createContext;
export const e: symbol = computed;
export const f: symbol = render;
export const g: symbol = hydrate;
export { RuiIconAlertCircle };
`;

function check(moduleResolution, module) {
	const dir = join(work, moduleResolution);
	writeFileSync(
		join(dir, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: { module, moduleResolution, strict: true, noEmit: true, skipLibCheck: false, types: [] },
			files: ['repro.mts'],
		}),
	);
	writeFileSync(join(dir, 'repro.mts'), repro);
	const result = spawnSync('node', [tsc, '-p', dir], { encoding: 'utf8' });
	return `${result.stdout}${result.stderr}`
		.split('\n')
		.filter((line) => line.includes('error TS'))
		.map((line) => line.replace(/^.*?(node_modules\/|repro)/, '$1'));
}

try {
	const tarballs = join(work, 'tarballs');
	mkdirSync(tarballs, { recursive: true });
	for (const name of ['nodenext', 'bundler']) {
		mkdirSync(join(work, name, 'node_modules/@ecopages'), { recursive: true });
	}
	for (const name of packages) {
		execFileSync('pnpm', ['pack', '--pack-destination', tarballs], {
			cwd: join(root, 'packages', name),
			stdio: 'ignore',
		});
	}
	for (const tarball of execFileSync('ls', [tarballs], { encoding: 'utf8' }).split('\n').filter(Boolean)) {
		const name = tarball.replace(/^ecopages-/, '').replace(/-\d.*\.tgz$/, '');
		for (const mode of ['nodenext', 'bundler']) {
			const target = join(work, mode, 'node_modules/@ecopages', name);
			mkdirSync(target, { recursive: true });
			execFileSync('tar', ['-xzf', join(tarballs, tarball), '-C', target, '--strip-components=1']);
		}
	}

	const nodenext = check('nodenext', 'nodenext');
	const bundler = check('bundler', 'esnext');
	const summarize = (errors) => {
		const counts = {};
		for (const line of errors)
			counts[line.match(/error (TS\d+)/)[1]] = (counts[line.match(/error (TS\d+)/)[1]] ?? 0) + 1;
		return `${errors.length} errors ${JSON.stringify(counts)}\n${errors
			.slice(0, 12)
			.map((line) => line.slice(0, 200))
			.join('\n')}`;
	};
	console.log(`nodenext: ${summarize(nodenext)}\n\nbundler: ${summarize(bundler)}`);

	const unexpected = (errors) =>
		errors.filter(
			(line) => !/^repro\.mts\(\d+,\d+\): error TS2322: .* is not assignable to type 'symbol'/.test(line),
		);
	assert.deepEqual(unexpected(nodenext), [], 'nodenext consumer reports unexpected errors');
	assert.deepEqual(unexpected(bundler), [], 'bundler consumer reports unexpected errors');
	assert.equal(nodenext.length, 7, 'every export assigned to symbol must be typed, not any');
	assert.equal(bundler.length, 7, 'every export assigned to symbol must be typed, not any');
} finally {
	if (!process.argv[2]) rmSync(work, { recursive: true, force: true });
}
