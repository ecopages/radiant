import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	SORTABLE_PLACEHOLDER_ATTRIBUTE,
	SORTABLE_STATE_ATTRIBUTE,
	SortableController,
	type SortableChange,
	type SortableControllerConfig,
} from './sortable-controller';
import { SortableGroup } from './sortable-group';

describe('SortableController preview', () => {
	const live: SortableController[] = [];

	afterEach(() => {
		live.splice(0).forEach((controller) => controller.destroy());
		document.body.replaceChildren();
	});

	function column(name: string, left: number, labels: string[]) {
		const list = document.createElement('ul');
		list.setAttribute('aria-label', name);
		list.style.cssText = `position:fixed;left:${left}px;top:0;margin:0;padding:0;list-style:none;width:100px;min-height:100px;overflow:hidden`;
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

	const kids = (list: HTMLElement) => [...list.children] as HTMLElement[];
	const labels = (list: HTMLElement) => kids(list).map((el) => el.textContent);
	const placeholderIn = (list: HTMLElement) =>
		kids(list).findIndex((el) => el.hasAttribute(SORTABLE_PLACEHOLDER_ATTRIBUTE));

	function mount(config: Partial<SortableControllerConfig> = {}) {
		const group = new SortableGroup();
		const todo = column('To do', 0, ['A', 'B', 'C']);
		const done = column('Done', 200, ['X', 'Y']);
		const changes: {
			change: SortableChange;
			todo: (string | null)[];
			item: HTMLElement;
			itemParent: Node | null;
		}[] = [];
		const onChange = vi.fn<(change: SortableChange) => boolean | void>((change) => {
			changes.push({ change, todo: labels(todo), item: change.item, itemParent: change.item.parentNode });
		});
		const make = (list: HTMLElement) =>
			new SortableController({
				group,
				preview: true,
				getContainer: () => list,
				getItems: () => kids(list),
				onChange,
				...config,
			});
		const controllers = [make(todo), make(done)];
		live.push(...controllers);
		controllers.forEach((controller) => controller.attach());
		return { todo, done, controllers, onChange, changes };
	}

	const pointer = (target: EventTarget, type: string, x: number, y: number) =>
		target.dispatchEvent(
			new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: x, clientY: y }),
		);
	const press = (target: EventTarget, key: string) =>
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

	it('leaves things in place without the option', () => {
		const { todo, controllers } = mount({ preview: undefined });
		const [a] = kids(todo);

		pointer(a, 'pointerdown', 10, 10);
		pointer(document, 'pointermove', 10, 50);

		expect(a.parentElement).toBe(todo);
		expect(todo.querySelector(`[${SORTABLE_PLACEHOLDER_ATTRIBUTE}]`)).toBeNull();
		expect(a.style.position).toBe('');
		controllers.forEach((controller) => controller.destroy());
	});

	describe('pointer', () => {
		it('moves the item to the layer where it follows the pointer, and a placeholder holds its slot', () => {
			const { todo } = mount();
			const [, b] = kids(todo);

			pointer(b, 'pointerdown', 30, 30);
			pointer(document, 'pointermove', 60, 36);

			expect(b.parentElement).toBe(document.body);
			expect(b.getAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe('lifted');
			expect(b.style.position).toBe('fixed');
			expect(b.style.pointerEvents).toBe('none');
			expect(b.style.width).toBe('100px');
			expect(b.style.height).toBe('20px');
			expect([b.style.left, b.style.top]).toEqual(['30px', '26px']);
			expect(kids(todo).map((el) => el.hasAttribute(SORTABLE_PLACEHOLDER_ATTRIBUTE))).toEqual([
				false,
				true,
				false,
			]);
			expect(kids(todo)[1].getBoundingClientRect().height).toBe(20);

			pointer(document, 'pointermove', 90, 10);
			expect([b.style.left, b.style.top]).toEqual(['60px', '0px']);
		});

		it('moves the placeholder to the slot under the pointer and reports it on drop with the item back in place', () => {
			const { todo, onChange, changes } = mount();
			const [a] = kids(todo);

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 10, 55);
			expect(placeholderIn(todo)).toBe(2);
			expect(kids(todo)).toHaveLength(3);

			pointer(document, 'pointerup', 10, 55);

			expect(onChange).toHaveBeenCalledTimes(1);
			expect(changes[0].change).toMatchObject({ item: a, from: 0, to: 2, toContainer: todo });
			expect(changes[0].itemParent).toBe(todo);
			expect(changes[0].todo).toEqual(['A', 'B', 'C']);
			expect(a.style.cssText).toBe('height: 20px; margin: 0px;');
			expect(todo.querySelector(`[${SORTABLE_PLACEHOLDER_ATTRIBUTE}]`)).toBeNull();
			expect(a.hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
		});

		it('returns the item to where it started when the pointer is cancelled', () => {
			const { todo, onChange } = mount();
			const [, b] = kids(todo);

			pointer(b, 'pointerdown', 10, 30);
			pointer(document, 'pointermove', 10, 58);
			expect(b.parentElement).toBe(document.body);
			pointer(document, 'pointercancel', 10, 58);

			expect(onChange).not.toHaveBeenCalled();
			expect(labels(todo)).toEqual(['A', 'B', 'C']);
			expect(b.parentElement).toBe(todo);
			expect(document.querySelector(`[${SORTABLE_PLACEHOLDER_ATTRIBUTE}]`)).toBeNull();
		});

		it('holds the slot in another container of the group and leaves the first one', () => {
			const { todo, done, changes } = mount();
			const [a] = kids(todo);

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 5);

			expect(a.parentElement).toBe(document.body);
			expect(placeholderIn(todo)).toBe(-1);
			expect(placeholderIn(done)).toBe(0);
			expect(labels(todo)).toEqual(['B', 'C']);

			pointer(document, 'pointermove', 210, 55);
			expect(placeholderIn(done)).toBe(2);
			pointer(document, 'pointermove', 210, 25);
			expect(placeholderIn(done)).toBe(1);

			pointer(document, 'pointerup', 210, 25);

			expect(changes[0].change).toMatchObject({
				item: a,
				from: 0,
				to: 1,
				fromContainer: todo,
				toContainer: done,
			});
			expect(labels(todo)).toEqual(['A', 'B', 'C']);
			expect(labels(done)).toEqual(['X', 'Y']);
			expect(document.querySelector(`[${SORTABLE_PLACEHOLDER_ATTRIBUTE}]`)).toBeNull();
		});

		it('keeps the owner that applies the change in charge of where the card lands', () => {
			const { todo, done } = mount({
				onChange: ({ item, to, toContainer }) => {
					toContainer.insertBefore(item, kids(toContainer).filter((el) => el !== item)[to] ?? null);
				},
			});
			const [a] = kids(todo);

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 25);
			expect(a.parentElement).toBe(document.body);
			pointer(document, 'pointerup', 210, 25);

			expect(labels(todo)).toEqual(['B', 'C']);
			expect(labels(done)).toEqual(['X', 'A', 'Y']);
		});

		it('restores the item and removes the placeholder when destroyed mid-drag', () => {
			const { todo, done, controllers, onChange } = mount();
			const [a] = kids(todo);
			a.style.color = 'red';

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 210, 55);
			expect(a.parentElement).toBe(document.body);
			expect(placeholderIn(done)).toBe(2);
			controllers.forEach((controller) => controller.destroy());

			expect(onChange).not.toHaveBeenCalled();
			expect(labels(todo)).toEqual(['A', 'B', 'C']);
			expect(a.style.cssText).toBe('height: 20px; margin: 0px; color: red;');
			expect(document.querySelector(`[${SORTABLE_PLACEHOLDER_ATTRIBUTE}]`)).toBeNull();
			expect(kids(done)).toHaveLength(2);
		});

		it('uses the placeholder and the layer the owner provides', () => {
			const layer = document.createElement('div');
			document.body.append(layer);
			const createPlaceholder = vi.fn(() => document.createElement('li'));
			const { todo } = mount({ getPreviewLayer: () => layer, createPlaceholder });
			const [a] = kids(todo);

			pointer(a, 'pointerdown', 10, 10);
			pointer(document, 'pointermove', 10, 30);

			expect(a.parentElement).toBe(layer);
			expect(createPlaceholder).toHaveBeenCalledWith(a);
			expect(kids(todo)[placeholderIn(todo)].localName).toBe('li');
		});
	});

	describe('keyboard', () => {
		it('lifts the item out, keeps the keys and the focus on it and moves the placeholder', () => {
			const { todo, done, changes } = mount();
			const [a] = kids(todo);
			a.focus();

			press(a, ' ');
			expect(a.parentElement).toBe(document.body);
			expect(document.activeElement).toBe(a);
			expect(placeholderIn(todo)).toBe(0);

			press(a, 'ArrowDown');
			press(a, 'ArrowDown');
			expect(placeholderIn(todo)).toBe(2);
			expect(a.style.top).toBe(`${kids(todo)[2].getBoundingClientRect().top}px`);

			press(a, 'PageDown');
			expect(placeholderIn(todo)).toBe(-1);
			expect(placeholderIn(done)).toBe(2);
			expect(a.style.left).toBe('200px');

			press(a, ' ');
			expect(changes[0].change).toMatchObject({ from: 0, to: 2, source: 'keyboard', toContainer: done });
			expect(labels(todo)).toEqual(['A', 'B', 'C']);
			expect(document.activeElement).toBe(a);
		});

		it('returns the item and its focus on Escape', () => {
			const { todo, onChange } = mount();
			const [, b] = kids(todo);
			b.focus();

			press(b, ' ');
			press(b, 'ArrowUp');
			expect(b.parentElement).toBe(document.body);
			press(b, 'Escape');

			expect(onChange).not.toHaveBeenCalled();
			expect(labels(todo)).toEqual(['A', 'B', 'C']);
			expect(b.parentElement).toBe(todo);
			expect(document.activeElement).toBe(b);
			expect(document.querySelector(`[${SORTABLE_PLACEHOLDER_ATTRIBUTE}]`)).toBeNull();
		});

		it('cancels when focus moves to another element', () => {
			const { todo, onChange } = mount();
			const [a, b] = kids(todo);
			a.focus();

			press(a, ' ');
			expect(a.parentElement).toBe(document.body);
			b.focus();

			expect(onChange).not.toHaveBeenCalled();
			expect(a.parentElement).toBe(todo);
			expect(a.hasAttribute(SORTABLE_STATE_ATTRIBUTE)).toBe(false);
		});
	});
});
