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

/**
 * Args the stage reads. Required, not optional: `DocsMeta.args` is complete by construction,
 * and the docs controls preserve their types — `rui-number-field` only emits `number`,
 * `rui-switch` only `boolean` — so the stage uses them directly, with no defaults of its own.
 */
export type ToastStageArgs = {
	position: ToastPosition;
	duration: number;
	visibleToasts: number;
	closeButton: boolean;
	expand: boolean;
};

/**
 * Wraps the story's triggers in the playground stage and mounts a `<rui-toaster>` scoped to it.
 *
 * @remarks
 * The stage owns the toaster because `container` has to point at the stage element. The trigger
 * content is the story's own `render` — this decorator provides the frame, not the content.
 */
export const withToastStage: DocsDecorator<ToastStageArgs> = (story, { args }) => {
	toast.clear();

	return (
		<div class={TOAST_STAGE_CLASS}>
			<div class="playground-toast-stage__actions">{story()}</div>
			<RuiToaster
				container={TOAST_STAGE_SELECTOR}
				position={args.position}
				duration={args.duration}
				visibleToasts={args.visibleToasts}
				closeButton={args.closeButton}
				expand={args.expand}
			/>
		</div>
	);
};
