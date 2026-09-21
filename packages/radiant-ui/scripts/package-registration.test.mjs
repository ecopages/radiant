import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

for (const [entry, view, value, expectedInputs] of [
	['date-field', 'RuiDateField', '2026-08-07', 1],
	['date-range-picker', 'RuiDateRangePicker', '2026-08-07/2026-08-14', 2],
]) {
	test(`${entry} registers and server-renders its nested hosts from the built package`, () => {
		const result = spawnSync(
			process.execPath,
			[
				'--input-type=module',
				'-e',
				`
import assert from 'node:assert/strict';
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
const { ${view}: View } = await import('@ecopages/radiant-ui/${entry}');
for (const tag of ['rui-${entry}', 'rui-date-input', 'rui-calendar']) {
    assert.ok(customElements.get(tag), tag);
}
const html = withRadiantServerCustomElementRenderBridge(() =>
    renderToString(View({ value: '${value}', locale: 'en-US' }), { mode: 'hydrate' }),
);
const inputs = [...html.matchAll(/<rui-date-input\\b[\\s\\S]*?<\\/rui-date-input>/g)];
assert.equal(inputs.length, ${expectedInputs});
assert.ok(html.includes('data-calendar-grid'));
for (const [input] of inputs) {
    assert.ok(input.includes('data-date-segment'));
    assert.ok(input.includes('>2026</span>'));
}
`,
			],
			{ cwd: new URL('..', import.meta.url), encoding: 'utf8' },
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
	});
}
