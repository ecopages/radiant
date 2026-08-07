import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "tree",
	title: "Tree",
	exportName: "RuiTree",
	category: "Data display",
	lede: "Trees display hierarchical data — file systems, org charts, or nested categories — with expand/collapse per branch.",
	usage: {
		intro: "Pass a `nodes` tree structure or compose tree items as children. Bind `value` to the selected node id.",
		example: `import { RuiTree, type RuiTreeNode } from '@ecopages/radiant-ui/tree';

const nodes: RuiTreeNode[] = [
  { id: 'src', label: 'src', children: [{ id: 'app', label: 'app.ts' }] },
];

<RuiTree nodes={nodes} value="app" label="Project files" />`,
	},
	guidance: [
  {
    id: "selection",
    title: "Node selection",
    paragraphs: [
      "Bind `value` to highlight the active node. Use keyboard arrows to navigate and expand branches."
    ],
  },
	],
	accessibility: [
   "Tree exposes `role=\"tree\"` with `role=\"treeitem\"` children.",
   "Expand/collapse state is communicated with `aria-expanded`.",
   "Provide `label` so users know what hierarchy the tree represents."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       textControl({
  prop: "value",
  label: "Selected node",
  defaultValue: "app"
}),
       textControl({
  prop: "label",
  label: "Accessible name",
  defaultValue: "Project files"
})
     ]
   }),
		],
	}),
});
