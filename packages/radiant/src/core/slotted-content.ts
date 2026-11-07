import { createMarkupNodeLike, isKeyedJsxValue, type JsxRenderable, type TemplateResultLike } from '@ecopages/jsx';

import { escapeHtmlText } from '../utils/escape-html-text';
import { HYDRATION_ATTRIBUTE } from './hydration-codec';

/** Comment data that opens the server's placement of a host's captured slotted content in its view. */
export const SLOTTED_START = 'radiant-slotted';
/** Comment data that closes it. */
export const SLOTTED_END = '/radiant-slotted';
/**
 * Marks a server-rendered host that holds captured slotted content, and the inert `<template>` that carries that
 * content when the view did not place it.
 */
export const SLOTTED_ATTRIBUTE = 'data-radiant-slotted';

type ForeignNamespace = 'svg' | 'math';

/**
 * Replaces slotted content that a view places inside `svg` or `math`.
 *
 * @remarks The server passes one to {@link projectForeignSlotted}: a light-DOM node would otherwise serialize by its
 * own DOM position, under the host in HTML, while the browser parses it where the view puts it.
 */
export type ForeignSlottedProjector = (content: JsxRenderable, namespace: ForeignNamespace) => JsxRenderable;

/** A host's child nodes as slotted content, without the hydration scripts and slotted template the server adds. */
export function captureSlottedNodes(host: HTMLElement): Node[] {
	return Array.from(host.childNodes).filter((node) => !isSlottedTemplate(node) && !isHydrationScript(node));
}

/** The server's start and end comments around captured slotted content, as markup the view renders as it is. */
export function createSlottedBounds(): [JsxRenderable, JsxRenderable] {
	return [createMarkupNodeLike(`<!--${SLOTTED_START}-->`), createMarkupNodeLike(`<!--${SLOTTED_END}-->`)];
}

/**
 * Takes the slotted content the server rendered for `host`, or returns `undefined` when the server marked none.
 *
 * @remarks Only a host carrying {@link SLOTTED_ATTRIBUTE} holds server slotted content, so a host whose authored
 * children include a nested server-rendered host never takes that host's content. The attribute is removed. The
 * content is either the nodes between the host's first {@link SLOTTED_START} comment in tree order and its matching
 * end, which stay where they are while the comments are removed, or the content of a template child carrying the
 * attribute, which is removed. The first start comment is the host's own: a nested host's comments sit inside the
 * slotted content they belong to, and a host a view creates receives its children from the view and adds none.
 */
export function takeServerSlotted(host: HTMLElement): Node[] | undefined {
	if (!host.hasAttribute(SLOTTED_ATTRIBUTE)) return undefined;
	host.removeAttribute(SLOTTED_ATTRIBUTE);

	for (const node of Array.from(host.childNodes)) {
		if (!isSlottedTemplate(node)) continue;
		node.remove();
		return Array.from(node.content.childNodes);
	}

	const start = findComment(host, SLOTTED_START);
	if (!start) return [];

	const nodes: Node[] = [];
	let depth = 0;
	let node = start.nextSibling;

	for (; node; node = node.nextSibling) {
		if (isComment(node, SLOTTED_START)) depth += 1;
		if (isComment(node, SLOTTED_END) && depth-- === 0) break;
		nodes.push(node);
	}

	start.remove();
	node?.remove();
	return nodes;
}

/** The markup of captured slotted nodes, for the template that carries them when the view did not place them. */
export function serializeSlottedMarkup(nodes: readonly JsxRenderable[]): string {
	return nodes.map((node) => renderableToHtmlFragment(node) ?? '').join('');
}

/** Inert template the client reads captured slotted nodes from when the view did not place them. */
export function createSlottedTemplateTag(markup: string): string {
	return markup === '' ? '' : `<template ${SLOTTED_ATTRIBUTE}>${markup}</template>`;
}

export function collectAuthoredHydrationScriptMarkup(host: HTMLElement): string | undefined {
	const fragments = Array.from(host.childNodes)
		.filter((node): node is HTMLScriptElement => isHydrationScript(node))
		.map((node) => renderableToHtmlFragment(node) ?? '')
		.filter((fragment) => fragment !== '');

	return fragments.length > 0 ? fragments.join('') : undefined;
}

/**
 * Passes each entry of `slotted` through `project` wherever `value` places it inside `svg` or `math`.
 *
 * @remarks Server only. Entries are found by identity, at any depth: the JSX factory copies an array child, so the
 * slotted arrays themselves do not survive, while their entries, and a single slotted value, do. Namespaces are tracked through
 * templates by the rule of the jsx serializer's `childForeignContent`.
 */
