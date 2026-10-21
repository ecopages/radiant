/**
 * Compiles `consumer.ts` with `declaration: true` against the built package and fails on any diagnostic.
 *
 * @remarks
 * Run in a scratch folder outside the repository. Inside it, TypeScript names a type by a relative
 * path to the built `dist` file and never reports TS2883. The built `dist` folders are linked into
 * the folder's `node_modules`, the shape an installed package has, so a helper type that no
 * `exports` entry reaches fails the way it does for a consumer. Needs `pnpm build:all` (or the
 * radiant, jsx and signals `build:lib`) first, as CI does before `typecheck`.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const packages = resolve(here, '../../../..');
const scratch = mkdtempSync(join(tmpdir(), 'radiant-declaration-emit-'));

mkdirSync(join(scratch, 'node_modules/@ecopages'), { recursive: true });
for (const name of ['radiant', 'jsx', 'signals']) {
	const dist = join(packages, name, 'dist');
	if (!existsSync(join(dist, 'package.json'))) {
		console.error(`packages/${name}/dist is missing: build it first (pnpm build:all)`);
		process.exit(1);
	}
	symlinkSync(dist, join(scratch, 'node_modules/@ecopages', name), 'dir');
}

copyFileSync(join(here, 'consumer.ts'), join(scratch, 'consumer.ts'));
writeFileSync(
	join(scratch, 'tsconfig.json'),
	JSON.stringify({
		extends: resolve(packages, '../tsconfig.json'),
		compilerOptions: { declaration: true, emitDeclarationOnly: true, noEmit: false, outDir: 'out', rootDir: '.' },
		include: ['consumer.ts'],
	}),
);

const tsc = join(dirname(createRequire(import.meta.url).resolve('typescript/package.json')), 'bin/tsc');
const result = spawnSync(process.execPath, [tsc, '-p', join(scratch, 'tsconfig.json')], { stdio: 'inherit' });

rmSync(scratch, { recursive: true, force: true });
process.exit(result.status ?? 1);
