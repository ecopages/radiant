import { defineComponentDoc, definePlayground, defineScenario, numberControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'toc',
	title: 'Toc',
	exportName: 'RuiToc',
	category: 'Navigation',
	lede: "Table of contents components scan a page for headings and render jump links that track the reader's scroll position.",
	usage: {
		intro: 'Point `target` at the content root selector. Adjust `headingSelector` to match the heading levels you want to include.',
		example: `import { RuiToc } from '@ecopages/radiant-ui/toc';

<RuiToc
  target=".docs-content"
  headingSelector="h2,h3"
  label="On this page"
  scrollOffset={120}
/>`,
	},
	guidance: [
		{
			id: 'heading-levels',
			title: 'Heading levels',
			paragraphs: [
				'Default `h2,h3` suits most docs pages. Include `h4` only when the page has deep nesting worth navigating.',
			],
		},
		{
			id: 'scroll-offset',
			title: 'Scroll offset',
			paragraphs: [
				'Set `scrollOffset` to account for a fixed header so jumped headings are not hidden beneath it.',
			],
		},
	],
	accessibility: [
		'The TOC renders as a `nav` landmark with `label` as its accessible name.',
		'Current section is indicated visually and for assistive technologies during scroll.',
		'Nested headings use indentation to convey hierarchy.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'target',
						label: 'Target selector',
						defaultValue: '.docs-content',
					}),
					textControl({
						prop: 'headingSelector',
						label: 'Heading selector',
						defaultValue: 'h2,h3',
					}),
					textControl({
						prop: 'label',
						label: 'Accessible name',
						defaultValue: 'On this page',
					}),
					numberControl({
						prop: 'scrollOffset',
						label: 'Scroll offset',
						defaultValue: 120,
						min: 0,
						max: 200,
						step: 8,
					}),
				],
			}),
		],
	}),
});
