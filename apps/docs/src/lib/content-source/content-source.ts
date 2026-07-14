import { join, sep } from 'node:path';
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';
import { z, type ZodType } from 'zod';
import { fileSystem } from '@ecopages/file-system';
import type { EcoComponent } from '@ecopages/core';

const defaultFrontmatterSchema = z.object({
	title: z.string(),
	description: z.string(),
	group: z.string().optional(),
	order: z.number().optional(),
});

export type ContentFrontmatter = z.infer<typeof defaultFrontmatterSchema>;

type SortableFrontmatter = {
	title: string;
	order?: number;
};

export type ContentEntry<T extends SortableFrontmatter = ContentFrontmatter> = T & {
	/** Joined slug segments, e.g. `getting-started/introduction`. */
	slug: string;
	/** Path segments relative to the content root, e.g. `['getting-started', 'introduction']`. */
	segments: string[];
};

export type OrderBy<T extends SortableFrontmatter = ContentFrontmatter> =
	| 'order'
	| 'title'
	| 'slug'
	| ((a: ContentEntry<T>, b: ContentEntry<T>) => number);

export type ContentSourceConfig<T extends SortableFrontmatter = ContentFrontmatter> = {
	/** Directory scanned for content files. */
	contentRoot: string;
	/** Default ordering applied to the manifest entries. */
	orderBy?: OrderBy<T>;
	/** File extensions treated as content. Defaults to `['.mdx']`. */
	extensions?: string[];
	/** Frontmatter schema. Defaults to `title`, `description`, `group`, `order`. */
	schema?: ZodType<T>;
};

type ContentCache<T extends SortableFrontmatter> = {
	manifest: ContentEntry<T>[];
	entriesBySlug: Map<string, ContentEntry<T>>;
	filePathsBySlug: Map<string, string>;
	componentsBySlug: Map<string, EcoComponent<Record<string, unknown>>>;
};

type SortableEntry = SortableFrontmatter & { slug: string };

const builtInComparators = {
	title: (a: SortableEntry, b: SortableEntry) => a.title.localeCompare(b.title),
	slug: (a: SortableEntry, b: SortableEntry) => a.slug.localeCompare(b.slug),
	order: (a: SortableEntry, b: SortableEntry) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title),
} satisfies Record<'order' | 'title' | 'slug', (a: SortableEntry, b: SortableEntry) => number>;

function resolveOrderBy<T extends SortableFrontmatter>(
	orderBy: OrderBy<T> = 'order',
): (a: ContentEntry<T>, b: ContentEntry<T>) => number {
	if (typeof orderBy === 'function') return orderBy;
	const comparator = builtInComparators[orderBy];
	return (a, b) => comparator(a, b);
}

function slugFromRelativePath(relativePath: string, extensions: string[]): string {
	for (const ext of extensions) {
		if (relativePath.endsWith(ext)) {
			return relativePath.slice(0, -ext.length).split(sep).join('/');
		}
	}
	return relativePath.split(sep).join('/');
}

/**
 * Scans a content directory and exposes its entries as structured data,
 * the raw file text, and the renderable content per slug.
 */
export class ContentSource<T extends SortableFrontmatter = ContentFrontmatter> {
	private readonly extensions: string[];
	private readonly orderBy: OrderBy<T>;
	private readonly schema: ZodType<T>;
	private cachePromise?: Promise<ContentCache<T>>;

	constructor(private readonly config: ContentSourceConfig<T>) {
		this.extensions = config.extensions ?? ['.mdx'];
		this.orderBy = config.orderBy ?? 'order';
		this.schema = (config.schema ?? defaultFrontmatterSchema) as ZodType<T>;
	}

	private parseFrontmatter(raw: string): T {
		const file = new VFile({ value: raw });
		matter(file);
		return this.schema.parse(file.data.matter as Record<string, unknown>);
	}

	private async loadCache(): Promise<ContentCache<T>> {
		const patterns = this.extensions.map((ext) => `**/*${ext}`);
		const relativePaths = await fileSystem.glob(patterns, { cwd: this.config.contentRoot });

		const files = await Promise.all(
			relativePaths.map(async (relativePath) => {
				const filePath = join(this.config.contentRoot, relativePath);
				const slug = slugFromRelativePath(relativePath, this.extensions);
				const raw = await fileSystem.readFile(filePath);
				const entry: ContentEntry<T> = {
					...this.parseFrontmatter(raw),
					slug,
					segments: slug.split('/'),
				};
				return { filePath, entry };
			}),
		);

		files.sort((a, b) => resolveOrderBy<T>(this.orderBy)(a.entry, b.entry));

		const entriesBySlug = new Map<string, ContentEntry<T>>();
		const filePathsBySlug = new Map<string, string>();

		for (const { entry, filePath } of files) {
			entriesBySlug.set(entry.slug, entry);
			filePathsBySlug.set(entry.slug, filePath);
		}

		return {
			manifest: files.map((file) => file.entry),
			entriesBySlug,
			filePathsBySlug,
			componentsBySlug: new Map(),
		};
	}

	private async getCache(): Promise<ContentCache<T>> {
		if (!this.cachePromise) {
			this.cachePromise = this.loadCache();
		}
		return this.cachePromise;
	}

	async getManifest(): Promise<ContentEntry<T>[]> {
		return (await this.getCache()).manifest;
	}

	async getContentEntry(slug: string): Promise<ContentEntry<T>> {
		const { entriesBySlug } = await this.getCache();
		const entry = entriesBySlug.get(slug);
		if (!entry) throw new Error(`Unknown content entry: ${slug}`);
		return entry;
	}

	async getContentEntryBySegments(segments: string[]): Promise<ContentEntry<T>> {
		return this.getContentEntry(segments.join('/'));
	}

	async getContent(slug: string): Promise<EcoComponent<Record<string, unknown>>> {
		const cache = await this.getCache();
		const cached = cache.componentsBySlug.get(slug);
		if (cached) return cached;

		const filePath = cache.filePathsBySlug.get(slug);
		if (!filePath) {
			throw new Error(`Unknown content entry: ${slug}`);
		}

		const mod = await import(filePath);
		const component = mod.default as EcoComponent<Record<string, unknown>>;
		cache.componentsBySlug.set(slug, component);
		return component;
	}

	async getRawContent(slug: string): Promise<string> {
		const cache = await this.getCache();
		const filePath = cache.filePathsBySlug.get(slug);
		if (!filePath) {
			throw new Error(`Unknown content entry: ${slug}`);
		}
		return fileSystem.readFile(filePath);
	}

	clearCache(): void {
		this.cachePromise = undefined;
	}
}
