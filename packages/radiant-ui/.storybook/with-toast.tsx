import type { Decorator } from '@ecopages/storybook-radiant-vite';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiToaster, toast, TOAST_POSITIONS, type ToastPosition } from '../src/components/ui/toast';
import { ToastTrigger } from './toast-trigger';

type ToastStageArgs = {
	closeButton?: boolean;
	duration?: number;
	expand?: boolean;
	gap?: number;
	offset?: number;
	position?: ToastPosition;
	visibleToasts?: number;
};

/**
 * Centres a story's trigger controls over a tall canvas so toasts have room to animate in.
 *
 * @remarks
 * Triggers and toasters are siblings, not nested: the trigger layer is `pointer-events: none`
 * and centred, which would otherwise reposition the toasters. That is why the stage owns the
 * toasters instead of leaving them to each story's `render`.
 */
function ToastStage({ children, toasters }: { children: JsxRenderable; toasters: JsxRenderable }) {
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
					{children}
				</div>
			</div>
			{toasters}
		</div>
	);
}

/** Stage with a single `<rui-toaster>` configured from the story's args. */
export const withToastStage: Decorator = (Story, { args }) => {
	const stageArgs = args as ToastStageArgs;
	toast.clear();

	return (
		<ToastStage
			toasters={
				<RuiToaster
					position={stageArgs.position}
					duration={stageArgs.duration}
					closeButton={stageArgs.closeButton}
					expand={stageArgs.expand}
					visibleToasts={stageArgs.visibleToasts}
					gap={stageArgs.gap}
					offset={stageArgs.offset}
				/>
			}
		>
			{Story() as JsxRenderable}
		</ToastStage>
	);
};

/** Stage with one `<rui-toaster>` per position, for comparing placements side by side. */
export const withToastPositions: Decorator = (Story) => {
	toast.clear();

	return (
		<ToastStage
			toasters={TOAST_POSITIONS.map((position) => (
				<RuiToaster key={position} position={position} closeButton />
			))}
		>
			{Story() as JsxRenderable}
		</ToastStage>
	);
};

/** The trigger set for the overview story. Rendered by the story, not injected by a decorator. */
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
