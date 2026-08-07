import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "treegrid",
	title: "Treegrid",
	exportName: "RuiTreegrid",
	category: "Data display",
	lede: "Treegrids combine tree hierarchy with tabular columns — file explorers with size and date columns, or nested budgets.",
	usage: {
		intro: "Define rows with `RuiTreegridRow` data including `id`, `label`, and nested `children`. Bind `value` for selection.",
		example: `import { RuiTreegrid, type RuiTreegridRow } from '@ecopages/radiant-ui/treegrid';

const rows: RuiTreegridRow[] = [
  { id: 'docs', label: 'docs', children: [{ id: 'intro', label: 'introduction.md' }] },
];

<RuiTreegrid rows={rows} value="intro" label="Repository" />`,
	},
	guidance: [
  {
    id: "tree-vs-treegrid",
    title: "Tree vs treegrid",
    paragraphs: [
      "Use Treegrid when rows have multiple columns of data. Use Tree for single-column hierarchies."
    ],
  },
	],
	accessibility: [
   "Treegrid exposes `role=\"treegrid\"` with grid navigation semantics.",
   "Column headers provide context for cell values.",
   "Expandable rows communicate `aria-expanded` on parent rows."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       textControl({
  prop: "value",
  label: "Selected row",
  defaultValue: "intro"
}),
       textControl({
  prop: "label",
  label: "Accessible name",
  defaultValue: "Repository"
})
     ]
   }),
		],
	}),
});
