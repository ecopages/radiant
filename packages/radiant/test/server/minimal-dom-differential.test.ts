// @vitest-environment node
import { Window } from 'happy-dom';
import { describe, expect, test } from 'vitest';
import { MinimalHTMLElement } from '../../src/server/shim/minimal-dom/nodes';
import '../../src/server/shim/minimal-dom/html';

/**
 * Differential test: the minimal DOM against happy-dom as a reference DOM.
 *
 * @remarks Each case generates well-formed HTML from a seed, applies the same mutations to both DOMs, and
 * compares what the browser would see: the minimal output re-parsed by happy-dom, `textContent`, and
 * attribute values. A failure message carries the seed and the source HTML to reproduce it.
 */

const CASES = 1000;
const KNOWN_ENTITIES = ['&amp;', '&lt;', '&gt;', '&quot;', '&#39;', '&#x41;', '&#169;', '&nbsp;', '&copy;', '&mdash;'];
const UNKNOWN_ENTITIES = ['&euro;', '&rsquo;', '&hearts;'];
const CONTAINERS = ['div', 'span', 'b', 'em', 'section', 'x-card'];
const VOIDS = ['br', 'input', 'img'];
const ATTRIBUTE_NAMES = ['title', 'data-rules', 'aria-label', 'class'];
const SCRIPTS = [
	'<script type="application/json">{"a":"<b>&amp;</b>","b":"&lt;"}</script>',
	'<script type="application/json">{"html":"<div><span>x</span></div>"}</script>',
	'<style>.a::before{content:"&amp; >"}</style>',
	'<script>const close = "</div>";</script>',
	'<script>const open = "<div>";</script>',
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
	constructor(
		private readonly random: Random,
		private readonly entities: readonly string[],
	) {}

	text(): string {
		return repeat(this.random, 4, () =>
			pick(this.random, ['a', 'Terms', ' ', '& ', '>', '"', "'", '=', ...this.entities]),
		);
	}

	attributeValue(): string {
		return repeat(this.random, 3, () =>
			pick(this.random, ['x', ' ', "'", '<', '>', '[{&quot;type&quot;:1}]', ...this.entities]),
		);
	}

	attributes(): string {
		const names = ATTRIBUTE_NAMES.filter(() => this.random() < 0.4);
		return names
			.map((name) => {
				const roll = this.random();
				if (roll < 0.1) return ` ${name}`;
				if (roll < 0.2) return ` ${name}=${pick(this.random, ['x', 'a-b', '1'])}`;
				if (roll < 0.35) return ` ${name}='${this.attributeValue().replace(/'/g, '"')}'`;
				if (roll < 0.45) return `  ${name} = "${this.attributeValue()}" `;
				return ` ${name}="${this.attributeValue()}"`;
			})
			.join('');
	}

	node(depth: number): string {
		const roll = this.random();

		if (roll < 0.35 || depth > 3) return this.text();
		if (roll < 0.45) return `<${pick(this.random, VOIDS)}${this.attributes()}>`;
		if (roll < 0.5) return `<!-- ${this.text().replace(/-/g, '')} -->`;
		if (roll < 0.55) return pick(this.random, SCRIPTS);

		const tag = pick(this.random, CONTAINERS);
		const written = this.random() < 0.1 ? tag.toUpperCase() : tag;
		return `<${written}${this.attributes()}>${this.children(depth + 1)}</${written}>`;
	}

	children(depth: number): string {
		return repeat(this.random, 3, () => this.node(depth));
	}
}

type DomElement = {
	readonly children: ArrayLike<DomElement>;
	readonly localName: string;
	textContent: string | null;
	innerHTML: string;
	getAttribute(name: string): string | null;
	getAttributeNames(): string[];
	setAttribute(name: string, value: string): void;
	removeAttribute(name: string): void;
	append(...nodes: string[]): void;
};

function collectElements(root: DomElement): DomElement[] {
	return Array.from(root.children).flatMap((child) => [child, ...collectElements(child)]);
}

