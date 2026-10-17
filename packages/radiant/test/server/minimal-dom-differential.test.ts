// @vitest-environment node
import { Window } from 'happy-dom';
import { defaultTreeAdapter, html as parse5Html, parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';

/**
 * Differential test: the minimal DOM against a reference DOM.
 *
 * @remarks The reference parses with parse5 (the spec-conformant parser behind jsdom) and builds the tree in
 * happy-dom through DOM APIs only, because happy-dom's own parser deviates from the spec (for example on `>`
 * inside quoted attribute values, `<title>` content, and the newline after `<pre>`). Each case generates
 * conforming HTML from a seed (content models respected, so the spec applies no implied end tags or foster
 * parenting), applies the same mutations to both DOMs, and compares node structure, `textContent`, attribute
 * values, and the serialized output as re-parsed by parse5. A failure message carries the seed and the source
 * HTML to reproduce it.
 */

const CASES = 1000;
const ENTITIES = [
	'&amp;',
	'&lt;',
	'&gt;',
	'&quot;',
	'&#39;',
	'&#x41;',
	'&#169;',
	'&#x80;',
	'&nbsp;',
	'&copy;',
	'&euro;',
	'&rsquo;',
	'&check;',
	'&NotNestedGreaterGreater;',
	'&notit;',
	'&copy 2024',
	'&unknown;',
];
const ATTRIBUTE_NAMES = ['title', 'data-rules', 'aria-label', 'class'];
const VOIDS = ['br', 'input', 'img'];
const PHRASING_CONTAINERS = ['span', 'b', 'em', 'x-card'];
const MUTABLE_CONTAINERS = new Set([...PHRASING_CONTAINERS, 'div', 'section', 'p', 'li', 'td', 'pre']);
const TEXT_ONLY = [
	'<script type="application/json">{"a":"<b>&amp;</b>","b":"&lt;"}</script>',
	'<script>const close = "</div>"; const open = "<div>";</script>',
	'<style>.a::before{content:"&amp; >"}</style>',
	'<textarea>\n<b>bold</b> &amp; &copy</textarea>',
	'<title>A &lt;title&gt; with <b>tags</b></title>',
];
const MARKUP_ODDITIES = [
	'<!---->',
	'<!-->',
	'<!--->',
	'<?pi x?>',
	'<!doctype html>',
	'</ odd>',
	'</>',
	'a < b',
	'x\r\ny',
];

type Random = () => number;

function createRandom(seed: number): Random {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(random: Random, items: readonly T[]): T {
	return items[Math.floor(random() * items.length)] as T;
}

function repeat(random: Random, max: number, build: () => string): string {
	return Array.from({ length: 1 + Math.floor(random() * max) }, build).join('');
}

class HtmlGenerator {
	constructor(private readonly random: Random) {}

	text(): string {
		return repeat(this.random, 4, () =>
			pick(this.random, ['a', 'Terms', ' ', '& ', '>', '"', "'", '=', ...ENTITIES]),
		);
	}

	attributeValue(): string {
		return repeat(this.random, 3, () =>
			pick(this.random, ['x', ' ', "'", '<', '>', '\r\n', '?a=1&copy=2', '[{&quot;type&quot;:1}]', ...ENTITIES]),
		);
	}

	attributes(): string {
		const names = ATTRIBUTE_NAMES.filter(() => this.random() < 0.4);
		const duplicate = names.length > 0 && this.random() < 0.1 ? ` ${names[0]}="duplicate"` : '';
		const written = names.map((name) => {
			const roll = this.random();
			if (roll < 0.1) return ` ${name}`;
			if (roll < 0.2) return ` ${name}=${pick(this.random, ['x', 'a-b', '1'])}`;
			if (roll < 0.35) return ` ${name}='${this.attributeValue().replace(/'/g, '"')}'`;
			if (roll < 0.45) return `  ${name} = "${this.attributeValue()}" `;
			return ` ${name}="${this.attributeValue()}"`;
		});
		return `${written.join('')}${duplicate}`;
	}

	element(tag: string, children: string): string {
		const written = this.random() < 0.1 ? tag.toUpperCase() : tag;
		return `<${written}${this.attributes()}>${children}</${written}>`;
	}

	/** Phrasing content: allowed inside `p` and inline elements without triggering implied end tags. */
	phrasing(depth: number): string {
		const roll = this.random();

		if (roll < 0.4 || depth > 3) return this.text();
		if (roll < 0.5) return `<${pick(this.random, VOIDS)}${this.attributes()}>`;
		if (roll < 0.55) return `<!-- ${pick(this.random, ['note', 'a = "b" > c', '&amp; &copy', ''])} -->`;
		if (roll < 0.6) return pick(this.random, TEXT_ONLY);
		if (roll < 0.65) return pick(this.random, MARKUP_ODDITIES);
		return this.element(pick(this.random, PHRASING_CONTAINERS), this.phrasingChildren(depth + 1));
	}

	phrasingChildren(depth: number): string {
		return repeat(this.random, 3, () => this.phrasing(depth));
	}

	flow(depth: number): string {
		const roll = this.random();

		if (roll < 0.45 || depth > 3) return this.phrasing(depth);
		if (roll < 0.6) return this.element(pick(this.random, ['div', 'section']), this.flowChildren(depth + 1));
		if (roll < 0.7) return this.element('p', this.phrasingChildren(depth + 1));
		if (roll < 0.77)
			return this.element(
				'ul',
				repeat(this.random, 2, () => this.element('li', this.flowChildren(depth + 1))),
			);
		if (roll < 0.83) {
			const cell = () => this.element('td', this.flowChildren(depth + 1));
			return `<table><tbody>${repeat(this.random, 2, () => `<tr>${repeat(this.random, 2, cell)}</tr>`)}</tbody></table>`;
		}
		if (roll < 0.9)
			return this.element('pre', `${this.random() < 0.5 ? '\n' : ''}${this.phrasingChildren(depth + 1)}`);
		return '<svg viewBox="0 0 24 24"><path d="M1 1h2"/><circle cx="1" cy="1" r="1"></circle></svg>';
	}

	flowChildren(depth: number): string {
		return repeat(this.random, 3, () => this.flow(depth));
	}
}

type DomNode = {
	readonly nodeType: number;
	readonly childNodes: ArrayLike<DomNode>;
	textContent: string | null;
};

type DomElement = DomNode & {
	readonly children: ArrayLike<DomElement>;
	readonly localName: string;
	innerHTML: string;
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	setAttribute(name: string, value: string): void;
	removeAttribute(name: string): void;
	append(...nodes: string[]): void;
};

function parentOf(element: DomElement): DomElement | null {
	return (element as unknown as { parentNode: DomElement | null }).parentNode;
}

function collectElements(root: DomElement): DomElement[] {
	return Array.from(root.children).flatMap((child) => [child, ...collectElements(child)]);
}

function describeTree(node: DomNode): unknown[] {
	return Array.from(node.childNodes).map((child) =>
		child.nodeType === 1
			? [(child as DomElement).localName, describeTree(child)]
			: [child.nodeType, child.textContent],
	);
}

type Mutation = { applies: (element: DomElement) => boolean; run: (element: DomElement, isReference: boolean) => void };

function createMutation(random: Random, generator: HtmlGenerator): Mutation {
	const roll = random();
	const rawText = repeat(random, 3, () => pick(random, ['x', ' & ', '<b>', '"q"', "'", '>', '&amp;', '\n']));
	const isMutable = (element: DomElement) => MUTABLE_CONTAINERS.has(element.localName);

	if (roll < 0.3) {
		const name = pick(random, ATTRIBUTE_NAMES);
		return { applies: () => true, run: (element) => element.setAttribute(name, rawText) };
	}

	if (roll < 0.45) {
		const name = pick(random, ATTRIBUTE_NAMES);
		return { applies: () => true, run: (element) => element.removeAttribute(name) };
	}

	if (roll < 0.6) {
		return { applies: isMutable, run: (element) => (element.textContent = rawText) };
	}

	if (roll < 0.7) {
		return {
			applies: isMutable,
			run: (element, isReference) => {
				if (isReference) {
					setReferenceHtml(element as unknown as Element, serializeReference(element as unknown as Node));
				} else {
					const serialized = element.innerHTML;
					element.innerHTML = serialized;
				}
			},
		};
	}

	const html = generator.phrasingChildren(2);

	if (roll < 0.85) {
		const position = pick(random, ['beforebegin', 'afterbegin', 'beforeend', 'afterend'] as const);
		const outside = position === 'beforebegin' || position === 'afterend';
		return {
			applies: (element) =>
				isMutable(element) && (!outside || MUTABLE_CONTAINERS.has(parentOf(element)?.localName ?? '')),
			run: (element, isReference) => {
				if (!isReference) {
					(element as unknown as MinimalHTMLElement).insertAdjacentHTML(position, html);
					return;
				}

				const target = element as unknown as Element;
				const holder = referenceDocument.createElement('div');
				buildReferenceNodes(
					holder,
					parseInContext(html, outside ? (target.parentElement as Element).localName : target.localName),
				);
				const nodes = Array.from(holder.childNodes);
				if (position === 'beforebegin') target.before(...nodes);
				if (position === 'afterbegin') target.prepend(...nodes);
				if (position === 'beforeend') target.append(...nodes);
				if (position === 'afterend') target.after(...nodes);
			},
		};
	}

	return {
		applies: isMutable,
		run: (element, isReference) => {
			element.append(rawText);
			if (isReference) {
				setReferenceHtml(
					element as unknown as Element,
					`${serializeReference(element as unknown as Node)}${html}`,
				);
			} else {
				element.innerHTML = `${element.innerHTML}${html}`;
			}
		},
	};
}

const reference = new Window();
const referenceDocument = reference.document as unknown as Document;

type ParsedNode = DefaultTreeAdapterMap['childNode'];

const VOID_ELEMENTS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'source',
	'track',
	'wbr',
]);
const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'plaintext']);
const LEADING_NEWLINE_ELEMENTS = new Set(['pre', 'listing', 'textarea']);

