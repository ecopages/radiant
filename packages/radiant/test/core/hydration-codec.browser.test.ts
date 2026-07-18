import { describe, expect, test, vi } from 'vitest';

import { findHydrationScript, parseHydrationPayload } from '../../src/core/hydration-codec';

describe('hydration codec helpers', () => {
	test('recovers from invalid hydration payload JSON by returning the fallback', () => {
		const script = document.createElement('script');
		script.textContent = '{bad-json';
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		try {
			expect(parseHydrationPayload(script, { count: 0 })).toEqual({ count: 0 });
			expect(warn).toHaveBeenCalledTimes(1);
		} finally {
			warn.mockRestore();
		}
	});

	test('finds keyed hydration scripts from real element children', () => {
		const host = document.createElement('div');
		host.innerHTML =
			'<script type="application/json" data-hydration data-hydration-type="context">{"count":1}</script>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>';

		const keyed = findHydrationScript(host, 'context', 'provider');
		const unkeyed = findHydrationScript(host, 'context');

		expect(keyed?.textContent).toBe('{"count":3}');
		expect(unkeyed?.textContent).toBe('{"count":1}');
	});

	test('falls back to childNodes when a host does not expose an element children collection', () => {
		const hydrationScript = document.createElement('script');
		hydrationScript.setAttribute('type', 'application/json');
		hydrationScript.setAttribute('data-hydration', '');
		hydrationScript.setAttribute('data-hydration-type', 'signal');
		hydrationScript.setAttribute('data-hydration-key', 'status');
		hydrationScript.textContent = '"ready"';

		const host = {
			childNodes: [document.createTextNode('ignore'), hydrationScript],
			children: undefined,
		} as unknown as Element;

		expect(findHydrationScript(host, 'signal', 'status')).toBe(hydrationScript);
	});
});
