import type { RadiantElement } from '../../core/radiant-element';

export function jsxState(target: RadiantElement, propertyKey: string) {
	const originalConnectedCallback = target.connectedCallback;

	target.connectedCallback = function (this: RadiantElement) {
		this.createReactiveField(propertyKey, this[propertyKey as keyof typeof this], { bind: true });
		originalConnectedCallback.call(this);
	};
}
