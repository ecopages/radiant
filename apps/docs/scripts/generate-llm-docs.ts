import { join, dirname, basename } from 'path';
import { exists, mkdir, readdir, rm } from 'node:fs/promises';

const ROOT_DIR = join(import.meta.dir, '..');
const SRC_DOCS_DIR = join(ROOT_DIR, 'src/content/docs');
const PUBLIC_DIR = join(ROOT_DIR, 'src/public');
const OUTPUT_CONTENT_DIR = join(PUBLIC_DIR, 'llms-content');
const OUTPUT_LLMS_FILE = join(PUBLIC_DIR, 'llms.txt');

const PREFERRED_SECTION_ORDER = [
	'getting-started',
	'components',
	'decorators',
	'context',
	'packages',
	'examples',
	'tools',
];

type DocFile = {
	filePath: string;
	relativePath: string;
	title: string;
	content: string;
};

async function ensureDir(path: string) {
	if (!(await exists(path))) {
		await mkdir(path, { recursive: true });
	}
}

async function cleanGeneratedOutput() {
	await rm(OUTPUT_CONTENT_DIR, { recursive: true, force: true });
	await rm(OUTPUT_LLMS_FILE, { force: true });
}

function formatTitle(value: string) {
	return value
		.split('-')
		.map((word) => {
			if (word === 'ssr' || word === 'jsx') {
				return word.toUpperCase();
			}

			return word.charAt(0).toUpperCase() + word.slice(1);
		})
		.join(' ');
}

function extractTitle(content: string, fallbackTitle: string) {
	const headingMatch = content.match(/^#\s+(.+)$/m);
	return headingMatch?.[1]?.trim() || fallbackTitle;
}

async function scanDocs(dir: string, relativePath = ''): Promise<DocFile[]> {
	const results: DocFile[] = [];
	const entries = await readdir(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		const nextRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			results.push(...(await scanDocs(fullPath, nextRelativePath)));
			continue;
		}

		if (!entry.isFile() || (!entry.name.endsWith('.mdx') && !entry.name.endsWith('.md'))) {
			continue;
		}

		const extension = entry.name.endsWith('.mdx') ? '.mdx' : '.md';
		const baseName = basename(entry.name, extension);
		const pathWithoutExt = relativePath ? `${relativePath}/${baseName}` : baseName;
		const content = await Bun.file(fullPath).text();
		const fallbackTitle = formatTitle(baseName);

		results.push({
			filePath: fullPath,
			relativePath: pathWithoutExt,
			title: extractTitle(content, fallbackTitle),
			content,
		});
	}

	return results;
}

function groupBySection(files: DocFile[]): Map<string, DocFile[]> {
	const sections = new Map<string, DocFile[]>();

	for (const file of files) {
		const section = file.relativePath.split('/')[0] || 'other';

		if (!sections.has(section)) {
			sections.set(section, []);
		}

		sections.get(section)?.push(file);
	}

	return sections;
}

function getOrderedSections(sections: Map<string, DocFile[]>) {
	return [
		...PREFERRED_SECTION_ORDER.filter((section) => sections.has(section)),
		...Array.from(sections.keys())
			.filter((section) => !PREFERRED_SECTION_ORDER.includes(section))
			.sort((a, b) => a.localeCompare(b)),
	];
}

async function main() {
	await ensureDir(PUBLIC_DIR);
	await cleanGeneratedOutput();
	await ensureDir(OUTPUT_CONTENT_DIR);

	const files = await scanDocs(SRC_DOCS_DIR);
	const sections = groupBySection(files);
	const sectionOrder = getOrderedSections(sections);

	const outputLines: string[] = [
		'# Radiant Documentation',
		'> Build typed custom elements, controller hosts, JSX views, and Signals with Radiant.',
		'> Find your skill here: https://radiant.ecopages.app/skill.txt',
		'',
	];

	const baseUrl = process.env.ECOPAGES_BASE_URL || 'https://ecopages.app';

	for (const section of sectionOrder) {
		const sectionFiles = sections.get(section);
		if (!sectionFiles || sectionFiles.length === 0) continue;

		outputLines.push(`## ${formatTitle(section)}`);

		for (const file of sectionFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath))) {
			const destFile = join(OUTPUT_CONTENT_DIR, `${file.relativePath}.txt`);
			const destDir = dirname(destFile);

			await ensureDir(destDir);
			await Bun.write(destFile, file.content);

			outputLines.push(`- [${file.title}](${baseUrl}/llms-content/${file.relativePath}.txt)`);
		}

		outputLines.push('');
	}

	await Bun.write(OUTPUT_LLMS_FILE, outputLines.join('\n'));
	console.log(`[llms.txt] Successfully generated at ${OUTPUT_LLMS_FILE}`);
	console.log(`[llms.txt] Generated ${files.length} documentation files`);
}

main().catch(console.error);
