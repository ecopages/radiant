import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type FormArgs = {
	mode: string;
};

export const meta = {
	component: 'form',
	exportName: 'RuiForm',
	args: {
		mode: 'onSubmit',
	},
	argTypes: {
		mode: { control: { type: 'select' }, options: ['onSubmit', 'onBlur', 'onChange', 'onTouched', 'all'] as const },
	},
	exampleCode: (args) => buildExampleCode('RuiForm', 'form', args),
	render: (args) => renderPlaygroundPreview('form', args),
} satisfies DocsMeta<FormArgs>;

type Story = DocsStory<FormArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'form/default' } } });
