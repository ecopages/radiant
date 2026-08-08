import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ListboxArgs = {
	value: string;
	disabled: boolean;
	embedded: boolean;
	label: string;
};

export const meta = {
	component: 'listbox',
	exportName: 'RuiListbox',
	args: {
		value: 'cat',
		disabled: false,
		embedded: false,
		label: 'Animal',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		embedded: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiListbox', 'listbox', args),
	render: (args) => renderPlaygroundPreview('listbox', args),
} satisfies DocsMeta<ListboxArgs>;

type Story = DocsStory<ListboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'listbox/default' } } });
