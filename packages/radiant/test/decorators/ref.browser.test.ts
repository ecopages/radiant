import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { ref, refAll, type RefDecoratorHost } from '../../src/decorators/ref';
import { ref as standardRef } from '../../src/decorators/standard/ref';

const WARNINGS_ENABLED = Symbol.for('@ecopages/jsx.dev-warnings-enabled');

@customElement('ref-host')
class RefHost extends RadiantElement {
	@ref() menubarRoot!: HTMLElement | null;
	@ref() listboxID!: HTMLElement | null;
	@ref() XMLPanel!: HTMLElement | null;
	@ref('l1234') specialProduct!: HTMLElement | null;
	@ref({ required: false }) optionsOnly!: HTMLElement | null;
	@ref('named', { required: false }) nameAndOptions!: HTMLElement | null;
	@ref() missing!: HTMLElement | null;
	@refAll() item!: HTMLElement[];
	@refAll('row') rows!: HTMLElement[];
	@refAll({ required: false }) optionsRows!: HTMLElement[];
}

@customElement('ref-inner')
class _RefInner extends RadiantElement {}

class RefController extends RadiantController {
	@ref() status!: HTMLElement | null;
	@refAll() item!: HTMLElement[];
}

const byId = (id: string) => document.getElementById(id) as HTMLElement;

async function mount<T extends HTMLElement>(markup: string): Promise<T> {
	document.body.innerHTML = markup;
	await Promise.resolve();
	return document.body.firstElementChild as T;
}

describe('@ref', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('the default name is the field name as an attribute name', async () => {
		const host = await mount<RefHost>(`<ref-host>
			<i id="a" data-ref="menubar-root"></i>
			<i id="b" data-ref="listbox-id"></i>
			<i id="c" data-ref="xmlpanel"></i>
		</ref-host>`);

		expect(host.menubarRoot).toBe(byId('a'));
		expect(host.listboxID).toBe(byId('b'));
		expect(host.XMLPanel).toBe(byId('c'));
	});

	test('a given name is used exactly as written, with or without options', async () => {
		const host = await mount<RefHost>(`<ref-host>
			<i id="a" data-ref="l1234"></i>
			<i id="b" data-ref="options-only"></i>
			<i id="c" data-ref="named"></i>
			<i id="d" data-ref="special-product"></i>
		</ref-host>`);

		expect(host.specialProduct).toBe(byId('a'));
		expect(host.optionsOnly).toBe(byId('b'));
		expect(host.nameAndOptions).toBe(byId('c'));
	});

	test('reads null and [] before connect', () => {
		const host = document.createElement('ref-host') as RefHost;

		expect(host.menubarRoot).toBeNull();
		expect(host.item).toEqual([]);
	});

	test('reads null when nothing matches', async () => {
		const host = await mount<RefHost>('<ref-host></ref-host>');

		expect(host.missing).toBeNull();
	});

	test('is live: a replaced node is returned on the next read', async () => {
		const host = await mount<RefHost>('<ref-host><i id="old" data-ref="menubar-root"></i></ref-host>');
		expect(host.menubarRoot).toBe(byId('old'));

		const next = document.createElement('i');
		next.dataset.ref = 'menubar-root';
		byId('old').replaceWith(next);

		expect(host.menubarRoot).toBe(next);
	});

	test('ignores a nested host part of the same name', async () => {
		const host = await mount<RefHost>(`<ref-host>
			<ref-inner><i id="inner" data-ref="menubar-root"></i></ref-inner>
			<i id="outer" data-ref="menubar-root"></i>
		</ref-host>`);

		expect(host.menubarRoot).toBe(byId('outer'));
	});

	test('does not leak a part of an outer host into a nested one', async () => {
		const host = await mount<RefHost>(`<ref-host>
			<i id="outer" data-ref="menubar-root"></i>
			<ref-host id="nested"></ref-host>
		</ref-host>`);

		expect(host.menubarRoot).toBe(byId('outer'));
		expect((byId('nested') as RefHost).menubarRoot).toBeNull();
	});
});

