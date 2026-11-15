import { RadiantController, controller, onEvent, query } from '@ecopages/radiant';
import {
	DismissController,
	FocusTrapController,
	PortalController,
	ScrollLockController,
} from '@ecopages/radiant-ui/controllers';

/**
 * @remarks
 * The four controllers are constructed directly, not through `createX(this, ...)`: they start and stop with the
 * dialog, not with the host's connection. `registerCleanupCallback` releases them if the registry disconnects the
 * host because it left the page while the dialog is open.
 */
@controller('modal')
export class ModalController extends RadiantController {
	@query({ selector: '[data-list]' }) private list!: HTMLElement;
	@query({ selector: '[data-empty]' }) private empty!: HTMLElement;
	@query({ selector: '[data-reset]' }) private reset!: HTMLElement;
	@query({ selector: '[data-layer]' }) private layer!: HTMLElement;
	@query({ selector: '[data-dialog]' }) private dialog!: HTMLElement;
	@query({ selector: '[data-dialog] h3' }) private heading!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private rows: HTMLElement[] = [];
	private pending: HTMLElement | null = null;
	private returnTo: HTMLElement | null = null;
	private readonly portal = new PortalController({ getNode: () => this.layer, getContainer: () => this.host });
	private readonly trap = new FocusTrapController({
		getSurface: () => this.dialog,
		getReturnFocus: () => this.returnTo,
	});
	private readonly lock = new ScrollLockController({
		getTarget: () => this.host.closest<HTMLElement>('.docs-layout__content') ?? document.documentElement,
	});
	private readonly dismiss = new DismissController({
		getSurface: () => this.dialog,
		triggers: ['pointer', 'escape'],
		onDismiss: () => this.close(`Kept ${this.nameOf(this.pending!)}`),
	});

	constructor(host: Element) {
		super(host);
		this.registerCleanupCallback(() => this.release());
	}

	override connect(): void {
		super.connect();
		this.rows = [...this.list.children] as HTMLElement[];
	}

	@onEvent({ selector: '[data-delete]', type: 'click' })
	ask(event: Event): void {
		const row = (event.target as Element).closest('li')!;
		this.pending = row;
		this.heading.textContent = `Delete ${this.nameOf(row)}?`;
		this.layer.hidden = false;
		this.portal.attach();
		this.lock.attach();
		this.trap.attach();
		this.dismiss.attach();
		this.status.textContent = `Delete ${this.nameOf(row)}?`;
	}

	@onEvent({ selector: '[data-confirm]', type: 'click' })
	confirm(): void {
		const row = this.pending!;
		const name = this.nameOf(row);
		const neighbour = row.nextElementSibling ?? row.previousElementSibling;
		row.remove();
		this.empty.hidden = this.list.children.length > 0;
		this.returnTo = neighbour?.querySelector<HTMLElement>('[data-delete]') ?? this.reset;
		this.close(`Deleted ${name}, ${this.list.children.length} left`);
	}

	@onEvent({ selector: '[data-close]', type: 'click' })
	cancel(): void {
		this.close(`Kept ${this.nameOf(this.pending!)}`);
	}

	@onEvent({ selector: '[data-reset]', type: 'click' })
	restore(): void {
		this.list.replaceChildren(...this.rows);
		this.empty.hidden = true;
		this.list.querySelector<HTMLElement>('[data-delete]')!.focus();
		this.status.textContent = 'List restored';
	}

	private nameOf(row: Element): string | null {
		return row.firstElementChild!.textContent;
	}

	private release(): void {
		this.dismiss.destroy();
		this.layer.hidden = true;
		this.trap.destroy();
		this.returnTo = null;
		this.pending = null;
		this.lock.destroy();
		this.portal.destroy();
	}

	private close(message: string): void {
		this.release();
		this.status.textContent = message;
	}
}
