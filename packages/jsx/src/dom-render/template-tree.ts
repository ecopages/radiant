import type { TemplateResultLike } from '../types/index.ts';
import { getRangeParent, insertIntoRange } from './child-range.ts';
import { HTML_NAMESPACE_URI } from './namespaces.ts';
import { isTemplateResultLike } from './runtime-helpers.ts';
import {
	createLiveTemplateParts,
	getCompiledTemplate,
	normalizeTemplateFragmentNamespaces,
} from './template-compiler.ts';
import { createTemplateInstanceUpdate } from './template-instance.ts';
import type {
	BindingDescriptor,
	CompiledTemplate,
	LiveChildPart,
	LiveTemplatePart,
	TemplateInstance,
} from './types.ts';

/** A node of a {@link TemplateTree} by its position in tree order, or `-1` for none. */
type NodeRef = number;

type TreePart =
	| { binding: Exclude<BindingDescriptor, { kind: 'child' }>; element: NodeRef; index: number; type: 'attribute' }
	| { element: NodeRef; index: number; type: 'text-content' }
	| { end: NodeRef; index: number; owner: NodeRef; start: NodeRef; type: 'child' };

/** One template of a {@link TemplateTree}, its nodes located by {@link NodeRef}. */
type TemplateTreeNode = {
	/** Aligned with `parts`: the nested template a child part starts with, or `null`. */
	children: readonly (TemplateTreeNode | null)[];
	compiled: CompiledTemplate;
	parts: readonly TreePart[];
	roots: readonly NodeRef[];
};

/**
 * The DOM of a template and of every element template nested in its child parts, built once and cloned whole.
 *
 * @remarks Nested JSX, such as a table row and its cells, is one template per element: mounted one by one, each is
 * cloned, resolved and inserted into its parent's range. A tree does that once per combination of shapes. Each nested
 * template still mounts into its own child range, so an update that changes one child's shape replaces that child
 * alone, as on the general path.
 */
export type TemplateTree = {
	content: DocumentFragment;
	/** How many nodes, in tree order, the parts and roots reach into. */
	nodeCount: number;
	root: TemplateTreeNode;
};

type TrieNode = {
	next?: Map<unknown, TrieNode>;
	tree?: TemplateTree;
};

/** Stands for a child part whose value is not a nested element template. */
const NOT_NESTED = {};
const TRIE_ROOT: TrieNode = {};
const MAX_TRIE_NODES = 4096;
let trieNodeCount = 0;

/**
 * Returns the tree for `template` and the shapes of its nested templates, building it on first use.
 *
 * @remarks Trees are keyed by the namespace context first, since a tree's roots are normalized against it, then by
 * the compiled template of the template and of each nested template, depth first. Past {@link MAX_TRIE_NODES}, a
 * tree is built for each use and not kept, so shapes built from data cannot grow the cache without bound. Templates
 * rooted at a custom element are never nested, so a host's children mount as their own templates.
 */
export function getTemplateTree(
	template: TemplateResultLike,
	contextParent: Node | null,
	rootTarget: HTMLElement,
): TemplateTree {
	const contextElement = contextParent instanceof Element ? contextParent : contextParent?.parentElement;
	const namespace = contextElement?.namespaceURI ?? HTML_NAMESPACE_URI;
	const context = namespace === HTML_NAMESPACE_URI ? namespace : `${namespace} ${contextElement?.localName}`;
	const compiled = getCompiledTemplate(template);
	const contextNode = stepTrie(TRIE_ROOT, context);
	const start = contextNode && stepTrie(contextNode, compiled);
	const leaf = start && walkNestedShapes(template, compiled, start);

	if (!leaf) return buildTemplateTree(template, contextParent, rootTarget);
	return (leaf.tree ??= buildTemplateTree(template, contextParent, rootTarget));
}

/** Clones a tree and binds an instance to each of its templates, nested instances already mounted in their parts. */
export function instantiateTemplateTree(tree: TemplateTree, rootTarget: HTMLElement): TemplateInstance {
	const fragment = tree.content.cloneNode(true) as DocumentFragment;
	const nodes = collectNodes(fragment, tree.nodeCount);
	return createTreeInstance(nodes, tree.root, rootTarget, Array.from(fragment.childNodes));
}

/** The first `count` nodes of `fragment` in tree order. */
function collectNodes(fragment: DocumentFragment, count: number): Node[] {
	const nodes: Node[] = [];
	let node: Node | null = fragment.firstChild;

	while (node && nodes.length < count) {
		nodes.push(node);
		if (node.firstChild) {
			node = node.firstChild;
			continue;
		}
		while (node && node !== fragment && !node.nextSibling) node = node.parentNode;
		node = node && node !== fragment ? node.nextSibling : null;
	}

	return nodes;
}

