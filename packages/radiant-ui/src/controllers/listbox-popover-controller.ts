import { bindController, type Controller, type ControllerHost } from './controller';
import type { DismissReason } from './dismiss-controller';
import { PopoverController } from './popover-controller';
import { wrapCollectionIndex } from './collection-index';
import { clearCollectionActive, getVisibleCollectionOptions, setCollectionActive } from './collection-navigation';

/** Which option becomes active when the popup opens. */
export type ListboxActivation = 'first' | 'last' | 'none';

/** The elements and state a `ListboxPopoverController` reads from the select or combobox that owns it. */
export type ListboxPopoverControllerConfig = {
	getAnchor: () => HTMLElement | null;
	getFloating: () => HTMLElement | null;
	getOpen: () => boolean;
	getOptions: () => HTMLElement[];
	getActiveDescendantHost: () => HTMLElement | null;
	getOptionIdPrefix: () => string;
	/** Called on a pointer press outside the anchor and popup, or focus leaving them. Escape stays with the owner's key handling. */
	onDismiss?: (reason: DismissReason, event: Event) => void;
};

/** The policy and callbacks `handleKeydown` applies for one key press. */
export type ListboxKeydownConfig = {
	isOpen: boolean;
	canUseSpace: boolean;
	closesOnTab: boolean;
	enterWhenClosed: 'open' | 'ignore';
	enterWithoutActive: 'close' | 'ignore';
	onOpen: (activation?: ListboxActivation) => void;
	onClose: (reason: 'arrow' | 'escape' | 'enter' | 'tab') => void;
	onSelectActive: () => void;
	onEscapeWhenClosed?: () => void;
};

/**
 * Shared state and interaction plumbing for listbox-backed popovers.
 *
 * @remarks Select and combobox intentionally keep their selection and filtering
 * policies local. This controller owns only the state machine both controls must
 * agree on: active-descendant navigation, popover positioning, and dismissal.
 * `syncPopoverPosition()` does nothing until `attach()`, and nothing after `destroy()`. A host built with
 * `createListboxPopoverController` attaches on every connect, so an element that is moved or reconnected positions
 * its popup again.
 */
export class ListboxPopoverController implements Controller {
	private readonly config: ListboxPopoverControllerConfig;
	private readonly popoverController: PopoverController;
	private activeIndex = -1;
	private visualFocus = false;

	constructor(config: ListboxPopoverControllerConfig) {
		this.config = config;
		this.popoverController = new PopoverController({
			getAnchor: config.getAnchor,
			getFloating: config.getFloating,
			getOpen: config.getOpen,
			getPlacement: () => 'bottom-start',
			gap: 4,
			portal: false,
			matchAnchorWidth: true,
			onDismiss: config.onDismiss,
			dismissOn: ['pointer', 'focus'],
		});
	}

	attach(): void {
		this.popoverController.attach();
	}

	get activeOptionIndex(): number {
		return this.activeIndex;
	}

	get hasVisualFocus(): boolean {
		return this.visualFocus;
	}

	ensureOptionIds(): void {
		this.config.getOptions().forEach((option, index) => {
			if (!option.id) {
				option.id = `${this.config.getOptionIdPrefix()}-${index}`;
			}
		});
	}

	getVisibleOptions(): HTMLElement[] {
		return getVisibleCollectionOptions(this.config.getOptions());
	}

	clearActiveOption(): void {
		this.activeIndex = -1;
		this.visualFocus = false;
		clearCollectionActive(this.config.getOptions(), this.config.getActiveDescendantHost());
	}

	setActiveOption(index: number): void {
		const visible = this.getVisibleOptions();
		if (index < 0 || index >= visible.length) {
			this.clearActiveOption();
			return;
		}

		this.activeIndex = index;
		this.visualFocus = true;
		setCollectionActive(
			this.config.getOptions(),
			visible,
			index,
			this.config.getActiveDescendantHost(),
			this.config.getOptionIdPrefix(),
		);
	}

