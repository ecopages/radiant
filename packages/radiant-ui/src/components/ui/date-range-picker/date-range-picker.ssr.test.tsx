// @vitest-environment node
import '@ecopages/radiant/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiField } from '../field';
import { RuiLabel } from '../label';
import { RuiDateRangePicker } from './date-range-picker';

describe('RuiDateRangePicker view', () => {
	it('provides distinct default input labels and accepts custom labels', () => {
		const defaults = renderToString(<RuiDateRangePicker />);
		const custom = renderToString(<RuiDateRangePicker startLabel="Arrival date" endLabel="Departure date" />);

		expect(defaults).toContain('aria-label="Start date"');
		expect(defaults).toContain('aria-label="End date"');
		expect(custom).toContain('aria-label="Arrival date"');
		expect(custom).toContain('aria-label="Departure date"');
	});

	it('renders start and end segment values before hydration', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiDateRangePicker value="2026-01-08/2026-01-15" locale="en-US" startLabel="Start" endLabel="End" />,
			),
		);

		expect(html).toContain('>01</span>');
		expect(html).toContain('>08</span>');
		expect(html).toContain('>15</span>');
		expect(html).toContain('>2026</span>');
	});

	it('binds split range values onto nested date inputs during SSR', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(<RuiDateRangePicker value="2026-03-10/2026-03-20" locale="en-US" />),
		);

		expect(html).toMatch(/<rui-date-input[^>]*value="2026-03-10"[^>]*data-range-start/);
		expect(html).toMatch(/<rui-date-input[^>]*value="2026-03-20"[^>]*data-range-end/);
	});

	it('does not leak a field wrapper closing tag as text', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiField name="trip">
					<RuiLabel>Trip dates</RuiLabel>
					<RuiDateRangePicker value="2026-08-01/2026-08-14" locale="en-US" />
				</RuiField>,
			),
		);

		expect(html).not.toContain('&lt;/div&gt;');
		expect(html).toContain('Trip dates');
		expect(html).toContain('>2026</span>');
	});
});
