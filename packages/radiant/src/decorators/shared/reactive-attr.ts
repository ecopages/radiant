import type { ReactiveHostLike } from '../../core/reactive-host';
import { type ReactiveBindingOption, validateReactivePropertyDefault } from '../../core/reactive-prop-core';
import { resolveHostElement } from '../../helpers/resolve-host-element';
import { resolveHostAutoBind } from './auto-bind';
import {
	defaultValueForType,
	readAttributeValue,
	type AttributeTypeConstant,
	writeAttributeValue,
} from '../../utils/attribute-utils';

export type AttrConverter<T> = {
	fromAttribute?: (value: string | null) => T;
	toAttribute?: (value: T) => string | null;
};

export type AttrOptions<T = string | undefined> = {
	source?: string;
	type?: AttributeTypeConstant;
	bind?: ReactiveBindingOption;
	defaultValue?: T;
	converter?: AttrConverter<T>;
};

type ReactiveAttributeHostApi<Bindings extends object = {}> = ReactiveHostLike<Bindings> & {
	registerCleanupCallback(callback: () => void): void;
	registerConnectedCallback(callback: () => void): void;
};

export type ReactiveAttributeHostLike<Bindings extends object = {}> =
	| (ReactiveAttributeHostApi<Bindings> & Element)
	| (ReactiveAttributeHostApi<Bindings> & { host: Element })
	| (ReactiveAttributeHostApi<Bindings> & { element: Element });

function resolveAttributeTarget(host: ReactiveAttributeHostLike): Element {
	return resolveHostElement(host);
}

function toAttributeName(propertyName: string): string {
	return propertyName
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/_/g, '-')
		.toLowerCase();
}

function resolveAttributeValue<T>(rawValue: string | null, options: AttrOptions<T>): T {
	if (options.converter?.fromAttribute) {
		const convertedValue = options.converter.fromAttribute(rawValue);

		if (rawValue === null && convertedValue === undefined && 'defaultValue' in options) {
			return options.defaultValue as T;
		}

		return convertedValue;
	}

	if (options.type) {
		if (rawValue === null) {
			return (options.defaultValue ?? defaultValueForType(options.type)) as T;
		}

		if (options.type === Boolean && rawValue === '') {
			return true as T;
		}

		return readAttributeValue(rawValue, options.type) as T;
	}

	if (rawValue === null) {
		return options.defaultValue as T;
	}

	return rawValue as T;
}

function readReactiveAttributeValue<T>(
	host: ReactiveAttributeHostLike,
	attributeName: string,
	options: AttrOptions<T>,
): T {
	return resolveAttributeValue(resolveAttributeTarget(host).getAttribute(attributeName), options);
}

function writeReactiveAttributeValue<T>(
	target: Element,
	attributeName: string,
	value: T,
	options: AttrOptions<T>,
): void {
	const attributeValue = options.converter?.toAttribute
		? options.converter.toAttribute(value)
		: options.type
			? writeAttributeValue(value, options.type)
			: value == null
				? null
				: String(value);

	if (attributeValue === null) {
		target.removeAttribute(attributeName);
		return;
	}

	target.setAttribute(attributeName, attributeValue);
}

export function installReactiveAttribute<TBindings extends object, TValue>(
	host: ReactiveAttributeHostLike<TBindings>,
	propertyName: string,
	options: AttrOptions<TValue> = {},
): void {
	if (options.type) {
		validateReactivePropertyDefault(options.type, options.defaultValue);
	}

	const hostRecord = host as unknown as Record<PropertyKey, unknown>;
	const attributeName = options.source ?? toAttributeName(propertyName);
	const observerKey = Symbol(`@ecopages/radiant/attr:${propertyName}:observer`);
	const bind = options.bind ?? resolveHostAutoBind(host);

	host.defineReactiveBinding(propertyName, bind);

	const initialValue = readReactiveAttributeValue(host, attributeName, options);
	const signal = host.createReactiveMember(propertyName, initialValue);

	Object.defineProperty(host, propertyName, {
		get() {
			return signal.get();
		},
		set(newValue: TValue) {
			const target = resolveAttributeTarget(this as ReactiveAttributeHostLike);
			writeReactiveAttributeValue(target, attributeName, newValue, options);
			signal.set(readReactiveAttributeValue(this as ReactiveAttributeHostLike, attributeName, options));
		},
		enumerable: true,
		configurable: true,
	});

	const disconnectObserver = () => {
		const observer = hostRecord[observerKey] as MutationObserver | undefined;
		observer?.disconnect();
	};

	const syncAndObserve = () => {
		signal.set(readReactiveAttributeValue(host, attributeName, options));

		if (typeof MutationObserver === 'undefined') {
			return;
		}

		const target = resolveAttributeTarget(host);

		disconnectObserver();

		const observer = new MutationObserver(() => {
			signal.set(readReactiveAttributeValue(host, attributeName, options));
		});

		observer.observe(target, {
			attributeFilter: [attributeName],
			attributes: true,
		});

		hostRecord[observerKey] = observer;
	};

	syncAndObserve();
	host.registerConnectedCallback(syncAndObserve);
	host.registerCleanupCallback(disconnectObserver);
}
