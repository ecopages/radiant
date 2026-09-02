import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContentScanner } from '@ecopages/content-processor';
import { DOCS_GROUP_ORDER, componentDocsFrontmatterSchema } from '../src/content/components';
import { configuredSiteOrigin } from '../src/lib/docs/site-meta';
import { generateLlmDocs as writeLlmDocs } from '../src/lib/llm-docs';

const ROOT_DIR = join(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');
const DEFAULT_CONTENT_ROOT = join(ROOT_DIR, 'src/content/components');

const LLMS_HEADER = [
	'# Radiant UI',
	'> Accessible, framework-agnostic UI components built on the Radiant reactive model.',
	'> Component modules live under @ecopages/radiant-ui/<slug>.',
	'',
	'## When to use this',
	'',
	'Reach for Radiant UI when you are:',
	'',
	'- Importing catalog components, themes, and composition helpers for light-DOM interfaces.',
	'- Composing accessible views that stay on Radiant hosts instead of a synthetic component tree.',
	'- Documenting or extending `rui-*` custom elements with the published module surface.',
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
	'- npm package: [`@ecopages/radiant-ui`](https://www.npmjs.com/package/@ecopages/radiant-ui).',
	'- Install: `npm install @ecopages/radiant-ui`, `pnpm add @ecopages/radiant-ui`, or `bun add @ecopages/radiant-ui`.',
	'- Guide: `/docs/getting-started/introduction` (text export: `/llms-content/getting-started/introduction.txt`).',
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
		schema: componentDocsFrontmatterSchema,
	});

	await writeLlmDocs(scanner, {
		outputDir: join(outputRoot, 'llms-content'),
		indexPath: join(outputRoot, 'llms.txt'),
		baseUrl: options.baseUrl ?? configuredSiteOrigin(),
		sectionOrder: DOCS_GROUP_ORDER,
		headerLines: LLMS_HEADER,
		getSection: (post) => post.group ?? post.category ?? post.segments[0] ?? 'Other',
		formatSectionTitle: (section) => section,
	});
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	await generateLlmDocs();
	console.log('[llms.txt] Successfully generated llms.txt and content files.');
}
