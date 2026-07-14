import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import type { PluggableList } from 'unified';
import { rehypeSimpleTableWrapper } from './rehype-simple-table-wrapper';
import { contentRemarkPlugins } from './content-remark';

export type MdxPluginsOptions = {
	/** Options forwarded to `rehype-pretty-code`. Defined by the caller. */
	rehypePrettyCode: RehypePrettyCodeOptions;
	/** Additional remark plugins (with their args) forwarded after the defaults. */
	remarkPlugins?: PluggableList;
	/** Additional rehype plugins (with their args) forwarded after the defaults. */
	rehypePlugins?: PluggableList;
};

/**
 * Builds the MDX plugin set for the docs pipeline. The `rehype-pretty-code`
 * options (including `theme`) are supplied by the caller (e.g. `eco.config.ts`)
 * so they stay configurable from the outside, and any other plugin that
 * accepts arguments can be forwarded via `remarkPlugins` / `rehypePlugins`.
 */
export function createMdxPlugins(options: MdxPluginsOptions) {
	const prettyCodePlugin: [typeof rehypePrettyCode, RehypePrettyCodeOptions] = [
		rehypePrettyCode,
		options.rehypePrettyCode,
	];

	return {
		remarkPlugins: [...contentRemarkPlugins, ...(options.remarkPlugins ?? [])],
		rehypePlugins: [prettyCodePlugin, rehypeSimpleTableWrapper, ...(options.rehypePlugins ?? [])],
	};
}
