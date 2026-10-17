// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { describe, expect, it } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import {
	renderRadiantElementHostToString,
	renderRadiantElementViewToString,
	SERVER_RENDERED_HOST_ATTRIBUTE,
} from '../../src/server/radiant-element-ssr';

@customElement('server-rendered-host-test')
class ServerRenderedHost extends RadiantElement {
	override render() {
		return <p>view</p>;
	}
}

describe('the server-rendered host stamp', () => {
	it('is written in hydrate mode, including the hydrate flag spelling', () => {
		for (const options of [{ mode: 'hydrate' as const }, { hydrate: true }]) {
			expect(renderRadiantElementHostToString(new ServerRenderedHost(), options)).toContain(
				`<server-rendered-host-test ${SERVER_RENDERED_HOST_ATTRIBUTE}>`,
			);
		}
	});

	it('is not written in plain mode', () => {
		expect(renderRadiantElementHostToString(new ServerRenderedHost(), { mode: 'plain' })).not.toContain(
			SERVER_RENDERED_HOST_ATTRIBUTE,
		);
	});

	it('is not written by the view-only serializer, which has no host tag', () => {
		expect(renderRadiantElementViewToString(new ServerRenderedHost(), { mode: 'hydrate' })).not.toContain(
			SERVER_RENDERED_HOST_ATTRIBUTE,
		);
	});
});
