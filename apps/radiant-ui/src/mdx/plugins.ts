import rehypePrettyCode, { type Options as RehypePrettyCodeOptions } from 'rehype-pretty-code';
import remarkGfm from 'remark-gfm';
import { transformerCopyButton } from '@rehype-pretty/transformers';
import type { Element, Root } from 'hast';
import type { PluggableList } from 'unified';
import { withContentMdxPlugins } from '@ecopages/content-processor/mdx';

export type DocsMdxPluginsOptions = {
	rehypePrettyCode: RehypePrettyCodeOptions;
	remarkPlugins?: PluggableList;
	rehypePlugins?: PluggableList;
};

function isElement(node: Root['children'][number] | Element): node is Element {
	return node.type === 'element';
}

function makeCopyButtonsCompatible(children: Root['children'] | Element['children']): void {
	for (let index = children.length - 1; index >= 0; index--) {
		const node = children[index];
		if (!isElement(node)) continue;
		if (node.tagName === 'style') {
			children.splice(index, 1);
			continue;
		}

		const className = node.properties.className;
		const isCopyButton =
			node.tagName === 'button' &&
			(node.properties.class === 'rehype-pretty-copy' ||
				className === 'rehype-pretty-copy' ||
				(Array.isArray(className) && className.includes('rehype-pretty-copy')));
		if (isCopyButton) {
			const source = node.properties.data;
			if (typeof source === 'string') {
				node.properties.dataRehypePrettyCopy = source;
			}
			delete node.properties.class;
			delete node.properties.className;
			delete node.properties.data;
			delete node.properties.onclick;
			delete node.properties.onClick;
			node.children = [{ type: 'text', value: 'Copy' }];
		}

		makeCopyButtonsCompatible(node.children);
	}
}

/**
 * Rehype Pretty's native transformer emits generic `data` and `class` props,
 * which this MDX-to-JSX renderer does not preserve as browser HTML attributes.
 */
export function rehypePrettyCopyButtonCompatibility() {
	return (tree: Root): void => makeCopyButtonsCompatible(tree.children);
}

/** Component-docs MDX plugins layered on top of content-collection defaults. */
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
		rehypePlugins: [prettyCodePlugin, rehypePrettyCopyButtonCompatibility, ...(options.rehypePlugins ?? [])],
	});
}
