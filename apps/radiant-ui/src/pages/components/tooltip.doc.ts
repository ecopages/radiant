import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	numberControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'tooltip',
	title: 'Tooltip',
	exportName: 'RuiTooltip',
	category: 'Overlays',
	lede: 'Tooltips show supplementary text on hover or focus — icon button labels, truncated text, or field hints.',
	usage: {
		intro: 'Wrap the trigger element and pass `content` with the tooltip text. Adjust `placement` and `delay` for positioning.',
		example: `import { RuiTooltip } from '@ecopages/radiant-ui/tooltip';
import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiTooltip content="Download report" placement="top" delay={200}>
  <RuiButton variant="ghost" aria-label="Download">↓</RuiButton>
</RuiTooltip>`,
	},
	guidance: [
		{
			id: 'supplementary-only',
			title: 'Supplementary information only',
			paragraphs: [
				'Tooltips should repeat or clarify visible labels, not introduce essential information available nowhere else.',
			],
		},
	],
	accessibility: [
		'Tooltips appear on keyboard focus as well as hover.',
		'Do not put interactive content inside tooltips — use a popover instead.',
		'Icon-only buttons should have `aria-label`; the tooltip provides redundant confirmation.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'content',
						label: 'Content',
						defaultValue: 'Download report',
					}),
					selectControl({
						prop: 'placement',
						label: 'Placement',
						defaultValue: 'top',
						options: [
							{
								value: 'top',
								label: 'Top',
							},
							{
								value: 'bottom',
								label: 'Bottom',
							},
							{
								value: 'left',
								label: 'Left',
							},
							{
								value: 'right',
								label: 'Right',
							},
						],
					}),
					numberControl({
						prop: 'delay',
						label: 'Delay (ms)',
						defaultValue: 200,
						min: 0,
						max: 1000,
						step: 50,
					}),
				],
			}),
		],
	}),
});
