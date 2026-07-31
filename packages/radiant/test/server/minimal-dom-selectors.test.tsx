import { beforeEach, describe, expect, test } from 'vitest';
import '../../src/server/install-ssr-runtime';
import { RadiantElement } from '../../src/core/radiant-element';
import { registerSsrPreparationCallback } from '../../src/core/ssr-preparation';
import { customElement } from '../../src/decorators/custom-element';
import { createServerRenderEnvironment, installLightDomShim } from '../../src/server/light-dom-shim';
import { alignMinimalDomHostTagName } from '../../src/server/shim/minimal-dom/align-host-tag-name';
import { MinimalHTMLElement, MinimalTextNode } from '../../src/server/shim/minimal-dom/nodes';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';
import * as selectors from '../../src/server/shim/minimal-dom/selectors';

describe('minimal-dom selectors', () => {
	beforeEach(() => {
		installLightDomShim();
	});

	test('matches tag, id, class, and attribute selectors', () => {
		const element = new MinimalHTMLElement('button');
		element.id = 'submit';
		element.setAttribute('class', 'primary action');
		element.setAttribute('data-ref', 'submit');

		expect(element.matches('button')).toBe(true);
		expect(element.matches('#submit')).toBe(true);
		expect(element.matches('.primary')).toBe(true);
		expect(element.matches('[data-ref]')).toBe(true);
		expect(element.matches('[data-ref="submit"]')).toBe(true);
		expect(element.matches('button.primary[data-ref="submit"]')).toBe(true);
		expect(element.matches('div')).toBe(false);
	});

	test('matches the universal selector, bare and in a combinator chain', () => {
		const host = new MinimalHTMLElement('section');
		host.innerHTML = '<div><span data-ref="child"></span></div>';

		const div = host.querySelector('div')!;
		const span = host.querySelector('[data-ref="child"]')!;

		expect(div.matches('*')).toBe(true);
		expect(span.matches('*')).toBe(true);
		expect(span.matches('div > *')).toBe(true);
		expect(div.matches('div > *')).toBe(false);
	});

	test('throws SyntaxError for unsupported selectors', () => {
		const element = new MinimalHTMLElement('div');

		expect(() => element.matches(':not(div)')).toThrow(SyntaxError);
		expect(() => element.querySelector(':focus')).toThrow(SyntaxError);
	});

	test('closest walks ancestors including self', () => {
		const root = new MinimalHTMLElement('rui-disclosure-group');
		const child = new MinimalHTMLElement('rui-disclosure');
		root.appendChild(child as unknown as Node);

		const trigger = new MinimalHTMLElement('button');
		trigger.setAttribute('data-disclosure-trigger', '');
		child.appendChild(trigger as unknown as Node);

		expect(trigger.closest('rui-disclosure')).toBe(child);
		expect(trigger.closest('rui-disclosure-group')).toBe(root);
		expect(trigger.closest('button')).toBe(trigger);
		expect(trigger.closest('section')).toBeNull();
	});

	test('querySelector finds direct children and nested descendants after materialization', () => {
		const host = new MinimalHTMLElement('section');
		host.innerHTML =
			'<header><h2 data-ref="title">Prepared heading</h2></header><p data-ref="body">Prepared body</p>';

		expect(host.querySelector('[data-ref="body"]')?.textContent).toBe('Prepared body');
		expect(host.querySelector('header > h2')?.getAttribute('data-ref')).toBe('title');
		expect(host.querySelector('header h2')?.textContent).toBe('Prepared heading');
	});

	test('querySelectorAll returns all matches for comma-separated selectors', () => {
		const host = new MinimalHTMLElement('section');
		host.innerHTML = '<button data-ref="a"></button><button data-ref="b"></button><span data-ref="c"></span>';

		expect(host.querySelectorAll('button, [data-ref="c"]')).toHaveLength(3);
	});

	test('contains reports descendant membership', () => {
		const host = new MinimalHTMLElement('section');
		host.innerHTML = '<p><span data-ref="inner">Nested</span></p>';

		const paragraph = host.querySelector('p')!;
		const inner = host.querySelector('[data-ref="inner"]')!;

		expect(host.contains(inner)).toBe(true);
		expect(paragraph.contains(inner)).toBe(true);
		expect(inner.contains(host)).toBe(false);
	});

	test('document.querySelector searches document children', () => {
		const document = globalThis.document;
		const host = document.createElement('minimal-dom-doc-test');
		host.setAttribute('data-doc-test', 'yes');
		document.appendChild(host);

		expect(document.querySelector('[data-doc-test="yes"]')).toBe(host);

		document.removeChild(host);
	});

	test('document.getElementById finds a descendant and elements expose children', () => {
		const host = document.createElement('minimal-dom-children-test');
		host.innerHTML = '<span id="first"></span>text<button id="second"></button>';
		document.appendChild(host);

		expect(document.getElementById('second')).toBe(host.querySelector('#second'));
		expect(Array.from(host.children).map((child) => child.id)).toEqual(['first', 'second']);

		document.removeChild(host);
	});

	test('children is a non-live snapshot array', () => {
		const host = document.createElement('minimal-dom-children-snapshot');
		host.innerHTML = '<span id="first"></span>';
		const snapshot = host.children;
		expect(snapshot).toHaveLength(1);

		host.innerHTML = '<span id="first"></span><button id="second"></button>';
		expect(snapshot).toHaveLength(1);
		expect(Array.from(host.children).map((child) => child.id)).toEqual(['first', 'second']);
	});

	test('style properties serialize through the style attribute', () => {
		const element = new MinimalHTMLElement('div');
		element.style.setProperty('--offset', '12px');
		element.style.height = '24px';

		expect(element.style.getPropertyValue('--offset')).toBe('12px');
		expect(element.getAttribute('style')).toContain('--offset: 12px');
		expect(element.getAttribute('style')).toContain('height: 24px');
	});

	test('provides animation-frame functions for layout-aware components', () => {
		expect(typeof requestAnimationFrame).toBe('function');
		expect(typeof cancelAnimationFrame).toBe('function');
	});

	test('selector module matches custom element tags', () => {
		const group = new MinimalHTMLElement('rui-disclosure-group');
		const disclosure = new MinimalHTMLElement('rui-disclosure');
		group.appendChild(disclosure as unknown as Node);

		expect(selectors.matches(disclosure, 'rui-disclosure')).toBe(true);
		expect(selectors.closest(disclosure, 'rui-disclosure-group')).toBe(group);
	});
});

