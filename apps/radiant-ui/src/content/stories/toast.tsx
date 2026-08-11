import { type ToastPosition, TOAST_POSITIONS } from '@ecopages/radiant-ui/toast';
/**
 * @remarks
 * Triggers import `toast` from the package root, not `@ecopages/radiant-ui/toast`: the docs
 * canvas prebundles the subpath as a separate vendor chunk with its own toast store, so a
 * trigger from there would post into a store no visible toaster is reading.
 */
import { RuiButton, toast } from '@ecopages/radiant-ui';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { withToastStage } from '@/lib/story-decorators/with-toast-stage';

export type ToastArgs = {
	position: ToastPosition;
	duration: number;
	visibleToasts: number;
	closeButton: boolean;
	expand: boolean;
};

export const meta = {
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
	render: () => (
		<>
			<RuiButton type="button" on:click={() => toast('Event has been created')}>
				Show default toast
			</RuiButton>
			<RuiButton type="button" on:click={() => toast.success('Profile saved')}>
				Show success toast
			</RuiButton>
			<RuiButton
				type="button"
				on:click={() => toast.error('Unable to reach the server', { description: 'Try again in a moment.' })}
			>
				Show error toast
			</RuiButton>
			<RuiButton type="button" variant="outline" on:click={() => toast.warning('Disk space is running low')}>
				Show warning toast
			</RuiButton>
			<RuiButton type="button" variant="outline" on:click={() => toast.info('Your session will expire soon')}>
				Show info toast
			</RuiButton>
			<RuiButton type="button" variant="ghost" on:click={() => toast.loading('Uploading…')}>
				Show loading toast
			</RuiButton>
			<RuiButton
				type="button"
				variant="outline"
				on:click={() =>
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
						loading: 'Saving…',
						success: 'Saved',
						error: 'Save failed',
					})
				}
			>
				Show promise toast
			</RuiButton>
			<RuiButton type="button" variant="ghost" on:click={() => toast.dismiss()}>
				Dismiss all toasts
			</RuiButton>
		</>
	),
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
