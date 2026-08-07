import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'popover',
	title: 'Popover',
	exportName: 'RuiPopover',
	category: 'Overlays',
	lede: 'Popovers anchor rich content to a trigger element — filters, mini forms, or contextual details — without modal focus trapping.',
	usage: {
		intro: 'Wrap content in `RuiPopoverTrigger` and `RuiPopoverContent`. Control `open`, `placement`, and `portal` for positioning.',
		example: `import { RuiPopover, RuiPopoverTrigger, RuiPopoverContent } from '@ecopages/radiant-ui/popover';
import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiPopover placement="bottom-start">
  <RuiPopoverTrigger>
    <RuiButton variant="outline">Filter</RuiButton>
  </RuiPopoverTrigger>
  <RuiPopoverContent>
    <p>Show items from the last 7 days.</p>
  </RuiPopoverContent>
</RuiPopover>`,
	},
	guidance: [
		{
			id: 'listbox-variant',
			title: 'Listbox variant',
			paragraphs: [
				'Set `variant="listbox"` when the popover hosts a `RuiListbox` — width and focus behavior adapt automatically.',
			],
		},
		{
			id: 'match-width',
			title: 'Match anchor width',
			paragraphs: ['Enable `matchAnchorWidth` for select-style popovers so the panel aligns with the trigger.'],
		},
	],
	accessibility: [
		'Triggers expose `aria-expanded` when the popover is open.',
		'Content is focusable and dismissible with Escape.',
		'Do not trap focus — users should reach surrounding content without closing first.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					booleanControl({
						prop: 'open',
						label: 'Open',
						defaultValue: false,
					}),
					selectControl({
						prop: 'placement',
						label: 'Placement',
						defaultValue: 'bottom-start',
						options: [
							{
								value: 'bottom',
								label: 'Bottom',
							},
							{
								value: 'bottom-start',
								label: 'Bottom start',
							},
							{
								value: 'top',
								label: 'Top',
							},
							{
								value: 'right',
								label: 'Right',
							},
						],
					}),
					booleanControl({
						prop: 'portal',
						label: 'Portal',
						defaultValue: true,
					}),
					booleanControl({
						prop: 'matchAnchorWidth',
						label: 'Match anchor width',
						defaultValue: false,
					}),
					numberControl({
						prop: 'offset',
						label: 'Offset (px)',
						defaultValue: 8,
						min: 0,
						max: 32,
						step: 1,
					}),
				],
			}),
		],
	}),
});
