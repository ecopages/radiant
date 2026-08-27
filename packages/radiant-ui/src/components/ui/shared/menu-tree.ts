import { PopoverController } from './popover-controller';

const SUBMENU_DELAY = 200;
const SUBMENU_CLOSE_DELAY = 250;
const SUBMENU_GAP = 6;

type MenuTreeConfig = {
	root: HTMLElement;
	getRootMenu: () => HTMLElement | null;
	onActivate: (item: HTMLElement) => void;
	onCloseRoot: (returnFocus: boolean) => void;
};

/**
 * Coordinates nested menu branches shared by menu-button and menubar hosts.
 *
 * @remarks Menus remain in light DOM so their ARIA relationship is represented
 * by an immediate menuitem/menu sibling pair. Submenu popovers therefore stay
 * unportaled while this coordinator manages their independent positions.
 */
export class MenuTreeController {
	private readonly config: MenuTreeConfig;
	private readonly popovers = new Map<HTMLElement, PopoverController>();
	private readonly openMenus = new Set<HTMLElement>();
	private readonly openTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
	private readonly closeTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

	constructor(config: MenuTreeConfig) {
		this.config = config;
	}

	sync(): void {
		for (const menu of this.getMenus()) {
			for (const item of this.getDirectItems(menu)) {
				const submenu = this.getSubmenu(item);
				if (!submenu) continue;
				item.setAttribute('aria-haspopup', 'menu');
				if (!item.hasAttribute('aria-expanded')) item.setAttribute('aria-expanded', 'false');
				if (!submenu.id) submenu.id = `rui-submenu-${Math.random().toString(36).slice(2, 9)}`;
				item.setAttribute('aria-controls', submenu.id);
				submenu.hidden = item.getAttribute('aria-expanded') !== 'true';
			}
		}
	}

	handlePointerOver(event: PointerEvent): void {
		const item = this.getDirectItem(event.target);
		if (!item || this.isDisabled(item)) return;

		this.cancelCloseFor(item);
		this.cancelAncestorCloseTimers(item);
		const submenu = this.getSubmenu(item);
		if (!submenu || item.getAttribute('aria-expanded') === 'true') return;

		this.closeSiblingBranches(item);
		this.cancelOpenFor(item);
		const timer = setTimeout(() => {
			this.openTimers.delete(item);
			this.openSubmenu(item, false);
		}, SUBMENU_DELAY);
		this.openTimers.set(item, timer);
	}

	handlePointerOut(event: PointerEvent): void {
		const item = this.getDirectItem(event.target);
		if (!item) return;

		const related = event.relatedTarget as Node | null;
		const submenu = this.getSubmenu(item);
		if (submenu && related && submenu.contains(related)) return;
		if (related && item.contains(related)) return;

		this.cancelOpenFor(item);
		if (item.getAttribute('aria-expanded') !== 'true') return;
		this.scheduleClose(item);
	}

	handleFocusOut(event: FocusEvent): void {
		const item = this.getDirectItem(event.target);
		if (!item || item.getAttribute('aria-expanded') !== 'true') return;
		const submenu = this.getSubmenu(item);
		const related = event.relatedTarget as Node | null;
		if (submenu && related && submenu.contains(related)) return;
		this.closeSubmenu(item, false);
	}

	handleKeydown(event: KeyboardEvent): boolean {
		const item = this.getDirectItem(event.target);
		const menu = item?.parentElement;
		if (!item || !menu || menu.getAttribute('role') !== 'menu') return false;

		const items = this.getFocusableItems(menu);
		const index = items.indexOf(item);
		const submenu = this.getSubmenu(item);

		switch (event.key) {
			case 'ArrowDown':
				if (index < 0 || items.length === 0) return false;
				event.preventDefault();
				items[(index + 1) % items.length]?.focus();
				return true;
			case 'ArrowUp':
				if (index < 0 || items.length === 0) return false;
				event.preventDefault();
				items[(index - 1 + items.length) % items.length]?.focus();
				return true;
			case 'Home':
				event.preventDefault();
				items[0]?.focus();
				return true;
			case 'End':
				event.preventDefault();
				items[items.length - 1]?.focus();
				return true;
			case 'ArrowRight':
				if (!submenu) return false;
				event.preventDefault();
				this.openSubmenu(item, true);
				return true;
			case 'ArrowLeft': {
				if (this.getRootMenu() === menu) return false;
				event.preventDefault();
				const trigger = this.getTriggerForMenu(menu);
				if (trigger) this.closeSubmenu(trigger, true);
				return true;
			}
			case 'Enter':
			case ' ':
				if (submenu) {
					event.preventDefault();
					this.openSubmenu(item, true);
					return true;
				}
				event.preventDefault();
				this.config.onActivate(item);
				return true;
			case 'Escape':
				event.preventDefault();
				this.config.onCloseRoot(true);
				return true;
			case 'Tab':
				this.config.onCloseRoot(false);
				return true;
			default:
				return false;
		}
	}

	handleClick(event: Event): boolean {
		const item = this.getDirectItem(event.target);
		if (!item || this.isDisabled(item)) return false;
		if (this.getSubmenu(item)) {
			event.preventDefault();
			this.closeSiblingBranches(item);
			this.openSubmenu(item, false);
			return true;
		}
		this.config.onActivate(item);
		return true;
	}

