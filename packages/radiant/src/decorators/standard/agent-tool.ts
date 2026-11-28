import { createAgentTool, type AgentToolConfig, type AgentToolHost } from '../../helpers/create-agent-tool';
import type { AgentToolExecuteOptions } from '../../helpers/register-agent-tool';

export function agentTool<Host extends AgentToolHost, Input>(config: Omit<AgentToolConfig<Host, Input>, 'execute'>) {
	return function (
		originalMethod: (this: Host, input: Input, options: AgentToolExecuteOptions) => unknown,
		context: ClassMethodDecoratorContext<Host>,
	): void {
		context.addInitializer(function (this: Host) {
			createAgentTool(this, {
				...config,
				execute: (input, options) => originalMethod.call(this, input, options),
			});
		});
	};
}
