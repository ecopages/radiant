import { applyResolvedAttributeBinding } from './bindings.ts';
import { releaseLiveAttributeSubscription } from './mounted-disposal.ts';
import {
	flushDeferredProperties,
	isReactiveAttributeSource,
	readReactiveChildSourceValue,
	resolveReactiveSnapshot,
	subscribeToReactiveChildSource,
} from './runtime-helpers.ts';
import type { DeferredPropertyBinding, LiveAttributePart } from './types.ts';

/**
 * Applies a single dynamic attribute binding to an already-located live DOM
 * element.
 */
export function updateLiveAttributePart(
	part: LiveAttributePart,
	value: unknown,
	deferredProperties: DeferredPropertyBinding[],
): void {
	if (part.source) {
		if (isReactiveAttributeSource(value) && part.source === value) {
			return;
		}

		releaseLiveAttributeSubscription(part);
	}

	if (isReactiveAttributeSource(value)) {
		const subscriptionSerial = part.subscriptionSerial + 1;
		part.subscriptionSerial = subscriptionSerial;
		part.source = value;
		part.unsubscribe = subscribeToReactiveChildSource(value, (nextValue) => {
			if (part.subscriptionSerial !== subscriptionSerial || part.source !== value) {
				return;
			}

			const nextDeferredProperties: DeferredPropertyBinding[] = [];
			applyResolvedAttributeBinding(part, resolveReactiveSnapshot(nextValue), nextDeferredProperties);
			flushDeferredProperties(nextDeferredProperties);
		});
		applyResolvedAttributeBinding(
			part,
			resolveReactiveSnapshot(readReactiveChildSourceValue(value)),
			deferredProperties,
		);
		return;
	}

	applyResolvedAttributeBinding(part, resolveReactiveSnapshot(value), deferredProperties);
}
