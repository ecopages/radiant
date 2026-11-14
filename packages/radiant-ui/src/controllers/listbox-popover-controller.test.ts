import { afterEach, describe, expect, it, vi } from 'vitest';
import { ListboxPopoverController, createListboxPopoverController } from './listbox-popover-controller';

function createOption(id: string, label: string, hidden = false): HTMLElement {
	const option = document.createElement('div');
	option.setAttribute('role', 'option');
	option.id = id;
	option.textContent = label;
	option.hidden = hidden;
	return option;
}

function createBehavior(options: HTMLElement[] = []) {
	const anchor = document.createElement('div');
	const floating = document.createElement('div');
	const activeHost = document.createElement('button');
	let open = false;

	const behavior = new ListboxPopoverController({
		getAnchor: () => anchor,
		getFloating: () => floating,
		getOpen: () => open,
		getOptions: () => options,
		getActiveDescendantHost: () => activeHost,
		getOptionIdPrefix: () => 'rui-test-option',
	});

	return { anchor, floating, activeHost, behavior, setOpen: (next: boolean) => (open = next) };
}

describe('ListboxPopoverController', () => {
	it('ensures option ids and tracks active-descendant navigation', () => {
		const options = [createOption('', 'One'), createOption('', 'Two')];
		const { behavior, activeHost, setOpen } = createBehavior(options);
		setOpen(true);

		behavior.ensureOptionIds();
		behavior.setActiveOption(1);

		expect(options[1].id).toBe('rui-test-option-1');
		expect(options[1].getAttribute('data-active')).toBe('true');
		expect(activeHost.getAttribute('aria-activedescendant')).toBe('rui-test-option-1');
		expect(behavior.activeOptionIndex).toBe(1);
		expect(behavior.hasVisualFocus).toBe(true);
	});

	it('opens on first arrow press when closed', () => {
		const options = [createOption('a', 'One'), createOption('b', 'Two')];
		const { behavior, setOpen } = createBehavior(options);
		const onOpen = vi.fn();

		behavior.moveActive(1, onOpen);

		expect(onOpen).toHaveBeenCalledWith('first');
		expect(setOpen).toBeDefined();
	});

	it('wraps active option movement when open', () => {
		const options = [createOption('a', 'One'), createOption('b', 'Two')];
		const { behavior, setOpen } = createBehavior(options);
		setOpen(true);

		behavior.setActiveOption(1);
		behavior.moveActive(1, vi.fn());

		expect(behavior.activeOptionIndex).toBe(0);
	});

	it('handles shared keyboard interactions through callbacks', () => {
		const options = [createOption('a', 'One')];
		const { behavior, setOpen } = createBehavior(options);
		setOpen(true);
		behavior.setActiveOption(0);

		const onSelectActive = vi.fn();
		const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
		const preventDefault = vi.spyOn(event, 'preventDefault');

		behavior.handleKeydown(event, {
			isOpen: true,
			canUseSpace: true,
			closesOnTab: false,
			enterWhenClosed: 'open',
			enterWithoutActive: 'ignore',
			onOpen: vi.fn(),
			onClose: vi.fn(),
			onSelectActive,
		});

		expect(preventDefault).toHaveBeenCalled();
		expect(onSelectActive).toHaveBeenCalled();
	});

	it('dismisses focus and pointer interactions outside the popover tree', () => {
		const { anchor, floating, behavior } = createBehavior();
		const inside = document.createElement('button');
		floating.append(inside);
		document.body.append(anchor, floating);

		expect(behavior.shouldDismissFocus(inside)).toBe(false);
		expect(behavior.shouldDismissPointer(inside)).toBe(false);
		expect(behavior.shouldDismissFocus(document.body)).toBe(true);
		expect(behavior.shouldDismissPointer(document.body)).toBe(true);

		anchor.remove();
		floating.remove();
	});
});

describe('ListboxPopoverController lifecycle on a plain element', () => {
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
		observers.length = 0;
	});

	function mountOpen() {
		vi.stubGlobal('ResizeObserver', RecordingResizeObserver);
		const anchor = document.createElement('button');
		const floating = document.createElement('div');
		document.body.append(anchor, floating);
		const config = {
			getAnchor: () => anchor,
			getFloating: () => floating,
			getOpen: () => true,
			getOptions: () => [] as HTMLElement[],
			getActiveDescendantHost: () => anchor,
			getOptionIdPrefix: () => 'rui-test-option',
		};
		return { anchor, floating, config };
	}

	it('stays inert until attach, then positions, and releases everything on destroy', () => {
		const { anchor, floating, config } = mountOpen();
		const controller = new ListboxPopoverController(config);

		controller.syncPopoverPosition();
		expect(observers).toHaveLength(0);

		controller.attach();
		controller.attach();
		controller.syncPopoverPosition();
		expect(observers).toHaveLength(1);
		expect(observers[0].disconnected).toBe(false);

		controller.destroy();
		controller.destroy();
		expect(observers[0].disconnected).toBe(true);

		controller.syncPopoverPosition();
		expect(observers).toHaveLength(1);

		anchor.remove();
		floating.remove();
	});

	it('positions again after destroy and attach', () => {
		const { anchor, floating, config } = mountOpen();
		const controller = new ListboxPopoverController(config);

		controller.attach();
		controller.destroy();
		controller.attach();
		controller.syncPopoverPosition();

		expect(observers).toHaveLength(1);
		expect(observers[0].disconnected).toBe(false);

		controller.destroy();
		anchor.remove();
		floating.remove();
	});

	it('createListboxPopoverController attaches on connect and destroys on cleanup', () => {
		const { anchor, floating, config } = mountOpen();
		const connected: (() => void)[] = [];
		const cleanup: (() => void)[] = [];
		const controller = createListboxPopoverController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			config,
		);

		controller.syncPopoverPosition();
		expect(observers).toHaveLength(0);

		connected.forEach((callback) => callback());
		controller.syncPopoverPosition();
		expect(observers[0].disconnected).toBe(false);

		cleanup.forEach((callback) => callback());
		expect(observers[0].disconnected).toBe(true);

		anchor.remove();
		floating.remove();
	});
});
