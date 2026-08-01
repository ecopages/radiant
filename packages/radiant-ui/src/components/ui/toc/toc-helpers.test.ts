import { describe, expect, it } from 'vitest';
import {
	ensureUniqueHeadingId,
	querySelectorAllSafe,
	querySelectorSafe,
	scrollHeadingIntoView,
	slugifyHeadingText,
	trackingLineY,
} from './toc-helpers';

describe('toc-helpers', () => {
	it('slugifies heading text', () => {
		expect(slugifyHeadingText('Hello World')).toBe('hello-world');
		expect(slugifyHeadingText('  API & Config! ')).toBe('api--config');
		expect(slugifyHeadingText('!!!')).toBe('');
	});

	it('returns null / empty for invalid selectors', () => {
		expect(querySelectorSafe(document, '[')).toBeNull();
		expect(querySelectorAllSafe(document, '[')).toEqual([]);
	});

	it('assigns collision-safe ids for repeated headings', () => {
		const used = new Set<string>();
		const taken = new Set<string>(['overview']);
		const isTaken = (id: string) => taken.has(id);

		const first = document.createElement('h2');
		first.textContent = 'Overview';
		expect(ensureUniqueHeadingId(first, used, isTaken)).toBe('overview-2');
		taken.add(first.id);

		const second = document.createElement('h2');
		second.textContent = 'Overview';
		expect(ensureUniqueHeadingId(second, used, isTaken)).toBe('overview-3');

		const withId = document.createElement('h2');
		withId.id = 'custom';
		withId.textContent = 'Overview';
		expect(ensureUniqueHeadingId(withId, used, isTaken)).toBe('custom');
		expect(used.has('custom')).toBe(true);
	});

	it('uses scroll-root top when computing the tracking line', () => {
		const root = document.createElement('div');
		root.getBoundingClientRect = () =>
			({
				top: 80,
				bottom: 480,
				left: 0,
				right: 300,
				width: 300,
				height: 400,
				x: 0,
				y: 80,
				toJSON() {},
			}) as DOMRect;

		expect(trackingLineY(root, 120)).toBe(200);
		expect(trackingLineY(window, 120)).toBe(120);
	});

	it('scrolls element roots relative to their visible top', () => {
		const root = document.createElement('div');
		Object.defineProperty(root, 'scrollTop', { value: 40, writable: true });
		root.getBoundingClientRect = () =>
			({
				top: 100,
				bottom: 500,
				left: 0,
				right: 300,
				width: 300,
				height: 400,
				x: 0,
				y: 100,
				toJSON() {},
			}) as DOMRect;

		const heading = document.createElement('h2');
		heading.getBoundingClientRect = () =>
			({
				top: 260,
				bottom: 280,
				left: 0,
				right: 300,
				width: 300,
				height: 20,
				x: 0,
				y: 260,
				toJSON() {},
			}) as DOMRect;

		const calls: Array<{ top?: number; behavior?: ScrollBehavior }> = [];
		root.scrollTo = ((options?: ScrollToOptions) => {
			calls.push(options ?? {});
		}) as typeof root.scrollTo;

		scrollHeadingIntoView(heading, root, 120, 'auto');
		expect(calls).toEqual([{ top: 80, behavior: 'auto' }]);
	});
});
