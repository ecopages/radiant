import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ContentScanner } from '@ecopages/content-processor';
import {
	compareDocsEntries,
	componentDocsFrontmatterSchema,
	DOCS_SECTION_CONFIG,
	LLM_SECTION_ORDER,
	type ComponentDocsFrontmatter,
} from '../src/content/components';
import { MOVED_DOCS_PATHS } from '../src/lib/docs/moved-docs-paths';
import { absoluteUrl, configuredSiteOrigin, normalizeSiteOrigin } from '../src/lib/docs/site-meta';

const appRoot = join(import.meta.dirname, '..');
const publicRoot = join(appRoot, 'src/public');
const defaultContentRoot = join(appRoot, 'src/content/components');

const LLMS_PREAMBLE = [
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
	'- Follow links to `/docs-llm/<section>/<slug>.md` for full page exports (HTML pages also advertise that URL as `rel=alternate`).',
	'- For a progressive build guide, start at `/skill.txt` or `/skill/SKILL.md`.',
	'',
	'## Install',
	'',
	'- npm package: [`@ecopages/radiant-ui`](https://www.npmjs.com/package/@ecopages/radiant-ui).',
	'- Install: `npm install @ecopages/radiant-ui`, `pnpm add @ecopages/radiant-ui`, or `bun add @ecopages/radiant-ui`.',
	'- Guide: `/docs/getting-started/introduction` (Markdown export: `/docs-llm/getting-started/introduction.md`).',
	'',
	'## Agent Skill',
	'',
	'- [Skill index](/skill.txt)',
	'- [SKILL.md](/skill/SKILL.md)',
	'',
];

/**
 * Directory of the old plain-text exports, `llms-content/<slug>.txt`.
 *
 * @remarks
 * Deprecated: kept for one release so links published before the switch to `/docs-llm/<section>/<slug>.md` keep
 * resolving. Pages that moved into a section folder are written under their old slug (from `MOVED_DOCS_PATHS`).
 * Removal: one release after `/docs-llm/` ships, delete `LEGACY_LLMS_DIR`, `legacyLlmsSlug`, the legacy writes and
 * staging below, the `src/public/llms-content/` entry in `.gitignore`, and the legacy assertions in the tests.
 */
export const LEGACY_LLMS_DIR = 'llms-content';

const legacyPathByCurrentPath = new Map(Object.entries(MOVED_DOCS_PATHS).map(([from, to]) => [to, from]));

/** Slug a page had before the section-folder move, used for its legacy `llms-content` export. */
function legacyLlmsSlug(slug: string): string {
	const currentPath = `/docs/${slug}`;
	return (legacyPathByCurrentPath.get(currentPath) ?? currentPath).slice('/docs/'.length);
}

export type GenerateLlmDocsOptions = {
	contentRoot?: string;
	/**
	 * Site origin used in `llms.txt` links. Defaults to `configuredSiteOrigin()`.
	 */
	baseUrl?: string;
};

function llmDocsOrigin(baseUrl?: string): string {
	return normalizeSiteOrigin(baseUrl ?? configuredSiteOrigin());
}

function createScanner(contentRoot: string): ContentScanner<ComponentDocsFrontmatter> {
	return new ContentScanner({
		contentRoot,
		schema: componentDocsFrontmatterSchema,
		orderBy: compareDocsEntries,
	});
}

/**
 * Writes raw MDX bodies and `llms.txt` into the public directory for static serving.
 *
 * @remarks
 * - `llms.txt` is a `.txt` discovery index only (when-to-use, install, section links).
 * - Linked page bodies live under `docs-llm/<section>/<slug>.md`.
 * - `docs-llm/` and `llms-content/` are generator-owned: each successful run replaces both trees so deleted or `llms: false` pages are not left public.
 * - Output is staged in `.docs-llm-staging/` and swapped in only after all writes succeed; a failed run leaves the previous exports intact and removes the staging tree.
 */
export async function generateLlmDocs(outputRoot = publicRoot, options: GenerateLlmDocsOptions = {}): Promise<void> {
	const scanner = createScanner(options.contentRoot ?? defaultContentRoot);
	const posts = await scanner.getManifest();
	const llmRoot = join(outputRoot, 'docs-llm');
	const legacyRoot = join(outputRoot, LEGACY_LLMS_DIR);
	const stagingRoot = join(outputRoot, '.docs-llm-staging');
	const stagedLlmRoot = join(stagingRoot, 'docs-llm');
	const stagedLegacyRoot = join(stagingRoot, LEGACY_LLMS_DIR);
	const origin = llmDocsOrigin(options.baseUrl);

	try {
		await rm(stagingRoot, { recursive: true, force: true });
		await mkdir(stagedLlmRoot, { recursive: true });
		await mkdir(stagedLegacyRoot, { recursive: true });
		const lines: string[] = [...LLMS_PREAMBLE];

		const sections = new Map<string, typeof posts>();

		for (const post of posts) {
			const sectionId = post.segments[0] ?? 'other';
			if (!sections.has(sectionId)) {
				sections.set(sectionId, []);
			}
			sections.get(sectionId)!.push(post);
		}

		const orderedSections = [
			...LLM_SECTION_ORDER.filter((section) => sections.has(section)),
			...Array.from(sections.keys())
				.filter((section) => !LLM_SECTION_ORDER.includes(section as (typeof LLM_SECTION_ORDER)[number]))
				.sort((a, b) => a.localeCompare(b)),
		];

		for (const sectionId of orderedSections) {
			const sectionPosts = sections.get(sectionId);
			const exportedPosts = sectionPosts?.filter((page) => page.llms !== false) ?? [];
			if (exportedPosts.length === 0) {
				continue;
			}

			const sectionTitle = DOCS_SECTION_CONFIG[sectionId as keyof typeof DOCS_SECTION_CONFIG]?.title ?? sectionId;
			lines.push(`## ${sectionTitle}`);

			for (const page of exportedPosts) {
				const pageSlug = page.segments[page.segments.length - 1]!;
				const body = await scanner.getRawContent(page.slug);
				const outputPath = join(stagedLlmRoot, sectionId, `${pageSlug}.md`);
				await mkdir(dirname(outputPath), { recursive: true });
				await writeFile(outputPath, body, 'utf8');

				const legacyPath = join(stagedLegacyRoot, `${legacyLlmsSlug(page.slug)}.txt`);
				await mkdir(dirname(legacyPath), { recursive: true });
				await writeFile(legacyPath, body, 'utf8');

				const url = absoluteUrl(`/docs-llm/${sectionId}/${pageSlug}.md`, origin);
				lines.push(`- [${page.title}](${url})`);
			}

			lines.push('');
		}

		await mkdir(outputRoot, { recursive: true });
		await writeFile(join(outputRoot, 'llms.txt'), lines.join('\n'), 'utf8');
		await rm(llmRoot, { recursive: true, force: true });
		await rename(stagedLlmRoot, llmRoot);
		await rm(legacyRoot, { recursive: true, force: true });
		await rename(stagedLegacyRoot, legacyRoot);
	} finally {
		await rm(stagingRoot, { recursive: true, force: true });
	}
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
	await generateLlmDocs(publicRoot);
	console.log(`[llms] Generated ${join(publicRoot, 'llms.txt')} and ${join(publicRoot, 'docs-llm')}/`);
}
