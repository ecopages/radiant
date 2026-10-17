// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { describe, expect, test } from 'vitest';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';
import { SignalComponent } from '../fixtures/signal-component';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

describeWhenStandard('pre-connect signal and SSR', () => {
	test('supports pre-connect signal reads and writes for host rendering', () => {
		const element = new SignalComponent();

		element.count.set(4);
		element.status.set('loading');

		const html = renderRadiantElementHostToString(element);

		expect(html).toContain('Count: 4');
		expect(html).toContain('Loading');
	});

	test('appends signal hydration scripts to SSR host output when requested', () => {
		const element = new SignalComponent();
		element.status.set('ready');
		const html = renderRadiantElementHostToString(element, { mode: 'hydrate' });

		expect(html).toContain('<signal-component-test data-radiant-ssr>');
		expect(html).toContain(
			'<script type="application/json" data-hydration data-hydration-type="signal" data-hydration-key="status">"ready"</script>',
		);
	});
});
