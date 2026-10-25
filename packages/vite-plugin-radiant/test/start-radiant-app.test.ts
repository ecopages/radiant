import { beforeEach, describe, expect, test, vi } from 'vitest';

const runtime = vi.hoisted(() => ({
	createRoot: vi.fn(),
	loadRadiantDomModules: vi.fn(),
	startControllers: vi.fn(),
	timeline: [] as string[],
	tagDefined: false,
}));

vi.mock('@ecopages/jsx', () => ({
	createRoot: runtime.createRoot,
}));

vi.mock('@ecopages/radiant', () => ({
	startControllers: runtime.startControllers,
}));

vi.mock(
	'virtual:radiant/app-load-mode',
	() => ({
		resolveRadiantAppLoadMode: () => 'ssr',
	}),
	{ virtual: true },
);

vi.mock(
	'virtual:radiant/dom-module-registry',
	() => ({
		loadRadiantDomModules: runtime.loadRadiantDomModules,
	}),
	{ virtual: true },
);

vi.mock(
	'virtual:radiant/client-module-registry',
	() => ({
		loadRadiantClientModule: vi.fn(),
	}),
	{ virtual: true },
);

describe('startRadiantApp', () => {
	beforeEach(() => {
		vi.resetModules();
		runtime.createRoot.mockReturnValue({
			hydrate: vi.fn(() => runtime.timeline.push('hydrate')),
			render: vi.fn(() => runtime.timeline.push('render')),
		});
		runtime.loadRadiantDomModules.mockImplementation(async (root: unknown) => {
			runtime.timeline.push(root === documentRoot ? 'load:document' : 'load:root');
			runtime.tagDefined = true;
			return [];
		});
		runtime.startControllers.mockImplementation(() => runtime.timeline.push('controllers'));
		runtime.timeline = [];
		runtime.tagDefined = false;
	});

	test('loads document elements before the app JSX is created', async () => {
		const app = vi.fn(() => {
			runtime.timeline.push(`app:${runtime.tagDefined}`);
			return {};
		});
		const { startRadiantApp } = await import('../src/runtime/start-radiant-app');

		await startRadiantApp({
			app,
			documentRoot,
			installHydrator: false,
			root: rootElement,
		});

		expect(runtime.timeline).toEqual(['load:document', 'app:true', 'hydrate', 'load:root', 'controllers']);
	});
});

const documentRoot = {
	querySelector: () => null,
} as unknown as Document;

const rootElement = {} as HTMLElement;
