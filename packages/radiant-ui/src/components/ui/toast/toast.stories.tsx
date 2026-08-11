import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, within } from 'storybook/test';
import { ToastDemoTriggers, withToastPositions, withToastStage } from '../../../../.storybook/with-toast';
import { ToastTrigger } from '../../../../.storybook/toast-trigger';
import { RuiToaster, TOAST_POSITIONS, toast } from './index';
import { RuiToaster as RuiToasterElement } from './toaster.script';

const meta = {
	title: 'Components/Toast',
	component: RuiToaster,
	parameters: { radiant: { element: RuiToasterElement, cssImports: ['./toast.css'] } },
	args: {
		position: 'bottom-end',
		duration: 4000,
		visibleToasts: 3,
		closeButton: true,
	},
	argTypes: {
		visibleToasts: {
			control: { type: 'number' as const, min: 1, max: 10, step: 1 },
			description: 'Max toasts shown in the stack at once',
		},
	},
} satisfies Meta<typeof RuiToaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	decorators: [withToastStage],
	render: () => <ToastDemoTriggers />,
	play: async ({ canvasElement }) => {
		// The trigger set is the story's own render, not something the stage injects.
		const canvas = within(canvasElement);
		expect(canvas.getByRole('button', { name: 'Show default toast' })).toBeInTheDocument();
		expect(canvas.getByRole('button', { name: 'Dismiss all toasts' })).toBeInTheDocument();
		expect(canvasElement.querySelector('rui-toaster')).toBeInTheDocument();
	},
};

export const Stack: Story = {
	decorators: [withToastStage],
	render: () => (
		<ToastTrigger
			label="Stack three toasts"
			onClick={() => {
				toast('First notification');
				toast.success('Second notification');
				toast.info('Third notification');
			}}
		/>
	),
};

export const VisibleToasts: Story = {
	decorators: [withToastStage],
	args: {
		visibleToasts: 5,
	},
	render: () => (
		<ToastTrigger
			label="Fire seven toasts (show five)"
			onClick={() => {
				for (let i = 1; i <= 7; i += 1) {
					toast(`Notification ${i}`);
				}
			}}
		/>
	),
};

export const AlwaysExpanded: Story = {
	decorators: [withToastStage],
	args: {
		expand: true,
	},
	render: () => (
		<ToastTrigger
			label="Stack three toasts (always expanded)"
			onClick={() => {
				toast('First notification');
				toast.success('Second notification');
				toast.info('Third notification');
			}}
		/>
	),
};

export const Positions: Story = {
	decorators: [withToastPositions],
	render: () => (
		<>
			{TOAST_POSITIONS.map((position) => (
				<ToastTrigger
					key={position}
					label={`Show toast at ${position}`}
					variant="outline"
					onClick={() => toast(`Toast at ${position}`, { position })}
				/>
			))}
		</>
	),
};

export const WithAction: Story = {
	decorators: [withToastStage],
	args: {
		duration: 8000,
	},
	render: () => (
		<ToastTrigger
			label="Show toast with action"
			onClick={() =>
				toast('File deleted', {
					action: {
						label: 'Undo',
						onClick: () => toast.success('Restored'),
					},
				})
			}
		/>
	),
};
