import type { TemplateResultLike } from '../types/index.ts';
import { updateRangeContent } from './child-range-update.ts';
import { getTemplateTree, instantiateTemplateTree } from './template-tree.ts';
import { updateLiveAttributePart } from './live-attribute-update.ts';
import { updateLiveTextContentParts } from './live-text-content-update.ts';
import type {
	CompiledTemplate,
	DeferredPropertyBinding,
	LiveAttributePart,
	LiveTemplatePart,
	TemplateInstance,
} from './types.ts';

/**
 * Creates a live template instance from a template result and applies initial values.
 *
 * @param template Compiled JSX template result.
 * @param rootTarget Host element that owns delegated listeners and child reconciliation.
 * @param deferredProperties Queue populated by `.prop` bindings during the initial update.
 * @param contextParent Optional namespace context for cloned fragment nodes.
 * @returns A mounted template instance; {@link updateTemplateInstance} applies later passes.
 */
export function createTemplateInstance(
	template: TemplateResultLike,
	rootTarget: HTMLElement,
	deferredProperties: DeferredPropertyBinding[],
	contextParent: Node | null = rootTarget,
): TemplateInstance {
	const instance = instantiateTemplateTree(getTemplateTree(template, contextParent, rootTarget), rootTarget);
	updateTemplateInstance(instance, template.values, deferredProperties);
	return instance;
}

/** Applies a template's next values to a mounted or hydrated instance. */
export function updateTemplateInstance(
	instance: TemplateInstance,
	values: readonly unknown[],
	deferredProperties: DeferredPropertyBinding[],
): void {
	const { parts, rootTarget } = instance;

	for (const part of parts) {
		if (part.type === 'attribute') {
			updateLiveAttributePart(part, values[part.index], deferredProperties);
			continue;
		}

		if (part.type === 'text-content') {
			continue;
		}

		part.mounted = updateRangeContent(part, values[part.index], part.mounted, rootTarget, deferredProperties);
	}

	updateLiveTextContentParts(parts, values);
}

/**
 * Moves a mounted instance to another shape of the same element, keeping its DOM nodes.
 *
 * @param instance Mounted instance whose element and child slots stay.
 * @param next Compiled template with the same {@link CompiledTemplate.structureKey}; only its attribute parts differ.
 * @param deferredProperties Queue that receives the property writes of attributes that are dropped.
 * @returns Whether the instance was moved; `false` leaves it untouched, and the caller replaces it.
 *
 * @remarks A factory template binds one part per attribute that is not `undefined`, so a spread that gains or loses
 * a key has another shape but the same element. Attributes bound by the same kind and name keep their live part,
 * and with it their listener and reactive subscription. Dropped ones are written `undefined` first, which removes
 * the attribute, detaches the listener and releases the subscription, so a kind change on one name (an `on:click`
 * handler turning into an attribute) starts clean. A dropped `prop:` binding is assigned `undefined`, as the
 * element cannot tell what its default was. Call {@link updateTemplateInstance} afterwards to write the values.
 */
export function retargetTemplateInstance(
	instance: TemplateInstance,
	next: CompiledTemplate,
	deferredProperties: DeferredPropertyBinding[],
): boolean {
	const { compiled } = instance;
	const element = instance.rootNodes.find((node): node is Element => node instanceof Element);

	if (!element || compiled.structureKey === undefined || compiled.structureKey !== next.structureKey) {
		return false;
	}

	const attributes = new Map<string, LiveAttributePart[]>();
	const slots: LiveTemplatePart[] = [];

	for (const part of instance.parts) {
		if (part.type === 'attribute') {
			const key = `${part.binding.kind}:${part.binding.name}`;
			const sameKey = attributes.get(key);
			if (sameKey) sameKey.push(part);
			else attributes.set(key, [part]);
		} else slots.push(part);
	}

	const nextParts: LiveTemplatePart[] = [];
	let slot = 0;

	for (const part of next.parts) {
		const key = part.type === 'attribute' ? `${part.binding.kind}:${part.binding.name}` : '';
		const live: LiveTemplatePart | undefined =
			part.type === 'attribute'
				? (attributes.get(key)?.shift() ?? {
						binding: part.binding,
						element,
						index: part.index,
						rootTarget: instance.rootTarget,
						subscriptionSerial: 0,
						type: 'attribute',
					})
				: slots[slot++];

		if (!live) return false;
		nextParts.push(live);
	}

	next.parts.forEach((part, position) => {
		nextParts[position]!.index = part.index;
	});

	for (const sameKey of attributes.values()) {
		for (const dropped of sameKey) updateLiveAttributePart(dropped, undefined, deferredProperties);
	}

	instance.compiled = next;
	instance.parts = nextParts;
	return true;
}
