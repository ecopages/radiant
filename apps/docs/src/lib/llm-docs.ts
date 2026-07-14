import { join } from 'node:path';
import { fileSystem } from '@ecopages/file-system';
import type { ContentEntry, ContentSource } from './content-source';

export type LlmDocsOptions = {
	/** Directory where each document's raw content is written. */
	outputDir: string;
	/** Path of the generated `llms.txt` index file. */
	indexPath: string;
	/** Base URL used for links in the index. */
	baseUrl?: string;
	/** Public sub-path used in index links. Defaults to `llms-content`. */
	publicPath?: string;
	/** Preferred section order; remaining sections are appended, sorted. */
	sectionOrder?: string[];
	/** Header lines written at the top of the index file. */
	headerLines?: string[];
	/** Computes the section key for a post. Defaults to the first slug segment. */
	getSection?: (slug: string, segments: string[]) => string;
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

/**
 * Generates an `llms.txt` index and per-document text files from a content
 * source's manifest. Consumes the source; it does not depend on its internals.
 */
export async function generateLlmDocs(source: ContentSource, options: LlmDocsOptions): Promise<void> {
	const {
		outputDir,
		indexPath,
		baseUrl = 'https://ecopages.app',
		publicPath = 'llms-content',
		sectionOrder = [],
		headerLines = [],
		getSection = (_slug, segments) => segments[0] ?? 'other',
		formatSectionTitle = defaultFormatTitle,
	} = options;

	const posts = await source.getManifest();

	const sections = new Map<string, ContentEntry[]>();
	for (const post of posts) {
		const section = getSection(post.slug, post.segments);
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

	await fileSystem.ensureDirAsync(outputDir);
	await fileSystem.emptyDirAsync(outputDir);

	for (const section of orderedSections) {
		const sectionPosts = sections.get(section);
		if (!sectionPosts || sectionPosts.length === 0) continue;

		outputLines.push(`## ${formatSectionTitle(section)}`);

		for (const post of sectionPosts.sort((a, b) => a.slug.localeCompare(b.slug))) {
			const destFile = join(outputDir, `${post.slug}.txt`);
			const raw = await source.getRawContent(post.slug);
			await fileSystem.writeAsync(destFile, raw);

			outputLines.push(`- [${post.title}](${baseUrl}/${publicPath}/${post.slug}.txt)`);
		}

		outputLines.push('');
	}

	await fileSystem.writeAsync(indexPath, outputLines.join('\n'));
}
