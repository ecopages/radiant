import { afterEach, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { bindTo } from '../../src/decorators/bind-to';
import { customElement } from '../../src/decorators/custom-element';
import { onEvent } from '../../src/decorators/on-event';
import { query } from '../../src/decorators/query';
import { state } from '../../src/decorators/state';

afterEach(() => {
	document.body.innerHTML = '';
});

@customElement('parts-inner')
class _PartsInner extends RadiantElement {}

@customElement('parts-outer')
class PartsOuter extends RadiantElement {
	clicks = 0;

	@query({ ref: 'item' }) item!: HTMLElement | null;
	@query({ ref: 'item', all: true }) items!: HTMLElement[];
	@query({ ref: 'item', cache: true }) cachedItem!: HTMLElement | null;
	@query({ ref: 'say "hi"' }) quoted!: HTMLElement | null;
	@query({ selector: '[data-ref="item"]', all: true }) everyItem!: HTMLElement[];

	@state
	@bindTo({ ref: 'item', text: true })
	label = 'one';

	@onEvent({ ref: 'item', type: 'click' })
	onItemClick() {
		this.clicks += 1;
	}
}

class PartsController extends RadiantController {
	clicks = 0;

	@query({ ref: 'item' }) item!: HTMLElement | null;

	@onEvent({ ref: 'item', type: 'click' })
	onItemClick() {
		this.clicks += 1;
	}
}

async function mount<T extends HTMLElement>(markup: string): Promise<T> {
	document.body.innerHTML = markup;
	await Promise.resolve();
	return document.body.firstElementChild as T;
}

const byId = (id: string) => document.getElementById(id) as HTMLElement;

const NESTED = `
<parts-outer>
	<parts-inner><b id="inner" data-ref="item">inner</b></parts-inner>
	<b id="outer" data-ref="item">outer</b>
</parts-outer>`;

describe('scoped parts, Element Host', () => {
	test('@query({ ref }) and getRef skip a nested host part, single and all', async () => {
		const host = await mount<PartsOuter>(NESTED);

		expect(host.item).toBe(byId('outer'));
		expect(host.getRef('item')).toBe(byId('outer'));
		expect(host.items).toEqual([byId('outer')]);
		expect(host.getRef('item', true)).toEqual([byId('outer')]);
		expect(host.cachedItem).toBe(byId('outer'));
	});

	test('@query({ selector }) still reaches into the nested host', async () => {
		const host = await mount<PartsOuter>(NESTED);

		expect(host.everyItem).toEqual([byId('inner'), byId('outer')]);
	});

	test('@bindTo({ ref }) writes the outer part only', async () => {
		const host = await mount<PartsOuter>(NESTED);
		await host.updateComplete;

		host.label = 'two';

		expect(byId('outer').textContent).toBe('two');
		expect(byId('inner').textContent).toBe('inner');
	});

	test('@onEvent({ ref }) ignores a click on the nested host part', async () => {
		const host = await mount<PartsOuter>(NESTED);

		byId('inner').click();
		expect(host.clicks).toBe(0);

		byId('outer').click();
		expect(host.clicks).toBe(1);
	});

	test('a part that is itself a nested host belongs to the outer host', async () => {
		const host = await mount<PartsOuter>(
			'<parts-outer><parts-inner id="seek" data-ref="item"><b id="deep" data-ref="item"></b></parts-inner></parts-outer>',
		);

		expect(host.item).toBe(byId('seek'));
		expect(host.items).toEqual([byId('seek')]);
		byId('seek').click();
		expect(host.clicks).toBe(1);
	});

	test('a nested host starts a scope only once upgraded', async () => {
		const host = await mount<PartsOuter>(
			'<parts-outer><parts-late id="late"><b id="inner" data-ref="item"></b></parts-late><b id="outer" data-ref="item"></b></parts-outer>',
		);

		expect(host.item).toBe(byId('inner'));
		expect(host.items).toEqual([byId('inner'), byId('outer')]);

		customElements.define('parts-late', class extends RadiantElement {});

		expect(host.item).toBe(byId('outer'));
		expect(host.items).toEqual([byId('outer')]);
	});

	test('authored children inserted before the match are returned on the next read', async () => {
		const host = await mount<PartsOuter>(NESTED);
		const earlier = document.createElement('i');
		earlier.setAttribute('data-ref', 'item');

		host.prepend(earlier);

		expect(host.item).toBe(earlier);
		expect(host.items).toEqual([earlier, byId('outer')]);
	});

	test('a name containing a double quote resolves in every API', async () => {
		const host = await mount<PartsOuter>(
			'<parts-outer><b id="q" data-ref="say &quot;hi&quot;"></b><parts-inner><b id="iq" data-ref="say &quot;hi&quot;"></b></parts-inner></parts-outer>',
		);

		expect(host.quoted).toBe(byId('q'));
		expect(host.getRef('say "hi"')).toBe(byId('q'));
		expect(host.getRef('say "hi"', true)).toEqual([byId('q')]);
	});

	test('a name containing a double quote reaches @onEvent and @bindTo', async () => {
		@customElement('parts-quote-events')
		class PartsQuoteEvents extends RadiantElement {
			clicks = 0;

			@state
			@bindTo({ ref: 'say "hi"', text: true })
			label = 'a';

			@onEvent({ ref: 'say "hi"', type: 'click' })
			onClick() {
				this.clicks += 1;
			}
		}

		const host = await mount<PartsQuoteEvents>(
			'<parts-quote-events><b id="q" data-ref="say &quot;hi&quot;"></b></parts-quote-events>',
		);
		await host.updateComplete;
		host.label = 'b';
		byId('q').click();

		expect(byId('q').textContent).toBe('b');
		expect(host.clicks).toBe(1);
	});
});

describe('scoped parts, Controller Host', () => {
	test('an outer controller ignores a nested Element Host part', async () => {
		const root = await mount<HTMLElement>(NESTED.replace(/parts-outer/g, 'section'));
		const controller = new PartsController(root);
		controller.connect();

		expect(controller.item).toBe(byId('outer'));
		expect(controller.getRef('item')).toBe(byId('outer'));
		expect(controller.getRef('item', true)).toEqual([byId('outer')]);

		byId('inner').click();
		expect(controller.clicks).toBe(0);
		byId('outer').click();
		expect(controller.clicks).toBe(1);
	});

	test('an attached nested Controller Host hides its parts only while attached', async () => {
		const outer = await mount<PartsOuter>(
			'<parts-outer><section id="nested"><b id="inner" data-ref="item"></b></section><b id="outer" data-ref="item"></b></parts-outer>',
		);
		const nested = new PartsController(byId('nested'));

		expect(outer.item).toBe(byId('inner'));

		nested.connect();
		expect(outer.item).toBe(byId('outer'));
		expect(outer.getRef('item', true)).toEqual([byId('outer')]);
		expect(nested.item).toBe(byId('inner'));

		nested.disconnect();
		expect(outer.item).toBe(byId('inner'));
		expect(outer.getRef('item', true)).toEqual([byId('inner'), byId('outer')]);
	});

	test('a nested Controller Host root is a part of the outer host', async () => {
		const outer = await mount<PartsOuter>(
			'<parts-outer><section id="seek" data-ref="item"><b data-ref="item"></b></section></parts-outer>',
		);
		new PartsController(byId('seek')).connect();

		expect(outer.item).toBe(byId('seek'));
		expect(outer.items).toEqual([byId('seek')]);
	});
});
