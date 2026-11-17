import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { resetPreviewTimingForTests, resolvePreviewOpenDelay } from '../shared/preview-timing';
import { RuiHoverCard, RuiHoverCardContent, RuiHoverCardTrigger } from './hover-card';
import { RuiHoverCard as RuiHoverCardElement } from './hover-card.script';
import { expectPopupFoundAcrossPortalCycle } from '../../../controllers/exit-transition.fixture';
import { fakeTimers } from '../../../controllers/event.fixture';
void RuiHoverCardElement;

function mount(element: JsxRenderable): { host: HTMLElement; cleanup: () => void } {
	const host = document.createElement('div');
	host.style.position = 'fixed';
	host.style.left = '-10000px';
	host.style.top = '-10000px';
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
	await new Promise((resolve) => {
		const channel = new MessageChannel();
		channel.port1.onmessage = () => resolve(undefined);
		channel.port2.postMessage(null);
	});
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
		vi.useRealTimers();
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

	it('stays closed after Escape on a pointer-opened card, even with a warmed-up delay', async () => {
		fakeTimers(['setTimeout', 'clearTimeout', 'Date']);
		const { host, cleanup } = mount(
			<RuiHoverCard delay={600} closeDelay={0}>
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
		const events: boolean[] = [];
		card.addEventListener('rui-open-change', (event) => events.push((event as CustomEvent).detail.open));

		card.setOpen(true);
		await settled();
		expect(document.activeElement).not.toBe(trigger);

		document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await settled();

		expect(document.activeElement).toBe(trigger);
		expect(content.hidden).toBe(true);
		expect(events).toEqual([true, false]);

		trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		await settled();
		expect(content.hidden).toBe(true);
		expect(events).toEqual([true, false]);

		vi.advanceTimersByTime(700);
		await settled();
		expect(content.hidden).toBe(true);
		expect(events).toEqual([true, false]);

		trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
		trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		vi.advanceTimersByTime(700);
		await settled();
		expect(content.hidden).toBe(false);

		cleanup();
	});

	it('reopens at once on focus within the cooldown after a close, and waits the delay after it', async () => {
		fakeTimers(['setTimeout', 'clearTimeout', 'Date']);
		const { host, cleanup } = mount(
			<RuiHoverCard delay={600} closeDelay={0}>
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

		card.setOpen(true);
		card.setOpen(false);
		trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		await settled();
		expect(content.hidden).toBe(false);

		card.setOpen(false);
		vi.advanceTimersByTime(700);
		trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		await settled();
		expect(content.hidden).toBe(true);
		vi.advanceTimersByTime(700);
		await settled();
		expect(content.hidden).toBe(false);

		cleanup();
	});

	it('keeps the card open when the pointer moves from the trigger onto the card', async () => {
		fakeTimers(['setTimeout', 'clearTimeout', 'Date']);
		const { host, cleanup } = mount(
			<RuiHoverCard delay={0} closeDelay={60}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();

		const card = getCard(host);
		const content = getContent(host);
		const events: boolean[] = [];
		card.addEventListener('rui-open-change', (event) => events.push((event as CustomEvent).detail.open));

		card.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }));
		await settled();
		expect(content.hidden).toBe(false);

		card.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true, pointerType: 'mouse' }));
		content.dispatchEvent(new PointerEvent('pointerenter', { bubbles: false, pointerType: 'mouse' }));
		vi.advanceTimersByTime(120);
		await settled();

		expect(content.hidden).toBe(false);
		expect(events).toEqual([true]);

		cleanup();
	});

	it('respects open delay before showing', async () => {
		fakeTimers(['setTimeout', 'clearTimeout', 'Date']);
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

		vi.advanceTimersByTime(80);
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

describe('RuiHoverCard portal container', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		resetPreviewTimingForTests();
	});

	async function mountCard(portalContainer?: string) {
		const frame = document.createElement('div');
		frame.id = 'frame';
		document.body.append(frame);
		const { host } = mount(
			<RuiHoverCard delay={0} closeDelay={0} portalContainer={portalContainer}>
				<RuiHoverCardTrigger>
					<button type="button">Trigger</button>
				</RuiHoverCardTrigger>
				<RuiHoverCardContent>Preview</RuiHoverCardContent>
			</RuiHoverCard>,
		);
		await settled();
		return { card: getCard(host), content: getContent(host), frame };
	}

	it('finds the current content while open, during its exit, and after a reopen with a new node', async () => {
		const { card, content } = await mountCard();

		await expectPopupFoundAcrossPortalCycle({
			popup: content,
			portaled: true,
			find: () => Reflect.apply(Reflect.get(card, 'getFloatingElement'), card, []),
			open: async () => {
				card.setOpen(true);
				await settled();
			},
			close: async () => {
				card.setOpen(false);
				await settled();
			},
		});
	});

	it('keeps the accessible name in sync on the content while it is portaled', async () => {
		const { card, content } = await mountCard();
		card.setOpen(true);
		await settled();
		expect(content.parentElement).toBe(document.body);

		card.contentLabel = 'Profile';
		await settled();

		expect(content.getAttribute('aria-label')).toBe('Profile');
	});

	it('mounts the content in the element a selector names, and back in the card on close', async () => {
		const { card, content, frame } = await mountCard('#frame');

		card.setOpen(true);
		await settled();
		expect(content.parentElement).toBe(frame);

		card.setOpen(false);
		await settled();
		expect(card.contains(content)).toBe(true);
	});

	it('honors a container property changed between opens', async () => {
		const { card, content, frame } = await mountCard();
		const other = document.createElement('div');
		document.body.append(other);

		card.portalContainer = frame;
		card.setOpen(true);
		await settled();
		expect(content.parentElement).toBe(frame);
		card.setOpen(false);
		await settled();

		card.portalContainer = () => other;
		card.setOpen(true);
		await settled();
		expect(content.parentElement).toBe(other);
	});
});
