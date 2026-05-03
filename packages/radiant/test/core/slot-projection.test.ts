import { describe, expect, test } from 'vitest';

import {
	collectAuthoredHydrationScriptMarkupFromHtml,
	parseProjectedSlotRenderablesFromHtml,
} from '../../src/server/slot-projection-html';
import {
	deserializeProjectedSlotRenderables,
	serializeProjectedSlotRenderables,
	SLOT_PROJECTION_SCRIPT_ATTRIBUTE,
} from '../../src/core/slot-projection-runtime';

describe('slot projection helpers', () => {
	test('round-trips parsed projected HTML through slot projection payloads', () => {
		const html =
			'<h2 slot="header" data-note="1 > 0">SSR header</h2>' +
			'<article data-kind="primary"><p>SSR body</p></article>' +
			'<p slot="footer">SSR footer</p>' +
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>' +
			`<script type="application/json" ${SLOT_PROJECTION_SCRIPT_ATTRIBUTE}>{"ignored":["<p>ignored</p>"]}</script>`;

		const parsed = parseProjectedSlotRenderablesFromHtml(html);
		const serialized = serializeProjectedSlotRenderables(parsed);

		expect(JSON.parse(serialized!)).toEqual({
			'': ['<article data-kind="primary"><p>SSR body</p></article>'],
			footer: ['<p slot="footer">SSR footer</p>'],
			header: ['<h2 slot="header" data-note="1 > 0">SSR header</h2>'],
		});
		expect(serializeProjectedSlotRenderables(deserializeProjectedSlotRenderables(serialized!))).toBe(serialized);
	});

	test('collects only authored hydration scripts from serialized host HTML', () => {
		const hydrationMarkup =
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":3}</script>';
		const html =
			'<p>SSR body</p>' +
			hydrationMarkup +
			`<script type="application/json" ${SLOT_PROJECTION_SCRIPT_ATTRIBUTE}>{"": ["<p>SSR body</p>"]}</script>`;

		expect(collectAuthoredHydrationScriptMarkupFromHtml(html)).toBe(hydrationMarkup);
	});
});
