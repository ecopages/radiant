import { defineComponentDoc, definePlayground, defineScenario, booleanControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'disclosure',
	title: 'Disclosure',
	exportName: 'RuiDisclosure',
	category: 'Layout',
	lede: 'Disclosures progressively reveal content behind a trigger — FAQs, filter panels, or advanced settings that most users can skip.',
	usage: {
		intro: 'Use `RuiDisclosureTrigger` and `RuiDisclosurePanel` inside `RuiDisclosure`. Group related disclosures with `RuiDisclosureGroup` when only one should be open.',
		example: `import {
  RuiDisclosure,
  RuiDisclosureTrigger,
  RuiDisclosurePanel,
  RuiDisclosureIcon,
} from '@ecopages/radiant-ui/disclosure';

<RuiDisclosure>
  <RuiDisclosureTrigger>
  Shipping details
  <RuiDisclosureIcon />
  </RuiDisclosureTrigger>
  <RuiDisclosurePanel>Delivered in 3–5 business days.</RuiDisclosurePanel>
</RuiDisclosure>`,
	},
	guidance: [
		{
			id: 'accordion-groups',
			title: 'Accordion groups',
			paragraphs: [
				'Wrap multiple disclosures in `RuiDisclosureGroup` with `multiple={false}` for accordion behavior.',
			],
		},
		{
			id: 'animation',
			title: 'Animated panels',
			paragraphs: [
				'Enable `animated` for height transitions. Verify content remains readable during the animation.',
			],
		},
	],
	accessibility: [
		'Triggers expose `aria-expanded` reflecting panel visibility.',
		'Panel content is associated with its trigger via `aria-controls`.',
		'Keyboard users activate disclosures with Enter or Space on the trigger.',
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
					booleanControl({
						prop: 'animated',
						label: 'Animated',
						defaultValue: false,
					}),
				],
				children: 'Shipping details',
			}),
		],
	}),
});
