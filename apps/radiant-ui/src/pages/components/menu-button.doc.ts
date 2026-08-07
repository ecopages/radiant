import { defineComponentDoc, definePlayground, defineScenario, booleanControl, selectControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'menu-button',
	title: 'Menu Button',
	exportName: 'RuiMenuButton',
	category: 'Navigation',
	lede: 'Menu buttons reveal a popup menu of actions when activated — ideal for overflow menus and contextual commands.',
	usage: {
		intro: 'Pass `items` with labels and handlers, or compose menu content as children. Control `placement` to avoid viewport clipping.',
		example: `import { RuiMenuButton } from '@ecopages/radiant-ui/menu-button';

<RuiMenuButton
  items={[
    { label: 'Edit', onSelect: editItem },
    { label: 'Delete', onSelect: deleteItem },
  ]}
  placement="bottom-start"
>
  Actions
</RuiMenuButton>`,
	},
	guidance: [
		{
			id: 'placement',
			title: 'Placement',
			paragraphs: [
				'Use `bottom-start` for left-aligned triggers. Flip to `top-*` when the button sits near the viewport bottom.',
			],
		},
	],
	accessibility: [
		'The trigger exposes `aria-haspopup="menu"` and `aria-expanded` when open.',
		'Menu items are reachable by arrow keys and activate with Enter.',
		'Return focus to the trigger when the menu closes.',
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
								value: 'bottom-start',
								label: 'Bottom start',
							},
							{
								value: 'bottom-end',
								label: 'Bottom end',
							},
							{
								value: 'top-start',
								label: 'Top start',
							},
						],
					}),
				],
				children: 'Actions',
			}),
		],
	}),
});
