import { asyncState, state, type AsyncStateFetcherOptions, type AsyncStateResult } from '@ecopages/signals';
import type { RadiantElement } from '../core/radiant-element';

export type ResourceContext<Host extends RadiantElement> = {
	host: Host;
};

export type ResourceRequestContext<Host extends RadiantElement> = ResourceContext<Host> & AsyncStateFetcherOptions;

type HostResourceBaseConfig<Host extends RadiantElement, Value> = {
	/** Seed value exposed from `data` before the first successful resolution. */
	initialValue?: Value;

	/** Milliseconds a successful response stays fresh in the per-instance cache. */
	staleTime?: number;

	/** Milliseconds to wait before transitioning `status` to `'pending'`. */
	pendingDelay?: number;

	/** Called after each successful resolution, including cache hits. */
	onSuccess?: (data: Value, ctx: ResourceContext<Host>) => void;

	/** Called after each failed resolution. Not called for aborted requests. */
	onError?: (error: unknown, ctx: ResourceContext<Host>) => void;

	/** Called after each resolution, whether successful or failed. */
	onSettled?: (data: Value | undefined, error: unknown, ctx: ResourceContext<Host>) => void;
};

/** Configuration for a host-owned resource that fetches on connect. */
export interface HostResourceConfig<Host extends RadiantElement, Value> extends HostResourceBaseConfig<Host, Value> {
	fetcher: (ctx: ResourceRequestContext<Host>) => Promise<Value>;
	source?: undefined;
}

/** Configuration for a host-owned resource driven by a reactive source. */
export interface HostResourceSourcedConfig<Host extends RadiantElement, Source, Value> extends HostResourceBaseConfig<
	Host,
	Value
> {
	/**
	 * Returns the current source value while the host is connected.
	 *
	 * Falsy values (`false`, `null`, `undefined`) disable fetching and preserve
	 * the current resource state.
	 */
	source: (ctx: ResourceContext<Host>) => Source | false | null | undefined;

	fetcher: (sourceValue: Source, ctx: ResourceRequestContext<Host>) => Promise<Value>;
}

export class HostResource<Host extends RadiantElement, Value, Source = never> implements AsyncStateResult<Value> {
	readonly data: AsyncStateResult<Value>['data'];
	readonly status: AsyncStateResult<Value>['status'];
	readonly error: AsyncStateResult<Value>['error'];

	private readonly connected = state(false);
	private readonly resource: AsyncStateResult<Value>;
	private disposed = false;

	constructor(host: Host, config: HostResourceConfig<Host, Value> | HostResourceSourcedConfig<Host, Source, Value>) {
		const context: ResourceContext<Host> = { host };
		const baseConfig = {
			initialValue: config.initialValue,
			pendingDelay: config.pendingDelay,
			staleTime: config.staleTime,
			onError: (error: unknown) => {
				config.onError?.(error, context);
			},
			onSettled: (data: Value | undefined, error: unknown) => {
				config.onSettled?.(data, error, context);
			},
			onSuccess: (data: Value) => {
				config.onSuccess?.(data, context);
			},
		};

		if (config.source) {
			this.resource = asyncState({
				...baseConfig,
				source: () => {
					if (this.disposed || !this.connected.get()) {
						return false;
					}

					return config.source(context);
				},
				fetcher: (sourceValue, options) => config.fetcher(sourceValue as Source, { ...context, ...options }),
			});
		} else {
			this.resource = asyncState({
				...baseConfig,
				source: () => {
					if (this.disposed || !this.connected.get()) {
						return false;
					}

					return true;
				},
				fetcher: (_connected, options) => config.fetcher({ ...context, ...options }),
			});
		}

		this.data = this.resource.data;
		this.status = this.resource.status;
		this.error = this.resource.error;
	}

	public connect(): void {
		if (this.disposed || this.connected.get()) {
			return;
		}

		this.connected.set(true);
	}

	public disconnect(): void {
		if (this.disposed || !this.connected.get()) {
			return;
		}

		this.connected.set(false);
		this.resource.abort();
	}

	public refetch(): void {
		if (this.disposed || !this.connected.get()) {
			return;
		}

		this.resource.refetch();
	}

	public abort(): void {
		if (this.disposed) {
			return;
		}

		this.resource.abort();
	}

	public dispose(): void {
		if (this.disposed) {
			return;
		}

		this.disposed = true;
		this.connected.set(false);
		this.resource.dispose();
	}
}

export function createHostResource<Host extends RadiantElement, Value>(
	host: Host,
	config: HostResourceConfig<Host, Value>,
): HostResource<Host, Value>;
export function createHostResource<Host extends RadiantElement, Source, Value>(
	host: Host,
	config: HostResourceSourcedConfig<Host, Source, Value>,
): HostResource<Host, Value, Source>;
export function createHostResource<Host extends RadiantElement, Source, Value>(
	host: Host,
	config: HostResourceConfig<Host, Value> | HostResourceSourcedConfig<Host, Source, Value>,
): HostResource<Host, Value, Source> {
	return new HostResource<Host, Value, Source>(host, config);
}

/**
 * Creates a host-owned resource and registers connect/disconnect lifecycle
 * hooks on the provided host.
 */
export function createResource<Host extends RadiantElement, Value>(
	host: Host,
	config: HostResourceConfig<Host, Value>,
): HostResource<Host, Value>;
export function createResource<Host extends RadiantElement, Source, Value>(
	host: Host,
	config: HostResourceSourcedConfig<Host, Source, Value>,
): HostResource<Host, Value, Source>;
export function createResource<Host extends RadiantElement, Source, Value>(
	host: Host,
	config: HostResourceConfig<Host, Value> | HostResourceSourcedConfig<Host, Source, Value>,
): HostResource<Host, Value, Source> {
	const hostResource = new HostResource<Host, Value, Source>(host, config);

	host.registerConnectedCallback(() => {
		hostResource.connect();
	});

	host.registerCleanupCallback(() => {
		hostResource.disconnect();
	});

	return hostResource;
}