	moveActive(direction: 1 | -1, onOpen: (activation: ListboxActivation) => void): void {
		const visible = this.getVisibleOptions();
		if (!visible.length) {
			return;
		}

		if (!this.config.getOpen()) {
			onOpen(direction === 1 ? 'first' : 'last');
			return;
		}

		if (this.visualFocus) {
			this.setActiveOption(wrapCollectionIndex(this.activeIndex, direction, visible.length));
			return;
		}

		this.setActiveOption(direction === 1 ? 0 : visible.length - 1);
	}

	/** Handles the APG keys shared by select-only and autocomplete listboxes. */
	handleKeydown(event: KeyboardEvent, options: ListboxKeydownConfig): void {
		if (event.ctrlKey || event.shiftKey || event.metaKey) return;
		const handler = this.keydownHandlers[event.key];
		handler?.call(this, event, options);
	}

	private readonly keydownHandlers: Record<string, (event: KeyboardEvent, options: ListboxKeydownConfig) => void> = {
		ArrowDown: this.handleArrowKey,
		ArrowUp: this.handleArrowKey,
		Escape: this.handleEscapeKey,
		Enter: this.handleActivationKey,
		' ': this.handleActivationKey,
		Tab: this.handleTabKey,
	};

	private handleArrowKey(event: KeyboardEvent, options: ListboxKeydownConfig): void {
		event.preventDefault();
		event.stopPropagation();
		const direction = event.key === 'ArrowDown' ? 1 : -1;
		if (event.altKey) {
			this.handleModifiedArrow(direction, options);
			return;
		}
		this.moveActive(direction, (activation) => options.onOpen(activation));
	}

	private handleModifiedArrow(direction: 1 | -1, options: ListboxKeydownConfig): void {
		if (direction === 1 && !options.isOpen) options.onOpen();
		if (direction === -1 && options.isOpen) options.onClose('arrow');
	}

	/**
	 * @remarks
	 * Escape stays in this key handler instead of `DismissController` because it runs only for keys pressed on the
	 * control, prevents the default even when the popup is closed, and lets the combobox clear its text through
	 * `onEscapeWhenClosed`. A document-wide Escape would also fire for focus elsewhere on the page.
	 */
	private handleEscapeKey(event: KeyboardEvent, options: ListboxKeydownConfig): void {
		event.preventDefault();
		if (options.isOpen) options.onClose('escape');
		else options.onEscapeWhenClosed?.();
	}

	private handleActivationKey(event: KeyboardEvent, options: ListboxKeydownConfig): void {
		if (event.key === ' ' && !options.canUseSpace) return;
		if (!options.isOpen && options.enterWhenClosed === 'open') {
			event.preventDefault();
			options.onOpen();
			return;
		}
		if (!options.isOpen) return;
		if (this.hasActiveOption()) {
			event.preventDefault();
			options.onSelectActive();
			return;
		}
		if (event.key === 'Enter' && options.enterWithoutActive === 'close') {
			event.preventDefault();
			options.onClose('enter');
		}
	}

	private handleTabKey(_event: KeyboardEvent, options: ListboxKeydownConfig): void {
		if (!options.isOpen) return;
		if (this.hasActiveOption() && options.closesOnTab) options.onSelectActive();
		else options.onClose('tab');
	}

	private hasActiveOption(): boolean {
		return this.visualFocus && Boolean(this.getVisibleOptions()[this.activeIndex]);
	}

	syncPopoverPosition(): void {
		this.popoverController.sync();
	}

	destroy(): void {
		this.popoverController.destroy();
	}
}

/**
 * Creates a `ListboxPopoverController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * private readonly listbox = createListboxPopoverController(this, {
 *   getAnchor: () => this.input,
 *   getFloating: () => this.popup,
 *   getOpen: () => this.open,
 *   getOptions: () => [...this.popup.querySelectorAll<HTMLElement>('[role="option"]')],
 *   getActiveDescendantHost: () => this.input,
 *   getOptionIdPrefix: () => 'pick',
 * });
 * ```
 */
export function createListboxPopoverController(
	host: ControllerHost,
	config: ListboxPopoverControllerConfig,
): ListboxPopoverController {
	return bindController(host, new ListboxPopoverController(config));
}
