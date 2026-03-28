import { beforeEach, describe, expect, test, vi } from 'vitest';

async function loadModule<T>(path: string): Promise<T> {
	return import(/* @vite-ignore */ path) as Promise<T>;
}

const loadJsxRuntime = async () => loadModule<{ jsx: Function }>('../jsx-runtime.ts');
const loadJsxModule = async () => loadModule<typeof import('../index.ts')>('../index.ts');

type EventCase = {
	readonly name: string;
	readonly tagName: keyof HTMLElementTagNameMap;
	readonly createEvent: () => Event;
	readonly expectInstanceOf: abstract new (...args: any[]) => Event;
	readonly prepareTarget?: (target: HTMLElement) => void;
};

const eventCases: readonly EventCase[] = [
	{
		name: 'click',
		tagName: 'button',
		createEvent: () => new MouseEvent('click', { bubbles: true, cancelable: true }),
		expectInstanceOf: MouseEvent,
	},
	{
		name: 'dblclick',
		tagName: 'button',
		createEvent: () => new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
		expectInstanceOf: MouseEvent,
	},
	{
		name: 'auxclick',
		tagName: 'button',
		createEvent: () => new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
		expectInstanceOf: MouseEvent,
	},
	{
		name: 'contextmenu',
		tagName: 'button',
		createEvent: () => new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
		expectInstanceOf: MouseEvent,
	},
	{
		name: 'mousedown',
		tagName: 'button',
		createEvent: () => new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
		expectInstanceOf: MouseEvent,
	},
	{
		name: 'mouseup',
		tagName: 'button',
		createEvent: () => new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
		expectInstanceOf: MouseEvent,
	},
	{
		name: 'keydown',
		tagName: 'input',
		createEvent: () => new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' }),
		expectInstanceOf: KeyboardEvent,
	},
	{
		name: 'keyup',
		tagName: 'input',
		createEvent: () => new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: 'Enter' }),
		expectInstanceOf: KeyboardEvent,
	},
	{
		name: 'beforeinput',
		tagName: 'input',
		createEvent: () => new InputEvent('beforeinput', { bubbles: true, cancelable: true, data: 'A' }),
		expectInstanceOf: InputEvent,
	},
	{
		name: 'input',
		tagName: 'input',
		createEvent: () => new InputEvent('input', { bubbles: true, cancelable: true, data: 'A' }),
		expectInstanceOf: InputEvent,
	},
	{
		name: 'change',
		tagName: 'input',
		createEvent: () => new Event('change', { bubbles: true, cancelable: true }),
		expectInstanceOf: Event,
		prepareTarget: (target) => {
			(target as HTMLInputElement).value = 'updated';
		},
	},
	{
		name: 'focus',
		tagName: 'input',
		createEvent: () => new FocusEvent('focus', { bubbles: false, cancelable: false }),
		expectInstanceOf: FocusEvent,
	},
	{
		name: 'blur',
		tagName: 'input',
		createEvent: () => new FocusEvent('blur', { bubbles: false, cancelable: false }),
		expectInstanceOf: FocusEvent,
	},
	{
		name: 'compositionstart',
		tagName: 'input',
		createEvent: () => new CompositionEvent('compositionstart', { bubbles: true, cancelable: true, data: 'A' }),
		expectInstanceOf: CompositionEvent,
	},
	{
		name: 'compositionupdate',
		tagName: 'input',
		createEvent: () => new CompositionEvent('compositionupdate', { bubbles: true, cancelable: true, data: 'AB' }),
		expectInstanceOf: CompositionEvent,
	},
	{
		name: 'compositionend',
		tagName: 'input',
		createEvent: () => new CompositionEvent('compositionend', { bubbles: true, cancelable: true, data: 'AB' }),
		expectInstanceOf: CompositionEvent,
	},
	{
		name: 'invalid',
		tagName: 'input',
		createEvent: () => new Event('invalid', { bubbles: false, cancelable: true }),
		expectInstanceOf: Event,
	},
	{
		name: 'submit',
		tagName: 'form',
		createEvent: () => new SubmitEvent('submit', { bubbles: true, cancelable: true }),
		expectInstanceOf: SubmitEvent,
	},
	{
		name: 'reset',
		tagName: 'form',
		createEvent: () => new Event('reset', { bubbles: true, cancelable: true }),
		expectInstanceOf: Event,
	},
	{
		name: 'pointerdown',
		tagName: 'div',
		createEvent: () => new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 1 }),
		expectInstanceOf: PointerEvent,
	},
	{
		name: 'pointerup',
		tagName: 'div',
		createEvent: () => new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 1 }),
		expectInstanceOf: PointerEvent,
	},
	{
		name: 'pointermove',
		tagName: 'div',
		createEvent: () => new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerId: 1 }),
		expectInstanceOf: PointerEvent,
	},
	{
		name: 'wheel',
		tagName: 'div',
		createEvent: () => new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 10 }),
		expectInstanceOf: WheelEvent,
	},
	{
		name: 'dragstart',
		tagName: 'div',
		createEvent: () => new DragEvent('dragstart', { bubbles: true, cancelable: true }),
		expectInstanceOf: DragEvent,
	},
	{
		name: 'dragenter',
		tagName: 'div',
		createEvent: () => new DragEvent('dragenter', { bubbles: true, cancelable: true }),
		expectInstanceOf: DragEvent,
	},
	{
		name: 'dragover',
		tagName: 'div',
		createEvent: () => new DragEvent('dragover', { bubbles: true, cancelable: true }),
		expectInstanceOf: DragEvent,
	},
	{
		name: 'drop',
		tagName: 'div',
		createEvent: () => new DragEvent('drop', { bubbles: true, cancelable: true }),
		expectInstanceOf: DragEvent,
	},
	{
		name: 'copy',
		tagName: 'input',
		createEvent: () => new ClipboardEvent('copy', { bubbles: true, cancelable: true }),
		expectInstanceOf: ClipboardEvent,
	},
	{
		name: 'cut',
		tagName: 'input',
		createEvent: () => new ClipboardEvent('cut', { bubbles: true, cancelable: true }),
		expectInstanceOf: ClipboardEvent,
	},
	{
		name: 'paste',
		tagName: 'input',
		createEvent: () => new ClipboardEvent('paste', { bubbles: true, cancelable: true }),
		expectInstanceOf: ClipboardEvent,
	},
	{
		name: 'animationstart',
		tagName: 'div',
		createEvent: () =>
			new AnimationEvent('animationstart', { bubbles: true, cancelable: true, animationName: 'fade' }),
		expectInstanceOf: AnimationEvent,
	},
	{
		name: 'animationend',
		tagName: 'div',
		createEvent: () =>
			new AnimationEvent('animationend', { bubbles: true, cancelable: true, animationName: 'fade' }),
		expectInstanceOf: AnimationEvent,
	},
	{
		name: 'transitionend',
		tagName: 'div',
		createEvent: () =>
			new TransitionEvent('transitionend', { bubbles: true, cancelable: true, propertyName: 'opacity' }),
		expectInstanceOf: TransitionEvent,
	},
	{
		name: 'toggle',
		tagName: 'details',
		createEvent: () => new Event('toggle', { bubbles: false, cancelable: false }),
		expectInstanceOf: Event,
	},
];

