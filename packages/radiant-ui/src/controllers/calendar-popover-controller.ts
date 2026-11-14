import { MOBILE_LAYOUT_MAX_WIDTH_PX } from '@/lib/viewport/mobile-layout';
import { bindController, type Controller, type ControllerHost } from './controller';
import { DismissController, type DismissReason } from './dismiss-controller';
import { EventListenerController } from './event-listener-controller';
import { PopoverController } from './popover-controller';

/** The getters and callbacks `CalendarPopoverController` reads from the date picker that owns it. */
export type CalendarPopoverControllerConfig = {
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
 * @remarks
 * Date-field and date-range-picker keep value commit and selection mode local. Focus leaving the host and the popup
 * closes it, judged after focus settles; `suppressDismiss()` skips the next such close. Escape from inside the host or
 * popup closes it, and from inside the popup also returns focus to the toggle.
 */
export class CalendarPopoverController implements Controller {
	private readonly config: CalendarPopoverControllerConfig;
	private readonly popoverController: PopoverController;
	private readonly mobileLayout: EventListenerController<MediaQueryList, 'change'>;
	private readonly dismissal: DismissController;

	constructor(config: CalendarPopoverControllerConfig) {
		this.config = config;
		this.popoverController = new PopoverController({
			getAnchor: config.getAnchor,
			getFloating: config.getFloating,
			getOpen: config.getOpen,
			getPlacement: () => 'bottom-start',
			gap: 4,
			portal: false,
		});
		this.mobileLayout = new EventListenerController({
			getTarget: () => window.matchMedia(`(max-width: ${MOBILE_LAYOUT_MAX_WIDTH_PX}px)`),
			type: 'change',
			listener: () => {
				this.config.onLayoutChange();
				if (this.config.getOpen()) {
					this.syncPopover();
				}
			},
		});
		this.dismissal = new DismissController({
			getSurface: () => this.config.getFloating(),
			getRelated: () => [this.config.getHost()],
			getOpen: () => this.config.getOpen(),
			onDismiss: (reason, event) => this.onDismiss(reason, event),
			triggers: ['focus', 'escape'],
			settleFocus: true,
			escapeScope: 'tree',
		});
	}

	/** Starts listening for mobile layout changes until `destroy()`. */
	attach(): void {
		this.dismissal.attach();
		this.popoverController.attach();
		this.mobileLayout.attach();
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
		this.dismissal.destroy();
		this.mobileLayout.destroy();
		this.popoverController.destroy();
	}

	/** Ignores the next focus-out, for a press on the toggle, whose focus change must not close the popup. */
	suppressDismiss(): void {
		this.dismissal.suppressFocus();
	}

	syncPopover(): void {
		const popover = this.config.getFloating();
		if (!popover) {
			return;
		}

		popover.hidden = !this.config.getOpen();
		this.popoverController.sync();
	}

	focusCalendarDay(): void {
		focusCalendarPickerDay(this.config.getCalendar(), this.config.getFocusIso());
	}

	private onDismiss(reason: DismissReason, event: Event): void {
		if (reason !== 'escape') {
			this.setOpen(false);
			return;
		}
		event.preventDefault();
		if (event.target instanceof Node && this.config.getFloating()?.contains(event.target)) {
			this.closeAndRestoreFocus();
		} else {
			this.setOpen(false);
		}
	}
}

/**
 * Creates a `CalendarPopoverController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * class DatePicker extends RadiantElement {
 *   private readonly picker = createCalendarPopoverController(this, {
 *     getHost: () => this,
 *     getAnchor: () => this.field,
 *     getFloating: () => this.popup,
 *     getOpen: () => this.open,
 *     getCalendar: () => this.popup,
 *     getFocusIso: () => this.value,
 *     getToggle: () => this.toggle,
 *     setOpenState: (next) => (this.open = next),
 *     onLayoutChange: () => {},
 *   });
 * }
 * ```
 */
export function createCalendarPopoverController(
	host: ControllerHost,
	config: CalendarPopoverControllerConfig,
): CalendarPopoverController {
	return bindController(host, new CalendarPopoverController(config));
}

/** Focus the calendar's selected day, or the roving tabindex day, or the first available day. */
export function focusCalendarPickerDay(calendar: HTMLElement | null, iso?: string): void {
	requestAnimationFrame(() => {
		if (!calendar) {
			return;
		}

		const selectedDay = iso
			? calendar.querySelector<HTMLButtonElement>(
					`[data-calendar-day][data-iso="${CSS.escape(iso)}"]:not(:disabled)`,
				)
			: null;
		(
			selectedDay ??
			calendar.querySelector<HTMLButtonElement>(
				'[data-calendar-day][tabindex="0"]:not(:disabled), [data-calendar-day]:not(:disabled)',
			)
		)?.focus();
	});
}
