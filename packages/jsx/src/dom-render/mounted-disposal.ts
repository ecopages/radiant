import { clearDelegationRoot, detachEventBindingListener, isEventListenerObject } from './event-delegation.ts';
import type {
	LiveAttributePart,
	MountedRangeContent,
	MountedRoot,
	MountedSubscription,
	TemplateInstance,
} from './types.ts';

/**
 * Releases runtime state associated with a root-level mounted tree.
 *
 * Range disposal already detaches each binding's listeners individually; clearing
 * the delegation root additionally drops any handler the range no longer tracks,
 * such as those attached in place by flat or iterable hydration.
 *
 * @param root Mounted root descriptor stored in the root render state.
 */
export function disposeMountedRoot(root: MountedRoot): void {
	disposeMountedRangeContent(root.mounted);
	clearDelegationRoot(root.rootTarget);
}

/**
 * Releases all disposable live parts within a {@link TemplateInstance}.
 *
 * Walks every child part and delegates to {@link disposeMountedRangeContent} so
 * subscriptions are cancelled and nested template instances are torn down recursively.
 *
 * @param instance Template instance to dispose.
 */
export function disposeTemplateInstance(instance: TemplateInstance): void {
	for (const part of instance.parts) {
		if (part.type === 'attribute') {
			disposeLiveAttributePart(part);
			continue;
		}

		if (part.type === 'child') {
			disposeMountedRangeContent(part.mounted);
		}
	}
}

export function disposeLiveAttributePart(part: LiveAttributePart): void {
	releaseLiveAttributeSubscription(part);

	if (
		!part.previousValue ||
		(!isEventListenerObject(part.previousValue) && typeof part.previousValue !== 'function')
	) {
		part.previousValue = undefined;
		return;
	}

	if (part.binding.kind === 'event') {
		detachEventBindingListener(
			part.rootTarget,
			part.element,
			part.binding.name,
			part.previousValue as EventListenerOrEventListenerObject,
		);
	}

	if (part.binding.kind === 'native-event') {
		part.element.removeEventListener(part.binding.name, part.previousValue as EventListenerOrEventListenerObject);
	}

	part.previousValue = undefined;
}

/** Ends the current reactive ownership epoch for a live attribute part. */
export function releaseLiveAttributeSubscription(part: LiveAttributePart): void {
	const unsubscribe = part.unsubscribe;
	part.subscriptionSerial += 1;
	part.unsubscribe = undefined;
	part.source = undefined;
	unsubscribe?.();
}

/**
 * Ends the current child-range subscription epoch and returns the last mounted child state.
 *
 * The returned `mounted` subtree remains structurally owned by the same DOM range and can be
 * reconciled in place against the next value. Only the reactive source ownership is released.
 */
export function releaseMountedSubscription(mounted: MountedSubscription): MountedRangeContent {
	const unsubscribe = mounted.unsubscribe;
	mounted.subscriptionSerial += 1;
	mounted.unsubscribe = () => undefined;
	unsubscribe();
	return mounted.mounted;
}

/**
 * Recursively releases runtime bookkeeping for a mounted child range.
 *
 * Disposal is intentionally structural: subscriptions are unsubscribed and
 * nested range state is torn down even when the DOM nodes themselves are about
 * to be removed separately.
 */
export function disposeMountedRangeContent(mounted: MountedRangeContent): void {
	switch (mounted.kind) {
		case 'subscription':
			disposeMountedRangeContent(releaseMountedSubscription(mounted));
			return;

		case 'template':
			disposeTemplateInstance(mounted.instance);
			return;

		case 'indexed-list':
			for (const record of mounted.records) {
				disposeMountedRangeContent(record.mounted);
			}
			return;

		case 'keyed-list':
			for (const record of mounted.records.values()) {
				disposeMountedRangeContent(record.mounted);
			}
			return;

		case 'empty':
		case 'nodes':
		case 'text':
			return;
	}
}
