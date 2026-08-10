import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { toastStage, withToastStage } from '../../../../.storybook/with-toast-stage';
import { ToastTrigger } from '../../../../.storybook/toast-trigger';
import type { ToastPosition } from './toast-context';
import { RuiToaster, toast } from './index';
import { RuiToaster as RuiToasterElement } from './toaster.script';

const TOAST_POSITIONS: readonly ToastPosition[] = [
	'top-start',
	'top-center',
	'top-end',
	'bottom-start',
	'bottom-center',
	'bottom-end',
];

const meta = {
	title: 'Components/Toast',
	component: RuiToaster,
	parameters: { radiant: { element: RuiToasterElement, cssImports: ['./toast.css'] } },
	decorators: [withToastStage],
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
	parameters: toastStage({ demo: true }),
	render: () => null,
};

export const Stack: Story = {
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
	parameters: toastStage({ multiToaster: true }),
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
