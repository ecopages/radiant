import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ControllerHost } from './controller';
import { HotkeyController, createHotkeyController, matchesHotkey } from './hotkey-controller';

const press = (key: string, modifiers: Partial<KeyboardEventInit> = {}) => ({
	key,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	shiftKey: false,
	...modifiers,
});

function keydown(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
	target.dispatchEvent(event);
	return event;
}

describe('matchesHotkey grammar', () => {
	it.each([
		'k',
		'K',
		'mod+k',
		'shift+mod+k',
		'MOD+Shift+k',
		'Space',
		'space',
		'Plus',
		'ArrowLeft',
		'shift+ArrowLeft',
		'?',
		'0',
		'F1',
	])('parses %s', (keys) => {
		expect(() => matchesHotkey(press('x'), keys)).not.toThrow();
	});

	it.each([
		'',
		'+',
		'mod++',
		'k+',
		'+k',
		' ',
		'g g',
		'k ',
		'alt+k',
		'ctrl+k',
		'meta+k',
		'cmd+k',
		'hyper+k',
		'mod+mod+k',
		'shift',
		'mod',
		'shift+mod',
		'alt',
		'Control',
	])('rejects %j with a SyntaxError', (keys) => {
		expect(() => matchesHotkey(press('x'), keys)).toThrow(SyntaxError);
	});
});

describe('matchesHotkey matching', () => {
	it('matches mod with Meta, with Ctrl and with both, and not without', () => {
		expect(matchesHotkey(press('k', { metaKey: true }), 'mod+k')).toBe(true);
		expect(matchesHotkey(press('k', { ctrlKey: true }), 'mod+k')).toBe(true);
		expect(matchesHotkey(press('k', { metaKey: true, ctrlKey: true }), 'mod+k')).toBe(true);
		expect(matchesHotkey(press('k'), 'mod+k')).toBe(false);
	});

	it('rejects Ctrl, Meta and Alt on a binding without them', () => {
		expect(matchesHotkey(press('k'), 'k')).toBe(true);
		expect(matchesHotkey(press('k', { ctrlKey: true }), 'k')).toBe(false);
		expect(matchesHotkey(press('k', { metaKey: true }), 'k')).toBe(false);
		expect(matchesHotkey(press('k', { altKey: true }), 'k')).toBe(false);
		expect(matchesHotkey(press('k', { altKey: true, metaKey: true }), 'mod+k')).toBe(false);
	});

	it('compares keys without case', () => {
		expect(matchesHotkey(press('K'), 'k')).toBe(true);
		expect(matchesHotkey(press('k'), 'K')).toBe(true);
		expect(matchesHotkey(press('ArrowLeft'), 'arrowleft')).toBe(true);
	});

	it('checks Shift only when the string names it', () => {
		expect(matchesHotkey(press('ArrowLeft', { shiftKey: true }), 'ArrowLeft')).toBe(true);
		expect(matchesHotkey(press('ArrowLeft', { shiftKey: true }), 'shift+ArrowLeft')).toBe(true);
		expect(matchesHotkey(press('ArrowLeft'), 'shift+ArrowLeft')).toBe(false);
		expect(matchesHotkey(press('?', { shiftKey: true }), '?')).toBe(true);
		expect(matchesHotkey(press('K', { shiftKey: true }), 'k')).toBe(true);
	});

	it('writes the space bar as Space and the plus key as Plus', () => {
		expect(matchesHotkey(press(' '), 'Space')).toBe(true);
		expect(matchesHotkey(press('+'), 'Plus')).toBe(true);
		expect(matchesHotkey(press('+', { shiftKey: true }), 'mod+Plus')).toBe(false);
		expect(matchesHotkey(press('+', { ctrlKey: true }), 'mod+Plus')).toBe(true);
	});

	it('treats a misspelt key name as one that never matches', () => {
		expect(matchesHotkey(press('ArrowLeft'), 'ArrowLef')).toBe(false);
	});
});

