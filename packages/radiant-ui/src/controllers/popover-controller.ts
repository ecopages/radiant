import { bindController, type Controller, type ControllerHost } from './controller';
import { DismissController, type DismissReason } from './dismiss-controller';
import { attachFloating } from './floating-position';
import type { RuiPlacement } from './placement';
import { mountPortal, type PortalHandle } from './portal';

export type PopoverControllerConfig = {
	getAnchor: () => HTMLElement | null;
	getFloating: () => HTMLElement | null;
	getOpen: () => boolean;
	getPlacement: () => RuiPlacement;
	gap?: number;
	portal?: boolean;
	matchAnchorWidth?: boolean;
	portalContainer?: ParentNode;
	/**
	 * Called when the user dismisses the open popover. Dismissal listens only when this is set, and only while
	 * `getOpen()` is true.
	 */
	onDismiss?: (reason: DismissReason, event: Event) => void;
	/** Which dismissals `onDismiss` hears about. Defaults to all of them. Read once, when the controller is created. */
	dismissOn?: readonly DismissReason[];
};

/**
 * Headless popover lifecycle: portal mount, floating position, dismissal, and teardown.
 *
 * @remarks
 * `sync()` does nothing until `attach()`, and nothing after `destroy()`, so an element that is not connected never
 * mounts a portal or registers floating listeners. `destroy()` removes the floating listeners and observer, returns
 * a portaled surface to its place and forgets the floating element. Dismissal is delegated to a
 * `DismissController` over the anchor and the floating surface, attached with the popover. Its listeners sit on
 * `document`, so a surface portaled out of the host element still counts as inside: focus moving within it does
 * not dismiss, and focus leaving it does.
 */
export class PopoverController implements Controller {
	private attached = false;
	private config: PopoverControllerConfig;
	private cleanupFloating: (() => void) | null = null;
	private portalHandle: PortalHandle | null = null;
	private floatingElement: HTMLElement | null = null;
	private exitToken: object | null = null;
	private readonly dismissal: DismissController;

	constructor(config: PopoverControllerConfig) {
		this.config = config;
		this.dismissal = new DismissController({
			getSurface: () => this.resolveFloating(),
			getRelated: () => [this.config.getAnchor()],
			getOpen: () => this.config.getOpen(),
			onDismiss: (reason, event) => this.config.onDismiss?.(reason, event),
			triggers: config.dismissOn,
		});
	}

	updateConfig(patch: Partial<PopoverControllerConfig>): void {
		this.config = { ...this.config, ...patch };
	}

	attach(): void {
		this.attached = true;
		if (this.config.onDismiss) {
			this.dismissal.attach();
		}
	}

	sync(): void {
		if (!this.attached) {
			return;
		}
		const floating = this.resolveFloating();
		if (!floating) {
			return;
		}

		const open = this.config.getOpen();
		if (!open) {
			this.teardownFloating();
			floating.toggleAttribute('hidden', true);
			this.releasePortalAfterExit(floating);
			return;
		}

		this.exitToken = null;

		const anchor = this.config.getAnchor();
		if (!anchor) {
			return;
		}

		floating.toggleAttribute('hidden', false);

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
		return this.dismissal.contains(node);
	}

	/** Whether `target` is not a node, or is outside the anchor and floating surface. */
	isOutside(target: EventTarget | null): boolean {
		return this.dismissal.isOutside(target);
	}

	getFloatingElement(): HTMLElement | null {
		return this.resolveFloating();
	}

	teardown(): void {
		this.exitToken = null;
		this.teardownFloating();
		if (this.portalHandle) {
			this.portalHandle.unmount();
			this.portalHandle = null;
		}
	}

	destroy(): void {
		this.attached = false;
		this.dismissal.destroy();
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

	/**
	 * Keeps the portaled surface in `document.body` until its exit transition ends.
	 *
	 * @remarks Moving a node back to its placeholder detaches it, which drops the running transition and skips the
	 * exit. Without animations (reduced motion, classic themes, non-browser DOMs) the unmount stays synchronous.
	 */
	private releasePortalAfterExit(floating: HTMLElement): void {
		if (!this.portalHandle) {
			return;
		}
		const animations = typeof floating.getAnimations === 'function' ? floating.getAnimations() : [];
		if (animations.length === 0) {
			this.teardown();
			return;
		}
		const token = {};
		this.exitToken = token;
		void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
			if (this.exitToken === token) {
				this.teardown();
			}
		});
	}

	private teardownFloating(): void {
		this.cleanupFloating?.();
		this.cleanupFloating = null;
	}
}

/**
 * Creates a `PopoverController` that attaches when `host` connects and is destroyed when it disconnects.
 */
export function createPopoverController(host: ControllerHost, config: PopoverControllerConfig): PopoverController {
	return bindController(host, new PopoverController(config));
}
