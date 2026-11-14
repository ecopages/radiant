import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	SORTABLE_ACTIVE_ATTRIBUTE,
	SORTABLE_DROP_ATTRIBUTE,
	SORTABLE_STATE_ATTRIBUTE,
	SortableController,
	createSortableController,
	type SortableChange,
	type SortableControllerConfig,
} from './sortable-controller';

describe('SortableController on a plain list', () => {
	afterEach(() => {
		document.body.replaceChildren();
		vi.useRealTimers();
	});

	function mount(config: Partial<SortableControllerConfig> = {}, labels = ['Alpha', 'Beta', 'Gamma', 'Delta']) {
		const list = document.createElement('ul');
		list.style.cssText = 'position:fixed;left:0;top:0;margin:0;padding:0;list-style:none;width:100px';
		for (const label of labels) {
			const item = document.createElement('li');
			item.tabIndex = 0;
			item.style.cssText = 'height:20px;margin:0';
			item.textContent = label;
			list.append(item);
		}
		document.body.append(list);
		const items = () => [...list.children] as HTMLElement[];
		const onChange = vi.fn<(change: SortableChange) => boolean | void>();
		const announce = vi.fn<(message: string) => void>();
		const controller = new SortableController({
			getContainer: () => list,
			getItems: items,
			announce,
			onChange,
			...config,
		});
		return { list, items, onChange, announce, controller };
	}

	const pointer = (target: EventTarget, type: string, y: number, id = 1) =>
		target.dispatchEvent(
			new PointerEvent(type, { bubbles: true, pointerId: id, button: 0, clientX: 10, clientY: y }),
		);

	const press = (target: EventTarget, key: string) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

	it('is inert until attached', () => {
		const { items, onChange, controller } = mount();

		pointer(items()[0], 'pointerdown', 10);
		pointer(document, 'pointermove', 70);
		pointer(document, 'pointerup', 70);
		press(items()[0], ' ');

		expect(onChange).not.toHaveBeenCalled();
		expect(controller.getState()).toBeNull();
		expect(items()[0].hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
	});

	describe('pointer', () => {
		it('lifts after the threshold, marks the landing place and reports from and to on release', () => {
			const { list, items, onChange, controller } = mount();
			controller.attach();
			const [first, , third] = items();

			pointer(first, 'pointerdown', 10);
			pointer(document, 'pointermove', 12);
			expect(first.hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);

			pointer(document, 'pointermove', 55);
			expect(first.getAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe('lifted');
			expect(list.hasAttribute(SORTABLE_ACTIVE_ATTRIBUTE)).toBe(true);
			expect(first.style.getPropertyValue('--sortable-dy')).toBe('45px');
			expect(third.getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('after');
			expect(controller.getState()).toMatchObject({ item: first, from: 0, to: 2, source: 'pointer' });

			pointer(document, 'pointerup', 55);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith({
				item: first,
				from: 0,
				to: 2,
				source: 'pointer',
				fromContainer: list,
				toContainer: list,
			});
			expect(first.hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
			expect(third.hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(list.hasAttribute(SORTABLE_ACTIVE_ATTRIBUTE)).toBe(false);
			expect(first.style.getPropertyValue('--sortable-dy')).toBe('');
			expect(controller.getState()).toBeNull();
		});

		it('marks the target before itself when moving up', () => {
			const { list, items, onChange, controller } = mount();
			controller.attach();
			const [, second, , fourth] = items();

			pointer(fourth, 'pointerdown', 70);
			pointer(document, 'pointermove', 25);

			expect(second.getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('before');
			pointer(document, 'pointerup', 25);
			expect(onChange).toHaveBeenCalledWith({
				item: fourth,
				from: 3,
				to: 1,
				source: 'pointer',
				fromContainer: list,
				toContainer: list,
			});
		});

		it('treats a press that stays under the threshold as a click, not a sort', () => {
			const { items, onChange, announce, controller } = mount();
			controller.attach();

			pointer(items()[1], 'pointerdown', 30);
			pointer(document, 'pointermove', 32);
			pointer(document, 'pointerup', 32);

			expect(onChange).not.toHaveBeenCalled();
			expect(announce).not.toHaveBeenCalled();
		});

		it('does not call onChange when the item is dropped where it started', () => {
			const { items, onChange, announce, controller } = mount();
			controller.attach();

			pointer(items()[1], 'pointerdown', 30);
			pointer(document, 'pointermove', 60);
			pointer(document, 'pointermove', 30);
			pointer(document, 'pointerup', 30);

			expect(onChange).not.toHaveBeenCalled();
			expect(announce).toHaveBeenLastCalledWith('Dropped Beta, position 2 of 4.');
		});

		it('cancels without a change when the browser takes the pointer', () => {
			const { items, onChange, announce, controller } = mount();
			controller.attach();

			pointer(items()[0], 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			pointer(document, 'pointercancel', 55);

			expect(onChange).not.toHaveBeenCalled();
			expect(items()[0].hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
			expect(announce).toHaveBeenLastCalledWith('Cancelled. Alpha returned to position 1 of 4.');
		});

		it('only lifts from the handle when one is configured', () => {
			const { items, onChange, controller } = mount({ getHandle: (item) => item.querySelector('i') });
			for (const item of items()) {
				item.append(document.createElement('i'));
			}
			controller.attach();

			pointer(items()[0], 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			pointer(document, 'pointerup', 55);
			expect(onChange).not.toHaveBeenCalled();

			pointer(items()[0].querySelector('i')!, 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			pointer(document, 'pointerup', 55);
			expect(onChange).toHaveBeenCalledTimes(1);
		});

		it('ignores presses when enabled returns false', () => {
			const { items, onChange, controller } = mount({ enabled: () => false });
			controller.attach();

			pointer(items()[0], 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			pointer(document, 'pointerup', 55);

			expect(onChange).not.toHaveBeenCalled();
		});

		it('swallows the click that follows a drag and lets a later click through', async () => {
			const { list, items, controller } = mount();
			controller.attach();
			const seen = vi.fn();
			list.addEventListener('click', seen);

			pointer(items()[0], 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			pointer(document, 'pointerup', 55);
			items()[0].click();
			expect(seen).not.toHaveBeenCalled();

			await new Promise((resolve) => setTimeout(resolve, 5));
			items()[0].click();
			expect(seen).toHaveBeenCalledTimes(1);
		});

		it('treats a false return from onChange as a cancel', () => {
			const { items, announce, onChange, controller } = mount();
			onChange.mockReturnValue(false);
			controller.attach();

			pointer(items()[0], 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			pointer(document, 'pointerup', 55);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(announce).toHaveBeenLastCalledWith('Cancelled. Alpha returned to position 1 of 4.');
		});
	});

	describe('keyboard', () => {
		it('lifts with Space, moves with arrows, drops with Space and reports the change', () => {
			const { list, items, onChange, controller } = mount();
			controller.attach();
			const [first, , third] = items();

			const lift = press(first, ' ');
			expect(lift).toBe(false);
			expect(first.getAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe('lifted');

			press(first, 'ArrowDown');
			press(first, 'ArrowDown');
			expect(third.getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('after');
			expect(controller.getState()).toMatchObject({ from: 0, to: 2, source: 'keyboard' });

			press(first, ' ');

			expect(onChange).toHaveBeenCalledWith({
				item: first,
				from: 0,
				to: 2,
				source: 'keyboard',
				fromContainer: list,
				toContainer: list,
			});
			expect(first.hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
			expect(third.hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
		});

		it('lifts with Enter, jumps with End and drops with Enter', () => {
			const { items, onChange, controller } = mount();
			controller.attach();

			press(items()[1], 'Enter');
			press(items()[1], 'End');
			press(items()[1], 'Enter');

			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 1, to: 3 }));
		});

		it('cancels on Escape, stops it from reaching an enclosing dismissal and reports nothing', () => {
			const { items, onChange, announce, controller } = mount();
			controller.attach();
			const escape = vi.fn();
			document.addEventListener('keydown', escape);

			press(items()[0], ' ');
			press(items()[0], 'ArrowDown');
			press(items()[0], 'Escape');
			document.removeEventListener('keydown', escape);

			expect(onChange).not.toHaveBeenCalled();
			expect(items()[0].hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
			expect(items()[1].hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(announce).toHaveBeenLastCalledWith('Cancelled. Alpha returned to position 1 of 4.');
			expect(escape.mock.calls.map(([event]) => event.key)).toEqual([' ', 'ArrowDown']);
		});

		it('clamps at the ends and ignores arrows of the other axis', () => {
			const { items, onChange, controller } = mount();
			controller.attach();

			press(items()[0], ' ');
			press(items()[0], 'ArrowUp');
			press(items()[0], 'ArrowRight');
			press(items()[0], ' ');

			expect(onChange).not.toHaveBeenCalled();
		});

		it('does not lift from a control inside the item', () => {
			const { items, onChange, controller } = mount();
			const button = document.createElement('button');
			items()[0].append(button);
			controller.attach();

			press(button, 'Enter');
			press(button, 'ArrowDown');

			expect(controller.getState()).toBeNull();
			expect(onChange).not.toHaveBeenCalled();
		});

		it('lifts from the handle when one is configured', () => {
			const { items, onChange, controller } = mount({ getHandle: (item) => item.querySelector('button') });
			const buttons = items().map((item) => item.appendChild(document.createElement('button')));
			controller.attach();

			press(items()[0], ' ');
			expect(controller.getState()).toBeNull();

			press(buttons[0], ' ');
			press(buttons[0], 'ArrowDown');
			press(buttons[0], ' ');

			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 0, to: 1 }));
		});

		it('cancels when focus leaves the lifted item', () => {
			const { items, onChange, controller } = mount();
			controller.attach();

			press(items()[0], ' ');
			items()[0].dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: items()[2] }));

			expect(controller.getState()).toBeNull();
			expect(onChange).not.toHaveBeenCalled();
		});
	});

	describe('announcements', () => {
		it('announces the lift, each move, the drop and a cancel with the item label', () => {
			const { items, announce, controller } = mount();
			controller.attach();

			press(items()[0], ' ');
			press(items()[0], 'ArrowDown');
			press(items()[0], ' ');
			press(items()[1], ' ');
			press(items()[1], 'Escape');

			expect(announce.mock.calls.map(([message]) => message)).toEqual([
				'Picked up Alpha, position 1 of 4. Use the arrow keys to move, Space to drop, Escape to cancel.',
				'Alpha, position 2 of 4.',
				'Dropped Alpha, position 2 of 4.',
				'Picked up Beta, position 2 of 4. Use the arrow keys to move, Space to drop, Escape to cancel.',
				'Cancelled. Beta returned to position 2 of 4.',
			]);
		});

		it('builds messages from the configured builders and label', () => {
			const { items, announce, controller } = mount({
				getLabel: (item) => item.dataset.name ?? '',
				messages: {
					lift: ({ label }) => `lever ${label}`,
					move: ({ label, position, total }) => `${label} ${position}/${total}`,
				},
			});
			items()[0].dataset.name = 'A';
			controller.attach();

			press(items()[0], ' ');
			press(items()[0], 'ArrowDown');
			press(items()[0], ' ');

			expect(announce.mock.calls.map(([message]) => message)).toEqual([
				'lever A',
				'A 2/4',
				'Dropped A, position 2 of 4.',
			]);
		});
	});

	describe('destroy', () => {
		it('ends a pointer sort without a change or an announcement and clears the state', () => {
			const { list, items, onChange, announce, controller } = mount();
			controller.attach();

			pointer(items()[0], 'pointerdown', 10);
			pointer(document, 'pointermove', 55);
			announce.mockClear();
			controller.destroy();
			pointer(document, 'pointermove', 70);
			pointer(document, 'pointerup', 70);

			expect(onChange).not.toHaveBeenCalled();
			expect(announce).not.toHaveBeenCalled();
			expect(items()[0].hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
			expect(items()[2].hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(list.hasAttribute(SORTABLE_ACTIVE_ATTRIBUTE)).toBe(false);
			expect(items()[0].style.getPropertyValue('--sortable-dy')).toBe('');
			expect(controller.getState()).toBeNull();
		});

		it('ends a keyboard sort and stops listening', () => {
			const { items, onChange, controller } = mount();
			controller.attach();

			press(items()[0], ' ');
			controller.destroy();
			press(items()[0], ' ');

			expect(items()[0].hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
			expect(onChange).not.toHaveBeenCalled();
			expect(controller.getState()).toBeNull();
		});

		it('is idempotent and can attach again', () => {
			const { items, onChange, controller } = mount();
			controller.attach();
			controller.attach();
			controller.destroy();
			controller.destroy();
			controller.attach();

			press(items()[0], ' ');
			press(items()[0], 'ArrowDown');
			press(items()[0], ' ');

			expect(onChange).toHaveBeenCalledTimes(1);
		});
	});

	it('binds attach and destroy to the host through createSortableController', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const { list, items, onChange } = mount();
		const controller = createSortableController(
			{
				registerConnectedCallback: (callback) => connected.push(callback),
				registerCleanupCallback: (callback) => cleanup.push(callback),
			},
			{ getContainer: () => list, getItems: items, onChange },
		);

		connected.forEach((callback) => callback());
		press(items()[0], ' ');
		expect(controller.getState()).not.toBeNull();

		cleanup.forEach((callback) => callback());
		expect(controller.getState()).toBeNull();
	});
});
