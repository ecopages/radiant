import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import {
	RuiDisclosure,
	RuiDisclosureGroup,
	RuiDisclosureIcon,
	RuiDisclosurePanel,
	RuiDisclosureTrigger,
} from './disclosure';

describe('RuiDisclosure SSR', () => {
	it('renders default chevron down indicator at start position', () => {
		const html = renderToString(
			<RuiDisclosure trigger="Order details">
				<p>Your order will arrive soon.</p>
			</RuiDisclosure>,
		);

		expect(html).toContain('data-disclosure-trigger');
		expect(html).toContain('data-disclosure-icon');
		expect(html).toContain('rui-disclosure__icon--chevron');
		expect(html).toContain('<path d="m6 9 6 6 6-6"');
		expect(html).not.toContain('rui-disclosure__trigger--icon-end');

		const iconIndex = html.indexOf('data-disclosure-icon');
		const labelIndex = html.indexOf('Order details');
		expect(iconIndex).toBeLessThan(labelIndex);
	});

	it('supports iconPosition="end" on RuiDisclosure convenience trigger', () => {
		const html = renderToString(
			<RuiDisclosure trigger="Order details" iconPosition="end">
				<p>Your order will arrive soon.</p>
			</RuiDisclosure>,
		);

		expect(html).toContain('rui-disclosure__trigger--icon-end');
		const iconIndex = html.indexOf('data-disclosure-icon');
		const labelIndex = html.indexOf('Order details');
		expect(labelIndex).toBeLessThan(iconIndex);
	});

	it('supports iconPosition="end" on RuiDisclosureTrigger', () => {
		const html = renderToString(
			<RuiDisclosure>
				<RuiDisclosureTrigger iconPosition="end">Custom trigger</RuiDisclosureTrigger>
				<RuiDisclosurePanel>Content</RuiDisclosurePanel>
			</RuiDisclosure>,
		);

		expect(html).toContain('rui-disclosure__trigger--icon-end');
		const iconIndex = html.indexOf('data-disclosure-icon');
		const labelIndex = html.indexOf('Custom trigger');
		expect(labelIndex).toBeLessThan(iconIndex);
	});

	it('suppresses indicator when icon is null', () => {
		const html = renderToString(
			<RuiDisclosure trigger="No icon" icon={null}>
				<p>Content</p>
			</RuiDisclosure>,
		);

		expect(html).not.toContain('data-disclosure-icon');
		expect(html).not.toContain('<path d="m6 9 6 6 6-6"');
	});

	it('renders plus indicator variant without SVG child', () => {
		const html = renderToString(
			<RuiDisclosure trigger="Expandable" icon={<RuiDisclosureIcon variant="plus" />}>
				<p>Content</p>
			</RuiDisclosure>,
		);

		expect(html).toContain('rui-disclosure__icon--plus');
		expect(html).not.toContain('<path d="m6 9 6 6 6-6"');
	});

	it('renders inside a disclosure group', () => {
		const html = renderToString(
			<RuiDisclosureGroup>
				<RuiDisclosure value="one" trigger="Item 1" iconPosition="end">
					Content 1
				</RuiDisclosure>
				<RuiDisclosure value="two" trigger="Item 2" iconPosition="start">
					Content 2
				</RuiDisclosure>
			</RuiDisclosureGroup>,
		);

		expect(html).toContain('rui-disclosure-group');
		expect(html).toContain('rui-disclosure__trigger--icon-end');
	});
});
