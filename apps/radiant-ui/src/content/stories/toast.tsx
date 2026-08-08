import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsDecorator, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
/**
 * @remarks
 * Import from the package root — not `@ecopages/radiant-ui/toast`.
 * Docs canvas prebundles those as separate vendor chunks with separate toast
 * stores; the barrel is what registers `<rui-toaster>`, so triggers must use it too.
 */
import { RuiToaster, toast } from '@ecopages/radiant-ui';

const TOAST_STAGE_SELECTOR = '.playground-toast-stage';

const DEMO_TRIGGERS: Record<string, () => void> = {
	default: () => toast('Event has been created'),
	success: () => toast.success('Changes saved'),
	error: () => toast.error('Unable to reach the server', { description: 'Try again in a moment.' }),
	warning: () => toast.warning('Disk space is running low'),
	info: () => toast.info('Your session will expire soon'),
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
 * Installed at module load so SSR buttons work even before the canvas re-paints.
 */
function installToastDemo(): void {
	if (typeof document === 'undefined' || toastDemoInstalled) return;
	toastDemoInstalled = true;
	document.addEventListener('click', onToastDemoClick);
}

installToastDemo();

const withToastStage: DocsDecorator<ToastArgs> = (_story, context) => {
	installToastDemo();
	const args = context.args;

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
			<RuiToaster
				container={TOAST_STAGE_SELECTOR}
				position={(args.position as ToastArgs['position']) ?? 'bottom-end'}
				duration={Number(args.duration ?? 4000)}
				visibleToasts={Number(args.visibleToasts ?? 3)}
				closeButton={Boolean(args.closeButton)}
				expand={Boolean(args.expand)}
			/>
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
	render: () => null,
} satisfies DocsMeta<ToastArgs>;

type Story = DocsStory<ToastArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toast/default' } } });
