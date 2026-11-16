import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { query, queryAll } from '../../src/decorators/query';

@customElement('my-selector-query-element')
class MySelectorQueryElement extends RadiantElement {
	@query('.item') first!: HTMLElement | null;
	@query('.missing') missing!: HTMLElement | null;
	@queryAll('.item') items!: HTMLElement[];
	@queryAll('.missing') none!: HTMLElement[];
}

const createSelectorHost = (html: string) => {
	const host = document.createElement('my-selector-query-element') as MySelectorQueryElement;
	host.innerHTML = html;
	return host;
};

class QueryController extends RadiantController {
	@query<HTMLFormElement>('[data-ref="form"]') form!: HTMLFormElement | null;
	@query<HTMLInputElement>('[data-ref="email"]') emailInput!: HTMLInputElement | null;
	@query<HTMLParagraphElement>('[data-ref="status"]') statusNode!: HTMLParagraphElement | null;
}

const createElementWithClass = (text: string, className: string) => {
	const div = document.createElement('div');
	div.textContent = text;
	div.classList.add(className);
	return div;
};

class SelectorQueryController extends RadiantController {
	@query('.item') first!: HTMLElement | null;
	@queryAll('.item') items!: HTMLElement[];
}

describe('RadiantController @query', () => {
	test('reads the selector forms inside the controller host', () => {
		const host = document.createElement('section');
		host.innerHTML = '<i class="item">a</i><b><i class="item">b</i></b>';

		const controller = new SelectorQueryController(host);
		controller.connect();

		expect(controller.first?.textContent).toBe('a');
		expect(controller.items.map((node) => node.textContent)).toEqual(['a', 'b']);
	});

	test('queries authored form markup inside the controller host', () => {
		const host = document.createElement('section');
		host.innerHTML = `
			<form data-ref="form">
				<input data-ref="email" type="email" value="ada@example.com" />
				<p data-ref="status">Ready</p>
			</form>
		`;

		const controller = new QueryController(host);
		controller.connect();

		expect(controller.form).toBeInstanceOf(HTMLFormElement);
		expect(controller.emailInput?.value).toBe('ada@example.com');
		expect(controller.statusNode?.textContent).toBe('Ready');
	});
});

describe('@query(selector)', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('reads the first match', () => {
		const host = createSelectorHost('<i class="item">a</i><i class="item">b</i>');
		document.body.appendChild(host);
		expect(host.first?.textContent).toBe('a');
	});

	test('reads null when nothing matches', () => {
		const host = createSelectorHost('<i class="item">a</i>');
		document.body.appendChild(host);
		expect(host.missing).toBeNull();
	});

	test('reads null on a host with no children', () => {
		const host = document.createElement('my-selector-query-element') as MySelectorQueryElement;
		expect(host.first).toBeNull();
	});

	test('reaches into a nested host', () => {
		const host = createSelectorHost(
			'<my-selector-query-element><i class="item">nested</i></my-selector-query-element><i class="item">a</i>',
		);
		document.body.appendChild(host);
		expect(host.first?.textContent).toBe('nested');
	});

	test('reads live after the node is replaced', () => {
		const host = createSelectorHost('<i class="item">a</i>');
		document.body.appendChild(host);
		const first = host.first;
		const replacement = createElementWithClass('b', 'item');
		first?.replaceWith(replacement);
		expect(host.first).toBe(replacement);
	});
});

describe('@queryAll(selector)', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('reads every match in document order', () => {
		const host = createSelectorHost('<i class="item">a</i><b><i class="item">b</i></b><i class="item">c</i>');
		document.body.appendChild(host);
		expect(host.items.map((node) => node.textContent)).toEqual(['a', 'b', 'c']);
	});

	test('reads an empty array when nothing matches', () => {
		const host = document.createElement('my-selector-query-element') as MySelectorQueryElement;
		expect(host.items).toEqual([]);
		document.body.appendChild(host);
		expect(host.none).toEqual([]);
	});

	test('includes matches inside nested hosts', () => {
		const host = createSelectorHost(
			'<i class="item">a</i><my-selector-query-element><i class="item">nested</i></my-selector-query-element>',
		);
		document.body.appendChild(host);
		expect(host.items.map((node) => node.textContent)).toEqual(['a', 'nested']);
	});

	test('reads live after a node is added', () => {
		const host = createSelectorHost('<i class="item">a</i>');
		document.body.appendChild(host);
		expect(host.items).toHaveLength(1);
		host.appendChild(createElementWithClass('b', 'item'));
		expect(host.items).toHaveLength(2);
	});
});
