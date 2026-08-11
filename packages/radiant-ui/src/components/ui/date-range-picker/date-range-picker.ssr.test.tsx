import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
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
});
