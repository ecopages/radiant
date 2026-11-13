import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import { transformerCopyButton } from '@rehype-pretty/transformers';
import type { PluggableList } from 'unified';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';
import { rehypeHeadingIds } from './rehype-heading-ids';
import { rehypePrettyCopyCompatibility } from './rehype-pretty-copy-compatibility';
import { DOCS_SHIKI_THEMES } from './shiki-themes';

export type DocsMdxPluginsOptions = {
	remarkPlugins?: PluggableList;
	rehypePlugins?: PluggableList;
};

/**
 * Docs-specific MDX plugins layered on top of content-collection defaults.
 *
 * @remarks
 * Order matters: heading ids are assigned first, then rehype-pretty-code, then the copy compatibility pass.
 */
export function createDocsMdxPlugins(options: DocsMdxPluginsOptions = {}) {
	const prettyCodePlugin: [typeof rehypePrettyCode, RehypePrettyCodeOptions] = [
		rehypePrettyCode,
		{
			theme: DOCS_SHIKI_THEMES,
			defaultLang: { block: 'text' },
			transformers: [transformerCopyButton()],
		},
	];

	return withContentMdxPlugins({
		remarkPlugins: [remarkGfm, ...(options.remarkPlugins ?? [])],
		rehypePlugins: [
			rehypeHeadingIds,
			prettyCodePlugin,
			rehypePrettyCopyCompatibility,
			...(options.rehypePlugins ?? []),
		],
	});
}
