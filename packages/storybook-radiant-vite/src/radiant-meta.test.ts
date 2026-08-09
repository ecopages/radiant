import { describe, expect, test, vi } from 'vitest';
import { RADIANT_VIEW_ELEMENT } from './symbols';
import { radiantMeta } from './radiant-meta';

describe('radiantMeta', () => {
	test('links component to element for SSR', () => {
		const element = class RuiHost {} as unknown as CustomElementConstructor;
		const component = vi.fn(() => null);

		const meta = {
			title: 'Test',
			component,
			args: { count: 1 },
		};
		radiantMeta(meta, { element, stylesheets: ['./test.css'] });

		expect(meta.component).toBe(component);
		expect(meta.args).toEqual({ count: 1 });
		expect((component as typeof component & { [key: symbol]: unknown })[RADIANT_VIEW_ELEMENT]).toBe(element);
	});

	test('does not add stylesheets to returned Meta (stamp-transform source only)', () => {
		const meta = {
			title: 'Chip',
			component: () => null,
			parameters: { layout: 'centered' },
		};
		radiantMeta(meta, { stylesheets: ['./chip.css', '../shared.css'] });

		expect(meta).not.toHaveProperty('stylesheets');
		expect(meta.parameters).toEqual({ layout: 'centered' });
		expect(meta.parameters).not.toHaveProperty('radiant');
	});

	test('preserves parameters.stylesheets for withStylesheets extras', () => {
		const meta = {
			title: 'Sidebar',
			component: () => null,
			parameters: {
				stylesheets: ['/virtual/docs-skin.css'],
				layout: 'fullscreen',
			},
		};
		radiantMeta(meta, { stylesheets: ['./sidebar.css'] });

		expect(meta.parameters?.stylesheets).toEqual(['/virtual/docs-skin.css']);
		expect(meta.parameters?.layout).toBe('fullscreen');
	});

	test('allows presentational Meta without element', () => {
		const component = () => null;
		const meta = {
			title: 'Chip',
			component,
		};
		radiantMeta(meta, { stylesheets: ['./chip.css'] });

		expect(meta.component).toBe(component);
		expect((component as typeof component & { [key: symbol]: unknown })[RADIANT_VIEW_ELEMENT]).toBeUndefined();
	});
});
