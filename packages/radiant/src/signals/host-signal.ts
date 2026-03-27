import { createMarkupNodeLike, type JsxRenderable } from '@ecopages/jsx';
import type { SsrSerializableHydrationBinding } from '../core/ssr-hydration-binding';
import type { RadiantElement } from '../core/radiant-element';
import type { AttributeTypeConstant } from '../utils/attribute-utils';
import { state, type WritableSignal } from '@ecopages/signals';
import {
	SIGNAL_HYDRATION_ATTRIBUTE,
	SIGNAL_HYDRATION_KEY_ATTRIBUTE,
	createSignalHydrationScriptTag,
	escapeSignalHydrationJson,
} from './hydration-script';

type HostSignalOptions<Value> = {
	host: RadiantElement;
	hydrate?: AttributeTypeConstant;
	hydrationKey?: string;
	initialValue: Value;
	property: string;
};

type RenderRequestingHost = RadiantElement & {
	requestUpdate?: () => void;
};

/**
 * Host-owned writable signal that bridges signal updates back into Radiant's
 * update callback channel and optional SSR hydration pipeline.
 */
export class HostSignal<Value> implements WritableSignal<Value>, SsrSerializableHydrationBinding {
	private readonly host: RadiantElement;
	private readonly hydrate?: AttributeTypeConstant;
	private readonly hydrationKey?: string;
	private readonly property: string;
	private readonly source: WritableSignal<Value>;
	private hasAppliedHostHydration = false;

	constructor(options: HostSignalOptions<Value>) {
		this.host = options.host;
		this.hydrate = options.hydrate;
		this.hydrationKey = options.hydrationKey;
		this.property = options.property;
		this.source = state(this.resolveInitialValue(options.initialValue));
	}

	public get(): Value {
		return this.source.get();
	}

	public set(nextValue: Value): void {
		const previousValue = this.source.get();
		this.source.set(nextValue);
		const currentValue = this.source.get();

		if (!Object.is(previousValue, currentValue)) {
			this.host.notifyUpdate(this.property, previousValue, currentValue);
			this.requestHostRender();
		}
	}

	public subscribe(notify: (value: Value) => void): () => void {
		return this.source.subscribe(notify);
	}

	public update(updater: (value: Value) => Value): void {
		this.set(updater(this.get()));
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
			this.host.notifyUpdate(this.property, previousValue, hydratedValue);
			this.requestHostRender();
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

		return createSignalHydrationScriptTag({
			hydrationKey: this.hydrationKey,
			serializedValue,
		});
	}

	private findHydrationScriptElement(): Element | null {
		const childElements = Array.from(this.host.children ?? []);
		const keyedElement = this.hydrationKey
			? (childElements.find(
					(element) =>
						element.tagName === 'SCRIPT' &&
						element.hasAttribute(SIGNAL_HYDRATION_ATTRIBUTE) &&
						element.getAttribute(SIGNAL_HYDRATION_KEY_ATTRIBUTE) === this.hydrationKey,
				) ?? null)
			: null;

		if (keyedElement) {
			return keyedElement;
		}

		return (
			childElements.find(
				(element) =>
					element.tagName === 'SCRIPT' &&
					element.hasAttribute(SIGNAL_HYDRATION_ATTRIBUTE) &&
					!element.hasAttribute(SIGNAL_HYDRATION_KEY_ATTRIBUTE),
			) ?? null
		);
	}

	private isObject(value: unknown): value is Record<string, unknown> {
		return typeof value === 'object' && !Array.isArray(value) && value !== null;
	}

	private resolveInitialValue(initialValue: Value): Value {
		if (!this.hydrate) {
			return initialValue;
		}

		const hydrationScriptElement = this.findHydrationScriptElement();

		if (!hydrationScriptElement?.textContent) {
			return initialValue;
		}

		const parsedHydrationValue = JSON.parse(hydrationScriptElement.textContent) as Value;

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

		return escapeSignalHydrationJson(serializedValue);
	}

	private requestHostRender(): void {
		const renderRequestingHost = this.host as RenderRequestingHost;

		if (typeof renderRequestingHost.requestUpdate === 'function') {
			renderRequestingHost.requestUpdate();
		}
	}
}

export function createHostSignal<Value>(options: HostSignalOptions<Value>): HostSignal<Value> {
	return new HostSignal(options);
}