describe('minimal-dom selectors SSR integration', () => {
	beforeEach(() => {
		installLightDomShim();
	});

	test('querySelector resolves authored light DOM during host preparation', () => {
		const host = new MinimalHTMLElement('ssr-query-host-test');
		host.innerHTML = '<button data-ref="action" type="button">Open</button><p data-ref="status">idle</p>';

		const action = host.querySelector('[data-ref="action"]') as MinimalHTMLElement | null;
		const status = host.querySelector('[data-ref="status"]');

		expect(action?.localName).toBe('button');
		expect(action?.getAttribute('type')).toBe('button');
		expect(status?.textContent).toBe('idle');
	});

	test('alignMinimalDomHostTagName matches @customElement metadata on SSR hosts', () => {
		@customElement('minimal-dom-aligned-host-test')
		class MinimalDomAlignedHost extends RadiantElement {
			override render() {
				return <p>aligned</p>;
			}
		}

		const host = new MinimalDomAlignedHost();
		expect(host.localName).toBe('div');

		alignMinimalDomHostTagName(host, 'minimal-dom-aligned-host-test');

		expect(host.localName).toBe('minimal-dom-aligned-host-test');
		expect(host.tagName).toBe('MINIMAL-DOM-ALIGNED-HOST-TEST');
	});

	test('renderRadiantElementHostToString resolves querySelector during SSR preparation', () => {
		@customElement('minimal-dom-ssr-query-card')
		class MinimalDomSsrQueryCard extends RadiantElement {
			label = 'missing';

			constructor() {
				super();
				registerSsrPreparationCallback(this, () => {
					this.label = this.querySelector('[data-ref="label"]')?.textContent ?? 'missing';
				});
			}

			override render() {
				return <p data-ref="rendered">{this.label}</p>;
			}
		}

		const environment = createServerRenderEnvironment();
		const element = new MinimalDomSsrQueryCard();
		environment.prepareHost(element, {
			authoredContent: '<span data-ref="label">from-light-dom</span>',
		});

		const html = renderRadiantElementHostToString(element);

		expect(html).toContain('from-light-dom');
	});

	test('serializeNodeHtml escapes text-node content', () => {
		const host = new MinimalHTMLElement('section');
		host.appendChild(new MinimalTextNode('a < b & c > d') as unknown as Node);

		expect(host.innerHTML).toBe('a &lt; b &amp; c &gt; d');
	});
});
