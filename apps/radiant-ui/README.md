# Radiant UI Docs

Documentation app for Radiant UI: landing page at `/`, component reference under `/docs`.

The default Open Graph and Twitter preview is `src/public/assets/images/default-og.png`. It uses the site logo, Karla heading font, and the homepage hook; `src/lib/docs/site-meta.ts` supplies its public URL when a page has no custom image.

## Local development

```bash
pnpm --filter @ecopages/radiant-ui-docs dev
```

Run tests:

```bash
pnpm --filter @ecopages/radiant-ui-docs test
```

## Documentation architecture

Component pages combine three layers. Keep them separate — do not generate usage snippets from playground state.

| Layer        | Where                      | Purpose                                              |
| ------------ | -------------------------- | ---------------------------------------------------- |
| **Try it**   | `<Demo>` in MDX            | Live preview + prop controls                         |
| **Usage**    | Fenced `tsx` blocks in MDX | Copy-paste examples authors maintain by hand         |
| **Variants** | `<Canvas>` in MDX          | Static previews for additional stories (no controls) |

**Mental model:** Storybook-style docs pages, not a devtools panel. The playground explores props; prose owns the canonical example.

### Runtime pieces

- `src/lib/docs-stories/` — portable CSF-shaped toolkit (`meta`, `docsStory`, control heuristics, registry)
- `src/components/component-docs/` — host shell (`Demo`, `Canvas`, `Controls` custom elements)
- `src/content/stories/` — per-component story modules registered at import time
- `src/content/components/` — MDX pages

`Demo` renders `Canvas` (preview mount) and `Controls` (arg panel). It does not render example source code.

## Authoring a component page

### 1. Create the story module

Add `src/content/stories/<slug>.tsx` and register it in `src/content/stories/index.ts`.

```tsx
import { RuiButton } from '@ecopages/radiant-ui/button';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type ButtonArgs = {
	variant: 'filled' | 'outline';
	children: string;
};

export const meta = {
	args: { variant: 'filled', children: 'Continue' },
	argTypes: {
		children: { control: { type: 'text' } },
		variant: {
			control: { type: 'select' },
			options: ['filled', 'outline'] as const satisfies readonly ButtonArgs['variant'][],
		},
	},
	render: (args) => <RuiButton variant={args.variant}>{args.children}</RuiButton>,
} satisfies DocsMeta<ButtonArgs>;

type Story = DocsStory<ButtonArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'button/default' } } });
```

Every embedded story must call `docsStory` at module scope so client hydration can resolve it by `parameters.docs.id`.

### 2. Declare controls with `argTypes`

Authors declare `control.type` and `options`. The shell picks widgets via heuristics (`src/lib/docs-stories/heuristics.ts`):

- `boolean` → switch
- `text` → text input
- `number` → number field
- `radio` with 2+ options → radio group
- `select` with 2–3 options → segmented buttons
- `select` with 1 option or 4+ options → select
- `radio` or `select` with no options → text

Do not branch on option counts in the shell or MDX.

Segmented controls render as an inset rail: the pressed option derives its corner radius from `--radius-control` minus the rail padding, while unpressed options stay square so the nested shape remains coherent across themes.

### 3. Add the MDX page

Create `src/content/components/<section>/<slug>.mdx` with frontmatter (`title`, `description`, optional `order`). The folder is the sidebar section: `actions`, `forms`, `layout`, `navigation`, `overlays`, `feedback` or `data-display` (plus `getting-started` for guides). Section titles, icons and order live in `DOCS_SECTION_CONFIG` in `src/content/components.ts`; pages within a section sort by `order`, then slug. The page URL is `/docs/<section>/<slug>`.

When a page moves to another section, add its old path to `MOVED_DOCS_PATHS` in `src/lib/docs/moved-docs-paths.ts`. The build writes a Cloudflare Pages `_redirects` file from that map (`pnpm run generate:redirects`), and `scripts/generate-redirects.test.ts` checks that every old path lands on an existing page.

Wire dependencies so demo custom elements hydrate:

```tsx
import { meta as ButtonMeta, Default } from '@/content/stories/button';
import Canvas from '@/components/component-docs/canvas';
import Demo from '@/components/component-docs/demo';

export const config = {
	dependencies: {
		components: [Canvas, Demo],
		scripts: [
			'../../components/component-docs/demo.script.tsx',
			'../../components/component-docs/canvas.script.tsx',
			'../../components/component-docs/controls.script.tsx',
		],
	},
};
```

