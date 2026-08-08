import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type InputArgs = {
	size: string;
	type: string;
	disabled: boolean;
	placeholder: string;
};

export const meta = {
	component: 'input',
	exportName: 'RuiInput',
	args: {
		size: 'md',
		type: 'text',
		disabled: false,
		placeholder: 'you@example.com',
	},
	argTypes: {
		size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] as const },
		type: { control: { type: 'select' }, options: ['text', 'email', 'password', 'number'] as const },
		disabled: { control: { type: 'boolean' } },
		placeholder: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiInput', 'input', args),
	render: (args) => renderPlaygroundPreview('input', args),
} satisfies DocsMeta<InputArgs>;

type Story = DocsStory<InputArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'input/default' } } });
