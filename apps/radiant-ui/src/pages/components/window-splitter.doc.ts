import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	numberControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'window-splitter',
	title: 'Window Splitter',
	exportName: 'RuiWindowSplitter',
	category: 'Layout',
	lede: 'Window splitters divide a container into two resizable panes — code editor layouts, preview panels, or master-detail views.',
	usage: {
		intro: 'Set `value` to the primary pane percentage and `orientation` for horizontal or vertical splits. Provide two child panes.',
		example: `import { RuiWindowSplitter } from '@ecopages/radiant-ui/window-splitter';

<RuiWindowSplitter value={50} orientation="horizontal" label="Split view">
  <div>Editor</div>
  <div>Preview</div>
</RuiWindowSplitter>`,
	},
	guidance: [
		{
			id: 'pane-ratio',
			title: 'Initial pane ratio',
			paragraphs: [
				'`value` sets the primary pane percentage, clamped between 20 and 80. Users can drag the splitter to adjust.',
			],
		},
		{
			id: 'orientation',
			title: 'Orientation',
			paragraphs: ['Use `horizontal` for side-by-side panes and `vertical` for stacked editor/console layouts.'],
		},
	],
	accessibility: [
		'The splitter handle is keyboard focusable and adjustable with arrow keys.',
		'Provide `label` so screen readers identify the split region.',
		'Ensure both panes remain usable at minimum sizes — avoid content that breaks at narrow widths.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					numberControl({
						prop: 'value',
						label: 'Primary pane %',
						defaultValue: 50,
						min: 20,
						max: 80,
						step: 5,
					}),
					selectControl({
						prop: 'orientation',
						label: 'Orientation',
						defaultValue: 'horizontal',
						options: [
							{
								value: 'horizontal',
								label: 'Horizontal',
							},
							{
								value: 'vertical',
								label: 'Vertical',
							},
						],
					}),
					textControl({
						prop: 'label',
						label: 'Accessible name',
						defaultValue: 'Split view',
					}),
				],
			}),
		],
	}),
});
