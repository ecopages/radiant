import { describe, expect, test } from 'vitest';
import { jsx } from '@ecopages/jsx';
import { RenderRuntime, type RenderRuntimeHost } from '../../src/core/render-runtime';

/**
 * Regression coverage for hydration feeding a host's own SSR output back in as slot content.
 *
 * On first hydrate the host already holds its server-rendered markup while `hasMounted` is
 * still false, so the "host has children ⇒ authored light DOM" heuristic used to capture
 * that output as default-slot content. The slot value then became an ancestor of the very
 * range it was inserted into, and `insertNodesBefore` threw a `HierarchyRequestError`.
 */
function createHost(innerHTML: string): RenderRuntimeHost {
	const host = document.createElement('slot-projection-host') as RenderRuntimeHost;
	host.innerHTML = innerHTML;
	host.render = () => jsx('div', { children: jsx('slot', {}) });
	host.requestUpdate = () => {};
	document.body.appendChild(host);
	return host;
}

const SSR_OUTPUT = '<div data-radiant-jsx-bind-0="attr:class" class="card"><div data-ref="pane"></div></div>';
const AUTHORED_LIGHT_DOM = '<span data-authored>authored</span>';

describe('RenderRuntime slot projection', () => {
	test("ignores the host's own SSR output when hydration markers are present", () => {
		const host = createHost(SSR_OUTPUT);
		const runtime = new RenderRuntime(host);

		runtime.hydrate(host);

		// Nothing was captured as slot content, so the version counter never advanced.
		expect(runtime.slotProjectionVersion).toBe(0);
		host.remove();
	});

	test('still captures authored light DOM that carries no hydration markers', () => {
		const host = createHost(AUTHORED_LIGHT_DOM);
		const runtime = new RenderRuntime(host);

		runtime.render(host);

		expect(runtime.slotProjectionVersion).toBe(1);
		host.remove();
	});
});
