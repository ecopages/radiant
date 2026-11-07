import { beforeEach, describe, expect, test } from 'vitest';

import {
	captureSlottedNodes,
	collectAuthoredHydrationScriptMarkup,
	deserializeSlottedPayload,
	serializeSlottedPayload,
	SLOTTED_PAYLOAD_SCRIPT_ATTRIBUTE,
} from '../../src/core/slotted-content';
import { installLightDomShim } from '../../src/server/light-dom-shim';

describe('slotted content helpers', () => {
	beforeEach(() => {
		installLightDomShim();
	});

	test('round-trips captured light-DOM nodes through the slotted payload, without the server scripts', () => {
		const host = document.createElement('div');
		host.innerHTML =
			'<h2 data-note="1 > 0">SSR header</h2>' +
			'<article data-kind="primary"><p>SSR body</p></article>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>' +
			`<script type="application/json" ${SLOTTED_PAYLOAD_SCRIPT_ATTRIBUTE}>{"":["<p>ignored</p>"]}</script>`;

		const serialized = serializeSlottedPayload(captureSlottedNodes(host));

		expect(serialized).toEqual({
			'': ['<h2 data-note="1 > 0">SSR header</h2>', '<article data-kind="primary"><p>SSR body</p></article>'],
		});
		expect(serializeSlottedPayload(deserializeSlottedPayload(JSON.stringify(serialized)))).toEqual(serialized);
	});

	test('serializes comment nodes as nothing so their data cannot become payload markup', () => {
		const host = document.createElement('div');
		host.append(document.createComment('<img src=x onerror=alert(1)>'), document.createTextNode('kept'));

		expect(serializeSlottedPayload(captureSlottedNodes(host))).toEqual({ '': ['kept'] });
	});

	test('collects only authored hydration scripts from the host light DOM', () => {
		const hydrationMarkup =
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>';
		const host = document.createElement('div');
		host.innerHTML =
			'<p>SSR body</p>' +
			hydrationMarkup +
			`<script type="application/json" ${SLOTTED_PAYLOAD_SCRIPT_ATTRIBUTE}>{"": ["<p>SSR body</p>"]}</script>`;

		expect(collectAuthoredHydrationScriptMarkup(host)).toBe(hydrationMarkup);
	});
});
