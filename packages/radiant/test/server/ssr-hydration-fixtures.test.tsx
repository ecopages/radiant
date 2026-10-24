// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { SSR_HYDRATION_CASES } from '../fixtures/ssr-hydration/cases';

/**
 * Renders the markup the browser hydration tests start from, on the minimal DOM that production SSR uses.
 *
 * @remarks Kept as file snapshots so a server change shows up as a fixture diff and the browser tests always
 * hydrate real server output. Update with `vitest run -u`.
 */
describe('SSR hydration fixtures', () => {
	for (const [name, render] of Object.entries(SSR_HYDRATION_CASES)) {
		test(name, async () => {
			await expect(render()).toMatchFileSnapshot(`../fixtures/ssr-hydration/__snapshots__/${name}.html`);
		});
	}

	test('serializes the JSX children of a nested host in its marker namespace, without a slot payload', () => {
		const markup = SSR_HYDRATION_CASES['marker-slot-parent']?.() ?? '';

		expect(markup).toContain('<b data-radiant-jsx-bind-1="attr:title" title="inside-0">B</b>');
		expect(markup).toContain('<i data-radiant-jsx-bind-0="attr:title" title="after-0">I</i>');
		expect(markup).not.toContain('data-radiant-slot-projection');
	});
});
