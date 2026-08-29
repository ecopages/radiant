import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { resetPreviewTimingForTests, resolvePreviewOpenDelay } from '../shared/preview-timing';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from './hover-card';
import type { RuiHoverCard as RuiHoverCardElement } from './hover-card.script';
import './hover-card.script';

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	document.body.appendChild(host);
	const root = createRoot(host);
	root.render(element);
	return {
		host,
		cleanup: () => {
			root.unmount();
			host.remove();
		},
	};
}

async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await customElements.whenDefined('rui-hover-card');
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

function getCard(host: ParentNode): RuiHoverCardElement {
	const card = host.querySelector('rui-hover-card');
	if (!(card instanceof HTMLElement)) {
		throw new Error('Expected rui-hover-card');
	}
	return card as RuiHoverCardElement;
}

function getContent(host: ParentNode): HTMLElement {
	const content = host.querySelector('.rui-hover-card__content');
	if (!(content instanceof HTMLElement)) {
		throw new Error('Expected hover card content');
	}
	return content;
}

function getTriggerButton(host: ParentNode): HTMLButtonElement {
	const button = host.querySelector('[data-hover-card-trigger] button');
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error('Expected trigger button');
	}
	return button;
}

describe('RuiHoverCard', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		resetPreviewTimingForTests();
	});

	it('opens on pointer enter and closes on escape with focus return', async () => {
		const { host, cleanup } = mount(
			<RuiHoverCard delay={0} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		const card = getCard(host);
		const content = getContent(host);
		const trigger = getTriggerButton(host);

		expect(content.hidden).toBe(true);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');

		card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		await settled();

		expect(content.hidden).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
		expect(trigger.getAttribute('aria-controls')).toBe(content.id);
		expect(content.getAttribute('aria-label')).toBe('Preview');

		trigger.focus();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settled();

		expect(content.hidden).toBe(true);
		expect(document.activeElement).toBe(trigger);

		cleanup();
	});

	it('does not reopen from focusin after Escape', async () => {
		const { host, cleanup } = mount(
			<RuiHoverCard delay={0} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		const card = getCard(host);
		const content = getContent(host);
		const trigger = getTriggerButton(host);

		card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		await settled();
		trigger.focus();
		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true, relatedTarget: trigger }));
		await settled();

		expect(content.hidden).toBe(true);

		cleanup();
	});

	it('respects open delay before showing', async () => {
		const { host, cleanup } = mount(
			<RuiHoverCard delay={50} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		const card = getCard(host);
		const content = getContent(host);

		card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		expect(content.hidden).toBe(true);

		await new Promise((resolve) => setTimeout(resolve, 80));
		await settled();
		expect(content.hidden).toBe(false);

		cleanup();
	});

	it('does not open when disabled', async () => {
		const { host, cleanup } = mount(
			<RuiHoverCard disabled delay={0} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		const card = getCard(host);
		const content = getContent(host);

		card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		await settled();

		expect(content.hidden).toBe(true);

		cleanup();
	});

	it('emits rui-open-change when visibility changes', async () => {
		const { host, cleanup } = mount(
			<RuiHoverCard delay={0} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		const card = getCard(host);
		const events: boolean[] = [];
		card.addEventListener('rui-open-change', (event) => {
			events.push((event as CustomEvent<{ open: boolean }>).detail.open);
		});

		card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		await settled();
		card.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
		await settled();

		expect(events).toEqual([true, false]);

		cleanup();
	});

	it('does not leak preview warmup after an open card unmounts', async () => {
		const { host, cleanup } = mount(
			<RuiHoverCard delay={0} closeDelay={0}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		getCard(host).dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		await settled();
		expect(getContent(document).hidden).toBe(false);

		cleanup();
		expect(resolvePreviewOpenDelay(600, Date.now() + 1_000)).toBe(600);
	});
});
