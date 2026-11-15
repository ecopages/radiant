import { expect, test } from 'vitest';
import { unwrapJsxText } from './remark-unwrap-jsx-text';

type Node = { type: string; name?: string; value?: string; children?: Node[] };

const text = (value: string): Node => ({ type: 'text', value });
const paragraph = (...children: Node[]): Node => ({ type: 'paragraph', children });
const jsx = (name: string, ...children: Node[]): Node => ({ type: 'mdxJsxFlowElement', name, children });

function run(...children: Node[]): Node[] {
	const tree: Node = { type: 'root', children };
	unwrapJsxText(tree);
	return tree.children!;
}

test('text on its own line stays the content of the status element instead of a paragraph beside it', () => {
	const [status] = run(jsx('p', paragraph(text('Dialog closed'))));

	expect(status!.children).toEqual([text('Dialog closed')]);
});

test('unwraps inside nested frames, and in a button', () => {
	const [frame] = run(jsx('PrimitiveExample', jsx('div', jsx('button', paragraph(text('Open'))))));

	const button = frame!.children![0]!.children![0]!;
	expect(button.children).toEqual([text('Open')]);
});

test('keeps blank-line separated paragraphs and paragraphs in containers', () => {
	const two = jsx('li', paragraph(text('a')), paragraph(text('b')));
	const container = jsx('div', paragraph(text('c')));

	const [li, div] = run(two, container);

	expect(li!.children).toHaveLength(2);
	expect(div!.children).toEqual([paragraph(text('c'))]);
});