function isContainer(element: DomElement): boolean {
	return CONTAINERS.includes(element.localName);
}

type Mutation = (element: DomElement) => void;

function createMutation(
	random: Random,
	generator: HtmlGenerator,
): { applies: (element: DomElement) => boolean; run: Mutation } {
	const roll = random();
	const rawText = repeat(random, 3, () => pick(random, ['x', ' & ', '<b>', '"q"', "'", '>', '&amp;']));

	if (roll < 0.35) {
		const name = pick(random, ATTRIBUTE_NAMES);
		return { applies: () => true, run: (element) => element.setAttribute(name, rawText) };
	}

	if (roll < 0.5) {
		const name = pick(random, ATTRIBUTE_NAMES);
		return { applies: () => true, run: (element) => element.removeAttribute(name) };
	}

	if (roll < 0.75) {
		return { applies: isContainer, run: (element) => (element.textContent = rawText) };
	}

	const html = generator.children(2);
	return {
		applies: isContainer,
		run: (element) => {
			element.append(rawText);
			element.innerHTML = `${element.innerHTML}${html}`;
		},
	};
}

const reference = new Window();

function normalize(html: string): string {
	const container = reference.document.createElement('div');
	container.innerHTML = html;
	return container.innerHTML;
}

type Case = {
	seed: number;
	html: string;
	minimal: DomElement;
	expected: DomElement;
	compareReads: boolean;
};

function runCase(seed: number, options: { unknownEntities: boolean; mutate: boolean; query: boolean }): Case {
	const random = createRandom(seed);
	const generator = new HtmlGenerator(
		random,
		options.unknownEntities ? [...KNOWN_ENTITIES, ...UNKNOWN_ENTITIES] : KNOWN_ENTITIES,
	);
	const html = generator.children(0);

	const minimal = new MinimalHTMLElement('div', null) as unknown as DomElement;
	const expected = reference.document.createElement('div') as unknown as DomElement;
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

	return { seed, html, minimal, expected, compareReads: !options.unknownEntities };
}

/**
 * @remarks `textContent` is read first: walking `children` or serializing builds child nodes, which would
 * hide bugs in reads that happen before materialization.
 */
function assertEquivalent({ seed, html, minimal, expected, compareReads }: Case): void {
	const minimalText = minimal.textContent;
	const context = `seed ${seed}\nsource: ${html}\nminimal: ${minimal.innerHTML}`;

	if (compareReads) {
		expect(minimalText, context).toBe(expected.textContent);
	}

	const minimalElements = collectElements(minimal);
	const expectedElements = collectElements(expected);

	expect(
		minimalElements.map((element) => element.localName),
		context,
	).toEqual(expectedElements.map((element) => element.localName));
	expect(normalize(minimal.innerHTML), context).toBe(normalize(expected.innerHTML));

	if (!compareReads) return;

	minimalElements.forEach((element, index) => {
		const counterpart = expectedElements[index] as DomElement;
		const read = (target: DomElement) =>
			target.getAttributeNames().map((name) => [name, target.getAttribute(name)]);
		expect(read(element), context).toEqual(read(counterpart));
	});
}

describe('minimal DOM matches a reference DOM', () => {
	const variants = [
		{ name: 'parse and serialize', unknownEntities: false, mutate: false, query: false },
		{ name: 'parse, query and serialize', unknownEntities: false, mutate: false, query: true },
		{ name: 'parse, mutate and serialize', unknownEntities: false, mutate: true, query: false },
		{ name: 'query then mutate', unknownEntities: false, mutate: true, query: true },
		{ name: 'unknown entities survive serialization', unknownEntities: true, mutate: false, query: true },
	];

	for (const variant of variants) {
		test(variant.name, () => {
			for (let seed = 1; seed <= CASES; seed += 1) {
				assertEquivalent(runCase(seed, variant));
			}
		});
	}
});
