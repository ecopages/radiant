import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ButtonGroupArgs = {
	orientation: string;
};

export const meta = {
	component: 'button-group',
	exportName: 'RuiButtonGroup',
	args: {
		orientation: 'horizontal',
	},
	argTypes: {
		orientation: { control: { type: 'select' }, options: ['horizontal', 'vertical'] as const },
	},
	exampleCode: (args) => buildExampleCode('RuiButtonGroup', 'button-group', args),
	render: (args) => renderPlaygroundPreview('button-group', args),
} satisfies DocsMeta<ButtonGroupArgs>;

type Story = DocsStory<ButtonGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'button-group/default' } } });
