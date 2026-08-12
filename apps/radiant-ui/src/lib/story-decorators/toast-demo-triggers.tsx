/**
 * @remarks
 * Import from the package root — not `@ecopages/radiant-ui/toast`. The docs canvas prebundles
 * the subpath as a separate vendor chunk with its own toast store, so a trigger from there
 * would post into a store no visible toaster is reading.
 */
import { RuiButton, type RuiButtonVariant, toast } from '@ecopages/radiant-ui';

function ToastTrigger({
	label,
	variant = 'filled',
	onClick,
}: {
	label: string;
	variant?: RuiButtonVariant;
	onClick: () => void;
}) {
	return (
		<RuiButton variant={variant} type="button" on:click={onClick}>
			{label}
		</RuiButton>
	);
}

/** The trigger set for the toast overview story. Rendered by the story, not by the stage. */
export function ToastDemoTriggers() {
	return (
		<>
			<ToastTrigger label="Show default toast" onClick={() => toast('Event has been created')} />
			<ToastTrigger label="Show success toast" onClick={() => toast.success('Profile saved')} />
			<ToastTrigger
				label="Show error toast"
				onClick={() => toast.error('Unable to reach the server', { description: 'Try again in a moment.' })}
			/>
			<ToastTrigger
				label="Show warning toast"
				variant="outline"
				onClick={() => toast.warning('Disk space is running low')}
			/>
			<ToastTrigger
				label="Show info toast"
				variant="outline"
				onClick={() => toast.info('Your session will expire soon')}
			/>
			<ToastTrigger label="Show loading toast" variant="ghost" onClick={() => toast.loading('Uploading…')} />
			<ToastTrigger
				label="Show promise toast"
				variant="outline"
				onClick={() =>
					toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
						loading: 'Saving…',
						success: 'Saved',
						error: 'Save failed',
					})
				}
			/>
			<ToastTrigger label="Dismiss all toasts" variant="ghost" onClick={() => toast.dismiss()} />
		</>
	);
}
