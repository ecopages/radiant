import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import type { PluggableList } from 'unified';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';
import { rehypeSimpleTableWrapper } from './rehype-simple-table-wrapper';

export type DocsMdxPluginsOptions = {
	rehypePrettyCode: RehypePrettyCodeOptions;
	remarkPlugins?: PluggableList;
	rehypePlugins?: PluggableList;
};

/** Docs-specific MDX plugins layered on top of content-collection defaults. */
export function createDocsMdxPlugins(options: DocsMdxPluginsOptions) {
	const prettyCodePlugin: [typeof rehypePrettyCode, RehypePrettyCodeOptions] = [
		rehypePrettyCode,
		options.rehypePrettyCode,
	];

	return withContentMdxPlugins({
		remarkPlugins: [remarkGfm, ...(options.remarkPlugins ?? [])],
		rehypePlugins: [prettyCodePlugin, rehypeSimpleTableWrapper, ...(options.rehypePlugins ?? [])],
	});
}
