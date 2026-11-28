import { createAgentTool, type AgentToolConfig, type AgentToolHost } from '../../helpers/create-agent-tool';
import type { AgentToolExecuteOptions } from '../../helpers/register-agent-tool';
import type { Method } from '../../types';
import { registerLegacyInstanceInitializer } from './instance-initializers';

/**
 * @remarks Like `@onEvent`, legacy decorators apply bottom-up, so a `@bound` below this one hands over its
 * accessor descriptor. Read on the prototype, that accessor returns the undecorated method.
 */
export function agentTool<Host extends AgentToolHost, Input>(config: Omit<AgentToolConfig<Host, Input>, 'execute'>) {
	return (proto: Host, _: string, descriptor: PropertyDescriptor) => {
		const originalMethod: Method = descriptor.value ?? descriptor.get?.call(proto);

		registerLegacyInstanceInitializer(proto, (host) => {
			createAgentTool(host, {
				...config,
				execute: (input: Input, options: AgentToolExecuteOptions) => originalMethod.call(host, input, options),
			});
		});

		return descriptor;
	};
}
