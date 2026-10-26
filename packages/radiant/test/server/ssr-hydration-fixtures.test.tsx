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

	test('ships the JSX children of a nested host as Authored Children with a slot payload in plain mode', () => {
		const markup = SSR_HYDRATION_CASES['root-slot-parent-plain']?.() ?? '';

		expect(markup).toContain(
			'<hydrated-marker-slot-child-test><div class="child"><b title="inside-0">B</b></div><script type="application/json" data-radiant-slot-projection>',
		);
		expect(markup).not.toContain('data-radiant-ssr');
	});

	test('ships Authored Children when a render-owning host has no slot in its server-time view', () => {
		const markup = SSR_HYDRATION_CASES['conditional-slot']?.() ?? '';
		const payload = markup.match(/<script type="application\/json" data-radiant-slot-projection>(.*?)<\/script>/)?.[1];

		expect(payload).toBeDefined();
		expect(JSON.parse(payload ?? 'null')).toEqual({ '': ['<em>child</em>'] });
	});

	test('does not ship a slot payload for a View-owned Shell', () => {
		const markup = SSR_HYDRATION_CASES['view-owned-shell']?.() ?? '';

		expect(markup).not.toContain('data-radiant-slot-projection');
	});
});