function parseInContext(markup: string, contextTagName: string): ParsedNode[] {
	const context = defaultTreeAdapter.createElement(contextTagName, parse5Html.NS.HTML, []);
	return parseFragment(context, markup, {}).childNodes;
}

function buildReferenceNodes(parent: Element, nodes: ParsedNode[]): void {
	for (const node of nodes) {
		if (defaultTreeAdapter.isTextNode(node)) {
			parent.append(referenceDocument.createTextNode(node.value));
		} else if (defaultTreeAdapter.isCommentNode(node)) {
			parent.append(referenceDocument.createComment(node.data));
		} else if (defaultTreeAdapter.isElementNode(node)) {
			const element = referenceDocument.createElementNS(node.namespaceURI, node.tagName);
			for (const attribute of node.attrs) element.setAttribute(attribute.name, attribute.value);
			buildReferenceNodes(element, node.childNodes);
			parent.append(element);
		}
	}
}

function setReferenceHtml(element: Element, markup: string): void {
	element.replaceChildren();
	buildReferenceNodes(element, parseInContext(markup, element.localName));
}

/** The HTML fragment serialization algorithm, so the reference never uses happy-dom's serializer. */
function serializeReference(node: Node): string {
	return Array.from(node.childNodes, (child, index) => {
		if (child.nodeType === 8) return `<!--${child.textContent}-->`;

		if (child.nodeType === 3) {
			const text = child.textContent ?? '';
			const parentName = (node as Element).localName ?? '';
			if (RAW_TEXT_ELEMENTS.has(parentName)) return text;
			const newline =
				index === 0 && LEADING_NEWLINE_ELEMENTS.has(parentName) && text.startsWith('\n') ? '\n' : '';
			return `${newline}${text
				.replace(/&/g, '&amp;')
				.replace(/\u00a0/g, '&nbsp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')}`;
		}

		const element = child as Element;
		const name = element.localName;
		const attributes = Array.from(
			element.attributes,
			(attribute) =>
				` ${attribute.name}="${attribute.value
					.replace(/&/g, '&amp;')
					.replace(/\u00a0/g, '&nbsp;')
					.replace(/"/g, '&quot;')}"`,
		).join('');
		return VOID_ELEMENTS.has(name)
			? `<${name}${attributes}>`
			: `<${name}${attributes}>${serializeReference(element)}</${name}>`;
	}).join('');
}

