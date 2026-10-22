import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { query } from '../../src/decorators/query';

class MyQueryElement extends RadiantElement {
	@query({ ref: 'my-ref' }) myRef: HTMLDivElement | null;
	@query({ ref: 'my-ref', all: true, cache: false }) myRefs: HTMLDivElement[];
	@query({ ref: 'my-ref', all: true, cache: true }) myRefsCache: HTMLDivElement[];
	@query({ ref: 'my-ref', cache: true }) myRefCached: HTMLDivElement | null;
	@query({ selector: '.my-class' }) myClass: HTMLElement | null;
	@query({ selector: '.my-class', all: true }) myClasses: HTMLElement[];
	@query({ ref: 'missing' }) missing: HTMLElement | null;

	addElement() {
		const div = document.createElement('div');
		div.textContent = `My Ref ${this.myRefs.length + 1}`;
		div.setAttribute('data-ref', 'my-ref');
		this.appendChild(div);
	}
}

customElements.define('my-query-element', MyQueryElement);

class QueryController extends RadiantController {
	@query({ ref: 'form' }) form!: HTMLFormElement | null;
	@query({ ref: 'email' }) emailInput!: HTMLInputElement | null;
	@query({ ref: 'status' }) statusNode!: HTMLParagraphElement | null;
}

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

const createTemplate = () => {
	const customElement = document.createElement('my-query-element');

	const innerElementsMap: (
		| {
				text: string;
				dataRef: string;
		  }
		| {
				text: string;
				className: string;
		  }
	)[] = [
		{
			text: 'My Ref 1',
			dataRef: 'my-ref',
		},
		{
			text: 'My Ref 2',
			dataRef: 'my-ref',
		},
		{
			text: 'My Class 1',
			className: 'my-class',
		},
		{
			text: 'My Class 2',
			className: 'my-class',
		},
		{
			text: 'My Class 3',
			className: 'my-class',
		},
	];

	for (const innerElement of innerElementsMap) {
		if ('dataRef' in innerElement) {
			customElement.appendChild(createElementWithRef(innerElement.text, innerElement.dataRef));
		} else {
			customElement.appendChild(createElementWithClass(innerElement.text, innerElement.className));
		}
	}

	return customElement as MyQueryElement;
};

describe('@query', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('decorator queries ref correctly', async () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myRef?.textContent).toEqual('My Ref 1');
	});

	test('decorator queries all refs correctly', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myRefs.length).toEqual(2);
		expect(customElement.myRefs[0].textContent).toEqual('My Ref 1');
		expect(customElement.myRefs[1].textContent).toEqual('My Ref 2');
	});

	test('decorator reads null when nothing matches', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.missing).toBeNull();
	});

	test('decorator queries selector correctly', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myClass?.textContent).toEqual('My Class 1');
	});

	test('decorator queries all selectors correctly', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myClasses.length).toEqual(3);
		expect(customElement.myClasses[0].textContent).toEqual('My Class 1');
		expect(customElement.myClasses[1].textContent).toEqual('My Class 2');
		expect(customElement.myClasses[2].textContent).toEqual('My Class 3');
	});

	test('decorator queries ref correctly after adding element', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myRefs.length).toEqual(2);
		customElement.addElement();
		expect(customElement.myRefs.length).toEqual(3);
		expect(customElement.myRefs[2].textContent).toEqual('My Ref 3');
	});

	test('decorator queries ref with cache true correctly after adding element', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myRefs.length).toEqual(2);
		customElement.addElement();
		expect(customElement.myRefs.length).toEqual(3);
	});

	test('decorator queries ref with cache true correctly after adding element', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		expect(customElement.myRefsCache.length).toEqual(2);
		customElement.addElement();
		expect(customElement.myRefsCache.length).toEqual(2);
	});

	test('decorator without cache returns the new node after the first one is replaced', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		const first = customElement.myRef;
		expect(first?.textContent).toEqual('My Ref 1');

		const replacement = createElementWithRef('Replacement', 'my-ref');
		first?.replaceWith(replacement);

		expect(customElement.myRef).toBe(replacement);
	});

	test('decorator with cache true keeps returning the first node after it is replaced', () => {
		const customElement = createTemplate();
		document.body.appendChild(customElement);
		const first = customElement.myRefCached;
		expect(first?.textContent).toEqual('My Ref 1');

		first?.replaceWith(createElementWithRef('Replacement', 'my-ref'));

		expect(customElement.myRefCached).toBe(first);
	});
});

describe('RadiantController @query', () => {
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
