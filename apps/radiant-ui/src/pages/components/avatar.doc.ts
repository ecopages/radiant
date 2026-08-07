import { defineComponentDoc, definePlayground, defineScenario, selectControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'avatar',
	title: 'Avatar',
	exportName: 'RuiAvatar',
	category: 'Data display',
	lede: 'Avatars identify people or entities with a photo, initials, or generic fallback. Size variants keep them proportional in lists, bylines, and toolbars.',
	usage: {
		intro: 'Set `src` and `alt` when a photo is available. Use `fallback` for initials when the image fails to load or is not provided.',
		example: `import { RuiAvatar } from '@ecopages/radiant-ui/avatar';

<RuiAvatar src="/avatars/jane.jpg" alt="Jane Cooper" fallback="JC" size="md" />`,
	},
	guidance: [
		{
			id: 'fallback-text',
			title: 'Meaningful fallback text',
			paragraphs: [
				"Limit fallback to one or two characters derived from the person's name. Avoid arbitrary symbols that do not identify the subject.",
			],
		},
		{
			id: 'size-context',
			title: 'Pick size for context',
			paragraphs: [
				'Use `sm` in dense tables and comment threads, `md` in bylines and menus, and `lg` in profile headers.',
			],
		},
	],
	accessibility: [
		'Always provide `alt` text when `src` is set so the image is described to screen readers.',
		'When showing only initials, ensure surrounding text names the person — the avatar itself may be decorative.',
		'Do not use avatar color as the sole indicator of user role or status.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'size',
						label: 'Size',
						defaultValue: 'md',
						options: [
							{
								value: 'sm',
								label: 'Small',
							},
							{
								value: 'md',
								label: 'Medium',
							},
							{
								value: 'lg',
								label: 'Large',
							},
						],
					}),
					textControl({
						prop: 'fallback',
						label: 'Fallback',
						defaultValue: 'JC',
					}),
					textControl({
						prop: 'alt',
						label: 'Alt text',
						defaultValue: 'Jane Cooper',
					}),
				],
			}),
		],
	}),
});
