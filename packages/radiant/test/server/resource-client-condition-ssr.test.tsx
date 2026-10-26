import '../../src/server/install-ssr-runtime';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@ecopages/radiant/is-server', () => ({ isServer: false }));

import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { createResource } from '../../src/signals/host-resource';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';

describe('createResource during SSR when the browser export condition is active', () => {
	test('does not start a fetch during host serialization', async () => {
		let fetches = 0;

		@customElement('server-client-condition-resource-card-test')
		class ServerClientConditionResourceCard extends RadiantElement {
			resource = createResource(this, {
				fetcher: async () => {
					fetches += 1;
					return 'weather';
				},
			});

			override render() {
				return <p>{this.resource.status.get()}</p>;
			}
		}

		const html = renderRadiantElementHostToString(new ServerClientConditionResourceCard());
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(html).toContain('<server-client-condition-resource-card-test>');
		expect(fetches).toBe(0);
	});
});
