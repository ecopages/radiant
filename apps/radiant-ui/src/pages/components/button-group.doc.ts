import { defineComponentDoc, definePlayground, defineScenario, selectControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'button-group',
	title: 'Button Group',
	exportName: 'RuiButtonGroup',
	category: 'Actions',
	lede: 'Button groups visually unite related actions so users perceive them as a single control cluster. Use them for segmented choices or paired operations.',
	usage: {
		intro: 'Place `RuiButton` children inside `RuiButtonGroup`. Set `orientation` when stacking vertically in narrow layouts.',
		example: `import { RuiButtonGroup } from '@ecopages/radiant-ui/button-group';
import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiButtonGroup orientation="horizontal">
  <RuiButton variant="outline">Cancel</RuiButton>
  <RuiButton variant="filled">Save</RuiButton>
</RuiButtonGroup>`,
	},
	guidance: [
		{
			id: 'related-actions',
			title: 'Group related actions only',
			paragraphs: [
				'Keep actions logically connected — confirm/cancel pairs, view toggles, or formatting tools. Unrelated buttons should stand apart.',
			],
		},
		{
			id: 'orientation',
			title: 'Orientation',
			paragraphs: [
				'Use `horizontal` for toolbars and dialog footers. Switch to `vertical` in side panels or mobile layouts where width is constrained.',
			],
		},
	],
	accessibility: [
		'Each button inside the group retains its own accessible name and keyboard focus.',
		'When buttons represent a single choice, consider `toggle` buttons with `aria-pressed` instead of separate submit actions.',
		'Maintain visible focus indicators on every button in the group.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
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
				],
			}),
		],
	}),
});
