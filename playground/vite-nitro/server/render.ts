import { radiantSsrWindow } from './install-radiant-ssr';
import {
	renderComponent,
	createRenderedComponentHeaders,
	type RenderedComponent,
	type ServerRenderableComponent,
	type ServerRenderableComponentConstructor,
} from '@ecopages/radiant/server/render-component';
import { resolveRadiantSsrClientModuleKey } from 'virtual:radiant/ssr-client-module-registry';
import '../src/components/radiant-component-counter.script';
import '../src/components/radiant-event-binding-lab.script';
import '../src/components/radiant-context-flow-shell.script';
import '../src/components/radiant-signal-release-board.script';
import '../src/components/radiant-slot-studio-board.script.tsx';
import { RadiantComponentCounter } from '../src/components/radiant-component-counter.script';

void radiantSsrWindow;

export type ComponentId = 'counter' | 'server-card' | 'signal-release-board';

type ComponentDefinition = {
	load: () => Promise<ServerRenderableComponentConstructor<ServerRenderableComponent>>;
	configure?: (component: any) => void;
};

const registry: Record<ComponentId, ComponentDefinition> = {
	counter: {
		load: async () => RadiantComponentCounter,
		configure: (component) => {
			component.count = 6;
			component.label = 'SSR counter rendered in Nitro';
		},
	},
	'server-card': {
		load: async () =>
			(await import('../src/components/radiant-component-server-card.script')).RadiantComponentServerCardElement,
	},
	'signal-release-board': {
		load: async () =>
			(await import('../src/components/radiant-signal-release-board.script')).RadiantSignalReleaseBoardElement,
		configure: (component) => {
			component.configureBoardState({
				filter: 'launch-ready',
				lastSyncAt: 'SSR rehearsal snapshot',
				selectedTicketId: 103,
				syncState: 'ready',
				syncSummary: 'Nitro preloaded the release rehearsal with a launch-ready focus.',
			});
		},
	},
};

export async function renderSsrComponent(id: ComponentId): Promise<RenderedComponent> {
	const { load, configure } = registry[id];
	return renderComponent({ load, configure, resolveClientModuleSrc: resolveRadiantSsrClientModuleKey });
}

export function createSsrResponse(rendered: RenderedComponent): Response {
	return new Response(rendered.markup, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			...createRenderedComponentHeaders(rendered.metadata),
		},
	});
}
