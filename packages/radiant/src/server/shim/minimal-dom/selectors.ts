import type { MinimalElement, MinimalNode } from './nodes';

type QueryRoot = MinimalNode | MinimalElement;

type QueryableNode = MinimalElement & {
	materializeChildren(): void;
};

type SelectorPart =
	| { type: 'tag'; value: string }
	| { type: 'id'; value: string }
	| { type: 'class'; value: string }
	| { type: 'attr'; name: string; value?: string };

type CompoundSelector = {
	parts: SelectorPart[];
	combinator: 'descendant' | 'child' | null;
};

function isElementNode(node: QueryRoot): node is MinimalElement {
	return node.nodeType === 1;
}

function isQueryableElement(node: QueryRoot): node is QueryableNode {
	return isElementNode(node) && 'materializeChildren' in node;
}

function materializeIfNeeded(node: QueryRoot): void {
	if (isQueryableElement(node)) {
		node.materializeChildren();
	}
}

function splitSelectorList(selector: string): string[] {
	const selectors: string[] = [];
	let current = '';
	let depth = 0;
	let quote: '"' | "'" | undefined;

	for (let index = 0; index < selector.length; index += 1) {
		const character = selector[index];

		if (quote) {
			current += character;
			if (character === quote) {
				quote = undefined;
			}
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			current += character;
			continue;
		}

		if (character === '[') {
			depth += 1;
			current += character;
			continue;
		}

		if (character === ']') {
			depth = Math.max(0, depth - 1);
			current += character;
			continue;
		}

		if (character === ',' && depth === 0) {
			const trimmed = current.trim();
			if (trimmed !== '') {
				selectors.push(trimmed);
			}
			current = '';
			continue;
		}

		current += character;
	}

	const trimmed = current.trim();
	if (trimmed !== '') {
		selectors.push(trimmed);
	}

	return selectors;
}

function parseCompoundSelector(selector: string): CompoundSelector[] {
	const trimmed = selector.trim();

	if (trimmed === '') {
		throw new SyntaxError(`Failed to execute 'querySelector' on 'Element': '${selector}' is not a valid selector.`);
	}

	const tokens: Array<{ type: 'child' | 'compound' | 'descendant'; value?: string }> = [];
	let current = '';
	let inBrackets = false;
	let quote: '"' | "'" | undefined;

	for (let index = 0; index < trimmed.length; index += 1) {
		const character = trimmed[index];

		if (quote) {
			current += character;
			if (character === quote) {
				quote = undefined;
			}
			continue;
		}

		if (character === '"' || character === "'") {
			quote = character;
			current += character;
			continue;
		}

		if (character === '[') {
			inBrackets = true;
			current += character;
			continue;
		}

		if (character === ']') {
			inBrackets = false;
			current += character;
			continue;
		}

		if (!inBrackets && character === '>') {
			if (current.trim() !== '') {
				tokens.push({ type: 'compound', value: current.trim() });
			}
			tokens.push({ type: 'child' });
			current = '';
			continue;
		}

		if (!inBrackets && /\s/.test(character)) {
			if (current.trim() !== '') {
				tokens.push({ type: 'compound', value: current.trim() });
				tokens.push({ type: 'descendant' });
				current = '';
			}
			continue;
		}

		current += character;
	}

	if (current.trim() !== '') {
		tokens.push({ type: 'compound', value: current.trim() });
	}

	const compounds: CompoundSelector[] = [];
	let nextCombinator: CompoundSelector['combinator'] = null;

	for (const token of tokens) {
		if (token.type === 'compound') {
			compounds.push({
				parts: parseSelectorParts(token.value!),
				combinator: nextCombinator,
			});
			nextCombinator = null;
			continue;
		}

		if (token.type === 'descendant') {
			nextCombinator = 'descendant';
			continue;
		}

		nextCombinator = 'child';
	}

	if (compounds.length === 0) {
		throwUnsupported(selector);
	}

	return compounds;
}

