import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, expect, test } from 'vitest';

const appRoot = path.resolve(import.meta.dirname, '..');
const sourceContentRoot = join(appRoot, 'src/content/components');

let contentRoot = '';

beforeAll(async () => {
	contentRoot = await mkdtemp(join(tmpdir(), 'rui-llm-content-'));
	const gettingStartedDir = join(contentRoot, 'getting-started');
	await mkdir(gettingStartedDir, { recursive: true });
	await copyFile(
		join(sourceContentRoot, 'getting-started/introduction.mdx'),
		join(gettingStartedDir, 'introduction.mdx'),
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

test('generateLlmDocs writes llms.txt and text exports', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'rui-llm-output-'));

	try {
		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { baseUrl: 'https://radiant-ui.ecopages.app/', contentRoot });

		const llmsTxt = await readFile(join(outputRoot, 'llms.txt'), 'utf8');
		expect(llmsTxt).toContain('Introduction');
		expect(llmsTxt).toContain('## When to use this');
		expect(llmsTxt).toContain('Importing catalog components');
		expect(llmsTxt).toContain('## How to read the docs');
		expect(llmsTxt).toContain('This `llms.txt` file is an index only.');
		expect(llmsTxt).toContain('/llms-content/<slug>.txt');
		expect(llmsTxt).toContain('## Install');
		expect(llmsTxt).toContain('npm install @ecopages/radiant-ui');
		expect(llmsTxt).toContain('/docs/getting-started/introduction');
		expect(llmsTxt).toContain('https://radiant-ui.ecopages.app/llms-content/getting-started/introduction.txt');
		expect(llmsTxt).toContain('## Agent Skill');
		expect(llmsTxt).toContain('/skill/SKILL.md');

		const introduction = await readFile(join(outputRoot, 'llms-content/getting-started/introduction.txt'), 'utf8');
		expect(introduction).toContain('# Introduction');
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
}, 30_000);

test('generateLlmDocs replaces stale exports', async () => {
	const outputRoot = await mkdtemp(join(tmpdir(), 'rui-llm-stale-'));

	try {
		const staleExport = join(outputRoot, 'llms-content/stale/gone.txt');
		await mkdir(join(outputRoot, 'llms-content/stale'), { recursive: true });
		await writeFile(staleExport, '# Obsolete export\n', 'utf8');

		const { generateLlmDocs } = await import('./generate-llm-docs');
		await generateLlmDocs(outputRoot, { contentRoot });

		expect(await pathExists(staleExport)).toBe(false);
		expect(await pathExists(join(outputRoot, 'llms-content/getting-started/introduction.txt'))).toBe(true);
	} finally {
		await rm(outputRoot, { recursive: true, force: true });
	}
});
