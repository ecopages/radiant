import { describe, expect, test } from 'vitest';
import { jsx } from '@ecopages/jsx';
import { RenderRuntime, type RenderRuntimeHost } from '../../src/core/render-runtime';

/**
 * Regression coverage for hydration feeding a host's own SSR output back in as slotted content.
 *
 * On first hydrate the host already holds its server-rendered markup while `hasMounted` is still false, so the
 * "host has children means captured light DOM" heuristic used to capture that output. The slotted value then became
 * an ancestor of the very range it was inserted into, and `insertNodesBefore` threw a `HierarchyRequestError`.
 */
function createHost(
	innerHTML: string,
	wrap: (slotted: unknown) => unknown = (slotted) => jsx('div', { children: slotted }),
) {
	const host = document.createElement('slotted-runtime-host') as RenderRuntimeHost;
	host.innerHTML = innerHTML;
	const runtime = new RenderRuntime(host);
	host.render = () => wrap(runtime.getSlotted()) as never;
	host.requestUpdate = () => {};
	document.body.appendChild(host);
	return { host, runtime };
}

const SSR_OUTPUT = '<div data-radiant-jsx-bind-0="attr:class" class="card"><div data-ref="pane"></div></div>';

describe('RenderRuntime slotted content', () => {
	test("ignores the host's own SSR output when hydration markers are present", () => {
		const { host, runtime } = createHost(SSR_OUTPUT);

		runtime.hydrate(host);

		expect(runtime.hasCapturedSlotted).toBe(false);
		expect(runtime.getSlotted()).toBeNull();
		host.remove();
	});

	test('captures authored light DOM that carries no hydration markers', () => {
		const { host, runtime } = createHost('<span data-authored>authored</span>');
		const authored = host.querySelector('[data-authored]');

		runtime.render(host);

		expect(runtime.hasCapturedSlotted).toBe(true);
		expect(host.querySelector('div > [data-authored]')).toBe(authored);
		expect(runtime.getSlottedElements()).toEqual([authored]);
		host.remove();
	});

	test('moves the live light-DOM node into slotted content placed inside svg', () => {
		const text = '<img id="pwn" src="x"><b>b</b>';
		const style = document.createElement('style');
		style.textContent = text;
		const { host, runtime } = createHost('', (slotted) => jsx('svg', { children: slotted }));
		host.append(style);

		runtime.render(host);

		expect(host.querySelector('svg style')).toBe(style);
		expect(style.textContent).toBe(text);
		expect(host.querySelector('img')).toBeNull();
		host.remove();
	});
});
