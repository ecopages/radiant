import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { PopoverController, shouldDismissPopoverPointer } from '../shared/popover-controller';
import type { RuiPlacement } from '../shared/placement';

export type RuiMenuButtonProps = {
	/** Whether the menu starts open. Default: `false`. */
	open?: boolean;
	/** Placement of the menu surface relative to its trigger. Default: `bottom-start`. */
	placement?: RuiPlacement;
};

export type RuiMenuButtonSelectDetail = {
	value: string;
};

const MENU_GAP = 6;

/**
 * `<rui-menu-button>` — a button that opens a menu of actions.
 *
 * Implements the WAI-ARIA APG Menu Button pattern together with the Menu
 * keyboard model: the trigger exposes `aria-haspopup="menu"` and
 * `aria-expanded`, and the popup has `role="menu"` with `role="menuitem"`
 * children.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
 *
 * Keyboard interaction (trigger):
 * - `Enter` / `Space` / `ArrowDown`: open and focus the first item
 * - `ArrowUp`: open and focus the last item
 *
 * Keyboard interaction (open menu):
 * - `ArrowDown` / `ArrowUp`: move between items (wraps)
 * - `Home` / `End`: first / last item
 * - `Enter` / `Space`: activate the focused item and close
 * - `Escape`: close and return focus to the trigger
 *
 * @element rui-menu-button
 * @slot trigger - Label for the menu button.
 * @slot - Menu items (`role="menuitem"`), typically buttons or anchors.
 * @fires rui-change - Emitted when a menu item is activated; `detail.value` is the item's `data-value` or text.
 * @fires rui-close - Emitted when the menu closes.
 */
@customElement('rui-menu-button')
export class RuiMenuButton extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: String, defaultValue: 'bottom-start' }) placement: RuiPlacement;

	@query({ ref: 'trigger' }) triggerTarget: HTMLButtonElement;
	@query({ ref: 'menu' }) menuTarget: HTMLElement;

	@event({ name: 'rui-change', bubbles: true, composed: true })
	changeEvent: EventEmitter<RuiMenuButtonSelectDetail>;

	@event({ name: 'rui-close', bubbles: true, composed: true })
	closeEvent: EventEmitter<void>;

	private menuId = `rui-menu-${Math.random().toString(36).slice(2, 9)}`;
	private popoverController: PopoverController | null = null;
	private pendingFocus: 'first' | 'last' | 'trigger' | null = null;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.syncOpenState());
	}

	override disconnectedCallback(): void {
		this.popoverController?.destroy();
		this.popoverController = null;
		super.disconnectedCallback();
	}

	private getItems(): HTMLElement[] {
		return Array.from(this.menuTarget?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []).filter(
			(item) => !item.hidden && item.getAttribute('aria-disabled') !== 'true',
		);
	}

	private ensurePopoverController(): PopoverController {
		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: () => this.triggerTarget,
				getFloating: () => this.menuTarget,
				getOpen: () => this.open,
				getPlacement: () => this.placement,
				gap: MENU_GAP,
				portal: false,
			});
		}
		return this.popoverController;
	}

	@bound
	@onUpdated(['open', 'placement'])
	syncOpenState(): void {
		if (!this.triggerTarget || !this.menuTarget) return;

		this.menuTarget.id = this.menuId;
		this.triggerTarget.setAttribute('aria-controls', this.menuId);
		this.triggerTarget.setAttribute('aria-haspopup', 'menu');
		this.triggerTarget.setAttribute('aria-expanded', String(this.open));
		this.menuTarget.hidden = !this.open;

		const controller = this.ensurePopoverController();
		controller.updateConfig({
			getPlacement: () => this.placement,
			getOpen: () => this.open,
		});
		controller.sync();

		const focus = this.pendingFocus;
		this.pendingFocus = null;
		if (!focus) return;

		if (focus === 'first') this.getItems()[0]?.focus();
		if (focus === 'last') {
			const items = this.getItems();
			items[items.length - 1]?.focus();
		}
		if (focus === 'trigger') this.triggerTarget?.focus();
	}

	private setOpen(next: boolean, focus: 'first' | 'last' | 'trigger' | null = null): void {
		const wasOpen = this.open;
		this.pendingFocus = focus;
		this.open = next;
		if (wasOpen && !next) this.closeEvent.emit();
		if (wasOpen === next) this.syncOpenState();
	}

	@onEvent({ document: true, type: 'pointerdown' })
	onDocumentPointerDown(event: PointerEvent): void {
		if (!this.open) return;
		const target = event.target as Node | null;
		if (!shouldDismissPopoverPointer(this.triggerTarget, this.menuTarget, target)) return;
		this.setOpen(false);
	}

	@onEvent({ ref: 'trigger', type: 'click' })
	onTriggerClick(): void {
		this.setOpen(!this.open, this.open ? null : 'first');
	}

	@onEvent({ ref: 'trigger', type: 'keydown' })
	onTriggerKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowDown':
			case 'Enter':
			case ' ':
				event.preventDefault();
				this.setOpen(true, 'first');
				break;
			case 'ArrowUp':
				event.preventDefault();
				this.setOpen(true, 'last');
				break;
			default:
				break;
		}
	}

	@onEvent({ ref: 'menu', type: 'keydown' })
	onMenuKeydown(event: KeyboardEvent): void {
		const items = this.getItems();
		const current = document.activeElement as HTMLElement | null;
		const index = current ? items.indexOf(current) : -1;

		switch (event.key) {
			case 'ArrowDown': {
				event.preventDefault();
				const next = items[(index + 1) % items.length];
				next?.focus();
				break;
			}
			case 'ArrowUp': {
				event.preventDefault();
				const prev = items[(index - 1 + items.length) % items.length];
				prev?.focus();
				break;
			}
			case 'Home':
				event.preventDefault();
				items[0]?.focus();
				break;
			case 'End':
				event.preventDefault();
				items[items.length - 1]?.focus();
				break;
			case 'Escape':
				event.preventDefault();
				this.setOpen(false, 'trigger');
				break;
			case 'Tab':
				this.setOpen(false);
				break;
			case 'Enter':
			case ' ':
				if (current && items.includes(current)) {
					event.preventDefault();
					this.activateItem(current);
				}
				break;
			default:
				break;
		}
	}

	@onEvent({ selector: '[role="menuitem"]', type: 'click' })
	onItemClick(event: Event): void {
		const item = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement | null;
		if (!item || !this.contains(item)) return;
		this.activateItem(item);
	}

	private activateItem(item: HTMLElement): void {
		const value = item.getAttribute('data-value') || item.textContent?.trim() || '';
		this.changeEvent.emit({ value });
		this.setOpen(false, 'trigger');
	}

	override render() {
		return (
			<div class="rui-menu-button">
				<button
					type="button"
					data-ref="trigger"
					class="rui-button rui-button--primary rui-button--md rui-menu-button__trigger"
					aria-haspopup="menu"
					aria-expanded="false"
				>
					<slot name="trigger"></slot>
					<span class="rui-menu-button__chevron" aria-hidden="true"></span>
				</button>
				<div data-ref="menu" class="rui-menu-button__menu rui-popover rui-floating" role="menu" hidden>
					<slot></slot>
				</div>
			</div>
		);
	}
}
