import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import { state, type WritableSignal } from '@ecopages/signals';
import type { ReactiveState } from '../core/reactivity-contract';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';
import type { AttributeTypeConstant } from '../utils/attribute-utils';
import { createHydrationScriptTag, findHydrationScript, parseHydrationPayload } from '../core/hydration-codec';

type HostSignalOwner = {
	registerReactiveMember<Value>(property: string, signal: ReactiveState<Value>): void;
};

type HostSignalOptions<Value> = {
	host: HostSignalOwner;
	hydrate?: AttributeTypeConstant;
	hydrationKey?: string;
	initialValue?: Value;
	property: string;
	source?: WritableSignal<Value>;
};

export function isWritableSignalLike<Value>(value: unknown): value is WritableSignal<Value> {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as WritableSignal<Value>).get === 'function' &&
		typeof (value as WritableSignal<Value>).set === 'function' &&
		typeof (value as WritableSignal<Value>).subscribe === 'function' &&
		typeof (value as WritableSignal<Value>).update === 'function'
	);
}

/**
 * Host-owned writable signal that bridges signal updates back into Radiant's
 * update callback channel and optional SSR hydration pipeline.
 */
export class HostSignal<Value> implements WritableSignal<Value>, SsrSerializableHydrationBinding {
	private readonly host: HostSignalOwner;
	private readonly hydrate?: AttributeTypeConstant;
	private readonly hydrationKey?: string;
	private readonly property: string;
	private readonly source: WritableSignal<Value>;
	private currentValue: Value;
	private hasAppliedHostHydration = false;
	private sourceUnsubscribe?: () => void;

	constructor(options: HostSignalOptions<Value>) {
		this.host = options.host;
		this.hydrate = options.hydrate;
		this.hydrationKey = options.hydrationKey;
		this.property = options.property;
		this.source = options.source ?? state(this.resolveInitialValue(options.initialValue as Value));
		this.currentValue = this.source.get();
		this.host.registerReactiveMember(this.property, this.source);
	}

	public get(): Value {
		return this.source.get();
	}

	public set(nextValue: Value): void {
		this.source.set(nextValue);
	}

	public subscribe(notify: (value: Value) => void): () => void {
		return this.source.subscribe(notify);
	}

	public update(updater: (value: Value) => Value): void {
		this.set(updater(this.get()));
	}

	public connectToSource(): void {
		if (this.sourceUnsubscribe) {
			return;
		}

		const nextValue = this.source.get();

		if (!Object.is(this.currentValue, nextValue)) {
			this.currentValue = nextValue;
		}

		this.sourceUnsubscribe = this.source.subscribe((value) => {
			this.handleSourceChange(value);
		});
	}

	public disconnectFromSource(): void {
		this.sourceUnsubscribe?.();
		this.sourceUnsubscribe = undefined;
	}

	public hydrateFromHost(): void {
		if (!this.hydrate || this.hasAppliedHostHydration) {
			return;
		}

		this.hasAppliedHostHydration = true;

		const previousValue = this.source.get();
		const hydratedValue = this.resolveInitialValue(previousValue);

		if (!Object.is(previousValue, hydratedValue)) {
			this.source.set(hydratedValue);
			this.currentValue = this.source.get();
		}
	}

	public renderHydrationScript(): JsxRenderable | undefined {
		const outerHTML = this.renderHydrationScriptTag();

		if (!outerHTML) {
			return undefined;
		}

		return createMarkupNodeLike(outerHTML);
	}

	public renderHydrationScriptTag(): string | undefined {
		const serializedValue = this.serializeHydrationValue();

		if (!serializedValue) {
			return undefined;
		}

		return createHydrationScriptTag({
			type: 'signal',
			hydrationKey: this.hydrationKey,
			serializedValue,
		});
	}

	private findHydrationScriptElement(): Element | null {
		if (!(this.host instanceof Element)) {
			return null;
		}

		return findHydrationScript(this.host, 'signal', this.hydrationKey);
	}

	private isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && !Array.isArray(value) && value !== null;
	}

	private resolveInitialValue(initialValue: Value): Value {
		if (!this.hydrate) {
			return initialValue;
		}

		const hydrationScriptElement = this.findHydrationScriptElement();

		if (!hydrationScriptElement) {
			return initialValue;
		}

		const parsedHydrationValue = parseHydrationPayload(hydrationScriptElement, initialValue);

		if (this.hydrate === Object && this.isObject(parsedHydrationValue) && this.isObject(initialValue)) {
			return {
				...initialValue,
				...parsedHydrationValue,
			} as Value;
		}

		return parsedHydrationValue;
	}

	private serializeHydrationValue(): string | undefined {
		if (!this.hydrate) {
			return undefined;
		}

		const serializedValue = JSON.stringify(this.get());

		if (typeof serializedValue !== 'string') {
			return undefined;
		}

		return serializedValue;
	}

	private handleSourceChange(nextValue: Value): void {
		this.currentValue = nextValue;
	}
}

export function createHostSignal<Value>(options: HostSignalOptions<Value>): HostSignal<Value> {
	return new HostSignal(options);
}
