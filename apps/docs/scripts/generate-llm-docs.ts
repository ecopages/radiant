import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContentScanner, compareEntriesByField } from '@ecopages/content-processor';
import { docsFrontmatterSchema, LLM_SECTION_ORDER } from '../src/content/docs';
import { configuredSiteOrigin } from '../src/lib/docs/site-meta';
import { generateLlmDocs as writeLlmDocs } from '../src/lib/llm-docs';

const ROOT_DIR = join(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');
const DEFAULT_CONTENT_ROOT = join(ROOT_DIR, 'src/content/docs');

const LLMS_HEADER = [
	'# Radiant Documentation',
	'> Build typed custom elements, controller hosts, JSX views, and Signals with Radiant.',
	'',
	'## When to use this',
	'',
	'Reach for Radiant when you are:',
	'',
	'- Defining typed custom elements with `RadiantElement`, reactive fields, and light-DOM views.',
	'- Attaching `RadiantController` behavior to existing DOM instead of wrapping it in a synthetic component tree.',
	'- Authoring JSX views, Signals, and SSR or hydration for hosts that stay real custom elements.',
	'',
	'Do not use this site as a hosted SaaS or authenticated API. It is documentation and generated text for the open-source library.',
	'',
	'## How to read the docs',
	'',
	'- This `llms.txt` file is an index only.',
	'- Follow links to `/llms-content/<slug>.txt` for full page exports (HTML pages also advertise that URL as `rel=alternate`).',
	'- For a progressive build guide, start at `/skill.txt` or `/skill/SKILL.md`.',
	'',
	'## Install',
	'',
	'- npm packages: [`@ecopages/radiant`](https://www.npmjs.com/package/@ecopages/radiant) and [`@ecopages/jsx`](https://www.npmjs.com/package/@ecopages/jsx).',
	'- Install: `npm install @ecopages/radiant @ecopages/jsx`, `pnpm add @ecopages/radiant @ecopages/jsx`, or `bun add @ecopages/radiant @ecopages/jsx`.',
	'- Guide: `/docs/getting-started/installation` (text export: `/llms-content/getting-started/installation.txt`).',
	'',
	'## Agent Skill',
	'',
	'- [Skill index](/skill.txt)',
	'- [SKILL.md](/skill/SKILL.md)',
	'',
];

export type GenerateLlmDocsOptions = {
	contentRoot?: string;
	baseUrl?: string;
};

export async function generateLlmDocs(outputRoot = PUBLIC_DIR, options: GenerateLlmDocsOptions = {}): Promise<void> {
	const scanner = new ContentScanner({
		contentRoot: options.contentRoot ?? DEFAULT_CONTENT_ROOT,
		orderBy: compareEntriesByField('order'),
		schema: docsFrontmatterSchema,
	});

	await writeLlmDocs(scanner, {
		outputDir: join(outputRoot, 'llms-content'),
		indexPath: join(outputRoot, 'llms.txt'),
		baseUrl: options.baseUrl ?? configuredSiteOrigin(),
		sectionOrder: LLM_SECTION_ORDER,
		headerLines: LLMS_HEADER,
	});
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	await generateLlmDocs();
	console.log('[llms.txt] Successfully generated llms.txt and content files.');
}
