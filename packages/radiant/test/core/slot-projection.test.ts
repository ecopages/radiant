import { beforeEach, describe, expect, test } from 'vitest';

import {
	captureProjectedSlotRenderables,
	collectAuthoredHydrationScriptMarkup,
	deserializeProjectedSlotRenderables,
	serializeProjectedSlotRenderables,
	SLOT_PROJECTION_SCRIPT_ATTRIBUTE,
} from '../../src/core/slot-projection-runtime';
import { installLightDomShim } from '../../src/server/light-dom-shim';

describe('slot projection helpers', () => {
	beforeEach(() => {
		installLightDomShim();
	});

	test('round-trips projected light-DOM nodes through slot projection payloads', () => {
		const host = document.createElement('div');
		host.innerHTML =
			'<h2 slot="header" data-note="1 > 0">SSR header</h2>' +
			'<article data-kind="primary"><p>SSR body</p></article>' +
			'<p slot="footer">SSR footer</p>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>' +
			`<script type="application/json" ${SLOT_PROJECTION_SCRIPT_ATTRIBUTE}>{"ignored":["<p>ignored</p>"]}</script>`;

		const parsed = captureProjectedSlotRenderables(host);
		const serialized = serializeProjectedSlotRenderables(parsed);

		expect(JSON.parse(serialized!)).toEqual({
			'': ['<article data-kind="primary"><p>SSR body</p></article>'],
			footer: ['<p slot="footer">SSR footer</p>'],
			header: ['<h2 slot="header" data-note="1 > 0">SSR header</h2>'],
		});
		expect(serializeProjectedSlotRenderables(deserializeProjectedSlotRenderables(serialized!))).toBe(serialized);
	});

	test('collects only authored hydration scripts from the host light DOM', () => {
		const hydrationMarkup =
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>';
		const host = document.createElement('div');
		host.innerHTML =
			'<p>SSR body</p>' +
			hydrationMarkup +
			`<script type="application/json" ${SLOT_PROJECTION_SCRIPT_ATTRIBUTE}>{"": ["<p>SSR body</p>"]}</script>`;

		expect(collectAuthoredHydrationScriptMarkup(host)).toBe(hydrationMarkup);
	});
});
