import { defineComponentDoc, definePlayground, defineScenario, selectControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'heading',
	title: 'Heading',
	exportName: 'RuiHeading',
	category: 'Layout',
	lede: 'Heading groups an eyebrow, title, and description into a page or section header with consistent typographic rhythm.',
	usage: {
		intro: 'Compose with `RuiHeadingEyebrow`, `RuiHeadingTitle`, and `RuiHeadingDescription`. Adjust `size` and `align` for the layout context.',
		example: `import {
  RuiHeading,
  RuiHeadingEyebrow,
  RuiHeadingTitle,
  RuiHeadingDescription,
} from '@ecopages/radiant-ui/heading';

<RuiHeading size="lg" align="start">
  <RuiHeadingEyebrow>Components</RuiHeadingEyebrow>
  <RuiHeadingTitle>Button</RuiHeadingTitle>
  <RuiHeadingDescription>Trigger actions with clear, accessible labels.</RuiHeadingDescription>
</RuiHeading>`,
	},
	guidance: [
		{
			id: 'semantic-element',
			title: 'Semantic wrapper',
			paragraphs: [
				'Set `as` to `header` or `section` when the heading block defines a landmark region on the page.',
			],
		},
	],
	accessibility: [
		'`RuiHeadingTitle` renders the appropriate heading level for the page outline.',
		'Do not skip heading levels between the title and surrounding content.',
		'Eyebrow text is supplementary — the title carries the primary meaning.',
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
						defaultValue: 'lg',
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
						prop: 'align',
						label: 'Align',
						defaultValue: 'start',
						options: [
							{
								value: 'start',
								label: 'Start',
							},
							{
								value: 'center',
								label: 'Center',
							},
						],
					}),
				],
			}),
		],
	}),
});
