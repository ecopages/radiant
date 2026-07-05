import type { SsrSerializableContextProvider } from '../context/context-provider';
import type { SsrSerializableHydrationBinding } from './ssr-hydration-binding';

/**
 * Shared SSR provider and hydration binding storage for Radiant hosts.
 */
export class HostSsrRegistry {
	private readonly contextProviders = new Map<string, SsrSerializableContextProvider>();
	private readonly hydrationBindings = new Map<string, SsrSerializableHydrationBinding>();

	public registerContextProvider(name: string, provider: SsrSerializableContextProvider): void {
		this.contextProviders.set(name, provider);
		this.hydrationBindings.set(name, provider);
	}

	public registerHydrationBinding(name: string, binding: SsrSerializableHydrationBinding): void {
		this.hydrationBindings.set(name, binding);
	}

	public getContextProviders(): SsrSerializableContextProvider[] {
		return [...this.contextProviders.values()];
	}

	public getHydrationBindings(): SsrSerializableHydrationBinding[] {
		return [...this.hydrationBindings.values()];
	}
}
