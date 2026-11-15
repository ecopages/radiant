import remarkGfm from 'remark-gfm';
import type { PluggableList } from 'unified';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';
import { rehypeHeadingIds } from './rehype-heading-ids';
import { remarkUnwrapJsxText } from './remark-unwrap-jsx-text';
import { rehypePierreCode } from './rehype-pierre-code';

export type DocsMdxPluginsOptions = {
	remarkPlugins?: PluggableList;
	rehypePlugins?: PluggableList;
};

/**
 * Docs-specific MDX plugins layered on top of content-collection defaults.
 *
 * @remarks
 * Order matters: heading ids are assigned first, then code blocks are highlighted.
 */
export function createDocsMdxPlugins(options: DocsMdxPluginsOptions = {}) {
	return withContentMdxPlugins({
		remarkPlugins: [remarkGfm, remarkUnwrapJsxText, ...(options.remarkPlugins ?? [])],
		rehypePlugins: [rehypeHeadingIds, rehypePierreCode, ...(options.rehypePlugins ?? [])],
	});
}
