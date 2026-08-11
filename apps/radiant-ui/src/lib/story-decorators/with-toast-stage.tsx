import type { DocsDecorator } from '@/lib/docs-stories';
/**
 * @remarks
 * Import from the package root — not `@ecopages/radiant-ui/toast`.
 * Docs canvas prebundles those as separate vendor chunks with separate toast
 * stores; the barrel is what registers `<rui-toaster>`, so triggers must use it too.
 */
import { RuiToaster, toast, type ToastPosition } from '@ecopages/radiant-ui';

export const TOAST_STAGE_CLASS = 'playground-toast-stage';
export const TOAST_STAGE_SELECTOR = `.${TOAST_STAGE_CLASS}`;

export type ToastStageArgs = {
	position?: ToastPosition;
	duration?: number;
	visibleToasts?: number;
	closeButton?: boolean;
	expand?: boolean;
};

/**
 * Wraps the story's triggers in the playground stage and mounts a `<rui-toaster>` scoped to it.
 *
 * @remarks
 * The stage owns the toaster because `container` has to point at the stage element. The trigger
 * content is the story's own `render` — this decorator provides the frame, not the content.
 *
 * Control values arrive as strings from the docs playground inputs, hence the coercions.
 */
export function withToastStage<TArgs extends ToastStageArgs>(): DocsDecorator<TArgs> {
	return (story, context) => {
		toast.clear();
		const args = context.args;

		return (
			<div class={TOAST_STAGE_CLASS}>
				<div class="playground-toast-stage__actions">{story()}</div>
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