describe('@refAll', () => {
	test('returns owned parts in document order and leaves out nested hosts', async () => {
		const host = await mount<RefHost>(`<ref-host>
			<i id="a" data-ref="item"></i>
			<ref-inner><i id="inner" data-ref="item"></i></ref-inner>
			<div><i id="b" data-ref="item"></i></div>
		</ref-host>`);

		expect(host.item).toEqual([byId('a'), byId('b')]);
	});

	test('takes a name and options like @ref', async () => {
		const host = await mount<RefHost>(`<ref-host>
			<i id="a" data-ref="row"></i><i id="b" data-ref="row"></i><i id="c" data-ref="options-rows"></i>
		</ref-host>`);

		expect(host.rows).toEqual([byId('a'), byId('b')]);
		expect(host.optionsRows).toEqual([byId('c')]);
	});

	test('is live', async () => {
		const host = await mount<RefHost>('<ref-host><i id="a" data-ref="item"></i></ref-host>');
		const extra = document.createElement('i');
		extra.dataset.ref = 'item';
		host.append(extra);

		expect(host.item).toEqual([byId('a'), extra]);
	});
});

describe('@ref on a Controller Host', () => {
	test('reads parts scoped to the controller root', async () => {
		const root = await mount<HTMLElement>(`<section>
			<ref-inner><i id="inner" data-ref="status"></i></ref-inner>
			<i id="outer" data-ref="status"></i>
			<ref-inner><i data-ref="item"></i></ref-inner>
			<i id="item" data-ref="item"></i>
		</section>`);
		const controller = new RefController(root);
		controller.connect();

		expect(controller.status).toBe(byId('outer'));
		expect(controller.item).toEqual([byId('item')]);
	});
});

describe('@ref across reconnect on a Controller Host', () => {
	test('still resolves the owned part after disconnect and connect', async () => {
		const root = await mount<HTMLElement>('<section><i id="own" data-ref="status"></i></section>');
		const controller = new RefController(root);
		controller.connect();
		controller.disconnect();
		controller.connect();

		expect(controller.status).toBe(byId('own'));
	});
});

describe('@ref names that collide with element members', () => {
	test('a given name finds the part where the field name would shadow an element member', async () => {
		@customElement('ref-title-host')
		class RefTitleHost extends RadiantElement {
			@ref('title') headline!: HTMLElement | null;
		}

		const host = await mount<RefTitleHost>('<ref-title-host><h1 id="h" data-ref="title"></h1></ref-title-host>');

		expect(host.headline).toBe(byId('h'));
	});
});