/** Canonical form of a `div`'s inner HTML: parsed by parse5, then serialized. */
function normalize(markup: string): string {
	const container = referenceDocument.createElement('div');
	buildReferenceNodes(container, parseInContext(markup, 'div'));
	return serializeReference(container);
}

type Case = { seed: number; html: string; minimal: DomElement; expected: DomElement };

function runCase(seed: number, options: { mutate: boolean; query: boolean }): Case {
	const random = createRandom(seed);
	const generator = new HtmlGenerator(random);
	const html = generator.flowChildren(0);

	const minimal = new MinimalHTMLElement('div', null) as unknown as DomElement;
	const expected = referenceDocument.createElement('div') as unknown as DomElement;
	minimal.innerHTML = html;
	setReferenceHtml(expected as unknown as Element, html);

	if (options.query) {
		(minimal as unknown as MinimalHTMLElement).querySelectorAll('*');
	}

	if (options.mutate) {
		for (let step = 0; step < 3; step += 1) {
			const mutation = createMutation(random, generator);
			const minimalTargets = collectElements(minimal).filter(mutation.applies);
			const expectedTargets = collectElements(expected).filter(mutation.applies);
			const index = Math.floor(random() * minimalTargets.length);

			if (minimalTargets.length === 0 || minimalTargets.length !== expectedTargets.length) break;
			mutation.run(minimalTargets[index] as DomElement, false);
			mutation.run(expectedTargets[index] as DomElement, true);
		}
	}

	return { seed, html, minimal, expected };
}

