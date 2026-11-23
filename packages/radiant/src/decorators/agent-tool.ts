import type { AgentToolConfig, AgentToolHost } from '../helpers/create-agent-tool';
import type { AgentToolExecuteOptions } from '../helpers/register-agent-tool';
import type { Method } from '../types';
import { methodDecoratorBridge } from './bridge';
import { agentTool as legacyAgentTool } from './legacy/agent-tool';
import { agentTool as standardAgentTool } from './standard/agent-tool';

export type { AgentToolConfig, AgentToolHost };

/**
 * Registers a method as a WebMCP tool while its element is connected and enabled.
 *
 * @param config The tool without `execute`: the decorated method is `execute`.
 *
 * @remarks
 * The method stays an ordinary method, so the UI can call it with the same typed argument the agent's
 * input becomes. Pass `parse` (a schema library's `schema.parse`) to validate the agent's input before the
 * method runs; under standard decorators it also types the method's argument. Without `parse` the method
 * receives the agent's input unchecked, so its argument type is a promise the browser does not enforce.
 * The method may take `{ signal }` as a second argument; UI callers omit it.
 *
 * Like `@onEvent`, the decorator binds the method it decorates, so a subclass override is not what the agent
 * calls. See `createAgentTool` for the lifecycle, and `registerAgentTool` for the WebMCP behavior. The API is
 * experimental.
 */
export function agentTool<Host extends AgentToolHost, Input>(config: Omit<AgentToolConfig<Host, Input>, 'execute'>) {
	function decorator<THost extends Host>(
		protoOrTarget: (this: THost, input: Input, options: AgentToolExecuteOptions) => unknown,
		context: ClassMethodDecoratorContext<THost>,
	): void;
	function decorator<TMethod extends (input: Input, options: AgentToolExecuteOptions) => unknown>(
		protoOrTarget: Host,
		name: string,
		descriptor: TypedPropertyDescriptor<TMethod>,
	): TypedPropertyDescriptor<TMethod> | void;
	function decorator(
		protoOrTarget: Host | Method,
		nameOrContext: string | ClassMethodDecoratorContext<Host, Method>,
		descriptor?: TypedPropertyDescriptor<Method>,
	): TypedPropertyDescriptor<Method> | void {
		return methodDecoratorBridge(
			standardAgentTool<Host, Input>(config),
			legacyAgentTool<Host, Input>(config),
			protoOrTarget,
			nameOrContext,
			descriptor,
		);
	}

	return decorator;
}
