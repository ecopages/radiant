import { RadiantController, controller, onEvent, query } from '@ecopages/radiant';
import { createPopoverController, createRovingController } from '@ecopages/radiant-ui/controllers';

/**
 * @remarks
 * `RadiantController` has the two registration methods a radiant-ui `ControllerHost` needs, so the `createX(this, ...)`
 * factories bind to it as they do to an element: attached on `connect()`, destroyed on `disconnect()`.
 */
@controller('popover-menu')
export class PopoverMenuController extends RadiantController {
	@query({ selector: 'button' }) private trigger!: HTMLElement;
	@query({ selector: '[role="menu"]' }) private menu!: HTMLElement;
	@query({ selector: '[role="menuitem"]', all: true }) private items!: HTMLElement[];
	@query({ selector: '[data-status]' }) private status!: HTMLElement;

	private open = false;

	private readonly menuPopover = createPopoverController(this, {
		getAnchor: () => this.trigger,
		getFloating: () => this.menu,
		getOpen: () => this.open,
		getPlacement: () => 'bottom-start',
		portal: false,
		onDismiss: (reason) => this.setOpen(false, reason === 'escape'),
	});

	private readonly roving = createRovingController(this, {
		getItems: () => this.items,
		getTarget: () => this.menu,
		orientation: 'vertical',
	});

	override connect(): void {
		super.connect();
		this.roving.sync();
	}

	private setOpen(next: boolean, restoreFocus = false): void {
		this.open = next;
		this.menuPopover.sync();
		this.trigger.setAttribute('aria-expanded', String(next));
		this.status.textContent = next ? 'Menu open' : 'Menu closed';
		if (next) {
			this.roving.sync();
			this.roving.focus(this.items[0]);
		} else if (restoreFocus) {
			this.trigger.focus();
		}
	}

	@onEvent({ selector: 'button[aria-haspopup]', type: 'click' })
	toggle(): void {
		this.setOpen(!this.open, true);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'click' })
	choose(event: Event): void {
		this.setOpen(false, true);
		this.status.textContent = `Chose ${(event.target as HTMLElement).textContent}`;
	}
}
