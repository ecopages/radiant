import type { Decorator } from '@ecopages/storybook-radiant-vite';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiToaster, toast } from '../src/components/ui/toast';
import type { ToastPosition } from '../src/components/ui/toast/toast-context';
import { ToastTrigger } from './toast-trigger';

const TOAST_POSITIONS: readonly ToastPosition[] = [
	'top-start',
	'top-center',
	'top-end',
	'bottom-start',
	'bottom-center',
	'bottom-end',
];

export type ToastStageArgs = {
	closeButton?: boolean;
	duration?: number;
	expand?: boolean;
	gap?: number;
	offset?: number;
	position?: ToastPosition;
	visibleToasts?: number;
};

export type ToastStageOptions = {
	demo?: boolean;
	multiToaster?: boolean;
};

export type ToastStageParameters = {
	toastStage?: ToastStageOptions;
};

/** Spread into story `parameters` to configure the toast stage decorator. */
export function toastStage(options: ToastStageOptions): { toastStage: ToastStageOptions } {
	return { toastStage: options };
}

function ToastDemoTriggers() {
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

/**
 * CSF decorator: clears toast state, mounts `<rui-toaster>` from story args, and centers trigger controls.
 */
export const withToastStage: Decorator = (Story, { args, parameters }) => {
	const { demo = false, multiToaster = false } = (parameters as ToastStageParameters).toastStage ?? {};
	const stageArgs = args as ToastStageArgs;
	const story = demo ? null : (Story() as JsxRenderable);

	toast.clear();

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
					{demo ? <ToastDemoTriggers /> : story}
				</div>
			</div>
			{multiToaster ? (
				TOAST_POSITIONS.map((position) => <RuiToaster key={position} position={position} closeButton />)
			) : (
				<RuiToaster
					position={stageArgs.position}
					duration={stageArgs.duration}
					closeButton={stageArgs.closeButton}
					expand={stageArgs.expand}
					visibleToasts={stageArgs.visibleToasts}
					gap={stageArgs.gap}
					offset={stageArgs.offset}
				/>
			)}
		</div>
	);
};
