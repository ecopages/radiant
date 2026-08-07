import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TagGroupArgs = {
	value: string;
	selectionMode: string;
	disabled: boolean;
	embedded: boolean;
};

export const meta = {
	component: 'tag-group',
	exportName: 'RuiTagGroup',
	args: {
		value: 'react,typescript',
		selectionMode: 'multiple',
		disabled: false,
		embedded: false,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		selectionMode: { control: { type: 'select' }, options: ['single', 'multiple'] as const },
		disabled: { control: { type: 'boolean' } },
		embedded: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiTagGroup', 'tag-group', args),
	render: (args) => renderPlaygroundPreview('tag-group', args),
} satisfies DocsMeta<TagGroupArgs>;

type Story = DocsStory<TagGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'tag-group/default' } } });
