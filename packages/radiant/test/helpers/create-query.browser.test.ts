import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { createQuery, createQueryAll } from '../../src/helpers/create-query';

class QueryHelperElement extends RadiantElement {}
customElements.define('query-helper-element', QueryHelperElement);

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

describe('createQuery and createQueryAll', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('createQuery with a selector reads the first match live, or null', () => {
		const host = createHost();
		const accessor = createQuery(host, '.my-class');
		expect(accessor.value?.textContent).toBe('Class 1');
		expect(createQuery(host, '.missing').value).toBeNull();
		accessor.value?.replaceWith(createElementWithClass('Swapped', 'my-class'));
		expect(accessor.value?.textContent).toBe('Swapped');
	});

	test('createQuery reaches into a nested host that getRef skips', () => {
		const host = createHost();
		const nested = document.createElement('query-helper-element');
		nested.appendChild(createElementWithRef('Nested', 'nested-ref'));
		host.prepend(nested);
		expect(createQuery(host, '[data-ref="nested-ref"]').value?.textContent).toBe('Nested');
		expect(host.getRef('nested-ref')).toBeNull();
	});

	test('both accept a controller-style { host } target', () => {
		const host = createHost();
		expect(createQuery({ host }, '.my-class').value?.textContent).toBe('Class 1');
		expect(createQueryAll({ host }, '.my-class').value).toHaveLength(3);
	});

	test('createQueryAll reads every match in order, live', () => {
		const host = createHost();
		const accessor = createQueryAll(host, '.my-class');
		expect(accessor.value.map((node) => node.textContent)).toEqual(['Class 1', 'Class 2', 'Class 3']);
		host.appendChild(createElementWithClass('Class 4', 'my-class'));
		expect(accessor.value).toHaveLength(4);
		expect(createQueryAll(host, '.missing').value).toEqual([]);
	});
});
