import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { renderPlaygroundPreview } from '../src/components/component-playground/playground-previews';

describe('renderPlaygroundPreview', () => {
	test('renders popover with a trigger wrapper', () => {
		const preview = renderPlaygroundPreview('popover', {
			open: false,
			placement: 'bottom-start',
			portal: true,
			matchAnchorWidth: false,
			offset: 8,
		});

		expect(JSON.stringify(preview)).toContain('rui-popover-trigger');
	});

	test('renders sidebar provider demo instead of fallback copy', () => {
		const preview = renderPlaygroundPreview('sidebar', {
			collapsible: 'off',
			side: 'left',
			defaultOpen: true,
			resizable: false,
			defaultWidth: 256,
		});

		const serialized = JSON.stringify(preview);
		expect(serialized).toContain('rui-sidebar-provider');
		expect(serialized).not.toContain('requires layout context');
	});

	test('renders form fields with validation rules', () => {
		const preview = renderPlaygroundPreview('form', { mode: 'onSubmit' });
		const serialized = JSON.stringify(preview);

		expect(serialized).toContain('Email is required');
		expect(serialized).toContain('At least 10 characters');
	});

	test('renders expanded tree and treegrid examples', () => {
		const tree = JSON.stringify(renderPlaygroundPreview('tree', { value: 'button', label: 'Project files' }));
		const treegrid = JSON.stringify(renderPlaygroundPreview('treegrid', { value: 'button', label: 'Repository' }));

		expect(tree).toContain('components');
		expect(tree).toContain('button.tsx');
		expect(treegrid).toContain('components');
		expect(treegrid).toContain('4.2 KB');
	});

	test('renders toc demo with article headings', () => {
		const preview = JSON.stringify(
			renderPlaygroundPreview('toc', { headingSelector: 'h2,h3', label: 'On this page', scrollOffset: 80 }),
		);

		expect(preview).toContain('playground-toc-demo__article');
		expect(preview).toContain('Overview');
		expect(preview).toContain('rui-toc');
	});

	test('renders navigation menu megamenu panels', () => {
		const preview = JSON.stringify(renderPlaygroundPreview('navigation-menu', { label: 'Main' }));

		expect(preview).toContain('rui-navigation-menu__megamenu');
		expect(preview).toContain('Why these solutions?');
		expect(preview).toContain('Analytics');
	});

	test('renders date field props on the host element', () => {
		const preview = JSON.stringify(
			renderPlaygroundPreview('date-field', {
				value: '2026-12-25',
				dateStyle: 'long',
				disabled: true,
				readOnly: false,
				masked: false,
			}),
		);

		expect(preview).toContain('rui-date-field');
		expect(preview).toContain('2026-12-25');
		expect(preview).toContain('long');
		expect(preview).not.toContain('rui-field');
	});

	test('renders date range picker props on the host element', () => {
		const preview = JSON.stringify(
			renderPlaygroundPreview('date-range-picker', {
				value: '2026-08-01/2026-08-14',
				dateStyle: 'medium',
				visibleMonths: 2,
				disabled: false,
				readOnly: true,
			}),
		);

		expect(preview).toContain('rui-date-range-picker');
		expect(preview).toContain('2026-08-01/2026-08-14');
		expect(preview).not.toContain('rui-field');
	});
});

describe('DocsLayout persist markup', () => {
	test('marks the sidebar host for eco persist', () => {
		const layoutPath = fileURLToPath(new URL('../src/layouts/docs-layout/docs-layout.tsx', import.meta.url));
		const source = readFileSync(layoutPath, 'utf8');

		expect(source).toContain('data-eco-persist={DOCS_SIDEBAR_ID}');
		expect(source).not.toContain('scrollActiveOnMount');
		expect(source).toContain('<RuiSidebarContent aria-label="Component navigation">');
		expect(source).not.toContain('data={{ ecoPersist: DOCS_SIDEBAR_ID }}');
	});
});
