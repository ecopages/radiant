type DocPage = {
	title: string;
	slug: string;
};

type DocsGroup = {
	name: string;
	subdirectory?: string;
	pages: DocPage[];
};

type DocsSettings = {
	rootDir: string;
};

type DocsConfig = {
	settings: DocsSettings;
	documents: DocsGroup[];
};

export const docsConfig: DocsConfig = {
	settings: {
		rootDir: '/docs',
	},
	documents: [
		{
			name: 'Getting Started',
			subdirectory: 'getting-started',
			pages: [
				{ title: 'Overview', slug: 'introduction' },
				{ title: 'Installation', slug: 'installation' },
				{ title: 'Best Practices', slug: 'best-practices' },
			],
		},
		{
			name: 'Components',
			subdirectory: 'components',
			pages: [
				{ title: 'RadiantComponent', slug: 'radiant-component' },
				{ title: 'RadiantElement', slug: 'radiant-element' },
				{ title: 'Slots', slug: 'slots' },
			],
		},
		{
			name: 'Decorators',
			subdirectory: 'decorators',
			pages: [
				{ title: '@customElement', slug: 'custom-element' },
				{ title: '@prop', slug: 'prop' },
				{ title: '@state', slug: 'state' },
				{ title: '@signal', slug: 'signal' },
				{ title: '@query', slug: 'query' },
				{ title: '@querySlot', slug: 'query-slot' },
				{ title: '@event', slug: 'event' },
				{ title: '@onEvent', slug: 'on-event' },
				{ title: '@onUpdated', slug: 'on-updated' },
				{ title: '@bound', slug: 'bound' },
				{ title: '@debounce', slug: 'debounce' },
			],
		},
		{
			name: 'JSX',
			subdirectory: 'packages',
			pages: [
				{ title: 'JSX Overview', slug: 'jsx-overview' },
				{ title: 'Events', slug: 'jsx-events' },
				{ title: 'Client Rendering', slug: 'jsx-rendering' },
				{ title: 'SSR', slug: 'jsx-ssr' },
			],
		},
		{
			name: 'Signals',
			subdirectory: 'packages',
			pages: [
				{ title: 'Signals Overview', slug: 'signals-overview' },
				{ title: 'State & Computed', slug: 'signals-state-computed' },
				{ title: 'Effects & Watchers', slug: 'signals-effects' },
				{ title: 'Stores', slug: 'signals-stores' },
			],
		},
		{
			name: 'Context',
			subdirectory: 'context',
			pages: [
				{ title: 'Overview', slug: 'context' },
				{ title: 'Provide Context', slug: 'provide-context' },
				{ title: 'Consume Context', slug: 'consume-context' },
				{ title: 'Select Context', slug: 'context-selector' },
			],
		},
		{
			name: 'Tools',
			subdirectory: 'tools',
			pages: [{ title: 'stringifyTyped()', slug: 'stringify-typed' }],
		},
		{
			name: 'Examples',
			subdirectory: 'examples',
			pages: [
				{ title: 'Counter', slug: 'counter' },
				{ title: 'Weather App', slug: 'weather-app' },
				{ title: 'Todo App', slug: 'todo-app' },
			],
		},
	],
};
