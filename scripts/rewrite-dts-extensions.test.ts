import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { rewriteDeclarationExtensions } from './rewrite-dts-extensions.ts';

function fixture(files: Record<string, string>): string {
	const root = mkdtempSync(join(tmpdir(), 'dts-ext-'));
	for (const [name, content] of Object.entries(files)) {
		mkdirSync(dirname(join(root, name)), { recursive: true });
		writeFileSync(join(root, name), content);
	}
	return root;
}

const read = (root: string, name: string) => readFileSync(join(root, name), 'utf8');

test('rewrites files, directory indexes, multiline, type imports and leaves comments alone', () => {
	const root = fixture({
		'foo.d.ts': 'export declare const foo: number;\n',
		'dir/index.d.ts': 'export declare const bar: number;\n',
		'dir/deep.d.ts': 'export declare const deep: number;\n',
		'main.d.ts': [
			`// import { x } from './foo';`,
			`/** @example import('./foo') */`,
			`import { foo } from './foo';`,
			`import type { bar } from "./dir";`,
			`export * from './dir/deep';`,
			`import {`,
			`  a,`,
			`  b,`,
			`} from './foo';`,
			`export declare const t: import('./dir').bar;`,
			`export declare const u: typeof import("./foo", { with: { 'resolution-mode': 'import' } });`,
			`import './foo';`,
			`import done from './done.js';`,
			`import data from './data.json';`,
			`import styles from './styles.css';`,
			`import legacy from './legacy.ts';`,
			`export declare const s: 'from "./foo"';`,
			'',
		].join('\n'),
	});
	try {
		rewriteDeclarationExtensions(root);
		const out = read(root, 'main.d.ts');
		assert.match(out, /^\/\/ import \{ x \} from '\.\/foo';$/m);
		assert.match(out, /@example import\('\.\/foo'\)/);
		assert.match(out, /import \{ foo \} from '\.\/foo\.js';/);
		assert.match(out, /import type \{ bar \} from "\.\/dir\/index\.js";/);
		assert.match(out, /export \* from '\.\/dir\/deep\.js';/);
		assert.match(out, /\} from '\.\/foo\.js';/);
		assert.match(out, /import\('\.\/dir\/index\.js'\)\.bar/);
		assert.match(out, /import\("\.\/foo\.js", \{/);
		assert.match(out, /^import '\.\/foo\.js';$/m);
		assert.match(out, /'\.\/done\.js'/);
		assert.match(out, /'\.\/data\.json'/);
		assert.match(out, /'\.\/styles\.css'/);
		assert.match(out, /'\.\/legacy\.js'/);
		assert.match(out, /'from "\.\/foo"'/);
	} finally {
		rmSync(root, { recursive: true });
	}
});

test('is idempotent', () => {
	const root = fixture({ 'foo.d.ts': 'export {};\n', 'a.d.ts': `import { x } from './foo';\n` });
	try {
		assert.deepEqual(rewriteDeclarationExtensions(root), [join(root, 'a.d.ts')]);
		const first = read(root, 'a.d.ts');
		assert.deepEqual(rewriteDeclarationExtensions(root), []);
		assert.equal(read(root, 'a.d.ts'), first);
	} finally {
		rmSync(root, { recursive: true });
	}
});

test('fails naming the file and specifier when a specifier resolves to nothing', () => {
	const root = fixture({ 'a.d.ts': `import { x } from './missing';\n` });
	try {
		assert.throws(() => rewriteDeclarationExtensions(root), /'\.\/missing' in .*a\.d\.ts/);
	} finally {
		rmSync(root, { recursive: true });
	}
});
