import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { declarationFiles, moduleSpecifiers } from './rewrite-dts-extensions.ts';

const packages = ['jsx', 'signals', 'radiant', 'radiant-ui', 'vite-plugin-radiant', 'storybook-radiant-vite'];
const EXPLICIT_EXTENSION = /\.(?:js|json|css)$/;

/**
 * Requires every package to be built, so run it after `pnpm run build:all`.
 */
for (const name of packages) {
	test(`${name} declarations use resolvable explicit extensions on relative specifiers`, () => {
		const dist = fileURLToPath(new URL(`../packages/${name}/dist`, import.meta.url));
		assert.ok(existsSync(dist), `${dist} does not exist; build the package first`);

		const problems: string[] = [];
		for (const file of declarationFiles(dist)) {
			for (const { text } of moduleSpecifiers(readFileSync(file, 'utf8'))) {
				if (!EXPLICIT_EXTENSION.test(text)) {
					problems.push(`${file}: '${text}' has no explicit extension`);
					continue;
				}
				const target = resolve(dirname(file), text);
				if (!existsSync(target) && !existsSync(target.replace(/\.js$/, '.d.ts'))) {
					problems.push(`${file}: '${text}' does not resolve to a file in dist`);
				}
			}
		}

		assert.deepEqual(problems, []);
	});
}
