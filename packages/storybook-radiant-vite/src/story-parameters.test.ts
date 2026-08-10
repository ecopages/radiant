import { describe, expect, test } from 'vitest';
import { resolveSsrTarget, syncViewMetadata } from './resolve-ssr';
import { RADIANT_SCRIPT_EXPORT, RADIANT_SCRIPT_MODULE, RADIANT_VIEW_ELEMENT } from './symbols';
import type { Meta, RadiantStoryParameters } from './types';

type ViewProps = { label?: string };
type Stamped = { [key: symbol]: unknown };

function makeView() {
	return (args: ViewProps) => `<span>${args.label ?? ''}</span>`;
}

/** Node-env stand-in for a RadiantElement constructor (no `HTMLElement` global here). */
function makeElement(scriptModule?: string) {
	const Host = class RuiHost {} as unknown as CustomElementConstructor;
	if (scriptModule) {
		Object.assign(Host, {
			[RADIANT_SCRIPT_MODULE]: scriptModule,
			[RADIANT_SCRIPT_EXPORT]: 'RuiHost',
		});
	}
	return Host;
}

describe('parameters.radiant.element', () => {
	test('links the host element onto the view without mutating the meta', () => {
		const component = makeView();
		const element = makeElement();
		const meta = {
			component,
			parameters: { radiant: { element, cssImports: ['./test.css'] } },
			args: { label: 'hello' },
		} satisfies Meta<typeof component>;

		syncViewMetadata(meta.component, meta.parameters.radiant.element);

		expect(meta.component).toBe(component);
		expect(meta.args).toEqual({ label: 'hello' });
		expect((component as unknown as Stamped)[RADIANT_VIEW_ELEMENT]).toBe(element);
	});

	test('resolves the SSR script module stamped on the linked element', () => {
		const component = makeView();
		const element = makeElement('/src/components/ui/test/test.script.tsx');

		syncViewMetadata(component, element);

		expect(resolveSsrTarget({ component })).toMatchObject({
			kind: 'host',
			ssrModule: '/src/components/ui/test/test.script.tsx',
			ssrExport: 'RuiHost',
		});
	});

	test('cssImports is source-only and adds nothing to runtime parameters', () => {
		const component = makeView();
		const meta = {
			component,
			parameters: { layout: 'centered', radiant: { cssImports: ['./test.css'] } },
		} satisfies Meta<typeof component>;

		syncViewMetadata(meta.component, undefined);

		expect(meta.parameters.layout).toBe('centered');
		expect(meta.parameters).not.toHaveProperty('stylesheets');
	});

	test('leaves parameters.stylesheets alone for withStylesheets extras', () => {
		const component = makeView();
		const stylesheets = ['/skins/dark.css'];
		const meta = {
			component,
			parameters: { stylesheets, radiant: { element: makeElement(), cssImports: ['./test.css'] } },
		} satisfies Meta<typeof component>;

		syncViewMetadata(meta.component, meta.parameters.radiant.element);

		expect(meta.parameters.stylesheets).toBe(stylesheets);
	});

	test('presentational meta without an element links nothing', () => {
		const component = makeView();
		const meta = {
			component,
			parameters: { radiant: { cssImports: ['./test.css'] } },
		} satisfies Meta<typeof component>;

		// Also asserts the literal is assignable to the declared parameters type.
		const radiant: RadiantStoryParameters['radiant'] = meta.parameters.radiant;
		syncViewMetadata(meta.component, radiant?.element);

		expect((component as unknown as Stamped)[RADIANT_VIEW_ELEMENT]).toBeUndefined();
	});
});
