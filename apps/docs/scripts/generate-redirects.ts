import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MOVED_DOCS_PATHS } from '../src/lib/docs/moved-docs-paths';

const publicRoot = join(import.meta.dirname, '..', 'src/public');

/**
 * Renders Cloudflare Pages `_redirects` rules: one permanent redirect per moved docs page.
 *
 * @remarks
 * Each old path gets a second rule with a trailing slash, because Pages matches the request path as written and
 * old links exist in both forms.
 */
export function renderRedirects(movedPaths: Readonly<Record<string, string>> = MOVED_DOCS_PATHS): string {
	const lines = Object.entries(movedPaths).flatMap(([from, to]) => [`${from} ${to} 301`, `${from}/ ${to} 301`]);
	return `${lines.join('\n')}\n`;
}

/** Writes `_redirects` into the public directory, which the build copies to the deploy root. */
export async function generateRedirects(outputRoot = publicRoot): Promise<void> {
	await mkdir(outputRoot, { recursive: true });
	await writeFile(join(outputRoot, '_redirects'), renderRedirects(), 'utf8');
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	await generateRedirects();
	console.log(`[redirects] Generated ${join(publicRoot, '_redirects')}`);
}
