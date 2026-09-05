import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import { transformerCopyButton } from '@rehype-pretty/transformers';
import type { PluggableList } from 'unified';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';
import { rehypePrettyCopyCompatibility } from './rehype-pretty-copy-compatibility';

export type DocsMdxPluginsOptions = {
	rehypePrettyCode: RehypePrettyCodeOptions;
	remarkPlugins?: PluggableList;
	rehypePlugins?: PluggableList;
};

/** Docs-specific MDX plugins layered on top of content-collection defaults. */
export function createDocsMdxPlugins(options: DocsMdxPluginsOptions) {
	const prettyCodePlugin: [typeof rehypePrettyCode, RehypePrettyCodeOptions] = [
		rehypePrettyCode,
		{
			...options.rehypePrettyCode,
			transformers: [transformerCopyButton(), ...(options.rehypePrettyCode.transformers ?? [])],
		},
	];

	return withContentMdxPlugins({
		remarkPlugins: [remarkGfm, ...(options.remarkPlugins ?? [])],
		rehypePlugins: [prettyCodePlugin, rehypePrettyCopyCompatibility, ...(options.rehypePlugins ?? [])],
	});
}
