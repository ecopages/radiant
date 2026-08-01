import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiTreeProps } from './tree.script';
import { RuiTree as RuiTreeElement } from './tree.script';

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

export const RuiTree = defineRadiantView(
	RuiTreeElement,
	({ slot, label, value, nodes }: RuiTreeProps & RadiantSlotProps & { nodes: RuiTreeNode[] }) => (
		<rui-tree slot={slot} label={label} value={value}>
			<TreeNodes nodes={nodes} />
		</rui-tree>
	),

	{ stylesheets: ['./tree.css'] },
);
