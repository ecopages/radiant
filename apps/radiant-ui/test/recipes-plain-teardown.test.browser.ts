import { afterEach, describe, expect, test } from 'vitest';
import '../src/components/primitive-example/primitive-example.css';
import '../src/content/components/recipes/board.css';
import '../src/content/components/recipes/modal.css';
import '../src/content/components/recipes/popover-menu.css';
import '../src/content/components/recipes/sortable-list.css';
import '../src/content/components/recipes/swipe-card.css';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { mountForm, trackListeners } from './mount-recipe';

function pointerdown(target: Element): void {
	target.dispatchEvent(
		new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: 5, clientY: 5 }),
	);
}

/** Puts the recipe into the state that holds the most listeners, so the cleanup has the most to undo. */
const engage: Record<string, (root: HTMLElement) => void> = {
	modal: (root) => root.querySelector<HTMLElement>('[data-open]')!.click(),
	'popover-menu': (root) => root.querySelector<HTMLElement>('button')!.click(),
	'sortable-list': (root) => pointerdown(root.querySelector('li')!),
	board: (root) => pointerdown(root.querySelector('[data-card]')!),
	'swipe-card': (root) => pointerdown(root.querySelector('[data-card]')!),
};

afterEach(() => {
	document.body.innerHTML = '';
	document.documentElement.removeAttribute('style');
});

describe('plain recipe cleanup', () => {
	test.each(['board', 'calendar-events', 'modal', 'popover-menu', 'searchable-list', 'sortable-list', 'swipe-card'])(
		'%s leaves nothing on the document or window once its element leaves the page',
		async (slug) => {
			(await mountForm(slug, 'plain')).remove();
			syncExamples();
			const tracker = trackListeners();
			try {
				const baseline = tracker.live(document, window);
				const root = await mountForm(slug, 'plain');
				engage[slug]?.(root);

				root.remove();
				syncExamples();

				expect(tracker.live(document, window)).toEqual(baseline);
				expect(document.documentElement.style.overflow).toBe('');
			} finally {
				tracker.stop();
			}
		},
	);
});
