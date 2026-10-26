// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { createMarkupNodeLike } from '@ecopages/jsx';
import { renderToString, withServerCustomElementRenderHook } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { ContextProvider, createContext, onContextUpdate, provideContext } from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { state } from '../../src/decorators/state';
import {
	createRadiantElementSsrService,
	resolveRadiantElementRenderBridge,
	withServerRadiantElementSsrRuntime,
} from '../../src/server/radiant-element-ssr';

const hookContext = createContext<{ owner: string }>(Symbol('custom-hook-provider-children'));

@customElement('hook-children-consumer')
class HookChildrenConsumer extends RadiantElement<{ owner: string }> {
	@state owner = 'Awaiting provider';

	@onContextUpdate({ context: hookContext })
	protected syncOwner(current: { owner: string }): void {
		this.owner = current.owner;
	}

	override render() {
		return <p class="owner">{this.$.owner}</p>;
	}
}

@customElement('hook-children-provider')
class HookChildrenProvider extends RadiantElement {
	@provideContext({ context: hookContext, initialValue: { owner: 'Provider owner' } })
	context!: ContextProvider<typeof hookContext>;

	override render() {
		return (
			<section>
				<slot />
			</section>
		);
	}
}

const page = (
	<hook-children-provider>
		<hook-children-consumer />
	</hook-children-provider>
);

/**
 * An integration that registers its own custom-element render hook decides where a host's JSX children are built.
 *
 * @remarks By default they are built before the hook runs, outside the host's context providers, so a consumer
 * passed as a child of a provider host renders its fallback. A hook registered with `ownsChildren` applies them
 * itself, inside `applyLightDom`, where the provider frame exists. `@ecopages/ecopages-jsx` is such an integration.
 */
describe('a custom render hook and context consumers passed as children of a provider host', () => {
	it('misses the provider when the hook does not own the children', () => {
		expect([HookChildrenConsumer, HookChildrenProvider]).toBeDefined();

		const html = withServerRadiantElementSsrRuntime(() =>
			withServerCustomElementRenderHook(
				({ instance }) => {
					const markup = instance
						? resolveRadiantElementRenderBridge(instance)?.renderHostToString?.({ mode: 'hydrate' })
						: undefined;
					return markup === undefined ? undefined : createMarkupNodeLike(markup);
				},
				() => renderToString(page),
			),
		);

		expect(html).toMatch(/class="owner"[^>]*>Awaiting provider</);
	});

	it('resolves the provider when the hook owns the children and applies them inside the host', () => {
		const html = withServerRadiantElementSsrRuntime(() =>
			withServerCustomElementRenderHook(
				({ instance, applyChildren }) => {
					if (!instance || !resolveRadiantElementRenderBridge(instance)) return undefined;

					const service = createRadiantElementSsrService(instance as object);
					service.applyLightDom(() => applyChildren?.());
					return createMarkupNodeLike(service.renderHostToString({ mode: 'hydrate' }));
				},
				() => renderToString(page),
				{ ownsChildren: true },
			),
		);

		expect(html).toMatch(/class="owner"[^>]*>Provider owner</);
		expect(html).not.toContain('Awaiting provider');
	});
});
