import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import { createPopoverController, createRovingController } from '@ecopages/radiant-ui/controllers';

const actions = ['Rename', 'Duplicate', 'Delete'];

@customElement('popover-menu-app')
export class PopoverMenuApp extends RadiantElement<{ status: string }> {
	@state open = false;
	@state status = 'Menu closed';

	private readonly menuPopover = createPopoverController(this, {
		getAnchor: () => this.querySelector<HTMLElement>('button[aria-haspopup]'),
		getFloating: () => this.querySelector<HTMLElement>('[role="menu"]'),
		getOpen: () => this.open,
		getPlacement: () => 'bottom-start',
		portal: false,
		onDismiss: (reason) => this.setOpen(false, reason === 'escape'),
	});

	private readonly roving = createRovingController(this, {
		getItems: () => [...this.querySelectorAll<HTMLElement>('[role="menuitem"]')],
		getTarget: () => this.querySelector<HTMLElement>('[role="menu"]'),
		orientation: 'vertical',
	});

	/**
	 * Attaches the roving controller to the menu the render produced.
	 *
	 * @remarks
	 * The controllers attach when the element connects, before the first render, when no menu exists yet; a later
	 * `attach()` and `sync()` resolve the menu and its items again.
	 */
	protected override updated(): void {
		this.roving.attach();
		this.roving.sync();
	}

	private setOpen(next: boolean, restoreFocus = false): void {
		this.open = next;
		this.menuPopover.sync();
		this.status = next ? 'Menu open' : 'Menu closed';
		if (next) {
			this.roving.sync();
			this.roving.focus(this.querySelector<HTMLElement>('[role="menuitem"]')!);
		} else if (restoreFocus) {
			this.querySelector<HTMLElement>('button[aria-haspopup]')!.focus();
		}
	}

	@onEvent({ selector: 'button[aria-haspopup]', type: 'click' })
	toggle(): void {
		this.setOpen(!this.open, true);
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'click' })
	choose(event: Event): void {
		this.setOpen(false, true);
		this.status = `Chose ${(event.target as HTMLElement).textContent}`;
	}

	override render() {
		return (
			<>
				<button type="button" aria-haspopup="menu" aria-expanded={this.open ? 'true' : 'false'}>
					Actions
				</button>
				<div role="menu" aria-label="Actions" hidden={!this.open}>
					{actions.map((action) => (
						<button key={action} type="button" role="menuitem">
							{action}
						</button>
					))}
				</div>
				<p data-status aria-live="polite">
					{this.$.status}
				</p>
			</>
		);
	}
}
