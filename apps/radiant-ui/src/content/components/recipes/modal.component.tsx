import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import {
	DismissController,
	FocusTrapController,
	PortalController,
	ScrollLockController,
} from '@ecopages/radiant-ui/controllers';

const initialFiles = ['Brief', 'Report', 'Notes'];

/**
 * @remarks
 * The dialog is open while `pending` names a file. The controllers start and stop in `updated()`, after the render
 * that shows or hides the layer, so the layer is visible when the trap looks for something to focus and the final
 * list is on the page when the trap looks for the control that takes focus back. They are constructed directly, not
 * through `createX(this, ...)`, because they follow the dialog and not the element's connection;
 * `registerCleanupCallback` releases them if the element leaves the page while the dialog is open.
 */
@customElement('modal-app')
export class ModalApp extends RadiantElement {
	@state files = initialFiles;
	@state pending: string | null = null;
	@state status = 'Delete a file to see where focus goes';

	private isOpen = false;
	private returnTo: string | null = null;
	private resetFocus = false;
	private focusFirst = false;
	private readonly portal = new PortalController({
		getNode: () => this.querySelector<HTMLElement>('[data-layer]'),
		getContainer: () => this,
	});
	private readonly trap = new FocusTrapController({
		getSurface: () => this.querySelector<HTMLElement>('[data-dialog]'),
		getReturnFocus: () =>
			this.resetFocus
				? this.querySelector<HTMLElement>('[data-reset]')
				: this.querySelector<HTMLElement>(`[data-delete="${this.returnTo}"]`),
	});
	private readonly lock = new ScrollLockController({
		getTarget: () => this.closest<HTMLElement>('.docs-layout__content') ?? document.documentElement,
	});
	private readonly dismiss = new DismissController({
		getSurface: () => this.querySelector<HTMLElement>('[data-dialog]'),
		triggers: ['pointer', 'escape'],
		onDismiss: () => this.keep(),
	});

	constructor() {
		super();
		this.registerCleanupCallback(() => this.release());
	}

	@onEvent({ selector: '[data-delete]', type: 'click' })
	ask(event: Event): void {
		const name = (event.target as HTMLElement).closest<HTMLElement>('[data-delete]')!.dataset.delete!;
		this.pending = name;
		this.status = `Delete ${name}?`;
	}

	@onEvent({ selector: '[data-confirm]', type: 'click' })
	confirm(): void {
		const name = this.pending!;
		const index = this.files.indexOf(name);
		const files = this.files.filter((file) => file !== name);
		this.returnTo = files[index] ?? files[index - 1] ?? null;
		this.resetFocus = files.length === 0;
		this.files = files;
		this.pending = null;
		this.status = `Deleted ${name}, ${files.length} left`;
	}

	@onEvent({ selector: '[data-close]', type: 'click' })
	keep(): void {
		this.status = `Kept ${this.pending}`;
		this.pending = null;
	}

	@onEvent({ selector: '[data-reset]', type: 'click' })
	restore(): void {
		this.files = initialFiles;
		this.focusFirst = true;
		this.status = 'List restored';
	}

	protected override updated(): void {
		if (this.pending && !this.isOpen) {
			this.isOpen = true;
			this.portal.attach();
			this.lock.attach();
			this.trap.attach();
			this.dismiss.attach();
		} else if (!this.pending && this.isOpen) {
			this.release();
		}
		if (this.focusFirst) {
			this.focusFirst = false;
			this.querySelector<HTMLElement>('[data-delete]')!.focus();
		}
	}

	private release(): void {
		this.isOpen = false;
		this.dismiss.destroy();
		this.trap.destroy();
		this.returnTo = null;
		this.resetFocus = false;
		this.lock.destroy();
		this.portal.destroy();
	}

	override render() {
		return (
			<>
				<div data-origin>
					<ul data-list aria-label="Files">
						{this.files.map((name) => (
							<li key={name}>
								<span>{name}</span>
								<button type="button" data-delete={name} aria-label={`Delete ${name}`}>
									Delete
								</button>
							</li>
						))}
					</ul>
					<div data-empty hidden={this.files.length > 0}>
						<span>No files left</span>
						<button type="button" data-reset>
							Reset
						</button>
					</div>
					<div data-layer hidden={this.pending === null}>
						<div data-dialog role="dialog" aria-modal="true" aria-labelledby="modal-title">
							<h3 id="modal-title">Delete {this.pending}?</h3>
							<p>This cannot be undone.</p>
							<div data-actions>
								<button type="button" data-close>
									Cancel
								</button>
								<button type="button" data-confirm>
									Delete
								</button>
							</div>
						</div>
					</div>
				</div>
				<p data-status aria-live="polite">
					{this.status}
				</p>
			</>
		);
	}
}