Use `<Demo of={Default} meta={ButtonMeta} />` under **Try it**. Put copy-paste examples in **Usage** as fenced `tsx` blocks. `src/mdx/rehype-pierre-code.ts` highlights every fenced block with `@pierre/highlights` (the VS Code Light+ and Dark+ pair, through `src/lib/pierre-highlight.ts`) and adds the Copy button automatically; do not add one in MDX. Add `showLineNumbers` after the language (` ```ts showLineNumbers `) to draw a line-number gutter on one block; the numbers are a CSS counter, so they never reach the clipboard or a text selection. The recipe code tabs number every file and show its line count after the file name. The highlighter is WebAssembly and runs when the page build runs in Node, so no code is highlighted in the browser. The theme lab's CSS preview is the one exception, because its CSS comes from the reader's edits; it uses a minimal Shiki instance and not Pierre (see `src/lib/theme-lab/highlight-css.ts` for why), so `shiki` stays a dependency.

Use `<Canvas of={Destructive} meta={ButtonMeta} />` for extra stories that should preview without controls.

For a **behavior host** (the script queries `data-ref` / `data-*` / roles in light DOM — never BEM classes), Usage shows the `Rui*` helpers. Also document the query contract: a **Custom markup** section and an API **Light-DOM contract** table so authors can stamp the same targets without the helpers. Diff every snippet against the view — do not invent props (`id` vs `value`) or nest chrome a helper already renders. Add `<Canvas>` stories for extra capabilities (multiple selection, range mode, …). Playbook: [`.agents/skills/radiant-ui-docs/`](../../.agents/skills/radiant-ui-docs/SKILL.md). Tag Group (`src/content/components/data-display/tag-group.mdx`) is the filled example.

### 4. Multiple stories

Export additional stories from the same module with different `args`, `render`, or `parameters.docs.id`. See `button.tsx` and `cycle-toggle.tsx`.

### 5. Shared demo data

Reuse fixtures such as option lists from `src/content/stories/demo-data.ts` when several stories need the same data.

### 6. Tests

- `test/story-previews.test.browser.ts` — complex `render` output smoke tests
- `test/canvas.test.browser.ts` — client repaint when story context args change
- `test/controller-examples.test.browser.ts` — one test per controller page example; it mounts the `html` fence of the page and runs the page's `<slug>.script.ts`
- `test/recipes-*.test.browser.ts` — the same for recipe pages, one file per pattern and recipe or group of recipes, with `test/mount-recipe.ts` holding the shared mounting helpers (`mountForm`, `mountComponent`, `mountController`, `trackListeners`)
- `test/mount-example.test.browser.ts` — `mountExample` mounts each element once, re-mounts after the router events and cleans up an element that left the page
- `test/primitive-example.test.browser.ts` — with the frame CSS loaded: menu items sit in a column and popups sit above the code block that follows
- `test/recipe-imports.test.ts` — recipe scripts import only `@ecopages/radiant-ui/*` entries, their own data and loader files and, for the non-plain patterns, `@ecopages/radiant`; only plain scripts import the mount helper; pages list their patterns in order with plain last; the code tabs are the files as written without the mount call; the live examples come from `RecipeExample`, with no markup copied into the page
- `src/components/recipe-patterns/*.test.browser.ts` — the pattern switch shows the stored choice, destroys the old pattern and keeps one controller registry per document
- `src/mdx/rehype-pierre-code.test.ts` — fences become figures with line spans and a copy button holding the exact source, including fences inside MDX JSX nodes
- `src/lib/pierre-highlight.test.ts` — language fallback and one `.line` per source line, without a line for the final newline
- `src/styles/components/copy-button.test.browser.ts` — the copy button states and icon animation styles
- `src/layouts/base-layout/code-copy.test.browser.ts` — the click handler copies from `data-rehype-pretty-copy`, keeps the accessible name "Copy code" and announces the result through the base layout's `role="status"` region

Add a render test when a story layout is easy to regress (trees, sidebars, overlays).

`*.test.ts` files run on Node and own server rendering. `*.test.browser.ts` files run in Chromium through Vitest browser mode. A component that is server-rendered and then hydrated is split in two: a `*.ssr.test.ts` writes its markup to `__snapshots__/`, and the browser test hydrates that snapshot.

## Controllers, helpers and recipes

Three sections sit after the component sections: `controllers`, `helpers` and `recipes` (`DOCS_SECTION_ORDER` in `src/content/components.ts`). They are not catalog components, so `NON_COMPONENT_SECTIONS` keeps them out of the component count, the home page groups and the theme lab. Each folder under `src/content/components/` has an `overview.mdx` with `order: 0`.

- **Controller page** (`controllers/<slug>.mdx`): lede, import line, the example, config table, lifecycle and protected hooks. The example is `<PrimitiveExample name="<slug>">` (`src/components/primitive-example`) around plain elements, plus `controllers/<slug>.script.ts` listed in the page's `config.dependencies.scripts`. The page shows the markup in an `html` fence wrapped in `<div data-example="<slug>">` and the script in a `ts` fence; keep both identical to what runs, except that the fence leaves out the `mountExample` import and its closing call. The script exports `mount(root: HTMLElement): () => void`: it wires one example element and returns the cleanup that destroys its controllers. It ends with `mountExample('<slug>', mount)` (`src/components/primitive-example/mount-example.ts`). The page script is a module, so it runs once per tab; `mountExample` mounts every element once and mounts the new elements again on `eco:page-load` and `eco:after-swap`, and it runs the cleanup of an element that left the page. Never query the page at module level. The frame styles the plain elements and `data-box`, `data-status` hooks from the theme variables, so add no colors of your own. `<PrimitiveExample host>` frames one custom element (a Radiant form) instead of a `[data-example]` element to mount. `<PrimitiveExample layout="stack">` lays the children out as one full-width column and styles a labelled `input`, a bordered `ul` and a muted `data-status` caption; omit it for the default wrapping row. Text on its own line inside a text element such as `p`, `button` or `li` stays that element's content (`src/mdx/remark-unwrap-jsx-text.ts`); without it MDX would wrap the text in a loose `<p>`. The router morphs the page and can keep an example element while changing its `data-example`; `mountExample` then cleans up the old mount and mounts the new name. The frame is its own stacking context (`z-index: 1`), so a popup that overflows it stays above the code block that follows; give a new floating surface a role the frame styles or `data-box`.
- **Helper page** (`helpers/<slug>.mdx`): `<HelperResults rows={[{ code, result }]} />` lists calls with results computed while the page renders, so the output cannot drift from the helper.
- **Recipe page** (`recipes/<slug>.mdx`): the shape is described in `recipes/overview.mdx`. A recipe shows one behavior in up to four authoring patterns, each runnable and each with its full source in file tabs. The files and helpers are described next.

### Writing a recipe

Searchable list (`recipes/searchable-list.*`) is the worked example. A recipe `<slug>` has these files in `src/content/components/recipes/`; the page lists every script and the stylesheet in `config.dependencies`, and `RecipePatterns`, `RecipeCode` and `RecipeExample` in `config.dependencies.components`.

| File                                 | Holds                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `<slug>.mdx`                         | The page: goal, primitives, one `RecipePatterns` with a `RecipePattern` per pattern, prose that says what each pattern removes or costs.       |
| `<slug>.element.ts`                  | Radiant element: `@customElement('<slug>-element')`, markup authored inside it.                                                                |
| `<slug>.component.tsx`               | Radiant component: `@customElement('<slug>-app')`, draws its own markup in `render()`. The page writes only the tag.                           |
| `<slug>.controller.ts`               | Radiant controller: `@controller('<slug>')`, attached to markup carrying `data-controller="<slug>"`.                                           |
| `<slug>.script.ts`                   | Plain JavaScript: `mount(root)` plus `mountExample('<slug>', mount)` at the end, the same pattern as a controller page.                        |
| `<slug>.element.html`                | The element with its authored children, as the page runs it and the markup tab shows it.                                                       |
| `<slug>.controller.html`             | The `data-controller="<slug>"` host with its children.                                                                                         |
| `<slug>.plain.html`                  | A `<div data-example="<slug>">` with its children. The frame already is that element, so the page renders only the children.                   |
| `<slug>.css`                         | The stylesheet, scoped to the example's tags (`<slug>-element`, `<slug>-app`, `[data-controller]`, `[data-example]`); shown as the last tab.   |
| `<slug>.data.ts`, `<slug>.loader.ts` | Optional files every pattern shares (static data, media loading). They import no sibling, only public entries, and are shown after the script. |

The page order is element, component, controller, plain, and plain is always last because it is the baseline the others remove code from. `RecipePatterns patterns={[...]}` lists the patterns the recipe has in that order, and the `RecipePattern id` panels follow the same order. A recipe may leave out a pattern, but not plain.

How a page is built:

- **`RecipePatterns`** (`src/components/recipe-patterns`) renders a `RuiToolbar` of buttons, the first pattern live in a stage and every pattern as an inert `<template>`. Its script, `recipe-patterns.script.ts`, swaps the stage for a copy of the chosen template, so only one pattern is ever in the document: the old example is removed (its elements disconnect, `syncExamples` runs the cleanup of a plain one, the controller registry disconnects controllers) and the new one starts from pristine markup. The choice is kept in `localStorage` under one key shared by all recipes. The script starts the controller registry once per document (`startControllersOnce`), which the controller pattern needs.
- **`RecipeExample recipe pattern [layout]`** renders the live example of the element, controller and plain patterns from `<slug>.<pattern>.html` inside a `PrimitiveExample`, with `host` set for the element and controller patterns and `name` for plain. The component pattern keeps its tag inline in the page, as the `<slug>-app` tag alone inside `<PrimitiveExample host>`. Do not copy markup into the mdx; the page test fails when the page holds `data-example`, `data-controller` or a `<slug>-element` tag.
- **`RecipeCode recipe pattern`** shows the file tabs of one pattern, read from the same files at build time (`recipe-sources.ts`): the script (for plain, without the `mountExample` import and call), the shared `data` and `loader` files, the pattern's markup file and the stylesheet. The example and the tabs read the same files, so they cannot drift.
- **Layout.** Pass `layout="stack"` on the `RecipeExample` of every pattern, and on the inline component panel, when the recipe wants the full-width column.
- **Ids.** Only one pattern is in the document at a time, so the patterns can reuse ids.

Pattern notes:

- **Element.** Extends `RadiantElement`, finds its parts with `@query`, listens with `@onEvent` and composes controllers with `createX(this, config)`. Hold a controller in a field when the element calls it later; call the factory in the constructor when it is only attached for the connected lifetime. Anything that needs the authored children goes in `onConnected()`. Nothing is registered with the router: a custom element starts itself on every copy.
- **Component.** Use it where the markup derives from state (a calendar grid, board columns, a track list), not for markup the author is meant to shape. Controllers are field initializers and attach when the element connects, before the first render, so their targets are getters that read the current DOM, never cached nodes. `updated()` calls `attach()` again after each render. A controller's `onChange` writes state and never the DOM. The docs build prerenders the tag empty and the client draws it.
- **Controller.** A `RadiantController` finds its parts with `@query` through `this.host`, and uses `connect()` in place of `onConnected()`. The registry the page script starts attaches `data-controller` hosts as they enter the page and detaches them as they leave.
- **Plain.** The `mount(root)` function returns the cleanup that undoes it, as on a controller page.
- Imports come only from `@ecopages/radiant`, `@ecopages/radiant-ui/*` entries and the recipe's own `./<slug>.data` and `./<slug>.loader` files; the plain script also imports the mount helper. `test/recipe-imports.test.ts` enforces this.

Tests, in `test/recipes-*.test.browser.ts`: `test/mount-recipe.ts` mounts one pattern from the same files the page uses. `mountForm(slug, 'plain' | 'radiant')` mounts the plain markup and script or the element markup and module, `mountComponent(slug)` the `<slug>-app` tag and `mountController(slug)` the controller markup and module under a fresh registry (it stops any earlier one). Each returns the element the parts sit under. Run the shared assertions through each pattern, and add one test that removes the element and checks, with `trackListeners()`, that every listener it added is gone, then adds a fresh copy and checks it works.

To add a recipe: write the files above with no behavior difference between patterns, write the page with `RecipeExample` and `RecipeCode` panels, add the browser tests, then run `pnpm test` and `pnpm run build` and look at the page at 1280px and 390px. To add a pattern to a recipe: add its script (and markup file), a `RecipePattern` panel and its id in `patterns`, list the script in `config.dependencies.scripts`, and add its tests.

Add a test to `test/controller-examples.test.browser.ts` for every interactive controller example. Descriptions in frontmatter are quoted when they contain a colon.

## LLM docs export

```bash
pnpm --filter @ecopages/radiant-ui-docs generate:llms
```

Runs before `dev`, `build` and `preview`. Pages appear in sidebar order (section, then frontmatter `order`).

The command writes `llms.txt` and one raw-MDX Markdown export per page (with each recipe's source files written out as fenced blocks) at `src/public/docs-llm/<section>/<slug>.md`. Pages with `llms: false` in frontmatter are left out. Each page links its export as `rel="alternate"` (`src/lib/docs/docs-llm-url.ts`) and Copy for LLM fetches it. For one release the generator also writes the old `src/public/llms-content/<slug>.txt` exports, under the slug a page had before the section move (`/llms-content/button.txt`), so published links keep working; `LEGACY_LLMS_DIR` in `scripts/generate-llm-docs.ts` says what to delete afterwards. Both trees are generator-owned and staged before replacement, so a failed generation preserves the previous complete trees. `ECOPAGES_BASE_URL` is the canonical origin for configuration, generated links, and page metadata.

## Deployment

The build writes public files to `apps/radiant-ui/dist/client` and private server files to `dist/server`. Configure the Cloudflare Pages build output directory as `apps/radiant-ui/dist/client` when the repository root is the build root (or `dist/client` when this app is the build root).

The build also writes `dist/client/_redirects` from `src/lib/docs/moved-docs-paths.ts`. Cloudflare Pages reads it and answers every docs URL from before the section-folder move with a 301 to the page's current URL.
