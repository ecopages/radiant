import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';
import { z } from 'zod';
import type { EcoComponent } from '@ecopages/core';

const frontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	group: z.string().optional(),
	order: z.number().optional(),
});

type ContentFrontmatter = z.infer<typeof frontmatterSchema>;

export type ContentEntry = ContentFrontmatter & {
	/** Joined slug segments, e.g. `getting-started/introduction`. */
	slug: string;
	/** Path segments relative to the content root, e.g. `['getting-started', 'introduction']`. */
	segments: string[];
};

export type DocsNavItem = {
	title: string;
	href: string;
	slug: string;
};

export type DocsNavGroup = {
	name: string;
	items: DocsNavItem[];
};

export type DocsNav = {
	rootDir: string;
	groups: DocsNavGroup[];
};

type OrderBy = 'order' | 'title' | 'slug' | ((a: ContentEntry, b: ContentEntry) => number);

type ContentSourceConfig = {
	rootDir: string;
	contentRoot: string;
	groupOrder?: string[];
	orderBy?: OrderBy;
};

type ContentCache = {
	manifest: { rootDir: string; posts: ContentEntry[] };
	entriesBySlug: Map<string, ContentEntry>;
	componentsBySlug: Map<string, EcoComponent<Record<string, unknown>>>;
};

let config: ContentSourceConfig | null = null;
let cachePromise: Promise<ContentCache> | null = null;

export function defineContentSource(options: ContentSourceConfig): void {
	config = options;
	clearContentCache();
}

export function isContentSourceConfigured(): boolean {
	return config !== null;
}

function parseFrontmatter(raw: string): ContentFrontmatter {
	const file = new VFile({ value: raw });
	matter(file);
	return frontmatterSchema.parse(file.data.matter as Record<string, unknown>);
}

async function readMdxFilesRecursive(dir: string, contentRoot: string): Promise<ContentEntry[]> {
	const entries = await readdir(dir, { withFileTypes: true });

	const results = await Promise.all(
		entries.map(async (entry) => {
			const full = join(dir, entry.name);

			if (entry.isDirectory()) {
				return readMdxFilesRecursive(full, contentRoot);
			}

			if (!entry.isFile() || !entry.name.endsWith('.mdx')) {
				return [];
			}

			const rel = relative(contentRoot, full).replace(/\.mdx$/, '');
			const segments = rel.split(sep);
			const raw = await readFile(full, 'utf8');
			const fm = parseFrontmatter(raw);

			return [
				{
					...fm,
					slug: segments.join('/'),
					segments,
				},
			];
		}),
	);

	return results.flat();
}

export function clearContentCache(): void {
	cachePromise = null;
}

function requireConfig(): ContentSourceConfig {
	if (!config) {
		throw new Error(
			'Content source is not configured. Call ensureContentSource() from @/content-source.instance before using content-source.',
		);
	}
	return config;
}

function resolveOrderBy(orderBy: OrderBy = 'order'): (a: ContentEntry, b: ContentEntry) => number {
	if (typeof orderBy === 'function') return orderBy;
	switch (orderBy) {
		case 'title':
			return (a, b) => a.title.localeCompare(b.title);
		case 'slug':
			return (a, b) => a.slug.localeCompare(b.slug);
		case 'order':
		default:
			return (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title);
	}
}

async function loadContentCache(): Promise<ContentCache> {
	const { contentRoot, rootDir, orderBy = 'order' } = requireConfig();
	const posts = await readMdxFilesRecursive(contentRoot, contentRoot);
	posts.sort(resolveOrderBy(orderBy));

	return {
		manifest: { rootDir, posts },
		entriesBySlug: new Map(posts.map((post) => [post.slug, post])),
		componentsBySlug: new Map(),
	};
}

function getContentCache(): Promise<ContentCache> {
	if (!cachePromise) {
		cachePromise = loadContentCache();
	}
	return cachePromise;
}

export async function getContentManifest(): Promise<{ rootDir: string; posts: ContentEntry[] }> {
	return (await getContentCache()).manifest;
}

export async function getContentEntryBySegments(segments: string[]): Promise<ContentEntry> {
	return getContentEntry(segments.join('/'));
}

export async function getContentEntry(slug: string): Promise<ContentEntry> {
	const { entriesBySlug } = await getContentCache();
	const entry = entriesBySlug.get(slug);
	if (!entry) throw new Error(`Unknown content entry: ${slug}`);
	return entry;
}

export async function getContentComponent(slug: string): Promise<EcoComponent<Record<string, unknown>>> {
	const cache = await getContentCache();
	const cached = cache.componentsBySlug.get(slug);
	if (cached) return cached;

	if (!cache.entriesBySlug.has(slug)) {
		throw new Error(`Unknown content entry: ${slug}`);
	}

	const { contentRoot } = requireConfig();
	const mod = await import(join(contentRoot, `${slug}.mdx`));
	const component = mod.default as EcoComponent<Record<string, unknown>>;
	cache.componentsBySlug.set(slug, component);
	return component;
}

/**
 * Builds the grouped sidebar navigation for docs, driven entirely by the
 * content manifest. Group order follows `groupOrder` from the content-source
 * config; items within a group follow the configured `orderBy`.
 */
export async function getDocsNav(): Promise<DocsNav> {
	const { rootDir, groupOrder = [], orderBy } = requireConfig();
	const { posts } = (await getContentCache()).manifest;

	const byGroup = new Map<string, ContentEntry[]>();
	const groupInsertion = new Map<string, number>();

	posts.forEach((post, index) => {
		if (post.segments[post.segments.length - 1] === 'index') return;
		const group = post.group ?? post.segments[0] ?? 'Other';
		if (!byGroup.has(group)) {
			byGroup.set(group, []);
			groupInsertion.set(group, index);
		}
		byGroup.get(group)!.push(post);
	});

	const orderedGroups = Array.from(byGroup.keys()).sort((a, b) => {
		const ai = groupOrder.indexOf(a);
		const bi = groupOrder.indexOf(b);
		if (ai === -1 && bi === -1) return (groupInsertion.get(a) ?? 0) - (groupInsertion.get(b) ?? 0);
		if (ai === -1) return 1;
		if (bi === -1) return -1;
		return ai - bi;
	});

	const groups: DocsNavGroup[] = orderedGroups.map((name) => {
		const items = (byGroup.get(name) ?? [])
			.slice()
			.sort(resolveOrderBy(orderBy))
			.map((post) => ({
				title: post.title,
				href: `${rootDir}/${post.segments.join('/')}`,
				slug: post.slug,
			}));

		return { name, items };
	});

	return { rootDir, groups };
}
