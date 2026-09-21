import { PopoverController, shouldDismissPopoverFocus } from './popover-controller';

export type CalendarPopoverBehaviorConfig = {
	getHost: () => HTMLElement;
	getAnchor: () => HTMLElement | null;
	getFloating: () => HTMLElement | null;
	getOpen: () => boolean;
	getCalendar: () => HTMLElement | null;
	getFocusIso: () => string | undefined;
};

/**
 * Shared popover positioning and dismissal for calendar-backed date pickers.
 *
 * @remarks Date-field and date-range-picker keep value commit and selection mode local.
 */
export class CalendarPopoverBehavior {
	private readonly config: CalendarPopoverBehaviorConfig;
	private popoverController: PopoverController | null = null;
	private suppressPopoverDismiss = false;

	constructor(config: CalendarPopoverBehaviorConfig) {
		this.config = config;
	}

	destroy(): void {
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