describe('@ref private fields', () => {
	test('standard decorators reject a # field, which cannot hold a getter', () => {
		const context = { name: '#panel', private: true, addInitializer: vi.fn() };

		expect(() =>
			standardRef({ all: false, required: false })(
				undefined,
				context as unknown as ClassFieldDecoratorContext<RefDecoratorHost, Element | null>,
			),
		).toThrow(/private field #panel/);
	});
});

describe('@ref development warnings', () => {
	let warn: MockInstance<typeof console.warn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warn.mockRestore();
		delete (globalThis as Record<PropertyKey, unknown>)[WARNINGS_ENABLED];
	});

	const refWarnings = () => warn.mock.calls.map(([message]) => String(message)).filter((m) => m.includes('@ref'));

	test('a required part still missing after first connect warns once per class and field', async () => {
		@customElement('ref-required-host')
		class RefRequiredHost extends RadiantElement {
			@ref({ required: true }) panel!: HTMLElement | null;
			@ref() optionalPanel!: HTMLElement | null;
			@refAll({ required: true }) cells!: HTMLElement[];
		}

		const first = await mount<RefRequiredHost>('<ref-required-host></ref-required-host>');
		first.remove();
		document.body.append(first);
		document.body.append(document.createElement('ref-required-host'));
		await Promise.resolve();

		const messages = refWarnings();
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain('@ref "panel" on <ref-required-host>');
		expect(messages[0]).toContain('data-ref="panel"');
		expect(messages[1]).toContain('@refAll "cells"');
	});

	test('a required part the host renders itself does not warn', async () => {
		@customElement('ref-rendering-host')
		class RefRenderingHost extends RadiantElement {
			@ref({ required: true }) panel!: HTMLElement | null;

			override render() {
				const panel = document.createElement('div');
				panel.dataset.ref = 'panel';
				return panel;
			}
		}

		const host = await mount<RefRenderingHost>('<ref-rendering-host></ref-rendering-host>');

		expect(host.panel).not.toBeNull();
		expect(refWarnings()).toHaveLength(0);
	});

	test('a required part that is present does not warn', async () => {
		@customElement('ref-present-host')
		class RefPresentHost extends RadiantElement {
			@ref({ required: true }) panel!: HTMLElement | null;
		}

		await mount<RefPresentHost>('<ref-present-host><i data-ref="panel"></i></ref-present-host>');

		expect(refWarnings()).toHaveLength(0);
	});

	test('a required part that belongs to a nested host counts as missing', async () => {
		@customElement('ref-scoped-required-host')
		class RefScopedRequiredHost extends RadiantElement {
			@ref({ required: true }) panel!: HTMLElement | null;
		}

		await mount<RefScopedRequiredHost>(
			'<ref-scoped-required-host><ref-inner><i data-ref="panel"></i></ref-inner></ref-scoped-required-host>',
		);

		expect(refWarnings()).toHaveLength(1);
	});

	test('a missing part without required stays silent', async () => {
		@customElement('ref-optional-host')
		class RefOptionalHost extends RadiantElement {
			@ref() panel!: HTMLElement | null;
			@refAll() cells!: HTMLElement[];
		}

		await mount<RefOptionalHost>('<ref-optional-host></ref-optional-host>');

		expect(refWarnings()).toHaveLength(0);
	});

	test('a duplicate name inside one scope always warns, once', async () => {
		@customElement('ref-duplicate-host')
		class RefDuplicateHost extends RadiantElement {
			@ref() panel!: HTMLElement | null;
			@refAll() cells!: HTMLElement[];
		}

		await mount<RefDuplicateHost>(
			'<ref-duplicate-host><i data-ref="panel"></i><i data-ref="panel"></i><i data-ref="cells"></i><i data-ref="cells"></i></ref-duplicate-host>',
		);
		document.body.insertAdjacentHTML(
			'beforeend',
			'<ref-duplicate-host><i data-ref="panel"></i><i data-ref="panel"></i></ref-duplicate-host>',
		);
		await Promise.resolve();

		const messages = refWarnings();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toContain('@ref "panel"');
		expect(messages[0]).toContain('more than one part data-ref="panel"');
	});

	test('the same name in a nested host is not a duplicate', async () => {
		@customElement('ref-nested-duplicate-host')
		class RefNestedDuplicateHost extends RadiantElement {
			@ref() panel!: HTMLElement | null;
		}

		await mount<RefNestedDuplicateHost>(
			'<ref-nested-duplicate-host><i data-ref="panel"></i><ref-inner><i data-ref="panel"></i></ref-inner></ref-nested-duplicate-host>',
		);

		expect(refWarnings()).toHaveLength(0);
	});

	test('a Controller Host warns for required and duplicates', async () => {
		class RefWarnController extends RadiantController {
			@ref({ required: true }) status!: HTMLElement | null;
			@ref() title!: HTMLElement | null;
		}

		const root = await mount<HTMLElement>('<section><i data-ref="title"></i><i data-ref="title"></i></section>');
		new RefWarnController(root).connect();

		expect(refWarnings()).toHaveLength(2);
	});

	test('the shared development-warning switch silences them', async () => {
		(globalThis as Record<PropertyKey, unknown>)[WARNINGS_ENABLED] = false;

		@customElement('ref-silenced-host')
		class RefSilencedHost extends RadiantElement {
			@ref({ required: true }) panel!: HTMLElement | null;
			@ref() cell!: HTMLElement | null;
		}

		await mount<RefSilencedHost>(
			'<ref-silenced-host><i data-ref="cell"></i><i data-ref="cell"></i></ref-silenced-host>',
		);

		expect(refWarnings()).toHaveLength(0);
	});
});
