import { join } from 'node:path';
import appConfig from '../eco.config';
import { LLM_SECTION_ORDER } from '../src/config/docs';
import { ContentSource, resolveContentRoot } from '../src/lib/content-source';
import { generateLlmDocs } from '../src/lib/llm-docs';

const ROOT_DIR = join(import.meta.dir, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');

const LLMS_HEADER = [
	'# Radiant Documentation',
	'> Build typed custom elements, controller hosts, JSX views, and Signals with Radiant.',
	'> Find your skill here: https://radiant.ecopages.app/skill.txt',
	'',
];

const source = new ContentSource({
	contentRoot: resolveContentRoot(appConfig),
	orderBy: 'order',
});

await generateLlmDocs(source, {
	outputDir: join(PUBLIC_DIR, 'llms-content'),
	indexPath: join(PUBLIC_DIR, 'llms.txt'),
	baseUrl: process.env.ECOPAGES_BASE_URL,
	sectionOrder: LLM_SECTION_ORDER,
	headerLines: LLMS_HEADER,
});

console.log('[llms.txt] Successfully generated llms.txt and content files.');
