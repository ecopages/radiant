import { afterEach, describe, expect, test, vi } from 'vitest';
import { transformerCopyButton } from '@rehype-pretty/transformers';
import type { Root } from 'hast';
import { rehypePrettyCopyCompatibility } from '../src/mdx/rehype-pretty-copy-compatibility';
import '../src/layouts/docs-layout/docs-layout.script';

describe('transformerCopyButton', () => {
	test('embeds the source and click behavior in each highlighted code block', () => {
		const transformer = transformerCopyButton();
		const node = { type: 'element' as const, tagName: 'code', properties: {}, children: [] };

		transformer.code?.call({ source: 'const answer = 42;' }, node);

		expect(node.children[0]).toMatchObject({
			tagName: 'button',
			properties: { type: 'button', data: 'const answer = 42;', class: 'rehype-pretty-copy' },
		});
	});
});

describe('rehypePrettyCopyCompatibility', () => {
	test('preserves native transformer source in a renderer-safe data attribute', () => {
		const tree: Root = {
			type: 'root',
			children: [
				{
					type: 'element',
					tagName: 'button',
					properties: { className: ['rehype-pretty-copy'], data: 'const answer = 42;', onClick: 'copy()' },
					children: [],
				},
				{
					type: 'element',
					tagName: 'style',
					properties: {},
					children: [{ type: 'text', value: 'pre button.rehype-pretty-copy { opacity: 0; }' }],
				},
			],
		};

		rehypePrettyCopyCompatibility()(tree);

		expect(tree.children[0]).toMatchObject({
			type: 'element',
			properties: {
				type: 'button',
				title: 'Copy code',
				'aria-label': 'Copy code',
				'data-rehype-pretty-copy': 'const answer = 42;',
			},
			children: [{ type: 'text', value: 'Copy' }],
		});
		expect(tree.children).toHaveLength(1);
	});
});

describe('docs copy button', () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.useRealTimers();
	});

	test('copies the transformer source from its data attribute', async () => {
		vi.useFakeTimers();
		const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
		const button = document.createElement('button');
		button.dataset.rehypePrettyCopy = 'const answer = 42;';
		document.body.append(button);

		button.click();
		await Promise.resolve();
		await Promise.resolve();

		expect(writeText).toHaveBeenCalledWith('const answer = 42;');
		expect(button.textContent).toBe('Copied');
	});
});
