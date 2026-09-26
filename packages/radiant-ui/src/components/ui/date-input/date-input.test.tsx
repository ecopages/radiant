import { afterEach, describe, expect, it } from 'vitest';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { userEvent } from 'storybook/test';
import { RuiDateInput } from './date-input';
import type { RuiDateInput as RuiDateInputElement } from './date-input.script';
import './date-input.css';

function mount(element: JsxRenderable) {
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	root.render(element);
	return {
		container,
		cleanup: () => {
			root.unmount();
			container.remove();
		},
	};
}

async function connected(container: HTMLElement): Promise<RuiDateInputElement> {
	await customElements.whenDefined('rui-date-input');
	await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
	return container.querySelector('rui-date-input') as RuiDateInputElement;
}

async function settle(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

function segment(host: HTMLElement, type: 'month' | 'day' | 'year'): HTMLElement {
	return host.querySelector(`[data-date-segment][data-type="${type}"]`) as HTMLElement;
}

function hiddenInput(host: HTMLElement): HTMLInputElement {
	return host.querySelector('[data-date-input-hidden]') as HTMLInputElement;
}

function listenChanges(host: HTMLElement): string[] {
	const values: string[] = [];
	host.addEventListener('rui-change', (event) => {
		values.push((event as CustomEvent<{ value: string }>).detail.value);
	});
	return values;
}

describe('RuiDateInput segment editing', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('keeps a partial day local until the second digit completes the unit', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);
		const day = segment(host, 'day');
		let yearFocusIns = 0;
		let dayFocusIns = 0;
		host.addEventListener('focusin', (event) => {
			const type = (event.target as HTMLElement | null)?.getAttribute('data-type');
			if (type === 'year') {
				yearFocusIns += 1;
			}
			if (type === 'day') {
				dayFocusIns += 1;
			}
		});

		await userEvent.click(day);
		await userEvent.keyboard('1');
		await settle();

		expect(segment(host, 'day').textContent).toBe('1');
		expect(host.value).toBe('2026-08-20');
		expect(hiddenInput(host).value).toBe('2026-08-20');
		expect(changes).toEqual([]);
		expect(document.activeElement).toBe(segment(host, 'day'));
		expect(yearFocusIns).toBe(0);

		await userEvent.keyboard('5');
		await settle();

		expect(segment(host, 'day').textContent).toBe('15');
		expect(host.value).toBe('2026-08-15');
		expect(hiddenInput(host).value).toBe('2026-08-15');
		expect(changes).toEqual(['2026-08-15']);
		expect(document.activeElement).toBe(segment(host, 'year'));
		expect(dayFocusIns).toBeLessThan(8);
		expect(yearFocusIns).toBeLessThan(8);
		cleanup();
	});

	it('does not commit a partial year while digits are still being entered', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'year'));
		await userEvent.keyboard('1');
		await settle();

		expect(segment(host, 'year').textContent).toBe('1');
		expect(host.value).toBe('2026-08-20');
		expect(hiddenInput(host).value).toBe('2026-08-20');
		expect(changes).toEqual([]);
		expect(document.activeElement).toBe(segment(host, 'year'));

		await userEvent.keyboard('999');
		await settle();

		expect(segment(host, 'year').textContent).toBe('1999');
		expect(host.value).toBe('1999-08-20');
		expect(hiddenInput(host).value).toBe('1999-08-20');
		expect(changes).toEqual(['1999-08-20']);
		cleanup();
	});

	it('finalizes the prior segment when focus moves to another unit', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'day'));
		await userEvent.keyboard('1');
		await settle();
		await userEvent.keyboard('{ArrowRight}');
		await settle();

		expect(host.value).toBe('2026-08-01');
		expect(segment(host, 'day').textContent).toBe('01');
		expect(document.activeElement).toBe(segment(host, 'year'));
		expect(changes).toEqual(['2026-08-01']);
		cleanup();
	});

	it('commits a completed partial day on blur', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'day'));
		await userEvent.keyboard('1');
		await settle();
		await userEvent.click(document.body);
		await settle();

		expect(host.value).toBe('2026-08-01');
		expect(hiddenInput(host).value).toBe('2026-08-01');
		expect(changes).toEqual(['2026-08-01']);
		cleanup();
	});

	it('restores the committed date when blur leaves an incomplete draft', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'year'));
		await userEvent.keyboard('1');
		await settle();
		await userEvent.click(document.body);
		await settle();

		expect(host.value).toBe('2026-08-20');
		expect(segment(host, 'year').textContent).toBe('2026');
		expect(changes).toEqual([]);
		cleanup();
	});

	it('treats backspace as a new in-progress buffer instead of committing the trimmed day', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'day'));
		await userEvent.keyboard('{Backspace}');
		await settle();

		expect(segment(host, 'day').textContent).toBe('2');
		expect(host.value).toBe('2026-08-20');
		expect(changes).toEqual([]);

		await userEvent.keyboard('5');
		await settle();

		expect(segment(host, 'day').textContent).toBe('25');
		expect(host.value).toBe('2026-08-25');
		expect(changes).toEqual(['2026-08-25']);
		cleanup();
	});

	it('clears the typing buffer when arrow keys increment a segment', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'day'));
		await userEvent.keyboard('1');
		await settle();
		await userEvent.keyboard('{ArrowUp}');
		await settle();

		expect(segment(host, 'day').textContent).toBe('02');
		expect(host.value).toBe('2026-08-02');
		expect(changes).toEqual(['2026-08-02']);
		expect(document.activeElement).toBe(segment(host, 'day'));
		cleanup();
	});

	it('commits a full typed date from empty segments', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'month'));
		await userEvent.keyboard('08');
		await settle();
		await userEvent.click(segment(host, 'day'));
		await userEvent.keyboard('07');
		await settle();
		await userEvent.click(segment(host, 'year'));
		await userEvent.keyboard('2026');
		await settle();
		await userEvent.click(document.body);
		await settle();

		expect(segment(host, 'year').textContent).toBe('2026');
		expect(host.value).toBe('2026-08-07');
		expect(hiddenInput(host).value).toBe('2026-08-07');
		expect(changes).toEqual(['2026-08-07']);
		cleanup();
	});

	it('keeps filled units when focus moves to a still-empty segment', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="" locale="en-US" />);
		const host = await connected(container);
		const changes = listenChanges(host);

		await userEvent.click(segment(host, 'month'));
		await userEvent.keyboard('08');
		await settle();
		expect(segment(host, 'month').textContent).toBe('08');
		expect(host.value).toBe('');
		expect(changes).toEqual([]);

		await userEvent.click(segment(host, 'day'));
		await settle();
		expect(segment(host, 'month').textContent).toBe('08');
		expect(document.activeElement).toBe(segment(host, 'day'));
		cleanup();
	});

	it('replaces an in-progress draft when value is assigned from outside', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-08-20" locale="en-US" />);
		const host = await connected(container);

		await userEvent.click(segment(host, 'day'));
		await userEvent.keyboard('1');
		await settle();
		host.value = '2026-09-01';
		await settle();

		expect(segment(host, 'day').textContent).toBe('01');
		expect(segment(host, 'month').textContent).toBe('09');
		expect(host.value).toBe('2026-09-01');
		expect(hiddenInput(host).value).toBe('2026-09-01');
		cleanup();
	});
});

describe('RuiDateInput styles', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('keeps focused segment text legible against its focus fill', async () => {
		const { container, cleanup } = mount(<RuiDateInput value="2026-09-25" locale="en-US" />);
		await customElements.whenDefined('rui-date-input');
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

		const host = container.querySelector('rui-date-input') as HTMLElement;
		const focusedSegment = host.querySelector('[data-date-segment]') as HTMLElement;
		host.style.setProperty('--focus-ring', 'rgb(1, 2, 3)');
		host.style.setProperty('--on-primary', 'rgb(4, 5, 6)');
		focusedSegment.setAttribute('data-focused', 'true');
		const styles = getComputedStyle(focusedSegment);
		expect(styles.backgroundColor).toBe('rgb(1, 2, 3)');
		expect(styles.color).toBe('rgb(4, 5, 6)');
		expect(styles.webkitTextFillColor).toBe('rgb(4, 5, 6)');
		expect(styles.opacity).toBe('1');
		cleanup();
	});
});
