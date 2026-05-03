import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { createQuery } from '../../src/helpers/create-query';

class QueryHelperElement extends RadiantElement {}
customElements.define('query-helper-element', QueryHelperElement);

class ShadowQueryHelperElement extends RadiantElement {
	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: 'open' });
		shadowRoot.appendChild(createElementWithRef('Shadow Ref 1', 'shadow-ref'));
		shadowRoot.appendChild(createElementWithClass('Shadow Class 1', 'shadow-class'));
	}
}

customElements.define('shadow-query-helper-element', ShadowQueryHelperElement);

const createElementWithRef = (text: string, dataRef: string) => {
	const div = document.createElement('div');
	div.textContent = text;
	div.setAttribute('data-ref', dataRef);
	return div;
};

const createElementWithClass = (text: string, className: string) => {
	const div = document.createElement('div');
	div.textContent = text;
	div.classList.add(className);
	return div;
};

const createHost = () => {
	const host = document.createElement('query-helper-element') as QueryHelperElement;

	host.appendChild(createElementWithRef('Ref 1', 'my-ref'));
	host.appendChild(createElementWithRef('Ref 2', 'my-ref'));
	host.appendChild(createElementWithClass('Class 1', 'my-class'));
	host.appendChild(createElementWithClass('Class 2', 'my-class'));
	host.appendChild(createElementWithClass('Class 3', 'my-class'));

	document.body.appendChild(host);
	return host;
};

const createShadowHost = () => {
	const host = document.createElement('shadow-query-helper-element') as ShadowQueryHelperElement;
	host.appendChild(createElementWithRef('Light Ref 1', 'shadow-ref'));
	host.appendChild(createElementWithClass('Light Class 1', 'shadow-class'));
	document.body.appendChild(host);
	return host;
};

describe('createQuery', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('queries single element by ref', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement>(host, { ref: 'my-ref' });
		expect(accessor.value?.textContent).toBe('Ref 1');
	});

	test('queries all elements by ref', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement[]>(host, { ref: 'my-ref', all: true });
		expect(accessor.value).toHaveLength(2);
		expect(accessor.value![0].textContent).toBe('Ref 1');
		expect(accessor.value![1].textContent).toBe('Ref 2');
	});

	test('queries single element by selector', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement>(host, { selector: '.my-class' });
		expect(accessor.value?.textContent).toBe('Class 1');
	});

	test('queries all elements by selector', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement[]>(host, { selector: '.my-class', all: true });
		expect(accessor.value).toHaveLength(3);
	});

	test('returns null when no element matches', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement>(host, { selector: '.non-existent' });
		expect(accessor.value).toBeNull();
	});

	test('returns empty array when no elements match with all: true', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement[]>(host, { selector: '.non-existent', all: true });
		expect(accessor.value).toEqual([]);
	});

	test('caches result when cache is true', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement[]>(host, { ref: 'my-ref', all: true, cache: true });
		expect(accessor.value).toHaveLength(2);

		host.appendChild(createElementWithRef('Ref 3', 'my-ref'));
		expect(accessor.value).toHaveLength(2);
	});

	test('does not cache when cache is not set', () => {
		const host = createHost();
		const accessor = createQuery<HTMLDivElement[]>(host, { ref: 'my-ref', all: true });
		expect(accessor.value).toHaveLength(2);

		host.appendChild(createElementWithRef('Ref 3', 'my-ref'));
		expect(accessor.value).toHaveLength(3);
	});

	test('queries shadow DOM when scope is shadow', () => {
		const host = createShadowHost();
		const accessor = createQuery<HTMLDivElement>(host, { ref: 'shadow-ref', scope: 'shadow' });
		expect(accessor.value?.textContent).toBe('Shadow Ref 1');
	});

	test('queries both light and shadow DOM when scope is both', () => {
		const host = createShadowHost();
		const accessor = createQuery<HTMLDivElement[]>(host, {
			selector: '.shadow-class',
			all: true,
			scope: 'both',
		});
		expect(accessor.value).toHaveLength(2);
		expect(accessor.value?.map((element) => element.textContent)).toEqual(['Light Class 1', 'Shadow Class 1']);
	});
});
