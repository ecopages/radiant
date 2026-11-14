import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	CalendarPopoverController,
	createCalendarPopoverController,
	focusCalendarPickerDay,
} from './calendar-popover-controller';

describe('CalendarPopoverController on a plain element', () => {
	const observers: { disconnected: boolean }[] = [];

	class RecordingResizeObserver {
		record = { disconnected: false };
		constructor() {
			observers.push(this.record);
		}
		observe(): void {}
		unobserve(): void {}
		disconnect(): void {
			this.record.disconnected = true;
		}
	}

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		observers.length = 0;
	});

	function mount() {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		const listeners = new Set<() => void>();
		vi.spyOn(window, 'matchMedia').mockImplementation(
			() =>
				({
					matches: false,
					addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
					removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
				}) as unknown as MediaQueryList,
		);
		const host = document.createElement('div');
		const floating = document.createElement('div');
		host.append(floating);
		document.body.append(host);
		const onLayoutChange = vi.fn();
		const config = {
			getHost: () => host,
			getAnchor: () => host,
			getFloating: () => floating,
			getOpen: () => true,
			getCalendar: () => null,
			getFocusIso: () => undefined,
			getToggle: () => null,
			setOpenState: vi.fn(),
			onLayoutChange,
		};
		return { host, config, listeners, onLayoutChange };
	}

	it('listens for layout changes between attach and destroy and registers once', () => {
		const { host, config, listeners, onLayoutChange } = mount();
		const controller = new CalendarPopoverController(config);

		expect(listeners.size).toBe(0);

		controller.attach();
		controller.attach();
		expect(listeners.size).toBe(1);
		[...listeners][0]();
		expect(onLayoutChange).toHaveBeenCalledTimes(1);

		controller.destroy();
		controller.destroy();
		expect(listeners.size).toBe(0);

		controller.attach();
		expect(listeners.size).toBe(1);

		controller.destroy();
		host.remove();
	});

	it('releases the popover positioning on destroy', () => {
		const { host, config } = mount();
		const controller = new CalendarPopoverController(config);

		controller.attach();
		controller.syncPopover();
		expect(observers).toHaveLength(1);
		expect(observers[0].disconnected).toBe(false);

		controller.destroy();
		expect(observers[0].disconnected).toBe(true);

		host.remove();
	});

	it('mounts no positioning before attach or after destroy, also when a queued sync runs late', async () => {
		const { host, config } = mount();
		const controller = new CalendarPopoverController(config);

		controller.syncPopover();
		expect(observers).toHaveLength(0);

		controller.attach();
		controller.setOpen(true);
		controller.destroy();
		await Promise.resolve();

		expect(observers.every((record) => record.disconnected)).toBe(true);
		host.remove();
	});

	it('closes when focus leaves the host and the popup, unless suppressed or destroyed', async () => {
		const { host, config } = mount();
		const outside = document.createElement('button');
		const inside = document.createElement('button');
		host.append(inside);
		document.body.append(outside);
		const controller = new CalendarPopoverController(config);

		controller.attach();
		inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: host }));
		await Promise.resolve();
		expect(config.setOpenState).not.toHaveBeenCalled();

		inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
		await Promise.resolve();
		expect(config.setOpenState).toHaveBeenCalledWith(false);
		config.setOpenState.mockClear();

		controller.suppressDismiss();
		inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
		await Promise.resolve();
		expect(config.setOpenState).not.toHaveBeenCalled();

		controller.destroy();
		inside.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
		await Promise.resolve();
		expect(config.setOpenState).not.toHaveBeenCalled();

		host.remove();
		outside.remove();
	});

	it('closes on Escape from the host, returning focus to the toggle only from inside the popup', () => {
		const { host, config } = mount();
		const toggle = document.createElement('button');
		const inputInHost = document.createElement('input');
		const inPopup = document.createElement('button');
		const popup = config.getFloating() as HTMLElement;
		popup.append(inPopup);
		host.append(toggle, inputInHost);
		const outside = document.createElement('button');
		document.body.append(outside);
		const focusToggle = vi.spyOn(toggle, 'focus');
		const controller = new CalendarPopoverController({ ...config, getToggle: () => toggle });
		const escape = () => new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

		controller.attach();
		outside.dispatchEvent(escape());
		expect(config.setOpenState).not.toHaveBeenCalled();

		const fromInput = escape();
		inputInHost.dispatchEvent(fromInput);
		expect(config.setOpenState).toHaveBeenCalledWith(false);
		expect(fromInput.defaultPrevented).toBe(true);
		expect(focusToggle).not.toHaveBeenCalled();

		inPopup.dispatchEvent(escape());
		expect(focusToggle).toHaveBeenCalledTimes(1);

		controller.destroy();
		host.remove();
		outside.remove();
	});

	it('createCalendarPopoverController attaches on connect and destroys on cleanup', () => {
		const { host, config, listeners } = mount();
		const connected: (() => void)[] = [];
		const cleanup: (() => void)[] = [];
		createCalendarPopoverController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			config,
		);

		expect(listeners.size).toBe(0);
		connected.forEach((callback) => callback());
		expect(listeners.size).toBe(1);
		cleanup.forEach((callback) => callback());
		expect(listeners.size).toBe(0);

		host.remove();
	});
});

describe('focusCalendarPickerDay', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		document.body.replaceChildren();
	});

	it('finds the selected day even when the iso contains a quote', () => {
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => callback(0));
		const calendar = document.createElement('div');
		const day = document.createElement('button');
		day.setAttribute('data-calendar-day', '');
		day.setAttribute('data-iso', '2024-01-01');
		calendar.append(day);
		document.body.append(calendar);

		expect(() => focusCalendarPickerDay(calendar, '2024"]')).not.toThrow();
		expect(document.activeElement).toBe(day);
	});
});
