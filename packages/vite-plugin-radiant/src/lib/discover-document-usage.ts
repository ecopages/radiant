import { parse } from 'parse5';
import type { RadiantDocumentUsage } from '../runtime/document-state';

const RADIANT_CONTROLLER_ATTRIBUTE = 'data-controller';

type Parse5Attribute = {
	name: string;
	value: string;
};

type Parse5Element = {
	nodeName: string;
	tagName: string;
	attrs: Parse5Attribute[];
	childNodes: Parse5ChildNode[];
};

type Parse5ChildNode = Parse5Element | { nodeName: string; childNodes?: Parse5ChildNode[] };

export function discoverRadiantDocumentUsage(html: string): RadiantDocumentUsage {
	const customElementTagNames = new Set<string>();
	const controllerIdentifiers = new Set<string>();
	const document = parse(html) as { childNodes: Parse5ChildNode[] };

	for (const element of walkElements(document.childNodes)) {
		const tagName = element.tagName.toLowerCase();

		if (tagName.includes('-')) {
			customElementTagNames.add(tagName);
		}

		const controllerValue = readAttribute(element, RADIANT_CONTROLLER_ATTRIBUTE);

		if (!controllerValue) {
			continue;
		}

		for (const identifier of controllerValue
			.split(/\s+/)
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0)) {
			controllerIdentifiers.add(identifier);
		}
	}

	return {
		controllerIdentifiers: Array.from(controllerIdentifiers),
		customElementTagNames: Array.from(customElementTagNames),
	};
}

function* walkElements(nodes: Parse5ChildNode[]): Generator<Parse5Element> {
	for (const node of nodes) {
		if (!isElement(node)) {
			continue;
		}

		yield node;

		if (node.childNodes.length > 0) {
			yield* walkElements(node.childNodes);
		}
	}
}

function isElement(node: Parse5ChildNode): node is Parse5Element {
	return node.nodeName !== '#text' && node.nodeName !== '#comment' && node.nodeName !== '#documentType';
}

function readAttribute(element: Parse5Element, name: string): string | undefined {
	for (const attribute of element.attrs) {
		if (attribute.name === name) {
			return attribute.value;
		}
	}

	return undefined;
}
