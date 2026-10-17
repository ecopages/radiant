import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';

/**
 * Differential test: the SSR minimal DOM against Chromium.
 *
 * @remarks Each case generates conforming HTML from a seed (content models respected, so the spec applies no
 * implied end tags or foster parenting) and applies the same DOM calls to a minimal-DOM element and a Chromium
 * element. It then checks that both trees match (node types, names, text, attribute values, `textContent` read
 * before anything walks the tree), and that Chromium parses the minimal DOM's serialization back into exactly
 * the minimal tree, which is the SSR contract. A failure message carries the seed and the source HTML.
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
/**
 * @remarks Legacy references without a semicolon (`&copy 2024`, `&notit;`, `?a=1&copy=2`) stay out of attribute
 * values: Chromium's `innerHTML` fast path decodes some that the spec's attribute rule keeps literal. The spec
 * behaviour is pinned in `minimal-dom-entities.test.ts`.
 */
const ATTRIBUTE_ENTITIES = ENTITIES.filter((entity) => !['&notit;', '&copy 2024'].includes(entity));
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
/**
 * @remarks No `<?…?>`: the spec parses it as a bogus comment, while current Chromium creates a processing
 * instruction (a WHATWG proposal). `minimal-dom-parsing.test.ts` pins the spec behaviour.
 */
const MARKUP_ODDITIES = ['<!---->', '<!-->', '<!--->', '<!doctype html>', '</ odd>', '</>', 'a < b', 'x\r\ny'];

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
			pick(this.random, ['x', ' ', "'", '<', '>', '\r\n', '[{&quot;type&quot;:1}]', ...ATTRIBUTE_ENTITIES]),
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
	insertAdjacentHTML(position: InsertPosition, html: string): void;
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

/**
 * @remarks Set text never starts with a newline. The minimal DOM restores the newline the parser drops after a
 * `pre`, `listing` or `textarea` start tag when it serializes the element; Chromium does not, so its own round
 * trip loses that newline. `minimal-dom-parsing.test.ts` pins the minimal-DOM behaviour.
 */
type Mutation = { applies: (element: DomElement) => boolean; run: (element: DomElement) => void };

function createMutation(random: Random, generator: HtmlGenerator): Mutation {
	const roll = random();
	const rawText = `x${repeat(random, 3, () => pick(random, ['x', ' & ', '<b>', '"q"', "'", '>', '&amp;', '\n']))}`;
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
			run: (element) => {
				const serialized = element.innerHTML;
				element.innerHTML = serialized;
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
			run: (element) => element.insertAdjacentHTML(position, html),
		};
	}

	return {
		applies: isMutable,
		run: (element) => {
			element.append(rawText);
			element.innerHTML = `${element.innerHTML}${html}`;
		},
	};
}

type Case = { seed: number; html: string; minimal: DomElement; expected: DomElement };

function runCase(seed: number, options: { mutate: boolean; query: boolean }): Case {
	const random = createRandom(seed);
	const generator = new HtmlGenerator(random);
	const html = generator.flowChildren(0);

	const minimal = new MinimalHTMLElement('div', null) as unknown as DomElement;
	const expected = document.createElement('div') as unknown as DomElement;
	minimal.innerHTML = html;
	expected.innerHTML = html;

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
			mutation.run(minimalTargets[index] as DomElement);
			mutation.run(expectedTargets[index] as DomElement);
		}
	}

	return { seed, html, minimal, expected };
}

/**
 * @remarks Merges adjacent text: HTML cannot encode a boundary between two text nodes, so a parse always yields one.
 */
function describeSerializableTree(node: DomNode): unknown[] {
	const described: unknown[] = [];

	for (const child of Array.from(node.childNodes)) {
		const previous = described[described.length - 1] as [number, string] | undefined;

		if (child.nodeType === 3 && previous?.[0] === 3) {
			described[described.length - 1] = [3, `${previous[1]}${child.textContent}`];
		} else {
			described.push(
				child.nodeType === 1
					? [(child as DomElement).localName, describeSerializableTree(child)]
					: [child.nodeType, child.textContent],
			);
		}
	}

	return described;
}

function attributesOf(element: DomElement): unknown[] {
	return element.getAttributeNames().map((name) => [name, element.getAttribute(name)]);
}

/**
 * @remarks `textContent` is read first: walking children or serializing builds child nodes, which would hide
 * bugs in reads that happen before materialization.
 */
function assertEquivalent({ seed, html, minimal, expected }: Case): void {
	const minimalText = minimal.textContent;
	const output = minimal.innerHTML;
	const context = `seed ${seed}\nsource: ${JSON.stringify(html)}\nminimal: ${JSON.stringify(output)}`;

	expect(minimalText, context).toBe(expected.textContent);
	expect(describeTree(minimal), context).toEqual(describeTree(expected));

	const expectedElements = collectElements(expected);
	collectElements(minimal).forEach((element, index) => {
		expect(attributesOf(element), context).toEqual(attributesOf(expectedElements[index] as DomElement));
	});

	const reparsed = document.createElement('div');
	reparsed.innerHTML = output;
	expect(
		describeSerializableTree(reparsed as unknown as DomNode),
		`${context}\nChromium re-parses the output differently`,
	).toEqual(describeSerializableTree(minimal));
}

describe('minimal DOM matches Chromium', () => {
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