export function projectForeignSlotted(
	value: JsxRenderable,
	slotted: JsxRenderable,
	project: ForeignSlottedProjector,
): JsxRenderable {
	if (slotted === null || slotted === undefined) return value;

	const entries = new Set<unknown>();
	const collect = (entry: JsxRenderable): void => {
		entries.add(entry);
		if (Array.isArray(entry)) entry.forEach(collect);
	};
	collect(slotted);

	const walk = (current: JsxRenderable, namespace?: ForeignNamespace): JsxRenderable => {
		if (entries.has(current)) return namespace ? project(current, namespace) : current;
		if (isKeyedJsxValue(current)) return { ...current, value: walk(current.value, namespace) };

		if (isTemplateResultLike(current)) {
			const childNamespace = childForeignNamespace(current.rootLocalName?.toLowerCase(), namespace);
			return {
				...current,
				values: current.values.map((entry) => walk(entry as JsxRenderable, childNamespace)),
			} satisfies TemplateResultLike;
		}

		if (Array.isArray(current)) return current.map((entry: JsxRenderable) => walk(entry, namespace));
		return current;
	};

	return walk(value);
}

function isTemplateResultLike(value: JsxRenderable): value is TemplateResultLike {
	return (
		typeof value === 'object' &&
		value !== null &&
		(value as Partial<TemplateResultLike>)['_$rType$'] === 1 &&
		Array.isArray((value as Partial<TemplateResultLike>).values)
	);
}

/**
 * @remarks `svg` and `math` enter foreign content. Only an SVG `foreignObject`, `desc` or `title` returns to HTML;
 * under `math` the same names stay foreign.
 */
function childForeignNamespace(
	localName: string | undefined,
	namespace?: ForeignNamespace,
): ForeignNamespace | undefined {
	if (localName === 'svg' || localName === 'math') return localName;
	return namespace === 'svg' && (localName === 'foreignobject' || localName === 'desc' || localName === 'title')
		? undefined
		: namespace;
}

const ELEMENT_NODE = 1;
const COMMENT_NODE = 8;

/**
 * @remarks Checks the tag name and numeric node type: the server's minimal DOM defines neither `HTMLTemplateElement`
 * nor always a global `Node`.
 */
function isSlottedTemplate(node: Node): node is HTMLTemplateElement {
	return (
		node.nodeType === ELEMENT_NODE &&
		(node as Element).localName === 'template' &&
		(node as Element).hasAttribute(SLOTTED_ATTRIBUTE)
	);
}

function isComment(node: Node, data: string): boolean {
	return node.nodeType === COMMENT_NODE && (node as Comment).data === data;
}

function findComment(root: Node, data: string): Comment | undefined {
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if ((node as Comment).data === data) return node as Comment;
	}
	return undefined;
}

function isHydrationScript(node: Node): node is HTMLScriptElement {
	return node instanceof HTMLScriptElement && node.hasAttribute(HYDRATION_ATTRIBUTE);
}

function renderableToHtmlFragment(renderable: JsxRenderable): string | undefined {
	if (renderable === undefined || renderable === null || typeof renderable === 'boolean') return undefined;
	if (typeof renderable === 'string' || typeof renderable === 'number' || typeof renderable === 'bigint') {
		return String(renderable);
	}
	if (typeof Node !== 'undefined' && renderable instanceof Node) return nodeToHtmlFragment(renderable);
	if (isKeyedJsxValue(renderable)) return renderableToHtmlFragment(renderable.value);
	return typeof renderable === 'object' ? objectToHtmlFragment(renderable) : undefined;
}

/**
 * @remarks Comment nodes render nothing: the template becomes trusted markup on the client, and comment data is not
 * escaped by serialization.
 */
function nodeToHtmlFragment(node: Node): string | undefined {
	if (node.nodeType === Node.TEXT_NODE) return escapeHtmlText(node.textContent ?? '');
	if (node.nodeType === Node.COMMENT_NODE) return '';
	return (node as Element).outerHTML ?? node.textContent ?? undefined;
}

/** Markup-like objects by their `outerHTML`, and iterables entry by entry. */
function objectToHtmlFragment(renderable: object): string | undefined {
	if ('outerHTML' in renderable) {
		const outerHTML = (renderable as { outerHTML: unknown }).outerHTML;
		return typeof outerHTML === 'string' ? outerHTML : undefined;
	}

	if (Symbol.iterator in renderable) {
		return Array.from(renderable as Iterable<JsxRenderable>, (entry) => renderableToHtmlFragment(entry) ?? '').join(
			'',
		);
	}

	return undefined;
}
