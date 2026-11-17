import { computed, state } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { createRoot } from '../src/index.ts';
import { createSubscribableJsxValue, jsx } from '../src/jsx-runtime.ts';
import { renderToString } from '../src/ssr/server-render.ts';

type Value = boolean | string | null | undefined;
type Form = 'static' | 'signal' | 'binding';

/** A native boolean attribute, and on a custom element one it takes as an attribute and one it takes as a property. */
const POSITIONS = [
	['p', 'hidden'],
	['button', 'disabled'],
	['x-field', 'hidden'],
	['x-field', 'disabled'],
] as const;
const VALUES: Value[] = [true, false, undefined, null, 'until-found'];
const FORMS: Form[] = ['static', 'signal', 'binding'];
const MARKER = /\sdata-radiant-jsx-bind-\d+="[^"]*"/g;

function bound(form: Form, value: Value): unknown {
	if (form === 'static') return value;
	const source = state(value);
	return form === 'signal'
		? source
		: createSubscribableJsxValue({ getValue: () => source.get(), subscribe: (notify) => source.subscribe(notify) });
}

function view(tag: string, name: string, value: unknown) {
	return jsx('div', { children: jsx(tag, { [name]: value }) });
}

/** The attribute and the own property a binding left on the element. */
function read(container: HTMLElement, tag: string, name: string) {
	const element = container.querySelector(tag) as Element & Record<string, unknown>;
	return {
		attribute: element.getAttribute(name),
		property: Object.hasOwn(element, name) ? element[name] : 'none',
	};
}

function mount(tag: string, name: string, value: unknown): HTMLElement {
	const container = document.createElement('div');
	createRoot(container).render(view(tag, name, value));
	return container;
}

describe('a signal or binding on a standard boolean attribute binds each value as a static value of the same type would', () => {
	for (const [tag, name] of POSITIONS) {
		for (const value of VALUES) {
			test(`<${tag} ${name}={${String(value)}}> renders, serializes and hydrates the same in every form`, () => {
				const results = FORMS.map((form) => {
					const html = renderToString(view(tag, name, bound(form, value)));
					const hydrateHtml = renderToString(view(tag, name, bound(form, value)), { mode: 'hydrate' });
					const hydrated = document.createElement('div');
					hydrated.innerHTML = hydrateHtml;
					createRoot(hydrated).hydrate(view(tag, name, bound(form, value)));

					return {
						client: read(mount(tag, name, bound(form, value)), tag, name),
						html,
						hydrateHtml: value === undefined ? hydrateHtml.replace(MARKER, '') : hydrateHtml,
						hydrated: read(hydrated, tag, name),
					};
				});

				expect(results[1]).toEqual(results[0]);
				expect(results[2]).toEqual(results[0]);
			});
		}
	}

	for (const [tag, name] of POSITIONS) {
		test(`<${tag} ${name}> follows a signal through boolean and other values as a fresh static render would`, () => {
			const source = state<Value>(true);
			const container = mount(tag, name, source);
			const takesProperty = tag === 'x-field' && name === 'disabled';
			let wroteProperty = false;

			for (const value of [true, 'until-found', false, null, true, undefined, 'x', undefined, false]) {
				source.set(value);
				const expected = read(mount(tag, name, value), tag, name);
				const actual = read(container, tag, name);
				wroteProperty ||= takesProperty && typeof value !== 'boolean' && value !== undefined;

				if (wroteProperty && (typeof value === 'boolean' || value === undefined)) {
					expect(actual.attribute).toBe(expected.attribute);
				} else {
					expect(actual).toEqual(expected);
				}
			}
		});
	}

	test('a computed that builds the element does not depend on the bound signal', () => {
		const hidden = state(true);
		let runs = 0;
		const branch = computed(() => {
			runs += 1;
			return jsx('p', { hidden });
		});
		const container = document.createElement('div');
		createRoot(container).render(jsx('div', { children: branch }));

		hidden.set(false);

		expect(container.querySelector('p')!.hasAttribute('hidden')).toBe(false);
		expect(runs).toBe(1);
	});
});
