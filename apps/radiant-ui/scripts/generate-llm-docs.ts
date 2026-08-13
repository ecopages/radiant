import { join } from 'node:path';
import { ContentScanner } from '@ecopages/content-processor';
import appConfig from '../eco.config';
import { DOCS_GROUP_ORDER, componentDocsFrontmatterSchema } from '../src/content/components';
import { generateLlmDocs } from '../src/lib/llm-docs';

const ROOT_DIR = join(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');

const LLMS_HEADER = [
	'# Radiant UI',
	'> Accessible, framework-agnostic UI components built on the Radiant reactive model.',
	'> Component modules live under @ecopages/radiant-ui/<slug>.',
	'> Start at /skill.txt or /skill/SKILL.md',
	'',
];

const scanner = new ContentScanner({
	contentRoot: join(appConfig.absolutePaths.srcDir, 'content/components'),
	schema: componentDocsFrontmatterSchema,
});

await generateLlmDocs(scanner, {
	outputDir: join(PUBLIC_DIR, 'llms-content'),
	indexPath: join(PUBLIC_DIR, 'llms.txt'),
	baseUrl: process.env.ECOPAGES_BASE_URL,
	sectionOrder: DOCS_GROUP_ORDER,
	headerLines: LLMS_HEADER,
	getSection: (post) => post.group ?? post.category ?? post.segments[0] ?? 'Other',
	formatSectionTitle: (section) => section,
});

console.log('[llms.txt] Successfully generated llms.txt and content files.');
