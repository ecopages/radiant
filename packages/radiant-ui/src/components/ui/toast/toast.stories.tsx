import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiButton } from '../button';
import { RuiToaster, toast } from './index';

function resetToasts(): void {
	toast.clear();
}

const TOAST_POSITIONS = ['top-start', 'top-center', 'top-end', 'bottom-start', 'bottom-center', 'bottom-end'] as const;

let lastStoryId: string | undefined;

const meta = {
	title: 'Components/Toast',
	component: RuiToaster,
	args: {
		position: 'bottom-end',
		duration: 4000,
		visibleToasts: 3,
		closeButton: true,
	},
	argTypes: {
		visibleToasts: {
			control: { type: 'number', min: 1, max: 10, step: 1 },
			description: 'Max toasts shown in the stack at once',
		},
	},
	decorators: [
		(Story, { args, parameters, id }) => {
			if (lastStoryId !== id) {
				lastStoryId = id;
				resetToasts();
			}
			return (
				<div style={{ position: 'relative', minHeight: '70vh' }}>
					<div
						style={{
							position: 'absolute',
							inset: 0,
							display: 'grid',
							placeItems: 'center',
							padding: '1.5rem',
							pointerEvents: 'none',
							zIndex: 1,
						}}
					>
						<div
							style={{
								display: 'flex',
								flexWrap: 'wrap',
								gap: '0.5rem',
								justifyContent: 'center',
								maxWidth: '36rem',
								pointerEvents: 'auto',
							}}
						>
							<Story />
						</div>
					</div>
					{parameters.multiToaster ? (
						TOAST_POSITIONS.map((position) => <RuiToaster key={position} position={position} closeButton />)
					) : (
						<RuiToaster
							position={args.position}
							duration={args.duration}
							closeButton={args.closeButton}
							expand={args.expand}
							visibleToasts={args.visibleToasts}
							gap={args.gap}
							offset={args.offset}
						/>
					)}
				</div>
			);
		},
	],
} satisfies Meta<typeof RuiToaster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<>
			<RuiButton variant="filled" type="button" on:click={() => toast('Event has been created')}>
				Default
			</RuiButton>
			<RuiButton variant="filled" type="button" on:click={() => toast.success('Profile saved')}>
				Success
			</RuiButton>
			<RuiButton
				variant="filled"
				type="button"
				on:click={() => toast.error('Unable to reach the server', { description: 'Try again in a moment.' })}
			>
				Error
			</RuiButton>
			<RuiButton variant="outline" type="button" on:click={() => toast.warning('Disk space is running low')}>
				Warning
			</RuiButton>
			<RuiButton variant="outline" type="button" on:click={() => toast.info('Your session will expire soon')}>
				Info
			</RuiButton>
			<RuiButton variant="ghost" type="button" on:click={() => toast.loading('Uploading…')}>
				Loading
			</RuiButton>
			<RuiButton
				variant="outline"
				type="button"
				on:click={() =>
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
						loading: 'Saving…',
						success: 'Saved',
						error: 'Save failed',
					})
				}
			>
				Promise
			</RuiButton>
			<RuiButton variant="ghost" type="button" on:click={() => toast.dismiss()}>
				Dismiss all
			</RuiButton>
		</>
	),
};

export const Stack: Story = {
	render: () => (
		<RuiButton
			variant="filled"
			type="button"
			on:click={() => {
				toast('First notification');
				toast.success('Second notification');
				toast.info('Third notification');
			}}
		>
			Stack three (hover to expand)
		</RuiButton>
	),
};

export const VisibleToasts: Story = {
	args: {
		visibleToasts: 5,
	},
	render: () => (
		<RuiButton
			variant="filled"
			type="button"
			on:click={() => {
				for (let i = 1; i <= 7; i += 1) {
					toast(`Notification ${i}`);
				}
			}}
		>
			Fire 7 (show 5)
		</RuiButton>
	),
};

export const AlwaysExpanded: Story = {
	args: {
		expand: true,
	},
	render: () => (
		<RuiButton
			variant="filled"
			type="button"
			on:click={() => {
				toast('First notification');
				toast.success('Second notification');
				toast.info('Third notification');
			}}
		>
			Stack three (always expanded)
		</RuiButton>
	),
};

export const Positions: Story = {
	parameters: {
		multiToaster: true,
	},
	render: () => (
		<>
			{TOAST_POSITIONS.map((position) => (
				<RuiButton variant="outline" type="button" on:click={() => toast(`Toast at ${position}`, { position })}>
					{position}
				</RuiButton>
			))}
		</>
	),
};

export const WithAction: Story = {
	args: {
		duration: 8000,
	},
	render: () => (
		<RuiButton
			variant="filled"
			type="button"
			on:click={() =>
				toast('File deleted', {
					action: {
						label: 'Undo',
						onClick: () => toast.success('Restored'),
					},
				})
			}
		>
			Show with action
		</RuiButton>
	),
};
