import { defineComponentDoc, definePlayground, defineScenario, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'chip-list',
	title: 'Chip List',
	exportName: 'RuiChipList',
	category: 'Data display',
	lede: 'Chip lists lay out related chips in a semantic list so screen readers announce the collection and each item in order.',
	usage: {
		intro: 'Wrap `RuiChipListItem` children inside `RuiChipList`. Place `RuiChip` inside each item for consistent styling.',
		example: `import { RuiChipList, RuiChipListItem } from '@ecopages/radiant-ui/chip-list';
import { RuiChip } from '@ecopages/radiant-ui/chip';

<RuiChipList aria-label="Topics">
  <RuiChipListItem><RuiChip>React</RuiChip></RuiChipListItem>
  <RuiChipListItem><RuiChip>TypeScript</RuiChip></RuiChipListItem>
</RuiChipList>`,
	},
	guidance: [
		{
			id: 'label-the-list',
			title: 'Label the collection',
			paragraphs: [
				'Provide `aria-label` when the chip list is not described by a visible heading — for example, "Applied filters".',
			],
		},
	],
	accessibility: [
		'The list renders with list semantics so assistive technologies enumerate each chip.',
		'Give the list an accessible name via `aria-label` or a visible heading referenced with `aria-labelledby`.',
		'Keep the number of chips manageable; truncate with a summary chip when the set grows large.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'aria-label',
						label: 'Accessible name',
						defaultValue: 'Topics',
					}),
				],
			}),
		],
	}),
});
