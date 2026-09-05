import { describe, expect, test } from 'vitest';
import type { Root } from 'hast';
import { rehypePrettyCopyButtonCompatibility } from './plugins';

describe('rehypePrettyCopyButtonCompatibility', () => {
	test('preserves the transformer source in a renderer-safe data attribute', () => {
		const tree: Root = {
			type: 'root',
			children: [
				{
					type: 'element',
					tagName: 'button',
					properties: { className: ['rehype-pretty-copy'], data: 'const answer = 42;', onClick: 'copy()' },
					children: [],
				},
				{ type: 'element', tagName: 'style', properties: {}, children: [] },
			],
		};

		rehypePrettyCopyButtonCompatibility()(tree);

		expect(tree.children).toMatchObject([
			{
				type: 'element',
				properties: { dataRehypePrettyCopy: 'const answer = 42;' },
				children: [{ type: 'text', value: 'Copy' }],
			},
		]);
		expect(tree.children).toHaveLength(1);
	});
});
