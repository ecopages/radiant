import '@ecopages/radiant/client/install-hydrator';
import { beforeEach } from 'vitest';
import { userEvent } from 'vitest/browser';

/**
 * The browser pointer outlives each test, so a hover left by one test would put a
 * freshly mounted element under the cursor and fire `pointerenter` on it.
 *
 * @remarks Hover-paused components (carousel, toast) would then start paused. Moving
 * the pointer to `document.body` before every test keeps tests independent of order.
 */
beforeEach(async () => {
	await userEvent.unhover(document.body);
});
