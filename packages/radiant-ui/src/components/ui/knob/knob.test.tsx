import { createRoot } from '@ecopages/jsx';
import { afterEach, describe, expect, it } from 'vitest';
import { RuiKnob } from './knob';
import type { RuiKnob as RuiKnobElement } from './knob.script';

const cleanups: Array<() => void> = [];

async function mountKnob() {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(<RuiKnob value={0} min={0} max={100} />);
	cleanups.push(() => {
		root.unmount();
		host.remove();
	});
	await customElements.whenDefined('rui-knob');
	await new Promise((resolve) => setTimeout(resolve, 0));
	const knob = host.querySelector('rui-knob') as RuiKnobElement;
	const control = knob.querySelector('[data-ref="control"]') as HTMLElement;
	const rect = control.getBoundingClientRect();
	const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
	return { knob, control, center, radius: rect.width / 2 };
}

const pointer = (target: EventTarget, type: string, x: number, y: number) =>
	target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, button: 0, clientX: x, clientY: y }));

describe('rui-knob pointer drag', () => {
	afterEach(() => {
		for (const cleanup of cleanups.splice(0)) cleanup();
	});

	it('follows the pointer while dragging, flags data-dragging and stops on release', async () => {
		const { knob, control, center, radius } = await mountKnob();
		const changes: number[] = [];
		knob.addEventListener('rui-change', (event) => changes.push((event as CustomEvent).detail.value));

		pointer(control, 'pointerdown', center.x - radius, center.y + radius);
		const afterPress = knob.value;
		expect(control.hasAttribute('data-dragging')).toBe(true);

		pointer(document, 'pointermove', center.x + radius, center.y + radius);
		expect(knob.value).not.toBe(afterPress);

		pointer(document, 'pointerup', center.x + radius, center.y + radius);
		const released = knob.value;
		expect(control.hasAttribute('data-dragging')).toBe(false);

		pointer(document, 'pointermove', center.x, center.y - radius);
		expect(knob.value).toBe(released);
		expect(changes.length).toBeGreaterThan(0);
	});

	it('follows a control that arrives after the host connected', async () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		root.render(<RuiKnob value={0} min={0} max={100} />);
		await customElements.whenDefined('rui-knob');
		const knob = container.querySelector('rui-knob') as RuiKnobElement;
		const children = [...knob.childNodes];
		knob.replaceChildren();
		document.body.append(knob);
		knob.append(...children);
		await new Promise((resolve) => setTimeout(resolve, 0));
		cleanups.push(() => root.unmount());

		const control = knob.querySelector('[data-ref="control"]') as HTMLElement;
		const rect = control.getBoundingClientRect();
		const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
		pointer(control, 'pointerdown', center.x + rect.width / 2, center.y);

		expect(control.hasAttribute('data-dragging')).toBe(true);
		pointer(document, 'pointerup', center.x + rect.width / 2, center.y);
	});

	it.each(['replaced', 'removed and added back later'])(
		'drags a control that is %s after connect',
		async (change) => {
			const { knob, control, center, radius } = await mountKnob();
			const fresh = control.cloneNode(true) as HTMLElement;
			if (change === 'replaced') {
				control.replaceWith(fresh);
			} else {
				const marker = document.createComment('');
				control.replaceWith(marker);
				await new Promise((resolve) => setTimeout(resolve, 0));
				marker.replaceWith(fresh);
			}

			pointer(fresh, 'pointerdown', center.x + radius, center.y);
			pointer(document, 'pointerup', center.x + radius, center.y);

			expect(knob.value).toBeGreaterThan(0);
		},
	);

	it('ignores a press while disabled', async () => {
		const { knob, control, center, radius } = await mountKnob();
		knob.disabled = true;
		await knob.updateComplete;

		pointer(control, 'pointerdown', center.x + radius, center.y);

		expect(control.hasAttribute('data-dragging')).toBe(false);
		expect(knob.value).toBe(0);
	});
});
