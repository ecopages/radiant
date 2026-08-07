import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type TextareaArgs = {
	size: string;
	rows: number;
	disabled: boolean;
	placeholder: string;
};

export const meta = {
	component: 'textarea',
	exportName: 'RuiTextarea',
	args: {
		size: 'md',
		rows: 3,
		disabled: false,
		placeholder: 'Tell us about yourself',
	},
	argTypes: {
		size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] as const },
		rows: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		placeholder: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiTextarea', 'textarea', args),
	render: (args) => renderPlaygroundPreview('textarea', args),
} satisfies DocsMeta<TextareaArgs>;

type Story = DocsStory<TextareaArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'textarea/default' } } });
