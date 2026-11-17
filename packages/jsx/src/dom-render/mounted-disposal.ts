import { clearDelegationRoot, detachEventBindingListener, isEventListenerObject } from './event-delegation.ts';
import type {
	LiveAttributePart,
	LiveTemplatePart,
	LiveTextContentPart,
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
	disposeLiveTemplateParts(instance.parts);
}

/**
 * Releases live parts recovered during hydration or mount.
 *
 * Shared by full template teardown and incomplete hydration, so subscriptions
 * created for recovered parts do not survive a fallback client render.
 */
export function disposeLiveTemplateParts(parts: readonly LiveTemplatePart[]): void {
	for (const part of parts) {
		if (part.type === 'attribute') {
			disposeLiveAttributePart(part);
			continue;
		}

		if (part.type === 'text-content') {
			releaseLiveAttributeSubscription(part);
			continue;
		}

		if (part.type === 'child') {
			disposeMountedRangeContent(part.mounted);
		}
	}
}

export function disposeLiveAttributePart(part: LiveAttributePart): void {
	releaseLiveAttributeSubscription(part);

	if (part.binding.kind === 'ref') {
		detachRef(part);
		part.previousValue = undefined;
		return;
	}

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

	if (part.binding.kind === 'native-event' && part.nativeListener) {
		part.element.removeEventListener(part.binding.name, part.nativeListener);
		part.nativeListener = undefined;
	}

	part.previousValue = undefined;
}

/**
 * Runs the cleanup of an attached `ref` part, if it has one.
 *
 * @remarks A cleanup that throws is reported through {@link reportRefError} and does not stop the disposal around it.
 */
export function detachRef(part: LiveAttributePart): void {
	const cleanup = part.refCleanup;
	part.refCleanup = undefined;
	if (cleanup) runRefCleanup(cleanup);
}

/** Runs a `ref` cleanup, reporting an error it throws through {@link reportRefError}. */
export function runRefCleanup(cleanup: () => void): void {
	try {
		cleanup();
	} catch (error) {
		reportRefError(error);
	}
}

/**
 * Reports an error thrown by a `ref` callback or its cleanup, without interrupting the render, flush or disposal
 * that called it.
 *
 * @remarks The error is rethrown from a microtask, so it surfaces as an uncaught error (`window` `error` event in a
 * browser), the way React 19 reports an error no boundary handles. Throwing synchronously would abort the rest of the
 * pass and leave mounted state half recorded.
 */
export function reportRefError(error: unknown): void {
	queueMicrotask(() => {
		throw error;
	});
}

/** Ends the current reactive ownership epoch for a live attribute or text-content part. */
export function releaseLiveAttributeSubscription(part: LiveAttributePart | LiveTextContentPart): void {
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

		case 'keyed-list':
			for (const record of mounted.records.values()) {
				disposeMountedRangeContent(record.mounted);
			}
			return;

		case 'mixed-list':
			for (const entry of mounted.entries) {
				disposeMountedRangeContent(entry.record.mounted);
			}
			return;

		case 'empty':
		case 'nodes':
		case 'text':
			return;
	}
}
