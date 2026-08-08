import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ComboboxArgs = {
	value: string;
	placeholder: string;
	disabled: boolean;
	openOnFocus: boolean;
};

export const meta = {
	component: 'combobox',
	exportName: 'RuiCombobox',
	args: {
		value: '',
		placeholder: 'Choose an animal',
		disabled: false,
		openOnFocus: false,
	},
	argTypes: {
		value: { control: { type: 'text' } },
		placeholder: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		openOnFocus: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiCombobox', 'combobox', args),
	render: (args) => renderPlaygroundPreview('combobox', args),
} satisfies DocsMeta<ComboboxArgs>;

type Story = DocsStory<ComboboxArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'combobox/default' } } });