/**
 * @remarks `textContent` is read first: walking children or serializing builds child nodes, which would hide
 * bugs in reads that happen before materialization.
 */
function assertEquivalent({ seed, html, minimal, expected }: Case): void {
	const minimalText = minimal.textContent;
	const context = `seed ${seed}\nsource: ${JSON.stringify(html)}\nminimal: ${JSON.stringify(minimal.innerHTML)}`;

	expect(minimalText, context).toBe(expected.textContent);
	expect(describeTree(minimal), context).toEqual(describeTree(expected));
	expect(normalize(minimal.innerHTML), context).toBe(normalize(serializeReference(expected as unknown as Node)));

	const expectedElements = collectElements(expected);
	collectElements(minimal).forEach((element, index) => {
		const read = (target: DomElement) =>
			target.getAttributeNames().map((name) => [name, target.getAttribute(name)]);
		expect(read(element), context).toEqual(read(expectedElements[index] as DomElement));
	});
}

describe('minimal DOM matches a reference DOM', () => {
	const variants = [
		{ name: 'parse and serialize', mutate: false, query: false },
		{ name: 'parse, query and serialize', mutate: false, query: true },
		{ name: 'parse, mutate and serialize', mutate: true, query: false },
		{ name: 'query then mutate', mutate: true, query: true },
	];

	for (const variant of variants) {
		test(variant.name, () => {
			for (let seed = 1; seed <= CASES; seed += 1) {
				assertEquivalent(runCase(seed, variant));
			}
		});
	}
});
