import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsDecorator, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';
import { dismissToast, showToast } from '@ecopages/radiant-ui/toast';

const DEMO_TRIGGERS: Record<string, () => void> = {
	default: () => showToast({ title: 'Event has been created', variant: 'default' }),
	success: () => showToast({ title: 'Changes saved', variant: 'success' }),
	error: () =>
		showToast({
			title: 'Unable to reach the server',
			description: 'Try again in a moment.',
			variant: 'error',
		}),
	warning: () => showToast({ title: 'Disk space is running low', variant: 'warning' }),
	info: () => showToast({ title: 'Your session will expire soon', variant: 'info' }),
};

let toastDemoInstalled = false;

function onToastDemoClick(event: Event): void {
	const target = event.target;
	if (!(target instanceof Node)) return;

	const trigger = (target instanceof Element ? target : target.parentElement)?.closest<HTMLElement>(
		'[data-toast-trigger]',
	);
	const id = trigger?.dataset.toastTrigger;
	if (!id) return;

	DEMO_TRIGGERS[id]?.();
}

/**
 * @remarks
 * Document delegation for `data-toast-trigger` — SSR-safe, same pattern as `installDialogs`.
 * Uses `showToast` (DOM events) so the mounted `<rui-toaster>` receives updates even when
 * the story module and the canvas bundle resolve separate toast store copies.
 */
function installToastDemo(): void {
	if (typeof document === 'undefined' || toastDemoInstalled) return;
	toastDemoInstalled = true;
	document.addEventListener('click', onToastDemoClick);
}

const withToastStage: DocsDecorator<ToastArgs> = (story) => {
	installToastDemo();
	if (typeof document !== 'undefined') {
		dismissToast();
	}

	return (
		<div class="playground-toast-stage">
			<div class="playground-toast-stage__actions">
				<button type="button" class="rui-button rui-button--filled rui-button--md" data-toast-trigger="default">
					Default
				</button>
				<button type="button" class="rui-button rui-button--filled rui-button--md" data-toast-trigger="success">
					Success
				</button>
				<button type="button" class="rui-button rui-button--filled rui-button--md" data-toast-trigger="error">
					Error
				</button>
				<button
					type="button"
					class="rui-button rui-button--outline rui-button--md"
					data-toast-trigger="warning"
				>
					Warning
				</button>
				<button type="button" class="rui-button rui-button--outline rui-button--md" data-toast-trigger="info">
					Info
				</button>
			</div>
			{story()}
		</div>
	);
};

export type ToastArgs = {
	position: string;
	duration: number;
	visibleToasts: number;
	closeButton: boolean;
	expand: boolean;
};

export const meta = {
	component: 'toast',
	exportName: 'RuiToaster',
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
			options: ['bottom-end', 'bottom-center', 'top-end', 'top-center'] as const,
		},
		duration: { control: { type: 'number' } },
		visibleToasts: { control: { type: 'number' } },
		closeButton: { control: { type: 'boolean' } },
		expand: { control: { type: 'boolean' } },
	},
	decorators: [withToastStage],
	exampleCode: (args) => buildExampleCode('RuiToaster', 'toast', args),
	render: (args) => renderPlaygroundPreview('toast', args),
} satisfies DocsMeta<ToastArgs>;

type Story = DocsStory<ToastArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toast/default' } } });
