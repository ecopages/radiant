import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ChipListArgs = {
	'aria-label': string;
};

export const meta = {
	component: 'chip-list',
	exportName: 'RuiChipList',
	args: {
		'aria-label': 'Topics',
	},
	argTypes: {
		'aria-label': { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiChipList', 'chip-list', args),
	render: (args) => renderPlaygroundPreview('chip-list', args),
} satisfies DocsMeta<ChipListArgs>;

type Story = DocsStory<ChipListArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'chip-list/default' } } });
