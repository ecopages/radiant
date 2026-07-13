import type { ReactiveBindingOption } from '../../core/reactive-prop-core';
import type { ReactiveHostLike } from '../../core/reactive-host';

/**
 * Registers a member `State` early enough for subclass field initializers that
 * read `this.$.member` (for example `this.$.preference.map(...)`).
 *
 * Post-construction setup still runs afterward to install accessors, SSR prop
 * resolution, and attribute channels once class fields have finished writing.
 */
export function bootstrapReactiveMemberBinding(
	host: ReactiveHostLike,
	propertyName: string,
	initialValue: unknown,
	bind: ReactiveBindingOption = false,
): void {
	if (host.getReactiveMember(propertyName)) {
		return;
	}

	host.createReactiveMember(propertyName, initialValue);

	if (bind !== undefined && bind !== false) {
		host.defineReactiveBinding(propertyName, bind);
	}
}
