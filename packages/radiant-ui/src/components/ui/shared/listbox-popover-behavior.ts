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
		if (event.ctrlKey || event.shiftKey || event.metaKey) {
			return;
		}

		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			const direction = event.key === 'ArrowDown' ? 1 : -1;

			if (event.altKey) {
				if (direction === 1 && !options.isOpen) {
					options.onOpen();
				} else if (direction === -1 && options.isOpen) {
					options.onClose('arrow');
				}
				return;
			}

			this.moveActive(direction, (activation) => options.onOpen(activation));
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			if (options.isOpen) {
				options.onClose('escape');
			} else {
				options.onEscapeWhenClosed?.();
			}
			return;
		}

		if (event.key === 'Enter' || (event.key === ' ' && options.canUseSpace)) {
			if (!options.isOpen && options.enterWhenClosed === 'open') {
				event.preventDefault();
				options.onOpen();
				return;
			}

			const visible = this.getVisibleOptions();
			if (options.isOpen && this.visualFocus && visible[this.activeIndex]) {
				event.preventDefault();
				options.onSelectActive();
			} else if (event.key === 'Enter' && options.isOpen && options.enterWithoutActive === 'close') {
				event.preventDefault();
				options.onClose('enter');
			}
			return;
		}

		if (event.key === 'Tab' && options.isOpen) {
			const visible = this.getVisibleOptions();
			if (this.visualFocus && visible[this.activeIndex] && options.closesOnTab) {
				options.onSelectActive();
				return;
			}
			options.onClose('tab');
		}
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
