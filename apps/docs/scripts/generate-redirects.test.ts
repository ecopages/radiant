import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import { MOVED_DOCS_PATHS } from '../src/lib/docs/moved-docs-paths';
import { generateRedirects, renderRedirects } from './generate-redirects';

const contentRoot = join(import.meta.dirname, '..', 'src/content/docs');

async function listDocsPaths(directory: string): Promise<Set<string>> {
	const entries = await readdir(directory, { recursive: true, withFileTypes: true });
	return new Set(
		entries
			.filter((entry) => entry.isFile() && entry.name.endsWith('.mdx'))
			.map((entry) => `/docs/${relative(contentRoot, join(entry.parentPath, entry.name)).replace(/\.mdx$/, '')}`),
	);
}

describe('moved docs paths', () => {
	test('every old path redirects to an existing page', async () => {
		const pages = await listDocsPaths(contentRoot);
		const missing = Object.entries(MOVED_DOCS_PATHS).filter(([, to]) => !pages.has(to));
		expect(missing).toEqual([]);
	});

	test('no old path is still a page', async () => {
		const pages = await listDocsPaths(contentRoot);
		expect(Object.keys(MOVED_DOCS_PATHS).filter((from) => pages.has(from))).toEqual([]);
	});

	test('every page sits in a section folder', async () => {
		const pages = await listDocsPaths(contentRoot);
		expect([...pages].filter((page) => page.split('/').length !== 4)).toEqual([]);
	});
});

describe('renderRedirects', () => {
	test('writes a permanent rule for each old path with and without a trailing slash', () => {
		expect(renderRedirects({ '/docs/old': '/docs/section/old' })).toBe(
			'/docs/old /docs/section/old 301\n/docs/old/ /docs/section/old 301\n',
		);
	});

	test('generateRedirects writes _redirects into the output directory', async () => {
		const outputRoot = await mkdtemp(join(tmpdir(), 'docs-redirects-'));
		try {
			await generateRedirects(outputRoot);
			const lines = (await readFile(join(outputRoot, '_redirects'), 'utf8')).trim().split('\n');
			expect(lines).toHaveLength(Object.keys(MOVED_DOCS_PATHS).length * 2);
		} finally {
			await rm(outputRoot, { recursive: true, force: true });
		}
	});
});
