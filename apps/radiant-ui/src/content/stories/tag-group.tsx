import { RuiTagGroup, type RuiTagGroupSelectionMode } from '@ecopages/radiant-ui/tag-group';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type TagGroupArgs = {
	value: string;
	selectionMode: RuiTagGroupSelectionMode;
	disabled: boolean;
	embedded: boolean;
};

function parseCsv(value: string): string[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

export const meta = {
	args: {
		value: 'react,typescript',
		selectionMode: 'multiple',
		disabled: false,
		embedded: false,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		selectionMode: {
			control: { type: 'select' },
			options: ['single', 'multiple'] as const satisfies readonly RuiTagGroupSelectionMode[],
		},
		disabled: { control: { type: 'boolean' } },
		embedded: { control: { type: 'boolean' } },
	},
	render: (args) => {
		const tagValues = parseCsv(args.value);
		return (
			<RuiTagGroup
				value={args.value}
				selectionMode={args.selectionMode}
				disabled={args.disabled}
				embedded={args.embedded}
				label="Skills"
				tags={tagValues.map((tag) => ({ value: tag, label: tag }))}
			/>
		);
	},
} satisfies DocsMeta<TagGroupArgs>;

type Story = DocsStory<TagGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tag-group/default' } } });