describe('HotkeyController', () => {
	const controllers: HotkeyController[] = [];
	const track = (controller: HotkeyController): HotkeyController => {
		controllers.push(controller);
		return controller;
	};

	afterEach(() => {
		controllers.splice(0).forEach((controller) => controller.destroy());
		document.body.innerHTML = '';
	});

	function mountTarget(): HTMLDivElement {
		const target = document.createElement('div');
		document.body.append(target);
		return target;
	}

	it('throws a SyntaxError for a bad key string in the constructor, before anything attaches', () => {
		expect(
			() => new HotkeyController({ getTarget: () => document, hotkeys: [{ keys: 'alt+k', handler: vi.fn() }] }),
		).toThrow(SyntaxError);
	});

	it('runs the handler of a match, prevents the default and does nothing for other keys', () => {
		const target = mountTarget();
		const handler = vi.fn();
		track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler }] })).attach();

		expect(keydown(target, 'x').defaultPrevented).toBe(false);
		expect(handler).not.toHaveBeenCalled();

		const event = keydown(target, 'k');
		expect(handler).toHaveBeenCalledWith(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it('leaves the default alone and tries the next match when a handler returns false', () => {
		const target = mountTarget();
		const decline = vi.fn(() => false);
		const accept = vi.fn();
		track(
			new HotkeyController({
				getTarget: () => target,
				hotkeys: [
					{ keys: 'k', handler: decline },
					{ keys: 'k', handler: accept },
				],
			}),
		).attach();

		expect(keydown(target, 'k').defaultPrevented).toBe(true);
		expect(decline).toHaveBeenCalledTimes(1);
		expect(accept).toHaveBeenCalledTimes(1);
	});

	it('does not prevent the default when every match declines', () => {
		const target = mountTarget();
		track(
			new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler: () => false }] }),
		).attach();

		expect(keydown(target, 'k').defaultPrevented).toBe(false);
	});

	it('runs only the first match that does not decline', () => {
		const target = mountTarget();
		const first = vi.fn();
		const second = vi.fn();
		track(
			new HotkeyController({
				getTarget: () => target,
				hotkeys: [
					{ keys: 'shift+ArrowLeft', handler: first },
					{ keys: 'ArrowLeft', handler: second },
				],
			}),
		).attach();

		keydown(target, 'ArrowLeft', { shiftKey: true });
		keydown(target, 'ArrowLeft');
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});

	it.each([
		['an input', () => document.createElement('input')],
		['a textarea', () => document.createElement('textarea')],
		[
			'a contenteditable element',
			() => {
				const element = document.createElement('div');
				element.contentEditable = 'true';
				return element;
			},
		],
	])('skips keys typed in %s', (_name, create) => {
		const target = mountTarget();
		const field = create();
		target.append(field);
		const handler = vi.fn();
		track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler }] })).attach();

		expect(keydown(field, 'k').defaultPrevented).toBe(false);
		expect(handler).not.toHaveBeenCalled();
	});

	it('still handles a key typed in a checkbox or a button', () => {
		const target = mountTarget();
		const checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		const button = document.createElement('button');
		target.append(checkbox, button);
		const handler = vi.fn();
		track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler }] })).attach();

		keydown(checkbox, 'k');
		keydown(button, 'k');
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('treats a handler that returns true as handled: the default is prevented and no later hotkey runs', () => {
		const target = mountTarget();
		const later = vi.fn();
		track(
			new HotkeyController({
				getTarget: () => target,
				hotkeys: [
					{ keys: 'k', handler: () => true },
					{ keys: 'k', handler: later },
				],
			}),
		).attach();

		expect(keydown(target, 'k').defaultPrevented).toBe(true);
		expect(later).not.toHaveBeenCalled();
	});

	it('skips a key while composing and a key whose default another handler already prevented', () => {
		const target = mountTarget();
		const child = document.createElement('span');
		target.append(child);
		const handler = vi.fn();
		track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler }] })).attach();

		keydown(target, 'k', { isComposing: true });
		child.addEventListener('keydown', (event) => event.preventDefault());
		keydown(child, 'k');
		expect(handler).not.toHaveBeenCalled();
	});

	it('listens on nothing before attach and after destroy, attaches once and can attach again', () => {
		const target = mountTarget();
		const handler = vi.fn();
		const controller = track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler }] }));

		keydown(target, 'k');
		expect(handler).not.toHaveBeenCalled();

		controller.attach();
		controller.attach();
		keydown(target, 'k');
		expect(handler).toHaveBeenCalledTimes(1);

		controller.destroy();
		controller.destroy();
		keydown(target, 'k');
		expect(handler).toHaveBeenCalledTimes(1);

		controller.attach();
		keydown(target, 'k');
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('picks up a target that appeared after the first attach and moves when the target changes', () => {
		const first = mountTarget();
		const second = mountTarget();
		let current: HTMLElement | null = null;
		const handler = vi.fn();
		const controller = track(new HotkeyController({ getTarget: () => current, hotkeys: [{ keys: 'k', handler }] }));

		controller.attach();
		keydown(first, 'k');
		expect(handler).not.toHaveBeenCalled();

		current = first;
		controller.attach();
		keydown(first, 'k');
		expect(handler).toHaveBeenCalledTimes(1);

		current = second;
		controller.attach();
		keydown(first, 'k');
		keydown(second, 'k');
		expect(handler).toHaveBeenCalledTimes(2);
	});

	it('ignores keys from outside an element target', () => {
		const target = mountTarget();
		const outside = mountTarget();
		const handler = vi.fn();
		track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'k', handler }] })).attach();

		keydown(outside, 'k');
		expect(handler).not.toHaveBeenCalled();
	});

	it('listens in the bubble phase by default and in the capture phase with capture', () => {
		const ancestor = mountTarget();
		const child = document.createElement('span');
		ancestor.append(child);
		const order: string[] = [];
		child.addEventListener('keydown', () => order.push('child'));
		track(
			new HotkeyController({
				getTarget: () => ancestor,
				capture: true,
				hotkeys: [
					{
						keys: 'k',
						handler: () => {
							order.push('capture');
							return false;
						},
					},
				],
			}),
		).attach();
		track(
			new HotkeyController({
				getTarget: () => ancestor,
				hotkeys: [{ keys: 'k', handler: () => void order.push('bubble') }],
			}),
		).attach();

		keydown(child, 'k');
		expect(order).toEqual(['capture', 'child', 'bubble']);
	});

	it('hides the key from the target when a capture handler stops propagation', () => {
		const ancestor = mountTarget();
		const child = document.createElement('span');
		ancestor.append(child);
		const onChild = vi.fn();
		child.addEventListener('keydown', onChild);
		track(
			new HotkeyController({
				getTarget: () => ancestor,
				capture: true,
				hotkeys: [{ keys: 'k', handler: (event) => event.stopPropagation() }],
			}),
		).attach();

		keydown(child, 'k');
		expect(onChild).not.toHaveBeenCalled();
	});

	it('removes a capture listener on destroy', () => {
		const target = mountTarget();
		const handler = vi.fn();
		const controller = track(
			new HotkeyController({ getTarget: () => target, capture: true, hotkeys: [{ keys: 'k', handler }] }),
		);

		controller.attach();
		controller.destroy();
		keydown(target, 'k');
		expect(handler).not.toHaveBeenCalled();
	});

	it('hides the key from a bubble instance on the same ancestor, and lets an unmatched key reach both', () => {
		const ancestor = mountTarget();
		const child = document.createElement('span');
		ancestor.append(child);
		const capture = vi.fn((event: KeyboardEvent) => event.stopPropagation());
		const bubble = vi.fn();
		track(
			new HotkeyController({
				getTarget: () => ancestor,
				capture: true,
				hotkeys: [{ keys: 'k', handler: capture }],
			}),
		).attach();
		track(
			new HotkeyController({
				getTarget: () => ancestor,
				hotkeys: [
					{ keys: 'k', handler: bubble },
					{ keys: 'j', handler: bubble },
				],
			}),
		).attach();

		keydown(child, 'k');
		expect(capture).toHaveBeenCalledTimes(1);
		expect(bubble).not.toHaveBeenCalled();

		keydown(child, 'j');
		expect(capture).toHaveBeenCalledTimes(1);
		expect(bubble).toHaveBeenCalledTimes(1);
	});

	it('lets only the first of two instances on document handle a shared key', () => {
		const first = vi.fn();
		const second = vi.fn();
		track(new HotkeyController({ getTarget: () => document, hotkeys: [{ keys: 'k', handler: first }] })).attach();
		track(new HotkeyController({ getTarget: () => document, hotkeys: [{ keys: 'k', handler: second }] })).attach();

		expect(keydown(document.body, 'k').defaultPrevented).toBe(true);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});

	it('keeps two controllers on one host independent', () => {
		const target = mountTarget();
		const a = vi.fn();
		const b = vi.fn();
		const first = track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'a', handler: a }] }));
		const second = track(new HotkeyController({ getTarget: () => target, hotkeys: [{ keys: 'b', handler: b }] }));
		first.attach();
		second.attach();

		keydown(target, 'a');
		keydown(target, 'b');
		first.destroy();
		keydown(target, 'a');
		keydown(target, 'b');
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(2);
	});

	it('throws a SyntaxError for a bad key string through createHotkeyController, before it binds', () => {
		const register = vi.fn();
		const host: ControllerHost = { registerConnectedCallback: register, registerCleanupCallback: register };

		expect(() =>
			createHotkeyController(host, { getTarget: () => document, hotkeys: [{ keys: 'shift', handler: vi.fn() }] }),
		).toThrow(SyntaxError);
		expect(register).not.toHaveBeenCalled();
	});

	it('is bound to a host through createHotkeyController', () => {
		const connected: Array<() => void> = [];
		const cleanup: Array<() => void> = [];
		const host: ControllerHost = {
			registerConnectedCallback: (callback) => connected.push(callback),
			registerCleanupCallback: (callback) => cleanup.push(callback),
		};
		const target = mountTarget();
		const handler = vi.fn();

		createHotkeyController(host, { getTarget: () => target, hotkeys: [{ keys: 'k', handler }] });
		keydown(target, 'k');
		expect(handler).not.toHaveBeenCalled();

		connected.forEach((callback) => callback());
		keydown(target, 'k');
		expect(handler).toHaveBeenCalledTimes(1);

		cleanup.forEach((callback) => callback());
		keydown(target, 'k');
		expect(handler).toHaveBeenCalledTimes(1);
	});
});
