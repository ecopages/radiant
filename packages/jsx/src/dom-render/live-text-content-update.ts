import { releaseLiveAttributeSubscription } from './mounted-disposal.ts';
import {
	isReactiveChildSource,
	readReactiveChildSourceValue,
	subscribeToReactiveChildSource,
} from './runtime-helpers.ts';
import { stringifyTextContentValue, writeTextContentElement } from './text-content.ts';
import type { LiveTemplatePart, LiveTextContentPart } from './types.ts';

/**
 * Applies every text-content part in `parts`, then writes each host element once.
 *
 * Reactive sources subscribe here the same way attribute parts do. A later
 * notification rewrites only the element that owns the notifying slot.
 */
export function updateLiveTextContentParts(parts: readonly LiveTemplatePart[], values: readonly unknown[]): void {
	const textContentParts = parts.filter((part): part is LiveTextContentPart => part.type === 'text-content');

	for (const part of textContentParts) {
		bindTextContentPart(part, values[part.index], textContentParts);
	}

	writeGroupedTextContent(textContentParts);
}

function bindTextContentPart(
	part: LiveTextContentPart,
	value: unknown,
	siblings: readonly LiveTextContentPart[],
): void {
	if (part.source) {
		if (isReactiveChildSource(value) && part.source === value) {
			return;
		}

		releaseLiveAttributeSubscription(part);
	}

	if (!isReactiveChildSource(value)) {
		part.committedText = stringifyTextContentValue(value);
		return;
	}

	const subscriptionSerial = part.subscriptionSerial + 1;
	part.subscriptionSerial = subscriptionSerial;
	part.source = value;
	part.unsubscribe = subscribeToReactiveChildSource(value, (nextValue) => {
		if (part.subscriptionSerial !== subscriptionSerial || part.source !== value) {
			return;
		}

		part.committedText = stringifyTextContentValue(nextValue);
		writeGroupedTextContent(siblings, part.element);
	});
	part.committedText = stringifyTextContentValue(readReactiveChildSourceValue(value));
}

function writeGroupedTextContent(parts: readonly LiveTextContentPart[], element?: Element): void {
	const groups = new Map<Element, LiveTextContentPart[]>();

	for (const part of parts) {
		if (element && part.element !== element) {
			continue;
		}

		const group = groups.get(part.element) ?? [];
		group.push(part);
		groups.set(part.element, group);
	}

	for (const [host, group] of groups) {
		writeTextContentElement(host, group.map((part) => part.committedText).join(''));
	}
}
