import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { getDocsLlmUrlFromPathname } from '../src/lib/docs/docs-llm-url';

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceContentRoot = join(appRoot, 'src/content/docs');

let contentRoot = '';

beforeAll(async () => {
	contentRoot = await mkdtemp(join(tmpdir(), 'docs-llm-content-'));
	await mkdir(join(contentRoot, 'getting-started'), { recursive: true });
	await mkdir(join(contentRoot, 'signals'), { recursive: true });
	await mkdir(join(contentRoot, 'llms-fixture'), { recursive: true });
	for (const page of ['getting-started/introduction', 'getting-started/installation', 'signals/signals-overview']) {
		await copyFile(join(sourceContentRoot, `${page}.mdx`), join(contentRoot, `${page}.mdx`));
	}
	await writeFile(
		join(contentRoot, 'llms-fixture/excluded.mdx'),
		`---
title: "Excluded"
description: "Excluded from LLM exports."
order: 1
llms: false
---

# Excluded from LLM export
`,
		'utf8',
	);
});

afterAll(async () => {
	if (contentRoot) {
		await rm(contentRoot, { recursive: true, force: true });
	}
});

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

test('generateLlmDocs writes llms.txt and Markdown exports in sidebar order', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'docs-llm-output-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { baseUrl: 'https://radiant.ecopages.app/', contentRoot });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		expect(llmsTxt).toContain('## When to use this');
		expect(llmsTxt).toContain('Defining typed custom elements');
		expect(llmsTxt).toContain('This `llms.txt` file is an index only.');
		expect(llmsTxt).toContain('/docs-llm/<section>/<slug>.md');
		expect(llmsTxt).not.toContain('/llms-content/');
		expect(llmsTxt).toContain('npm install @ecopages/radiant @ecopages/jsx');
		expect(llmsTxt).toContain('## Agent Skill');
		expect(llmsTxt).not.toContain('Excluded');
		expect(llmsTxt).not.toContain('## llms-fixture');

		const overview = llmsTxt.indexOf(
			'[Overview](https://radiant.ecopages.app/docs-llm/getting-started/introduction.md)',
		);
		const installation = llmsTxt.indexOf(
			'[Installation](https://radiant.ecopages.app/docs-llm/getting-started/installation.md)',
		);
		const signals = llmsTxt.indexOf('## Signals');
		expect(overview).toBeGreaterThan(-1);
		expect(installation).toBeGreaterThan(overview);
		expect(signals).toBeGreaterThan(installation);

		const introduction = await readFile(join(outputRoot, 'docs-llm/getting-started/introduction.md'), 'utf8');
		expect(introduction).toContain('# Introduction');
		expect(await pathExists(join(outputRoot, 'docs-llm/llms-fixture/excluded.md'))).toBe(false);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
}, 30_000);

test('generateLlmDocs keeps the legacy text exports under their old slugs', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'docs-llm-legacy-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		const markdown = await readFile(join(outputRoot, 'docs-llm/signals/signals-overview.md'), 'utf8');
		expect(await readFile(join(outputRoot, 'llms-content/packages/signals-overview.txt'), 'utf8')).toBe(markdown);
		expect(await pathExists(join(outputRoot, 'llms-content/getting-started/introduction.txt'))).toBe(true);
		expect(await pathExists(join(outputRoot, 'llms-content/signals/signals-overview.txt'))).toBe(false);
		expect(await pathExists(join(outputRoot, 'llms-content/llms-fixture/excluded.txt'))).toBe(false);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});

test('generateLlmDocs replaces stale exports and leaves no staging directory behind', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'docs-llm-stale-'));

	try {
		await mkdir(join(outputRoot, 'docs-llm/stale'), { recursive: true });
		await mkdir(join(outputRoot, 'llms-content/stale'), { recursive: true });
		await writeFile(join(outputRoot, 'docs-llm/stale/gone.md'), '# Obsolete export\n', 'utf8');
		await writeFile(join(outputRoot, 'llms-content/stale/gone.txt'), '# Obsolete export\n', 'utf8');

		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		expect(await pathExists(join(outputRoot, 'docs-llm/stale/gone.md'))).toBe(false);
		expect(await pathExists(join(outputRoot, 'llms-content/stale/gone.txt'))).toBe(false);
		expect(await pathExists(join(outputRoot, 'docs-llm/getting-started/introduction.md'))).toBe(true);
		expect(await pathExists(join(outputRoot, '.docs-llm-staging'))).toBe(false);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});

test('llms.txt links match the page alternates', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'docs-llm-contract-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot, baseUrl: 'https://docs.example.com/' });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		const pageLinks = [...llmsTxt.matchAll(/\]\((https?:\/\/[^)]+\/docs-llm\/[^)]+)\)/g)].map((match) => match[1]!);
		expect(pageLinks.length).toBeGreaterThan(0);

		for (const href of pageLinks) {
			const url = new URL(href);
			expect(url.origin).toBe('https://docs.example.com');
			expect(await pathExists(join(outputRoot, url.pathname.slice(1)))).toBe(true);
			const [, section, slug] = url.pathname.replace(/^\//, '').replace(/\.md$/, '').split('/');
			expect(getDocsLlmUrlFromPathname(`/docs/${section}/${slug}`)).toBe(url.pathname);
		}
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});
