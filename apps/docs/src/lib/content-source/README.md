# content-source

A small, renderer-agnostic library that scans a directory of MDX/Markdown
content and exposes it as structured data. It is intentionally decoupled from
anything that _consumes_ that data (navigation, LLM generation, etc.).

## Scope

This package is pure data. It does not know about the docs UI, the layout
bundle, or LLM output. Consumers import a `ContentSource` instance and call
its methods.

App-specific wiring (content root, nav group order, URL prefix) lives in
`src/lib/docs-source.ts`. `generateLlmDocs` lives in `src/lib/llm-docs.ts`.

## Usage

```ts
import { ContentSource } from '@/lib/content-source';
import { resolveAppRoot } from '@/lib/resolve-app-root';
import { join } from 'node:path';

const source = new ContentSource({
	contentRoot: join(resolveAppRoot(import.meta.url), 'src/content/docs'),
	orderBy: 'order',
});
```

For the docs app, import the preconfigured instance from `@/lib/docs-source`.

## `ContentSource<T>`

Generic over `T`, the frontmatter shape (defaults to
`title`, `description`, `group?`, `order?`).

### Config

| Option        | Type                                               | Default      | Description                                 |
| ------------- | -------------------------------------------------- | ------------ | ------------------------------------------- |
| `contentRoot` | `string`                                           | — (required) | Directory scanned for content files.        |
| `orderBy`     | `'order' \| 'title' \| 'slug' \| (a, b) => number` | `'order'`    | Default manifest ordering.                  |
| `extensions`  | `string[]`                                         | `['.mdx']`   | File extensions treated as content.         |
| `schema`      | `ZodType<T>`                                       | default      | Frontmatter schema used to parse each file. |

### Methods

- `getManifest(): Promise<ContentEntry<T>[]>` — all entries, ordered.
- `getContentEntry(slug): Promise<ContentEntry<T>>` — a single entry.
- `getContentEntryBySegments(segments): Promise<ContentEntry<T>>`
- `getContent(slug): Promise<EcoComponent>` — the renderable component for a slug.
- `getRawContent(slug): Promise<string>` — raw file text (e.g. for LLMs).
- `clearCache(): void` — drop the in-memory cache.

### `ContentEntry<T>`

```ts
type ContentEntry<T> = T & {
	slug: string; // joined segments, e.g. 'getting-started/intro'
	segments: string[]; // path parts relative to the content root
};
```
