import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { ControllerHost } from './controller';
import { FocusTrapController, createFocusTrapController } from './focus-trap-controller';

describe('FocusTrapController', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function setup() {
		const outside = document.createElement('button');
		const surface = document.createElement('div');
		surface.tabIndex = -1;
		const first = document.createElement('button');
		const middle = document.createElement('button');
		const last = document.createElement('button');
		surface.append(first, middle, last);
		const after = document.createElement('button');
		document.body.append(outside, surface, after);
		return { outside, surface, first, middle, last, after };
	}

	const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

	it('takes focus on the first focusable on attach, and gives it back on destroy', async () => {
		const { outside, first, surface } = setup();
		outside.focus();
		const trap = new FocusTrapController({ getSurface: () => surface });

		trap.attach();
		await flush();
		expect(document.activeElement).toBe(first);

		trap.destroy();
		expect(document.activeElement).toBe(outside);
	});

	it('focuses the surface when it holds nothing focusable', async () => {
		const surface = document.createElement('div');
		surface.tabIndex = -1;
		document.body.append(surface);
		const trap = new FocusTrapController({ getSurface: () => surface });

		trap.attach();
		await flush();

		expect(document.activeElement).toBe(surface);
	});

	it('wraps Tab from the last focusable to the first, and Shift+Tab the other way', async () => {
		const { surface, first, last } = setup();
		const trap = new FocusTrapController({ getSurface: () => surface });
		trap.attach();
		await flush();

		last.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(first);

		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(last);
	});

	it('leaves Tab between two focusables to the browser', async () => {
		const { surface, first, middle } = setup();
		const trap = new FocusTrapController({ getSurface: () => surface });
		trap.attach();
		await flush();

		first.focus();
		await userEvent.tab();

		expect(document.activeElement).toBe(middle);
	});

	it('keeps focus on the surface when nothing inside can take it', async () => {
		const { surface, first, middle, last } = setup();
		[first, middle, last].forEach((button) => button.setAttribute('disabled', ''));
		const trap = new FocusTrapController({ getSurface: () => surface });
		trap.attach();
		await flush();

		await userEvent.tab();

		expect(document.activeElement).toBe(surface);
	});

	it('ignores Tab while focus is in another surface, such as a second open modal', async () => {
		const { surface, first, middle } = setup();
		const empty = document.createElement('div');
		empty.tabIndex = -1;
		document.body.append(empty);
		const trap = new FocusTrapController({ getSurface: () => empty });
		const other = new FocusTrapController({ getSurface: () => surface });
		trap.attach();
		other.attach();
		await flush();

		first.focus();
		await userEvent.tab();

		expect(document.activeElement).toBe(middle);
	});

	it('loops over what getFocusable returns', async () => {
		const { surface, first, middle, last } = setup();
		const trap = new FocusTrapController({ getSurface: () => surface, getFocusable: () => [middle, last] });
		trap.attach();
		await flush();
		expect(document.activeElement).toBe(middle);

		last.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(middle);

		first.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(middle);
	});

	it('pulls focus that is inside the surface but outside the loop into it only when strict', async () => {
		const { surface, first, middle, last } = setup();
		let strict = false;
		const trap = new FocusTrapController({
			getSurface: () => surface,
			getFocusable: () => [middle, last],
			getStrict: () => strict,
		});
		trap.attach();
		await flush();

		first.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(middle);

		strict = true;
		first.focus();
		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(last);
	});

	it('stops trapping and does not refocus after destroy, and destroys twice safely', async () => {
		const { outside, surface, last, after } = setup();
		const trap = new FocusTrapController({ getSurface: () => surface });
		trap.attach();
		await flush();

		trap.destroy();
		trap.destroy();
		last.focus();
		await userEvent.tab();

		expect(document.activeElement).toBe(after);
		expect(document.activeElement).not.toBe(outside);
	});

	it('does not take focus when destroyed before the microtask runs', async () => {
		const { outside, surface } = setup();
		outside.focus();
		const trap = new FocusTrapController({ getSurface: () => surface });

		trap.attach();
		trap.destroy();
		await flush();

		expect(document.activeElement).toBe(outside);
	});

	it('is idempotent on attach and traps again after a destroy', async () => {
		const { outside, surface, first, last } = setup();
		outside.focus();
		const trap = new FocusTrapController({ getSurface: () => surface });
		trap.attach();
		trap.attach();
		await flush();
		trap.destroy();
		expect(document.activeElement).toBe(outside);

		trap.attach();
		await flush();
		last.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(first);
	});

	it('is bound to a host through createFocusTrapController', async () => {
		const { surface, first, outside } = setup();
		outside.focus();
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};

		expect(createFocusTrapController(host, { getSurface: () => surface })).toBeInstanceOf(FocusTrapController);
		connected.forEach((callback) => callback());
		await flush();
		expect(document.activeElement).toBe(first);

		cleanup.forEach((callback) => callback());
		expect(document.activeElement).toBe(outside);
	});
});
