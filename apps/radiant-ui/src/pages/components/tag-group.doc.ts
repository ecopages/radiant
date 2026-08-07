import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	selectControl,
	textControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'tag-group',
	title: 'Tag Group',
	exportName: 'RuiTagGroup',
	category: 'Data display',
	lede: 'Tag groups display selected values as removable chips — common in multi-select fields and filter bars.',
	usage: {
		intro: 'Bind `value` as a comma-separated list. Compose `RuiTagList`, `RuiTag`, and `RuiTagRemove` for custom tag rendering.',
		example: `import { RuiTagGroup, RuiTagList, RuiTag, RuiTagRemove } from '@ecopages/radiant-ui/tag-group';

<RuiTagGroup value="react,typescript" selectionMode="multiple" label="Skills">
  <RuiTagList>
    <RuiTag id="react">React<RuiTagRemove /></RuiTag>
    <RuiTag id="typescript">TypeScript<RuiTagRemove /></RuiTag>
  </RuiTagList>
</RuiTagGroup>`,
	},
	guidance: [
		{
			id: 'embedded-tags',
			title: 'Embedded in selects',
			paragraphs: ['Set `embedded` when tags render inside a select or combobox trigger rather than standalone.'],
		},
	],
	accessibility: [
		'Each tag exposes its label text to screen readers.',
		'Remove buttons have accessible names indicating which tag will be removed.',
		'The group has an accessible name via `label` when not described by surrounding text.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'value',
						label: 'Value',
						defaultValue: 'react,typescript',
					}),
					selectControl({
						prop: 'selectionMode',
						label: 'Selection mode',
						defaultValue: 'multiple',
						options: [
							{
								value: 'single',
								label: 'Single',
							},
							{
								value: 'multiple',
								label: 'Multiple',
							},
						],
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'embedded',
						label: 'Embedded',
						defaultValue: false,
					}),
				],
			}),
		],
	}),
});
