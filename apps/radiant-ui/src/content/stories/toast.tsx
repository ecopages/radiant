import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { withToastStage } from '@/lib/story-decorators/with-toast-stage';
import { TOAST_POSITIONS, type ToastPosition } from '@ecopages/radiant-ui';

export type ToastArgs = {
	position: ToastPosition;
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
		closeButton: true,
		expand: false,
	},
	argTypes: {
		position: {
			control: { type: 'select' },
			options: TOAST_POSITIONS,
		},
		duration: { control: { type: 'number' } },
		visibleToasts: { control: { type: 'number' } },
		closeButton: { control: { type: 'boolean' } },
		expand: { control: { type: 'boolean' } },
	},
	decorators: [withToastStage()],
	exampleCode: (args) => buildExampleCode('RuiToaster', 'toast', args),
	render: () => null,
} satisfies DocsMeta<ToastArgs>;

type Story = DocsStory<ToastArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toast/default' } } });

export const AlwaysExpanded: Story = docsStory(meta, {
	args: { expand: true },
	parameters: { docs: { id: 'toast/always-expanded' } },
});

export const Positions: Story = docsStory(meta, {
	args: { position: 'top-center' },
	parameters: { docs: { id: 'toast/positions' } },
});
