import type { DocsDecorator } from '@/lib/docs-stories';
/**
 * @remarks
 * Import from the package root — not `@ecopages/radiant-ui/toast`.
 * Docs canvas prebundles those as separate vendor chunks with separate toast
 * stores; the barrel is what registers `<rui-toaster>`, so triggers must use it too.
 */
import { RuiButton, RuiToaster, toast, type ToastPosition } from '@ecopages/radiant-ui';

export const TOAST_STAGE_CLASS = 'playground-toast-stage';
export const TOAST_STAGE_SELECTOR = `.${TOAST_STAGE_CLASS}`;

export type ToastStageArgs = {
	position?: ToastPosition;
	duration?: number;
	visibleToasts?: number;
	closeButton?: boolean;
	expand?: boolean;
};

function ToastDemoTriggers() {
	return (
		<>
			<RuiButton type="button" on:click={() => toast('Event has been created')}>Show default toast</RuiButton>
			<RuiButton type="button" on:click={() => toast.success('Profile saved')}>Show success toast</RuiButton>
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
			<RuiButton type="button" variant="ghost" on:click={() => toast.dismiss()}>Dismiss all toasts</RuiButton>
		</>
	);
}

/**
 * Clears toast state, mounts `<rui-toaster>` scoped to the playground stage, and renders demo triggers.
 */
export function withToastStage<TArgs extends ToastStageArgs>(): DocsDecorator<TArgs> {
	return (_story, context) => {
		const args = context.args;

		return (
			<div class={TOAST_STAGE_CLASS}>
				<div class="playground-toast-stage__actions">
					<ToastDemoTriggers />
				</div>
				<RuiToaster
					container={TOAST_STAGE_SELECTOR}
					position={args.position ?? 'bottom-end'}
					duration={Number(args.duration ?? 4000)}
					visibleToasts={Number(args.visibleToasts ?? 3)}
					closeButton={Boolean(args.closeButton)}
					expand={Boolean(args.expand)}
				/>
			</div>
		);
	};
}
