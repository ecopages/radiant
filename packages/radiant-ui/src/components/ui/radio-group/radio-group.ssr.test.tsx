import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '@ecopages/radiant/server/radiant-element-ssr';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from '../alert/alert';
import { RuiRadio, RuiRadioGroup, RuiRadioGroupControl } from './radio-group';

describe('RuiRadioGroup SSR', () => {
	it('serializes unprefixed host props inside another custom element', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiAlert>
					<RuiRadioGroup value="email" name="contact" label="Preferred contact method" disabled={false}>
						<RuiRadioGroupControl>
							<RuiRadio value="email">Email</RuiRadio>
						</RuiRadioGroupControl>
					</RuiRadioGroup>
				</RuiAlert>,
			),
		);

		expect(html).toMatch(/<rui-radio-group[^>]*value="email"/);
		expect(html).toMatch(/<rui-radio-group[^>]*name="contact"/);
		expect(html).toMatch(/<rui-radio-group[^>]*label="Preferred contact method"/);
		expect(html).not.toMatch(/<rui-radio-group[^>]*\bdisabled=/);
	});

	it('gives every native radio the group name', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<RuiRadioGroup name="plan" label="Plan">
					<RuiRadioGroupControl>
						<RuiRadio value="free">Free</RuiRadio>
						<RuiRadio value="pro">Pro</RuiRadio>
						<RuiRadio value="team">Team</RuiRadio>
					</RuiRadioGroupControl>
				</RuiRadioGroup>,
			),
		);

		const radios = html.match(/<input[^>]*type="radio"[^>]*>/g) ?? [];
		expect(radios).toHaveLength(3);
		for (const radio of radios) expect(radio).toContain('name="plan"');
	});
});
