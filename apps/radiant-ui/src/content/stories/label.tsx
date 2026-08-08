import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type LabelArgs = {
	htmlFor: string;
	children: string;
};

export const meta = {
	component: 'label',
	exportName: 'RuiLabel',
	args: {
		htmlFor: '',
		children: 'Username',
	},
	argTypes: {
		htmlFor: { control: { type: 'text' } },
		children: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiLabel', 'label', args, args.children),
	render: (args) => renderPlaygroundPreview('label', args, args.children),
} satisfies DocsMeta<LabelArgs>;

type Story = DocsStory<LabelArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'label/default' } } });
