import { applyBindingToElement } from './bindings.ts';
import { releaseLiveAttributeSubscription } from './mounted-disposal.ts';
import {
	flushDeferredProperties,
	isReactiveAttributeSource,
	readReactiveChildSourceValue,
	subscribeToReactiveChildSource,
} from './runtime-helpers.ts';
import type { DeferredPropertyBinding, LiveAttributePart } from './types.ts';

function applyToPart(part: LiveAttributePart, value: unknown, deferredProperties: DeferredPropertyBinding[]): void {
	applyBindingToElement(part.element, part.binding, value, {
		rootTarget: part.rootTarget,
		deferredProperties,
		livePart: part,
	});
}

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

	if (!isReactiveAttributeSource(value)) {
		applyToPart(part, value, deferredProperties);
		return;
	}

	const subscriptionSerial = part.subscriptionSerial + 1;
	part.subscriptionSerial = subscriptionSerial;
	part.source = value;
	part.unsubscribe = subscribeToReactiveChildSource(value, (nextValue) => {
		if (part.subscriptionSerial !== subscriptionSerial || part.source !== value) {
			return;
		}

		const nextDeferredProperties: DeferredPropertyBinding[] = [];
		applyToPart(part, nextValue, nextDeferredProperties);
		flushDeferredProperties(nextDeferredProperties);
	});
	applyToPart(part, readReactiveChildSourceValue(value), deferredProperties);
}
