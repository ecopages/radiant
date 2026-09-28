import { PopoverController, shouldDismissPopoverFocus, shouldDismissPopoverPointer } from './popover-controller';
import {
	clearCollectionActive,
	getVisibleCollectionOptions,
	setCollectionActive,
	wrapCollectionIndex,
} from './collection-navigation';

export type ListboxActivation = 'first' | 'last' | 'none';

export type ListboxPopoverBehaviorConfig = {
	getAnchor: () => HTMLElement | null;
	getFloating: () => HTMLElement | null;
	getOpen: () => boolean;
	getOptions: () => HTMLElement[];
	getActiveDescendantHost: () => HTMLElement | null;
	getOptionIdPrefix: () => string;
};

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
 * policies local. This behavior owns only the state machine both controls must
 * agree on: active-descendant navigation, popover positioning, and dismissal.
 */
export class ListboxPopoverBehavior {
	private readonly config: ListboxPopoverBehaviorConfig;
	private readonly popoverController: PopoverController;
	private activeIndex = -1;
	private visualFocus = false;

	constructor(config: ListboxPopoverBehaviorConfig) {
		this.config = config;
		this.popoverController = new PopoverController({
			getAnchor: config.getAnchor,
			getFloating: config.getFloating,
			getOpen: config.getOpen,
			getPlacement: () => 'bottom-start',
			gap: 4,
			portal: false,
			matchAnchorWidth: true,
		});
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

	shouldDismissFocus(relatedTarget: EventTarget | null): boolean {
		return shouldDismissPopoverFocus(
			this.config.getAnchor(),
			this.popoverController.getFloatingElement(),
			relatedTarget,
		);
	}

	shouldDismissPointer(target: Node | null): boolean {
		return shouldDismissPopoverPointer(
			this.config.getAnchor(),
			this.popoverController.getFloatingElement(),
			target,
		);
	}

	destroy(): void {
		this.popoverController.destroy();
	}
}