describe('Radiant JSX browser event bindings', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	for (const eventCase of eventCases) {
		test(`on:${eventCase.name} receives the native browser event`, async () => {
			const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
			const container = document.createElement('div');
			const root = createRoot(container);
			let receivedEvent: Event | undefined;
			let receivedCurrentTarget: EventTarget | null | undefined;
			const handler = vi.fn((event: Event) => {
				receivedEvent = event;
				receivedCurrentTarget = event.currentTarget;
			});

			root.render(
				jsx(eventCase.tagName, {
					[`on:${eventCase.name}`]: handler,
					children: eventCase.tagName === 'input' ? undefined : 'Event target',
				}),
			);

			const target = container.querySelector(eventCase.tagName) as HTMLElement | null;
			expect(target).not.toBeNull();

			eventCase.prepareTarget?.(target as HTMLElement);
			const dispatchedEvent = eventCase.createEvent();
			(target as HTMLElement).dispatchEvent(dispatchedEvent);

			expect(handler).toHaveBeenCalledTimes(1);
			expect(receivedEvent).toBeInstanceOf(eventCase.expectInstanceOf);
			expect(receivedEvent?.type).toBe(eventCase.name);
			expect(receivedCurrentTarget).toBe(target);
		});
	}

	test('on-delegate:click dispatches from nested descendants with normalized currentTarget', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let receivedCurrentTarget: EventTarget | null | undefined;
		let receivedTarget: EventTarget | null | undefined;
		let receivedEvent: Event | undefined;

		root.render(
			jsx('button', {
				'on-delegate:click': (event: Event) => {
					receivedCurrentTarget = event.currentTarget;
					receivedTarget = event.target;
					receivedEvent = event;
				},
				children: jsx('span', { children: 'Nested label' }),
			}),
		);

		const button = container.querySelector('button');
		const nestedTarget = container.querySelector('span');

		expect(button).not.toBeNull();
		expect(nestedTarget).not.toBeNull();

		nestedTarget?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

		expect(receivedEvent).toBeInstanceOf(MouseEvent);
		expect(receivedCurrentTarget).toBe(button);
		expect(receivedTarget).toBe(nestedTarget);
	});

	test('on-delegate:click removes stale handlers when the binding becomes empty', async () => {
		const [{ jsx }, { createRoot }] = await Promise.all([loadJsxRuntime(), loadJsxModule()]);
		const container = document.createElement('div');
		const root = createRoot(container);
		let clickCount = 0;

		root.render(
			jsx('button', {
				'on-delegate:click': () => {
					clickCount += 1;
				},
				children: 'Delegate',
			}),
		);

		const button = container.querySelector('button');
		expect(button).not.toBeNull();

		button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		expect(clickCount).toBe(1);

		root.render(
			jsx('button', {
				'on-delegate:click': null,
				children: 'Delegate',
			}),
		);

		const updatedButton = container.querySelector('button');
		expect(updatedButton).not.toBeNull();

		updatedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		expect(clickCount).toBe(1);
	});
});
