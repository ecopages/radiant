import { join } from 'node:path';
import { ContentScanner, compareEntriesByField } from '@ecopages/content-processor';
import appConfig from '../eco.config';
import { docsFrontmatterSchema, LLM_SECTION_ORDER } from '../src/content/docs';
import { generateLlmDocs } from '../src/lib/llm-docs';

const ROOT_DIR = join(import.meta.dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');

const LLMS_HEADER = [
	'# Radiant Documentation',
	'> Build typed custom elements, controller hosts, JSX views, and Signals with Radiant.',
	'> Find your skill here: https://radiant.ecopages.app/skill.txt',
	'',
];

const scanner = new ContentScanner({
	contentRoot: join(appConfig.absolutePaths.srcDir, 'content/docs'),
	orderBy: compareEntriesByField('order'),
	schema: docsFrontmatterSchema,
});

await generateLlmDocs(scanner, {
	outputDir: join(PUBLIC_DIR, 'llms-content'),
	indexPath: join(PUBLIC_DIR, 'llms.txt'),
	baseUrl: process.env.ECOPAGES_BASE_URL,
	sectionOrder: LLM_SECTION_ORDER,
	headerLines: LLMS_HEADER,
});

console.log('[llms.txt] Successfully generated llms.txt and content files.');
