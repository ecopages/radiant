import { rename, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileSystem } from '@ecopages/file-system';
import { ContentScanner, type ContentEntry } from '@ecopages/content-processor';
import { normalizeSiteOrigin } from './docs/site-meta';

export type LlmDocsOptions<T extends Record<string, unknown> = Record<string, unknown>> = {
	/** Directory where each document's raw content is written. */
	outputDir: string;
	/** Path of the generated `llms.txt` index file. */
	indexPath: string;
	/** Base URL used for links in the index. */
	baseUrl?: string;
	/** Public sub-path used in index links. Defaults to `llms-content`. */
	publicPath?: string;
	/** Preferred section order; remaining sections are appended, sorted. */
	sectionOrder?: readonly string[];
	/** Header lines written at the top of the index file. */
	headerLines?: readonly string[];
	/** Computes the section key for a post. Defaults to the first slug segment. */
	getSection?: (post: ContentEntry<T>) => string;
	/** Formats a section key into a display title. */
	formatSectionTitle?: (section: string) => string;
};

function defaultFormatTitle(value: string): string {
	return value
		.split('-')
		.map((word) => {
			if (word === 'ssr' || word === 'jsx') return word.toUpperCase();
			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(' ');
}

function isEnoent(error: unknown): boolean {
	return (error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT';
}

/**
 * Replaces generated exports only after staging succeeds, preserving the previous tree on failure.
 */
async function replaceDirectory(target: string, source: string): Promise<void> {
	const previous = `${target}.previous`;
	await rm(previous, { recursive: true, force: true });

	try {
		await rename(target, previous);
	} catch (error) {
		if (!isEnoent(error)) {
			throw error;
		}
	}

	await rename(source, target);
	await rm(previous, { recursive: true, force: true });
}

/**
 * Generates an `llms.txt` index and per-document text files from scanned content.
 *
 * @remarks Everything is written to staging paths first; the content tree and the index are
 * swapped in only after generation succeeds. The two renames are not a single atomic step,
 * so the content tree is swapped first — until the index rename lands, the previous index
 * keeps resolving against the new exports (same URLs).
 */
export async function generateLlmDocs<T extends Record<string, unknown>>(
	scanner: ContentScanner<T>,
	options: LlmDocsOptions<T>,
): Promise<void> {
	const {
		outputDir,
		indexPath,
		baseUrl = 'https://ecopages.app',
		publicPath = 'llms-content',
		sectionOrder = [],
		headerLines = [],
		getSection = (post) => post.segments[0] ?? 'other',
		formatSectionTitle = defaultFormatTitle,
	} = options;

	const normalizedBaseUrl = normalizeSiteOrigin(baseUrl);
	const posts = await scanner.getManifest();

	const sections = new Map<string, ContentEntry<T>[]>();
	for (const post of posts) {
		const section = getSection(post);
		if (!sections.has(section)) sections.set(section, []);
		sections.get(section)!.push(post);
	}

	const orderedSections = [
		...sectionOrder.filter((section) => sections.has(section)),
		...Array.from(sections.keys())
			.filter((section) => !sectionOrder.includes(section))
			.sort((a, b) => a.localeCompare(b)),
	];

	const outputLines = [...headerLines];

	const stagingDir = `${outputDir}.staging`;
	const stagedIndexPath = `${indexPath}.staging`;
	await fileSystem.emptyDirAsync(stagingDir);
	for (const section of orderedSections) {
		const sectionPosts = sections.get(section);
		if (!sectionPosts || sectionPosts.length === 0) continue;

		outputLines.push(`## ${formatSectionTitle(section)}`);

		for (const post of sectionPosts.sort((a, b) => a.slug.localeCompare(b.slug))) {
			const destFile = join(stagingDir, `${post.slug}.txt`);
			const raw = await scanner.getRawContent(post.slug);
			await fileSystem.writeAsync(destFile, raw);

			outputLines.push(`- [${post.title}](${normalizedBaseUrl}/${publicPath}/${post.slug}.txt)`);
		}

		outputLines.push('');
	}

	await fileSystem.writeAsync(stagedIndexPath, outputLines.join('\n'));
	await replaceDirectory(outputDir, stagingDir);
	await rename(stagedIndexPath, indexPath);
}