	closeAll(): void {
		for (const menu of Array.from(this.openMenus)) {
			const trigger = this.getTriggerForMenu(menu);
			if (trigger) this.closeSubmenu(trigger, false);
		}
		this.clearTimers();
	}

	getFocusableItems(menu: HTMLElement): HTMLElement[] {
		return this.getDirectItems(menu).filter((candidate) => !this.isDisabled(candidate));
	}

	destroy(): void {
		this.closeAll();
		for (const controller of this.popovers.values()) controller.destroy();
		this.popovers.clear();
	}

	private openSubmenu(item: HTMLElement, focusFirst: boolean): void {
		const submenu = this.getSubmenu(item);
		if (!submenu || this.isDisabled(item)) return;

		this.cancelOpenFor(item);
		this.cancelCloseFor(item);
		this.closeSiblingBranches(item);
		item.setAttribute('aria-expanded', 'true');
		submenu.hidden = false;
		this.openMenus.add(submenu);

		let popover = this.popovers.get(submenu);
		if (!popover) {
			popover = new PopoverController({
				getAnchor: () => item,
				getFloating: () => submenu,
				getOpen: () => item.getAttribute('aria-expanded') === 'true',
				getPlacement: () => 'right-start',
				gap: SUBMENU_GAP,
				portal: false,
			});
			this.popovers.set(submenu, popover);
		}
		popover.updateConfig({ getAnchor: () => item, getOpen: () => item.getAttribute('aria-expanded') === 'true' });
		popover.sync();

		if (focusFirst) {
			this.getFocusableItems(submenu)[0]?.focus();
		}
	}

	private closeSubmenu(item: HTMLElement, returnFocus: boolean): void {
		const submenu = this.getSubmenu(item);
		if (!submenu) return;
		for (const child of this.getDirectItems(submenu)) this.closeSubmenu(child, false);
		this.cancelOpenFor(item);
		this.cancelCloseFor(item);
		item.setAttribute('aria-expanded', 'false');
		submenu.hidden = true;
		this.openMenus.delete(submenu);
		this.popovers.get(submenu)?.teardown();
		if (returnFocus) item.focus();
	}

	private closeSiblingBranches(item: HTMLElement): void {
		const menu = item.parentElement;
		if (!menu) return;
		for (const sibling of this.getDirectItems(menu)) {
			if (sibling !== item && sibling.getAttribute('aria-expanded') === 'true') this.closeSubmenu(sibling, false);
		}
	}

	private scheduleClose(item: HTMLElement): void {
		this.cancelCloseFor(item);
		const timer = setTimeout(() => {
			this.closeTimers.delete(item);
			this.closeSubmenu(item, false);
		}, SUBMENU_CLOSE_DELAY);
		this.closeTimers.set(item, timer);
	}

	private getMenus(): HTMLElement[] {
		return Array.from(this.config.root.querySelectorAll<HTMLElement>('[role="menu"]'));
	}

	private getRootMenu(): HTMLElement | null {
		return this.config.getRootMenu();
	}

	private getDirectItems(menu: HTMLElement): HTMLElement[] {
		return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).filter(
			(item) => item.closest('[role="menu"]') === menu,
		);
	}

	private getDirectItem(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof HTMLElement)) return null;
		const item = target.closest<HTMLElement>('[role="menuitem"]');
		return item && item.closest('[role="menu"]') && this.config.root.contains(item) ? item : null;
	}

	private getSubmenu(item: HTMLElement): HTMLElement | null {
		const next = item.nextElementSibling;
		return next instanceof HTMLElement && next.getAttribute('role') === 'menu' ? next : null;
	}

	private getTriggerForMenu(menu: HTMLElement): HTMLElement | null {
		const previous = menu.previousElementSibling;
		return previous instanceof HTMLElement && previous.getAttribute('role') === 'menuitem' ? previous : null;
	}

	private isDisabled(item: HTMLElement): boolean {
		return item.getAttribute('aria-disabled') === 'true' || (item instanceof HTMLButtonElement && item.disabled);
	}

	private cancelOpenFor(item: HTMLElement): void {
		const timer = this.openTimers.get(item);
		if (timer) clearTimeout(timer);
		this.openTimers.delete(item);
	}

	private cancelCloseFor(item: HTMLElement): void {
		const timer = this.closeTimers.get(item);
		if (timer) clearTimeout(timer);
		this.closeTimers.delete(item);
	}

	private cancelAncestorCloseTimers(item: HTMLElement): void {
		let menu = item.closest<HTMLElement>('[role="menu"]');
		while (menu) {
			const trigger = this.getTriggerForMenu(menu);
			if (!trigger) return;
			this.cancelCloseFor(trigger);
			menu = trigger.closest<HTMLElement>('[role="menu"]');
		}
	}

	private clearTimers(): void {
		for (const timer of this.openTimers.values()) clearTimeout(timer);
		for (const timer of this.closeTimers.values()) clearTimeout(timer);
		this.openTimers.clear();
		this.closeTimers.clear();
	}
}
