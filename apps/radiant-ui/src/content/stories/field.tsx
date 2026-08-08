import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type FieldArgs = {
	name: string;
	disabled: boolean;
	invalid: boolean;
	error: string;
};

export const meta = {
	component: 'field',
	exportName: 'RuiField',
	args: {
		name: 'email',
		disabled: false,
		invalid: false,
		error: '',
	},
	argTypes: {
		name: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		invalid: { control: { type: 'boolean' } },
		error: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiField', 'field', args),
	render: (args) => renderPlaygroundPreview('field', args),
} satisfies DocsMeta<FieldArgs>;

type Story = DocsStory<FieldArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'field/default' } } });
