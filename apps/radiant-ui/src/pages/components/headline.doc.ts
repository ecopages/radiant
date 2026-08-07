import { defineComponentDoc, definePlayground, defineScenario, selectControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'headline',
	title: 'Headline',
	exportName: 'RuiHeadline',
	category: 'Layout',
	lede: 'Headline renders a single typographic heading with size presets that map to the design system scale.',
	usage: {
		intro: 'Set `as` to the semantic heading level and `size` for visual weight. Use inside `RuiHeadingTitle` or standalone.',
		example: `import { RuiHeadline } from '@ecopages/radiant-ui/headline';

<RuiHeadline as="h1" size="xl">Radiant UI</RuiHeadline>`,
	},
	guidance: [
		{
			id: 'heading-level',
			title: 'Pick the right level',
			paragraphs: [
				'Match `as` to the document outline — one `h1` per page, then nest `h2`–`h4` without skipping levels.',
			],
		},
	],
	accessibility: [
		'Use semantic heading elements (`h1`–`h6`) via `as` for proper document structure.',
		'Visual size can differ from semantic level when the outline requires it, but document the intent.',
		'Do not use headlines purely for styling body text — use paragraph styles instead.',
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
						defaultValue: 'xl',
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
							{
								value: 'xl',
								label: 'Extra large',
							},
						],
					}),
					selectControl({
						prop: 'as',
						label: 'Element',
						defaultValue: 'h1',
						options: [
							{
								value: 'h1',
								label: 'H1',
							},
							{
								value: 'h2',
								label: 'H2',
							},
							{
								value: 'h3',
								label: 'H3',
							},
							{
								value: 'h4',
								label: 'H4',
							},
						],
					}),
				],
				children: 'Radiant UI',
			}),
		],
	}),
});
