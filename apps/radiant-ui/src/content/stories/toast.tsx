import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type ToastArgs = {
	position: string;
	duration: number;
	visibleToasts: number;
	closeButton: boolean;
	expand: boolean;
};

export const meta = {
	component: 'toast',
	exportName: 'RuiToaster',
	args: {
		position: 'bottom-end',
		duration: 4000,
		visibleToasts: 3,
		closeButton: false,
		expand: false,
	},
	argTypes: {
		position: {
			control: { type: 'select' },
			options: ['bottom-end', 'bottom-center', 'top-end', 'top-center'] as const,
		},
		duration: { control: { type: 'text' } },
		visibleToasts: { control: { type: 'text' } },
		closeButton: { control: { type: 'boolean' } },
		expand: { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiToaster', 'toast', args),
	render: (args) => renderPlaygroundPreview('toast', args),
} satisfies DocsMeta<ToastArgs>;

type Story = DocsStory<ToastArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toast/default' } } });
