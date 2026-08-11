import { describe, expect, test } from 'vitest';
import { meta as popoverMeta } from '../src/content/stories/popover';
import { meta as sidebarMeta } from '../src/content/stories/sidebar';
import { meta as formMeta } from '../src/content/stories/form';
import { meta as treeMeta } from '../src/content/stories/tree';
import { meta as treegridMeta } from '../src/content/stories/treegrid';
import { meta as tocMeta } from '../src/content/stories/toc';
import { meta as navigationMenuMeta } from '../src/content/stories/navigation-menu';
import { meta as dateFieldMeta } from '../src/content/stories/date-field';
import { meta as dateRangePickerMeta } from '../src/content/stories/date-range-picker';
import { meta as autocompleteMeta } from '../src/content/stories/autocomplete';
import { meta as menuButtonMeta } from '../src/content/stories/menu-button';
import { meta as radioGroupMeta } from '../src/content/stories/radio-group';

function serialize(element: unknown): string {
	return JSON.stringify(element);
}

describe('story preview renders', () => {
	test('popover renders with a trigger wrapper', () => {
		const preview = popoverMeta.render!({
			open: false,
			placement: 'bottom-start',
			portal: true,
			matchAnchorWidth: false,
			offset: 8,
		});

		expect(serialize(preview)).toContain('rui-popover-trigger');
	});

	test('sidebar renders provider demo instead of fallback copy', () => {
		const preview = sidebarMeta.render!({
			collapsible: 'off',
			side: 'left',
			defaultOpen: true,
			resizable: false,
			defaultWidth: 256,
		});

		const serialized = serialize(preview);
		expect(serialized).toContain('rui-sidebar-provider');
		expect(serialized).not.toContain('requires layout context');
	});

	test('form renders fields with validation rules', () => {
		const preview = formMeta.render!({ mode: 'onSubmit' });
		const serialized = serialize(preview);

		expect(serialized).toContain('Email is required');
		expect(serialized).toContain('At least 10 characters');
	});

	test('tree and treegrid render expanded examples', () => {
		const tree = serialize(treeMeta.render!({ value: 'button', label: 'Project files' }));
		const treegrid = serialize(treegridMeta.render!({ value: 'button', label: 'Repository' }));

		expect(tree).toContain('components');
		expect(tree).toContain('button.tsx');
		expect(treegrid).toContain('components');
		expect(treegrid).toContain('4.2 KB');
	});

	test('toc renders demo with article headings', () => {
		const preview = serialize(
			tocMeta.render!({ headingSelector: 'h2,h3', label: 'On this page', scrollOffset: 80 }),
		);

		expect(preview).toContain('playground-toc-demo__article');
		expect(preview).toContain('Overview');
		expect(preview).toContain('rui-toc');
	});

	test('navigation menu renders megamenu panels', () => {
		const preview = serialize(navigationMenuMeta.render!({ label: 'Main' }));

		expect(preview).toContain('rui-navigation-menu__megamenu');
		expect(preview).toContain('Why these solutions?');
		expect(preview).toContain('Analytics');
	});

	test('date field renders props on the host element', () => {
		const preview = serialize(
			dateFieldMeta.render!({
				value: '2026-12-25',
				dateStyle: 'long',
				visibleMonths: 1,
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

	test('autocomplete render reflects sensitivity arg', () => {
		const preview = serialize(autocompleteMeta.render!({ sensitivity: 'case' }));

		expect(preview).toContain('case');
		expect(preview).toContain('rui-listbox');
	});

	test('menu button and radio group render composed controls', () => {
		const menuButton = serialize(
			menuButtonMeta.render!({ open: false, placement: 'bottom-start', children: 'Actions' }),
		);
		const radioGroup = serialize(radioGroupMeta.render!({ value: 'pro', disabled: false, label: 'Plan' }));

		expect(menuButton).toContain('rui-menu-button__trigger');
		expect(menuButton).toContain('rui-menu-button__item');
		expect(radioGroup).toContain('rui-radio-group');
		expect(radioGroup).toContain('rui-radio');
	});

	test('date range picker renders props on the host element', () => {
		const preview = serialize(
			dateRangePickerMeta.render!({
				value: '2026-08-01/2026-08-14',
				dateStyle: 'medium',
				visibleMonths: 2,
				disabled: false,
				readOnly: true,
			}),
		);

		expect(preview).toContain('rui-date-range-picker');
		expect(preview).toContain('2026-08-01/2026-08-14');
		expect(preview).toContain('Trip dates');
	});
});
