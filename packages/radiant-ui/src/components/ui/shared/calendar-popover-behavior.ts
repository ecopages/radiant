import { listenMobileLayoutViewport } from '@/lib/viewport/mobile-layout';
import { PopoverController, shouldDismissPopoverFocus } from './popover-controller';

export type CalendarPopoverBehaviorConfig = {
	getHost: () => HTMLElement;
	getAnchor: () => HTMLElement | null;
	getFloating: () => HTMLElement | null;
	getOpen: () => boolean;
	getCalendar: () => HTMLElement | null;
	getFocusIso: () => string | undefined;
	getToggle: () => HTMLElement | null;
	/** Writes the host's `open` state. */
	setOpenState: (next: boolean) => void;
	/** Called when the mobile layout viewport changes, before the open popover is repositioned. */
	onLayoutChange: () => void;
};

/**
 * Shared popover open state, positioning, dismissal and focus for calendar-backed date pickers.
 *
 * @remarks Date-field and date-range-picker keep value commit and selection mode local.
 */
export class CalendarPopoverBehavior {
	private readonly config: CalendarPopoverBehaviorConfig;
	private popoverController: PopoverController | null = null;
	private suppressPopoverDismiss = false;
	private disposeMobileLayoutListener: (() => void) | null = null;

	constructor(config: CalendarPopoverBehaviorConfig) {
		this.config = config;
	}

	/** Starts listening for mobile layout changes until `destroy()`; call it on every connection. */
	connect(): void {
		this.disposeMobileLayoutListener?.();
		this.disposeMobileLayoutListener = listenMobileLayoutViewport(() => {
			this.config.onLayoutChange();
			if (this.config.getOpen()) {
				this.syncPopover();
			}
		});
	}

	/**
	 * Opens or closes the popup and, on open, focuses the calendar day.
	 */
	setOpen(next: boolean): void {
		this.config.setOpenState(next);
		queueMicrotask(() => {
			this.syncPopover();
			if (next) {
				this.focusCalendarDay();
			}
		});
	}

	/**
	 * Closes the popup and returns focus to the toggle.
	 *
	 * @remarks
	 * Only for dismissals the user makes from inside the popup (Escape, day selection).
	 * Focus-out and outside-click call `setOpen(false)` directly so they never steal focus.
	 */
	closeAndRestoreFocus(): void {
		this.setOpen(false);
		this.config.getToggle()?.focus();
	}

	destroy(): void {
		this.disposeMobileLayoutListener?.();
		this.disposeMobileLayoutListener = null;
		this.popoverController?.destroy();
		this.popoverController = null;
	}

	suppressDismiss(): void {
		this.suppressPopoverDismiss = true;
	}

	syncPopover(): void {
		const popover = this.config.getFloating();
		if (!popover) {
			return;
		}

		popover.hidden = !this.config.getOpen();
		const controller = this.ensureController();
		controller.updateConfig({
			getOpen: () => this.config.getOpen(),
		});
		controller.sync();
	}

	focusCalendarDay(): void {
		focusCalendarPickerDay(this.config.getCalendar(), this.config.getFocusIso());
	}

	handleFocusOut(event: FocusEvent, onClose: () => void): void {
		const relatedTarget = event.relatedTarget;

		queueMicrotask(() => {
			if (this.suppressPopoverDismiss) {
				this.suppressPopoverDismiss = false;
				return;
			}

			if (!this.config.getOpen()) {
				return;
			}

			const popover = this.config.getFloating();
			if (!popover) {
				return;
			}

			const next = relatedTarget instanceof Node ? relatedTarget : document.activeElement;
			if (!shouldDismissPopoverFocus(this.config.getHost(), popover, next)) {
				return;
			}

			onClose();
		});
	}

	private ensureController(): PopoverController {
		if (!this.popoverController) {
			this.popoverController = new PopoverController({
				getAnchor: this.config.getAnchor,
				getFloating: this.config.getFloating,
				getOpen: this.config.getOpen,
				getPlacement: () => 'bottom-start',
				gap: 4,
				portal: false,
			});
		}

		return this.popoverController;
	}
}

/** Focus the calendar's selected day, or the roving tabindex day, or the first available day. */
export function focusCalendarPickerDay(calendar: HTMLElement | null, iso?: string): void {
	requestAnimationFrame(() => {
		if (!calendar) {
			return;
		}

		const selectedDay = iso
			? calendar.querySelector<HTMLButtonElement>(`[data-calendar-day][data-iso="${iso}"]:not(:disabled)`)
			: null;
		(
			selectedDay ??
			calendar.querySelector<HTMLButtonElement>(
				'[data-calendar-day][tabindex="0"]:not(:disabled), [data-calendar-day]:not(:disabled)',
			)
		)?.focus();
	});
}
