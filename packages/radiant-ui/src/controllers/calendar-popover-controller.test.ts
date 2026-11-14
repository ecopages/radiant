import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalendarPopoverController, createCalendarPopoverController } from './calendar-popover-controller';

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
