import { describe, expect, it } from 'vitest';
import { remarkMermaid } from './remark-mermaid';

type Tree = Parameters<ReturnType<typeof remarkMermaid>>[0];
type Node = {
	type: string;
	lang?: string;
	value?: string;
	children?: Node[];
	position?: unknown;
	[key: string]: unknown;
};

function transform(value: string, path = '/docs/ssr/hydration.mdx'): Node {
	const tree: Node = { type: 'root', children: [{ type: 'code', lang: 'mermaid', value }] };
	remarkMermaid()(tree as Tree, { path });
	return tree;
}

describe('remarkMermaid', () => {
	it('replaces a mermaid fence with an element holding the rendered SVG', () => {
		const tree = transform('flowchart LR\n  A[Server] --> B[Browser]');
		const [importNode, diagram] = tree.children ?? [];

		expect(importNode?.type).toBe('mdxjsEsm');
		expect(diagram).toMatchObject({ type: 'mdxJsxFlowElement', name: 'div' });
		const expression = diagram?.children?.[0]?.value ?? '';
		expect(expression).toContain('<svg');
		expect(expression).toContain('pele-flowchart');
	});

	it('leaves other code fences and pages without diagrams alone', () => {
		const tree: Node = { type: 'root', children: [{ type: 'code', lang: 'ts', value: 'const a = 1;' }] };
		remarkMermaid()(tree as Tree, { path: '/docs/x.mdx' });

		expect(tree.children).toHaveLength(1);
	});

	it('fails with the file and the page line for an invalid diagram', () => {
		const tree: Node = {
			type: 'root',
			children: [
				{
					type: 'code',
					lang: 'mermaid',
					value: 'notADiagram ???',
					position: { start: { line: 10, column: 1 } },
				},
			],
		};

		expect(() => remarkMermaid()(tree as Tree, { path: '/docs/ssr/hydration.mdx' })).toThrow(/hydration\.mdx/);
	});
});