function createTreeInstance(
	nodes: readonly Node[],
	node: TemplateTreeNode,
	rootTarget: HTMLElement,
	rootNodes: readonly Node[],
): TemplateInstance {
	const parts: LiveTemplatePart[] = [];

	for (let index = 0; index < node.parts.length; index += 1) {
		const part = node.parts[index]!;
		const child = node.children[index];

		if (part.type === 'attribute') {
			parts.push({
				binding: part.binding,
				element: nodes[part.element] as Element,
				index: part.index,
				rootTarget,
				subscriptionSerial: 0,
				type: 'attribute',
			});
		} else if (part.type === 'text-content') {
			parts.push({
				committedText: '',
				element: nodes[part.element] as Element,
				index: part.index,
				subscriptionSerial: 0,
				type: 'text-content',
			});
		} else {
			parts.push({
				end: refNode(nodes, part.end) as ChildNode | null,
				index: part.index,
				mounted: child
					? {
							instance: createTreeInstance(
								nodes,
								child,
								rootTarget,
								child.roots.map((ref) => nodes[ref]!),
							),
							kind: 'template',
						}
					: { kind: 'empty' },
				owner: refNode(nodes, part.owner) as ParentNode | undefined,
				start: refNode(nodes, part.start) as ChildNode | null,
				type: 'child',
			} satisfies LiveChildPart);
		}
	}

	return {
		compiled: node.compiled,
		parts,
		rootTarget,
		rootNodes,
		update: createTemplateInstanceUpdate(parts, rootTarget),
	};
}

function refNode(nodes: readonly Node[], ref: NodeRef): Node | null | undefined {
	return ref < 0 ? null : nodes[ref];
}

/**
 * Follows the trie by the compiled template of each nested template, depth first, and returns the node for the
 * whole combination, or `undefined` when the trie is full.
 */
function walkNestedShapes(
	template: TemplateResultLike,
	compiled: CompiledTemplate,
	start: TrieNode,
): TrieNode | undefined {
	let node: TrieNode | undefined = start;

	for (const part of compiled.clientParts) {
		if (part.type !== 'child') continue;

		const value = template.values[part.index];
		const nested = asNestedTemplate(value);
		const nestedCompiled = nested ? getCompiledTemplate(nested) : undefined;
		node = stepTrie(node, nestedCompiled ?? NOT_NESTED);
		if (!node) return undefined;

		if (nested && nestedCompiled) {
			node = walkNestedShapes(nested, nestedCompiled, node);
			if (!node) return undefined;
		}
	}

	return node;
}

function stepTrie(node: TrieNode, key: unknown): TrieNode | undefined {
	let next = node.next?.get(key);

	if (!next) {
		if (trieNodeCount >= MAX_TRIE_NODES) return undefined;
		next = {};
		(node.next ??= new Map()).set(key, next);
		trieNodeCount += 1;
	}

	return next;
}

function asNestedTemplate(value: unknown): TemplateResultLike | undefined {
	return isTemplateResultLike(value) && !value.rootLocalName?.includes('-') ? value : undefined;
}

type BuiltTemplate = {
	children: (BuiltTemplate | null)[];
	compiled: CompiledTemplate;
	fragment: DocumentFragment;
	liveParts: LiveTemplatePart[];
	rootNodes: Node[];
};

/**
 * @remarks Builds the DOM the general path would build before it applies any value: each template's content is
 * cloned, normalized against its parent, and inserted into its parent's child range. Paths are then read from the
 * root, so they hold for every clone.
 */
function buildTemplateTree(
	template: TemplateResultLike,
	contextParent: Node | null,
	rootTarget: HTMLElement,
): TemplateTree {
	const built = buildTemplate(template, contextParent, rootTarget);

	const order = new Map<Node, NodeRef>();
	collectNodes(built.fragment, Number.POSITIVE_INFINITY).forEach((node, index) => order.set(node, index));
	const root = toTreeNode(built, order);
	return { content: built.fragment, nodeCount: order.size, root };
}

function buildTemplate(
	template: TemplateResultLike,
	contextParent: Node | null,
	rootTarget: HTMLElement,
): BuiltTemplate {
	const compiled = getCompiledTemplate(template);
	const fragment = compiled.clientContent.cloneNode(true) as DocumentFragment;
	normalizeTemplateFragmentNamespaces(fragment, contextParent, template.rootLocalName);
	const liveParts = createLiveTemplateParts(fragment, compiled.clientParts, rootTarget);
	const rootNodes = Array.from(fragment.childNodes);
	const children: (BuiltTemplate | null)[] = [];

	for (const part of liveParts) {
		const nested = part.type === 'child' ? asNestedTemplate(template.values[part.index]) : undefined;

		if (!nested || part.type !== 'child') {
			children.push(null);
			continue;
		}

		const child = buildTemplate(nested, getRangeParent(part) ?? contextParent, rootTarget);
		insertIntoRange(part, child.rootNodes);
		children.push(child);
	}

	return { children, compiled, fragment, liveParts, rootNodes };
}

function toTreeNode(built: BuiltTemplate, order: ReadonlyMap<Node, NodeRef>): TemplateTreeNode {
	const ref = (node: Node | null | undefined): NodeRef => (node ? order.get(node)! : -1);

	return {
		children: built.children.map((child) => (child ? toTreeNode(child, order) : null)),
		compiled: built.compiled,
		parts: built.liveParts.map((live): TreePart => {
			if (live.type === 'attribute') {
				return { binding: live.binding, element: ref(live.element), index: live.index, type: 'attribute' };
			}
			if (live.type === 'text-content') {
				return { element: ref(live.element), index: live.index, type: 'text-content' };
			}
			return { end: ref(live.end), index: live.index, owner: ref(live.owner), start: ref(live.start), type: 'child' };
		}),
		roots: built.rootNodes.map(ref),
	};
}
