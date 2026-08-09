import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiTreeProps } from './tree.script';
import './tree.script';

export type RuiTreeNode = {
	id: string;
	label: JsxRenderable;
	children?: RuiTreeNode[];
	expanded?: boolean;
};

const TreeNodes = ({ nodes }: { nodes: RuiTreeNode[] }) => (
	<>
		{nodes.map((node) => (
			<li class="rui-tree__item">
				{node.children?.length ? (
					<>
						<button
							type="button"
							class="rui-tree__node"
							role="treeitem"
							data-value={node.id}
							aria-expanded={node.expanded ?? false}
							aria-selected="false"
							tabindex={-1}
						>
							{node.label}
						</button>
						<ul role="group" hidden={!(node.expanded ?? false)}>
							<TreeNodes nodes={node.children} />
						</ul>
					</>
				) : (
					<button
						type="button"
						class="rui-tree__node"
						role="treeitem"
						data-value={node.id}
						aria-selected="false"
						tabindex={-1}
					>
						{node.label}
					</button>
				)}
			</li>
		))}
	</>
);

/**
 * Tree composed from a `nodes` structure.
 *
 * @cssclass rui-tree__item - List item wrapping a node.
 * @cssclass rui-tree__node - Node button (`role="treeitem"`).
 *
 * @remarks The host (`<rui-tree>`) owns selection, expansion, and roving-tabindex
 * navigation over the authored `role="treeitem"` markup.
 */
export function RuiTree({ nodes, ...props }: JsxHtmlProps<RuiTreeProps & { slot?: string; nodes: RuiTreeNode[] }>) {
	return (
		<rui-tree {...props}>
			<TreeNodes nodes={nodes} />
		</rui-tree>
	);
}