function parseSelectorParts(selector: string): SelectorPart[] {
	const parts: SelectorPart[] = [];
	let index = 0;

	while (index < selector.length) {
		const character = selector[index];

		if (character === ' ' || character === '\t' || character === '\n' || character === '\r') {
			index += 1;
			continue;
		}

		if (character === '#') {
			const match = /^#([A-Za-z0-9_.-]+)/.exec(selector.slice(index));
			if (!match) {
				throwUnsupported(selector);
			}
			parts.push({ type: 'id', value: match[1]! });
			index += match[0].length;
			continue;
		}

		if (character === '.') {
			const match = /^\.([A-Za-z0-9_-]+)/.exec(selector.slice(index));
			if (!match) {
				throwUnsupported(selector);
			}
			parts.push({ type: 'class', value: match[1]! });
			index += match[0].length;
			continue;
		}

		if (character === '[') {
			const closeIndex = selector.indexOf(']', index);
			if (closeIndex === -1) {
				throwUnsupported(selector);
			}

			const attributeBody = selector.slice(index + 1, closeIndex);
			const attributeMatch = /^([A-Za-z0-9_:.-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?$/.exec(
				attributeBody,
			);

			if (!attributeMatch) {
				throwUnsupported(selector);
			}

			const [, name, doubleQuoted, singleQuoted, bareValue] = attributeMatch;
			const value = doubleQuoted ?? singleQuoted ?? bareValue;
			parts.push(value === undefined ? { type: 'attr', name: name! } : { type: 'attr', name: name!, value });
			index = closeIndex + 1;
			continue;
		}

		if (character === ':' || character === '~' || character === '+') {
			throwUnsupported(selector);
		}

		const tagMatch = /^([A-Za-z][A-Za-z0-9_:-]*|\*)/.exec(selector.slice(index));
		if (!tagMatch) {
			throwUnsupported(selector);
		}

		if (tagMatch[1] !== '*') {
			parts.push({ type: 'tag', value: tagMatch[1]!.toLowerCase() });
		}

		index += tagMatch[0].length;
	}

	return parts;
}

function throwUnsupported(selector: string): never {
	throw new SyntaxError(`Failed to execute 'querySelector' on 'Element': '${selector}' is not a valid selector.`);
}

function readClassTokens(element: MinimalElement): string[] {
	return (element.getAttribute('class') ?? '')
		.split(/\s+/)
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
}

function matchesPart(element: MinimalElement, part: SelectorPart): boolean {
	switch (part.type) {
		case 'tag':
			return element.localName === part.value;
		case 'id':
			return element.id === part.value;
		case 'class':
			return readClassTokens(element).includes(part.value);
		case 'attr':
			if (!element.hasAttribute(part.name)) {
				return false;
			}
			return part.value === undefined ? true : element.getAttribute(part.name) === part.value;
	}
}

function matchesCompound(element: MinimalElement, compound: CompoundSelector): boolean {
	return compound.parts.every((part) => matchesPart(element, part));
}

function matchesSelectorChain(element: MinimalElement, compounds: CompoundSelector[]): boolean {
	if (compounds.length === 0) {
		return false;
	}

	if (compounds.length === 1) {
		return matchesCompound(element, compounds[0]!);
	}

	let current: MinimalElement | null = element;

	for (let compoundIndex = compounds.length - 1; compoundIndex >= 0; compoundIndex -= 1) {
		const compound = compounds[compoundIndex]!;

		if (compoundIndex === compounds.length - 1) {
			if (!current || !matchesCompound(current, compound)) {
				return false;
			}

			current = getParentElement(current);
			continue;
		}

		const combinator = compounds[compoundIndex + 1]!.combinator;

		if (combinator === 'child') {
			if (!current || !matchesCompound(current, compound)) {
				return false;
			}

			current = getParentElement(current);
			continue;
		}

		let matched = false;

		while (current) {
			if (matchesCompound(current, compound)) {
				matched = true;
				current = getParentElement(current);
				break;
			}

			current = getParentElement(current);
		}

		if (!matched) {
			return false;
		}
	}

	return true;
}

function matchesSelector(element: MinimalElement, selector: string): boolean {
	return splitSelectorList(selector).some((singleSelector) =>
		matchesSelectorChain(element, parseCompoundSelector(singleSelector)),
	);
}

function getParentElement(node: MinimalElement): MinimalElement | null {
	const parent = node.parentNode as QueryRoot | null;
	return parent && isElementNode(parent) ? parent : null;
}

function* depthFirstElements(root: QueryRoot, includeRoot: boolean): Generator<MinimalElement> {
	if (includeRoot && isElementNode(root)) {
		yield root;
	}

	const stack: QueryRoot[] = [...root.childNodes].reverse() as unknown as QueryRoot[];

	while (stack.length > 0) {
		const node = stack.pop()!;

		if (isElementNode(node)) {
			materializeIfNeeded(node);
			yield node;

			for (let index = node.childNodes.length - 1; index >= 0; index -= 1) {
				const child = node.childNodes[index];
				if (child) {
					stack.push(child as unknown as QueryRoot);
				}
			}
			continue;
		}

		materializeIfNeeded(node);
		for (let index = node.childNodes.length - 1; index >= 0; index -= 1) {
			const child = node.childNodes[index];
			if (child) {
				stack.push(child as unknown as QueryRoot);
			}
		}
	}
}

function querySelectorOnRoot(root: QueryRoot, selector: string): MinimalElement | null {
	for (const singleSelector of splitSelectorList(selector)) {
		const compounds = parseCompoundSelector(singleSelector);

		if (compounds.length === 1) {
			for (const element of depthFirstElements(root, false)) {
				if (matchesCompound(element, compounds[0]!)) {
					return element;
				}
			}
			continue;
		}

		for (const candidate of depthFirstElements(root, false)) {
			if (matchesSelectorChain(candidate, compounds)) {
				return candidate;
			}
		}
	}

	return null;
}

function querySelectorAllOnRoot(root: QueryRoot, selector: string): MinimalElement[] {
	const results: MinimalElement[] = [];
	const seen = new Set<MinimalElement>();

	for (const singleSelector of splitSelectorList(selector)) {
		const compounds = parseCompoundSelector(singleSelector);

		if (compounds.length === 1) {
			for (const element of depthFirstElements(root, false)) {
				if (matchesCompound(element, compounds[0]!) && !seen.has(element)) {
					seen.add(element);
					results.push(element);
				}
			}
			continue;
		}

		for (const candidate of depthFirstElements(root, false)) {
			if (matchesSelectorChain(candidate, compounds) && !seen.has(candidate)) {
				seen.add(candidate);
				results.push(candidate);
			}
		}
	}

	return results;
}

export function matches(element: MinimalElement, selector: string): boolean {
	return matchesSelector(element, selector);
}

export function closest(element: MinimalElement, selector: string): MinimalElement | null {
	let current: MinimalElement | null = element;

	while (current) {
		if (matchesSelector(current, selector)) {
			return current;
		}

		current = getParentElement(current);
	}

	return null;
}

export function contains(root: QueryRoot, other: QueryRoot | null): boolean {
	if (!other) {
		return false;
	}

	if (root === other) {
		return true;
	}

	let current: QueryRoot | null = other;

	while (current) {
		if (current === root) {
			return true;
		}

		current = current.parentNode as QueryRoot | null;
	}

	return false;
}

export function querySelector(root: QueryRoot, selector: string): MinimalElement | null {
	return querySelectorOnRoot(root, selector);
}

export function querySelectorAll(root: QueryRoot, selector: string): MinimalElement[] {
	return querySelectorAllOnRoot(root, selector);
}
