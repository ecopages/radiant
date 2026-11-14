import { RadiantElement, customElement, onEvent, query } from '@ecopages/radiant';
import {
	DismissController,
	FocusTrapController,
	PortalController,
	ScrollLockController,
} from '@ecopages/radiant-ui/controllers';

/**
 * @remarks
 * The four controllers are constructed directly, not through `createX(this, ...)`: they start and stop with the
 * dialog, not with the element's connection. `registerCleanupCallback` releases them if the element leaves the page
 * while the dialog is open.
 */
@customElement('recipe-modal')
export class RecipeModal extends RadiantElement {
	@query({ selector: '[data-next]' }) private next!: HTMLElement;
	@query({ selector: '[data-layer]' }) private layer!: HTMLElement;
	@query({ selector: '[data-dialog]' }) private dialog!: HTMLElement;
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private returnTo: HTMLElement | null = null;
	private readonly portal = new PortalController({ getNode: () => this.layer, getContainer: () => this });
	private readonly trap = new FocusTrapController({
		getSurface: () => this.dialog,
		getReturnFocus: () => this.returnTo,
	});
	private readonly lock = new ScrollLockController();
	private readonly dismiss = new DismissController({
		getSurface: () => this.dialog,
		triggers: ['pointer', 'escape'],
		onDismiss: () => this.close('Dialog closed'),
	});

	constructor() {
		super();
		this.registerCleanupCallback(() => this.close('Dialog closed'));
	}

	@onEvent({ selector: '[data-open]', type: 'click' })
	open(): void {
		this.layer.hidden = false;
		this.portal.attach();
		this.lock.attach();
		this.trap.attach();
		this.dismiss.attach();
		this.status.textContent = 'Dialog open';
	}

	@onEvent({ selector: '[data-confirm]', type: 'click' })
	confirm(): void {
		this.returnTo = this.next;
		this.close('Deleted');
	}

	@onEvent({ selector: '[data-close]', type: 'click' })
	cancel(): void {
		this.close('Dialog closed');
	}

	private close(message: string): void {
		this.dismiss.destroy();
		this.layer.hidden = true;
		this.trap.destroy();
		this.returnTo = null;
		this.lock.destroy();
		this.portal.destroy();
		this.status.textContent = message;
	}
}
