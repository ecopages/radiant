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
        { title: 'Introduction', slug: 'introduction' },
        { title: 'Installation', slug: 'installation' },
      ],
    },
    {
      name: 'Core',
      subdirectory: 'core',
      pages: [{ title: 'RadiantElement', slug: 'radiant-element' }],
    },
    {
      name: 'Decorators',
      subdirectory: 'decorators',
      pages: [
        { title: '@customElement', slug: 'custom-element' },
        { title: '@debounce', slug: 'debounce' },
        { title: '@event', slug: 'event' },
        { title: '@onEvent', slug: 'on-event' },
        { title: '@onUpdated', slug: 'on-updated' },
        { title: '@query', slug: 'query' },
        { title: '@reactiveProp', slug: 'reactive-prop' },
        { title: '@reactiveField', slug: 'reactive-field' },
      ],
    },
    {
      name: 'Context',
      subdirectory: 'context',
      pages: [
        { title: 'Context', slug: 'context' },
        { title: '@provideContext', slug: 'provide-context' },
        { title: '@consumeContext', slug: 'consume-context' },
        { title: '@contextSelector', slug: 'context-selector' },
      ],
    },
    {
      name: 'Mixins',
      subdirectory: 'mixins',
      pages: [{ title: 'WithKita', slug: 'with-kita' }],
    },
    {
      name: 'Tools',
      subdirectory: 'tools',
      pages: [{ title: 'stringifyTyped', slug: 'stringify-typed' }],
    },
    {
      name: 'Examples',
      subdirectory: 'examples',
      pages: [
        { title: 'Counter', slug: 'counter' },
        { title: 'Todo App', slug: 'todo-app' },
      ],
    },
  ],
};
