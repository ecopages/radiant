import { describe, expect, test } from 'vitest';
import { discoverRadiantDocumentUsage } from '../src/lib/discover-document-usage';

describe('discoverRadiantDocumentUsage', () => {
	test('discovers custom elements and controller identifiers from rendered HTML', () => {
		const html = `<main><radiant-counter data-controller="counter-a counter-b"></radiant-counter></main>`;

		expect(discoverRadiantDocumentUsage(html)).toEqual({
			customElementTagNames: ['radiant-counter'],
			controllerIdentifiers: ['counter-a', 'counter-b'],
		});
	});

	test('does not treat markup-like text inside elements as tags', () => {
		const html = `<div data-controller="only-one"><p>Compare a &lt;radiant-fake&gt; literal</p></div>`;

		expect(discoverRadiantDocumentUsage(html)).toEqual({
			customElementTagNames: [],
			controllerIdentifiers: ['only-one'],
		});
	});

	test('reads attribute values with special characters', () => {
		const html = `<section data-controller="alpha" title="a>b"></section><my-widget></my-widget>`;

		expect(discoverRadiantDocumentUsage(html)).toEqual({
			customElementTagNames: ['my-widget'],
			controllerIdentifiers: ['alpha'],
		});
	});
});
