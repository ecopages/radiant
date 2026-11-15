import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	SORTABLE_ACTIVE_ATTRIBUTE,
	SORTABLE_DROP_ATTRIBUTE,
	SORTABLE_OVER_ATTRIBUTE,
	SORTABLE_STATE_ATTRIBUTE,
	SortableController,
	type SortableChange,
} from './sortable-controller';
import { SortableGroup } from './sortable-group';

describe('SortableController in a group', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function column(name: string, left: number, labels: string[]) {
		const list = document.createElement('ul');
		list.setAttribute('aria-label', name);
		list.style.cssText = `position:fixed;left:${left}px;top:0;margin:0;padding:0;list-style:none;width:100px;min-height:100px`;
		for (const label of labels) {
			const item = document.createElement('li');
			item.tabIndex = 0;
			item.style.cssText = 'height:20px;margin:0';
			item.textContent = label;
			list.append(item);
		}
		document.body.append(list);
		return list;
	}

	function mount(options: { accepts?: (item: HTMLElement) => boolean } = {}) {
		const group = new SortableGroup();
		const todo = column('To do', 0, ['A', 'B', 'C']);
		const done = column('Done', 200, ['X', 'Y']);
		const zone = column('Trash', 400, []);
		const announce = vi.fn<(message: string) => void>();
		const onChange = vi.fn<(change: SortableChange) => boolean | void>();
		const make = (list: HTMLElement, extra: Partial<ConstructorParameters<typeof SortableController>[0]> = {}) =>
			new SortableController({
				group,
				getContainer: () => list,
				getItems: () => [...list.children] as HTMLElement[],
				announce,
				onChange,
				...extra,
			});
		const controllers = [make(todo), make(done, { accepts: options.accepts }), make(zone)];
		controllers.forEach((controller) => controller.attach());
		const kids = (list: HTMLElement) => [...list.children] as HTMLElement[];
		return { group, todo, done, zone, announce, onChange, controllers, kids };
	}

	const pointer = (target: EventTarget, type: string, x: number, y: number) =>
		target.dispatchEvent(
			new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: x, clientY: y }),
		);

	const press = (target: EventTarget, key: string) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

	describe('pointer', () => {
		it('moves an item into another container and reports both containers and the index', () => {
			const { todo, done, kids, onChange, controllers } = mount();
			const [a] = kids(todo);
			const [x, y] = kids(done);

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 5);

			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(true);
			expect(todo.hasAttribute(SORTABLE_ACTIVE_ATTRIBUTE)).toBe(true);
			expect(x.getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('before');
			expect(controllers[0].getState()).toMatchObject({ from: 0, to: 0, fromContainer: todo, toContainer: done });

			pointer(document, 'pointermove', 210, 15);
			expect(x.hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(y.getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('before');

			pointer(document, 'pointermove', 210, 39);
			pointer(document, 'pointerup', 210, 39);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(onChange).toHaveBeenCalledWith({
				item: a,
				from: 0,
				to: 2,
				source: 'pointer',
				fromContainer: todo,
				toContainer: done,
			});
			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(y.hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(a.hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
		});

		it('drops into an empty container as index 0, with no item to mark', () => {
			const { todo, zone, kids, onChange } = mount();
			const [, b] = kids(todo);

			pointer(b, 'pointerdown', 10, 30);
			pointer(document, 'pointermove', 450, 50);
			expect(zone.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(true);
			pointer(document, 'pointerup', 450, 50);

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({ item: b, from: 1, to: 0, fromContainer: todo, toContainer: zone }),
			);
		});

		it('returns to a plain reorder when the pointer comes back over its own container', () => {
			const { todo, done, kids, onChange } = mount();
			const [a, , c] = kids(todo);

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 15);
			pointer(document, 'pointermove', 20, 55);

			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(kids(done).some((item) => item.hasAttribute(SORTABLE_DROP_ATTRIBUTE))).toBe(false);
			expect(c.getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('after');
			pointer(document, 'pointerup', 20, 55);
			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 0, to: 2, toContainer: todo }));
		});

		it('keeps the last container as the target while the pointer is between containers', () => {
			const { todo, done, kids, onChange } = mount();

			pointer(kids(todo)[0], 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 15);
			pointer(document, 'pointermove', 150, 15);
			pointer(document, 'pointerup', 150, 15);

			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ toContainer: done }));
		});

		it('skips a container that does not accept the item', () => {
			const { todo, done, kids, onChange } = mount({ accepts: () => false });

			pointer(kids(todo)[0], 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 15);
			pointer(document, 'pointerup', 210, 15);

			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(onChange).not.toHaveBeenCalled();
		});

		it('cancels a cross-container drag on pointercancel and clears every mark', () => {
			const { todo, done, kids, onChange, announce } = mount();

			pointer(kids(todo)[0], 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 15);
			pointer(document, 'pointercancel', 210, 15);

			expect(onChange).not.toHaveBeenCalled();
			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(kids(done)[0].hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(todo.hasAttribute(SORTABLE_ACTIVE_ATTRIBUTE)).toBe(false);
			expect(announce).toHaveBeenLastCalledWith('Cancelled. A returned to To do, position 1 of 3.');
		});

		it('clears the target container and its marks when destroyed mid-drag', () => {
			const { todo, done, kids, onChange, controllers } = mount();

			pointer(kids(todo)[0], 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 15);
			controllers[0].destroy();
			pointer(document, 'pointerup', 210, 15);

			expect(onChange).not.toHaveBeenCalled();
			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(kids(done)[0].hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(todo.hasAttribute(SORTABLE_ACTIVE_ATTRIBUTE)).toBe(false);
		});
	});

	describe('keyboard', () => {
		it('moves to the next container on PageDown, keeps the index and drops there', () => {
			const { todo, done, kids, onChange, announce } = mount();
			const [, b] = kids(todo);

			press(b, ' ');
			press(b, 'PageDown');

			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(true);
			expect(kids(done)[1].getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('before');
			expect(announce).toHaveBeenLastCalledWith('B, Done, position 2 of 3.');

			press(b, 'End');
			press(b, ' ');

			expect(onChange).toHaveBeenCalledWith({
				item: b,
				from: 1,
				to: 2,
				source: 'keyboard',
				fromContainer: todo,
				toContainer: done,
			});
			expect(announce).toHaveBeenLastCalledWith('Dropped B in Done, position 3 of 3.');
		});

		it('clamps the index to the other list, lands after its last item and walks back with PageUp', () => {
			const { todo, done, kids, onChange } = mount();
			const [, , c] = kids(todo);

			press(c, ' ');
			press(c, 'PageDown');
			expect(kids(done)[1].getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('after');
			press(c, 'ArrowDown');
			expect(kids(done)[1].getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('after');
			press(c, 'ArrowUp');
			expect(kids(done)[1].getAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe('before');
			press(c, 'PageUp');
			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			press(c, ' ');

			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 2, to: 1, toContainer: todo }));
		});

		it('cancels after crossing with Escape and clears the target marks', () => {
			const { todo, done, kids, onChange, announce } = mount();
			const [a] = kids(todo);

			press(a, ' ');
			press(a, 'PageDown');
			press(a, 'Escape');

			expect(onChange).not.toHaveBeenCalled();
			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(kids(done)[0].hasAttribute(SORTABLE_DROP_ATTRIBUTE)).toBe(false);
			expect(announce).toHaveBeenLastCalledWith('Cancelled. A returned to To do, position 1 of 3.');
		});

		it('mentions the container keys in the lift announcement only when there is a group', () => {
			const { kids, todo, announce } = mount();

			press(kids(todo)[0], ' ');

			expect(announce).toHaveBeenLastCalledWith(expect.stringContaining('Page Up and Page Down'));
		});

		it('moves into an empty container at index 0 and announces a refused drop as a return', () => {
			const { todo, zone, kids, onChange, announce } = mount();
			onChange.mockReturnValue(false);
			const [, , c] = kids(todo);

			press(c, ' ');
			press(c, 'PageDown');
			press(c, 'PageDown');
			expect(zone.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(true);
			press(c, ' ');

			expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ from: 2, to: 0, toContainer: zone }));
			expect(announce).toHaveBeenLastCalledWith('Cancelled. C returned to To do, position 3 of 3.');
		});

		it('skips containers that do not accept the item', () => {
			const { todo, done, zone, kids } = mount({ accepts: () => false });

			press(kids(todo)[0], ' ');
			press(kids(todo)[0], 'PageDown');

			expect(done.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(false);
			expect(zone.hasAttribute(SORTABLE_OVER_ATTRIBUTE)).toBe(true);
		});
	});

	describe('membership', () => {
		it('joins on attach and leaves on destroy, in attach order', () => {
			const { group, controllers, todo, kids } = mount();

			expect(group.members).toHaveLength(3);
			controllers[1].destroy();
			controllers[1].destroy();
			expect(group.members).toHaveLength(2);

			press(kids(todo)[0], ' ');
			press(kids(todo)[0], 'PageDown');
			expect(controllers[0].getState()?.toContainer.getAttribute('aria-label')).toBe('Trash');
		});
	});
});
