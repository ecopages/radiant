import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import type { RuiTree as RuiTreeElement, RuiTreeProps } from './tree.script';
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
						<ul role="group">
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
export function RuiTree({
	nodes,
	label,
	children,
	...props
}: JsxCustomElementAttributes<RuiTreeElement, RuiTreeProps & { nodes?: RuiTreeNode[] }>) {
	const content = nodes != null ? <TreeNodes nodes={nodes} /> : children;

	return (
		<rui-tree {...props} label={label}>
			<ul
				class="rui-tree"
				data-ref="root"
				role="tree"
				aria-label={label || undefined}
				aria-multiselectable="false"
			>
				{content}
			</ul>
		</rui-tree>
	);
}
