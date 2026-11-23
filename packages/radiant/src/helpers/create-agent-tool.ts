import { Computed, subtle } from '@ecopages/signals';
import { REACTIVE_HOST, type ReactiveHostInternals } from '../core/reactive-host';
import { RADIANT_ELEMENT_BRAND } from '../core/radiant-element-brand';
import { resolveHostElementOrNull } from './resolve-host-element';
import { registerAgentTool, type AgentToolExecuteOptions, type RegisterAgentToolConfig } from './register-agent-tool';

/** A host whose lifecycle a tool follows: a `RadiantElement` or a controller host. */
export type AgentToolHost = {
	registerConnectedCallback(callback: () => void): void;
	registerCleanupCallback(callback: () => void): void;
	isConnected: boolean;
};

/**
 * Configuration for `createAgentTool` and `@agentTool`.
 *
 * @remarks
 * `name` and `getEnabled` are read on connect and again whenever a signal they read changes, which
 * unregisters the old tool and registers the new one. Use a function of the host for a name that
 * includes an instance value, since two tools cannot share a name.
 */
export type AgentToolConfig<Host extends AgentToolHost = AgentToolHost, Input = unknown> = Omit<
	RegisterAgentToolConfig<Input>,
	'name' | 'execute'
> & {
	name: string | ((host: Host) => string);
	/** Registers the tool only while it returns `true`. Default: always. */
	getEnabled?: (host: Host) => boolean;
	execute(input: Input, options: AgentToolExecuteOptions): unknown;
};

function hasReactiveHost(host: AgentToolHost): host is AgentToolHost & { [REACTIVE_HOST]: ReactiveHostInternals } {
	return REACTIVE_HOST in host;
}

function describeHost(host: AgentToolHost): string | undefined {
	const element = resolveHostElementOrNull(host);
	return element ? `<${element.localName}>` : undefined;
}

/**
 * Registers a WebMCP tool while a host is connected and enabled, and removes it when the host disconnects.
 *
 * @param host The element or controller host the tool belongs to.
 * @param config The tool. `name` and `getEnabled` may be functions of the host.
 * @returns A function that stops managing the tool and unregisters it.
 *
 * @remarks
 * Registration happens after the host's attributes have caught up: from the connect-sync pass of an
 * element, the post-sync pass of a controller, or the connected callback of any other host. A host that
 * has already settled registers at once, so a tool created in `onConnected()` does not wait for the next
 * connect. An element that upgrades in place is connected inside its constructor but has not settled, so a
 * tool created there waits for the connect-sync pass. A server-rendered element whose children come from its parent's view registers only after it hydrates, and
 * never when its parent does not render on the client.
 *
 * Every connect registers again with a new `AbortController`, because a moved element disconnects and
 * reconnects and an aborted tool cannot be revived. A change of `name` or `getEnabled` also registers
 * again, so a tool that flips often fires `toolchange` each time.
 */
export function createAgentTool<Host extends AgentToolHost, Input = unknown>(
	host: Host,
	config: AgentToolConfig<Host, Input>,
): () => void {
	const { name, getEnabled, ...tool } = config;
	const label = describeHost(host);
	const state = new Computed(() => ({
		name: typeof name === 'function' ? name(host) : name,
		enabled: getEnabled ? getEnabled(host) : true,
	}));
	const watcher = new subtle.Watcher(() => {
		queueMicrotask(() => {
			if (!attached) return;
			watcher.watch();
			sync();
		});
	});

	let attached = false;
	let disposed = false;
	let registeredName: string | undefined;
	let unregister: (() => void) | undefined;

	const release = () => {
		unregister?.();
		unregister = undefined;
		registeredName = undefined;
	};

	const sync = () => {
		const { name: nextName, enabled } = state.get();
		if (enabled && unregister && registeredName === nextName) return;
		release();
		if (!enabled) return;
		unregister = registerAgentTool({ ...tool, name: nextName }, { label });
		registeredName = nextName;
	};

	const attach = () => {
		if (disposed) return;
		if (attached) return sync();
		attached = true;
		watcher.watch(state);
		sync();
	};

	const detach = () => {
		if (!attached) return;
		attached = false;
		watcher.unwatch(state);
		release();
	};

	if (hasReactiveHost(host)) {
		const internals = host[REACTIVE_HOST];
		const register = RADIANT_ELEMENT_BRAND in host ? internals.registerConnectSync : internals.registerPostSync;
		register.call(internals, attach);
	} else {
		host.registerConnectedCallback(attach);
	}
	host.registerCleanupCallback(detach);

	if (hasReactiveHost(host) ? host[REACTIVE_HOST].connectSettled : host.isConnected) attach();

	return () => {
		disposed = true;
		detach();
	};
}
