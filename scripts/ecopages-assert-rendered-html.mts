/**
 * Fails the build when emitted HTML contains an unrendered JavaScript value.
 *
 * @remarks
 * `[object Object]` in the output means a renderable reached a string boundary without being
 * serialized — the shape most recently produced by a stale `.eco` cache mixing two
 * `@ecopages/jsx` runtimes (see {@link ./ecopages-invalidate-stale-cache.mts}). Ecopages exits
 * 0 in that case and the corruption only surfaces as an e2e selector timeout minutes later,
 * so the build asserts on it directly.
 *
 * Usage: `tsx ../../scripts/ecopages-assert-rendered-html.mts dist` from the app directory.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const distDirectory = path.resolve(process.cwd(), process.argv[2] ?? 'dist');

/* Any `[object X]` tag, not just `Object`: a promise left unawaited on a render path
   serializes as `[object Promise]`, which is the same class of bug. */
const UNRENDERED_VALUE = /\[object [A-Z]\w*\]/;

/* Code samples and inline literals are authored content — a page documenting `String({})`
   prints this string on purpose. Only prose and markup are checked. */
const AUTHORED_CODE = /<(pre|code|script)\b[^>]*>[\s\S]*?<\/\1>/gi;

const entries = await readdir(distDirectory, { recursive: true, withFileTypes: true });
const pages = entries
	.filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
	.map((entry) => path.join(entry.parentPath, entry.name));

const corrupted: string[] = [];
for (const page of pages) {
	const html = await readFile(page, 'utf8');
	const match = UNRENDERED_VALUE.exec(html.replace(AUTHORED_CODE, ''));
	if (match) corrupted.push(`${path.relative(distDirectory, page)} — ${match[0]}`);
}

if (corrupted.length > 0) {
	console.error(
		`[ecopages] ${corrupted.length} of ${pages.length} rendered pages contain an unrendered value:\n` +
			`${corrupted
				.slice(0, 10)
				.map((entry) => `  ${entry}`)
				.join('\n')}\n` +
			`${corrupted.length > 10 ? `  …and ${corrupted.length - 10} more\n` : ''}` +
			'A value reached a string boundary without being serialized. If a workspace package was\n' +
			"rebuilt recently, remove the app's `.eco` directory and build again.",
	);
	process.exit(1);
}

console.log(`[ecopages] ${pages.length} rendered pages contain no unrendered values.`);
