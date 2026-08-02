import { attachFloating } from './floating-position';
import type { RuiPlacement } from './placement';
import { mountPortal, type PortalHandle } from './portal';

/** Whether `node` is inside the anchor or floating surface. */
export function popoverContains(
	anchor: HTMLElement | null,
	floating: HTMLElement | null,
	node: Node | null,
): boolean {
	if (!node) {
		return false;
	}
	return Boolean(anchor?.contains(node) || floating?.contains(node));
}

/** Whether focus left the popover interaction tree. */
export function shouldDismissPopoverFocus(
	anchor: HTMLElement | null,
	floating: HTMLElement | null,
	relatedTarget: EventTarget | null,
): boolean {
	if (!(relatedTarget instanceof Node)) {
		return true;
	}
	return !popoverContains(anchor, floating, relatedTarget);
}

/** Whether a pointer event target is outside the popover interaction tree. */
export function shouldDismissPopoverPointer(
	anchor: HTMLElement | null,
	floating: HTMLElement | null,
	target: Node | null,
): boolean {
	return !popoverContains(anchor, floating, target);
}

export type PopoverControllerConfig = {
	getAnchor: () => HTMLElement | null;
	getFloating: () => HTMLElement | null;
	getOpen: () => boolean;
	getPlacement: () => RuiPlacement;
	gap?: number;
	portal?: boolean;
	matchAnchorWidth?: boolean;
	portalContainer?: ParentNode;
};

/**
 * Headless popover lifecycle: portal mount, floating position, and teardown.
 */
export class PopoverController {
	private config: PopoverControllerConfig;
	private cleanupFloating: (() => void) | null = null;
	private portalHandle: PortalHandle | null = null;
	private floatingElement: HTMLElement | null = null;

	constructor(config: PopoverControllerConfig) {
		this.config = config;
	}

	updateConfig(patch: Partial<PopoverControllerConfig>): void {
		this.config = { ...this.config, ...patch };
	}

	sync(): void {
		const floating = this.resolveFloating();
		if (!floating) {
			return;
		}

		const open = this.config.getOpen();
		if (!open) {
			this.teardown();
			floating.hidden = true;
			return;
		}

		const anchor = this.config.getAnchor();
		if (!anchor) {
			return;
		}

		floating.hidden = false;

		const usePortal = this.config.portal !== false;
		if (usePortal) {
			if (!this.portalHandle) {
				this.portalHandle = mountPortal(floating, this.config.portalContainer ?? document.body);
			}
		} else if (this.portalHandle) {
			this.portalHandle.unmount();
			this.portalHandle = null;
		}

		this.teardownFloating();
		this.cleanupFloating = attachFloating({
			anchor,
			floating,
			getPlacement: this.config.getPlacement,
			gap: this.config.gap ?? 8,
			matchAnchorWidth: this.config.matchAnchorWidth,
		});
	}

	contains(node: Node | null): boolean {
		return popoverContains(this.config.getAnchor(), this.resolveFloating(), node);
	}

	getFloatingElement(): HTMLElement | null {
		return this.resolveFloating();
	}

	teardown(): void {
		this.teardownFloating();
		if (this.portalHandle) {
			this.portalHandle.unmount();
			this.portalHandle = null;
		}
	}

	destroy(): void {
		this.teardown();
		this.floatingElement = null;
	}

	private resolveFloating(): HTMLElement | null {
		const configuredFloating = this.config.getFloating();
		if (configuredFloating) {
			this.floatingElement = configuredFloating;
		}
		return configuredFloating ?? this.floatingElement;
	}

	private teardownFloating(): void {
		this.cleanupFloating?.();
		this.cleanupFloating = null;
	}
}
