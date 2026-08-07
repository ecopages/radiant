import { defineComponentDoc, definePlayground, defineScenario, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'grid',
	title: 'Grid',
	exportName: 'RuiGrid',
	category: 'Layout',
	lede: 'Grid provides a semantic table-like structure for tabular data with keyboard navigation and selection built in.',
	usage: {
		intro: 'Populate rows and cells as light-DOM children. Set `label` to name the grid for assistive technologies.',
		example: `import { RuiGrid } from '@ecopages/radiant-ui/grid';

<RuiGrid label="Team members">
  {/* row and cell content */}
</RuiGrid>`,
	},
	guidance: [
		{
			id: 'tabular-data',
			title: 'Use for tabular data',
			paragraphs: [
				'Prefer Grid when data has rows and columns with comparable values. Use Treegrid when rows can expand into hierarchies.',
			],
		},
	],
	accessibility: [
		'Provide a descriptive `label` — screen readers announce it when focus enters the grid.',
		'Column headers should be marked so users understand cell context.',
		'Support arrow-key navigation between focusable cells.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'label',
						label: 'Accessible name',
						defaultValue: 'Team members',
					}),
				],
			}),
		],
	}),
});
