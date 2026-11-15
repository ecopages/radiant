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
- `test/recipes-*.test.browser.ts` — the same for recipe pages, one file per recipe or group of recipes, with `test/mount-recipe.ts` holding the shared mounting helpers
- `test/mount-example.test.browser.ts` — `mountExample` mounts each element once, re-mounts after the router events and cleans up an element that left the page
- `test/primitive-example.test.browser.ts` — with the frame CSS loaded: menu items sit in a column and popups sit above the code block that follows
- `test/recipe-imports.test.ts` — plain recipe scripts import only the `controllers` and `helpers` entries, plus `mountExample`; Radiant element scripts add `@ecopages/radiant` and no mount helper; the page fences match the scripts
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
- **Recipe page** (`recipes/<slug>.mdx`): the shape is described in `recipes/overview.mdx`. A recipe shows the same behavior in two forms, each runnable and each with its full source in a fence: a plain form that follows the controller page pattern above, and a Radiant form, a `RadiantElement` that composes the controllers with `createX(this, config)`. The Radiant form is described next.

### Writing a recipe in both forms

Searchable list (`recipes/searchable-list.*`) is the worked example. A recipe `<slug>` has these files in `src/content/components/recipes/`:

| File                | Holds                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| `<slug>.mdx`        | The page. Lists both scripts in `config.dependencies.scripts`.                                         |
| `<slug>.script.ts`  | The plain form: `mount(root)` plus `mountExample('<slug>', mount)`.                                    |
| `<slug>.element.ts` | The Radiant form: one `@customElement('recipe-<slug>')` class. No `mountExample`, no returned cleanup. |

The page's Example section has two `###` headings, `Plain JavaScript` then `Radiant element`, each with its runnable example, its `html` fence and its `ts` fence, and the prose after the Radiant fence says what the host form removes: the mount function and its registration, the cleanup to return and the re-run after a client-side navigation.

- **Element.** The class extends `RadiantElement`, finds its parts with `@query({ selector })` (the `data-ref`, role and tag hooks the plain form queries), listens with `@onEvent({ selector, type })` and composes controllers with `createX(this, config)`. Hold a controller in a field initializer when the element calls it later (`this.roving.sync()`); call the factory in the constructor when it is only attached for the connected lifetime. Anything that needs the authored children (`sync()`, a first render of the status caption) goes in `onConnected()`, which runs after the authored children are available; callbacks that `createX` registers run earlier, at the start of the connect. Imports come only from `@ecopages/radiant` (the element scaffolding), `@ecopages/radiant-ui/controllers` and `@ecopages/radiant-ui/helpers`.
- **Markup.** The Radiant example renders `<PrimitiveExample host>` around one `<recipe-<slug>>` element with the authored children inside; `host` drops the `name` (there is nothing to mount) and gives the element no box of its own, so its children lay out in the frame and `layout="stack"` still applies. The element fence is the element with its children, without the frame. Ids in the Radiant markup differ from the plain form's (`radiant-fruit-filter`), because both forms are on one page.
- **Router.** Nothing is registered: a custom element runs `connectedCallback` on every new copy, so the router swapping the page in, or navigating away and back, starts it, and removing the element tears it down.
- **Fences.** The `ts` fence of the Radiant form is the `.element.ts` file exactly; the plain fence is the `.script.ts` without the `mountExample` import and closing call. `test/recipe-imports.test.ts` compares both and checks the imports.
- **Tests.** In a new `test/recipes-<slug>.test.browser.ts`, run the shared assertions through `describe.each(['plain', 'radiant'])` and the `mountForm(slug, form)` helper from `test/mount-recipe.ts` that mounts the first `html` fence and the `.script.ts` (plain) or the second `html` fence and the `.element.ts` (Radiant), then returns the example root. One more test per recipe removes the Radiant element and checks that every listener it added is removed, then adds a fresh copy and checks it works.

Checklist for adding a Radiant element form to a recipe:

1. Create `<slug>.element.ts` with `recipe-<slug>` and port the behavior onto controllers and `@onEvent`, with no behavior change.
2. Add it to the page's `config.dependencies.scripts`.
3. Split the page's Example section into `Plain JavaScript` and `Radiant element`; add the Radiant example, its `html` fence, its `ts` fence and the paragraph on what the host form removes.
4. Give the Radiant markup its own ids.
5. Share the recipe's browser test across both forms and add the teardown test.
6. Run `pnpm test` and `pnpm run build` and look at the page at 1280px and 390px.

Add a test to `test/controller-examples.test.browser.ts` for every interactive controller example, and to a `test/recipes-<slug>.test.browser.ts` for a recipe. Descriptions in frontmatter are quoted when they contain a colon.

#### All-in-one component

A third form, used where the markup is derived from state: a calendar grid, board columns. Today the board and calendar events recipes have it. The element owns its markup through `render()` (a Derived Tree in the catalog's terms), so the page uses one self-contained tag.

- **When.** Use it when the recipe's markup is generated from data (days, columns, rows) and the Radiant element would have to build it in `onConnected` or ask the author to copy a long block. Do not use it for markup the author is meant to shape, such as a field and a list.
- **Removes.** The markup to author and copy: the page's `html` fence is the tag alone, and the data is `@state`.
- **Costs.** The markup lives in the class, so restyling the structure means editing it. The element needs the render path on the server to have content before its script runs; without it the tag is prerendered empty (as in this docs build) and the client draws it, so there is no first paint of it.
- **Files and tag.** `<slug>.component.tsx` with `@customElement('recipe-<slug>-app')`; the `-app` suffix keeps the tag off the authored-markup form's `recipe-<slug>`. The page lists it in `config.dependencies.scripts` and the recipe's stylesheet selects both tags.
- **Page.** A third `###` heading, `Radiant component`, after `Radiant element`: its runnable `<PrimitiveExample host>` with the tag, an `html` fence that is the tag, a `tsx` fence that is the file exactly, and a paragraph on how `render()` and the controllers fit and how it compares with the authored-markup form (what it removes, what it costs). The page order is plain, element, component.
- **Imports.** Only `@ecopages/radiant`, `@ecopages/radiant-ui/controllers` and `@ecopages/radiant-ui/helpers`; the component needs no `@ecopages/jsx` import. `test/recipe-imports.test.ts` checks the imports and the `tsx` fence.
- **Controllers and `render()`.** Controllers are created as field initializers and attach when the element connects, before the first render, so their targets are getters that read the current DOM (`this.querySelector(...)`), never cached nodes. `updated()` runs after each render and calls `attach()` again, which re-resolves the targets, then restores focus on the node that moved by its id: a keyed item that changes parent is a new node. A controller's `onChange` writes state (a new array) and never the DOM. Text that changes while a sort is in progress, such as the announcement, is bound with `this.$.<field>` so it patches one text node and does not call `render()` again mid-sort.
- **Tests.** `test/recipes-component.test.browser.ts` mounts the page's third `html` fence and the `.component.tsx` with `mountComponent(slug)`; it moves by real pointer and keyboard input, moves twice to prove the state and not the DOM is the source, and removes the element with `trackListeners()`.

## LLM docs export

```bash
pnpm --filter @ecopages/radiant-ui-docs generate:llms
```

Runs before `dev`, `build` and `preview`. Pages appear in sidebar order (section, then frontmatter `order`).

The command writes `llms.txt` and one raw-MDX Markdown export per page at `src/public/docs-llm/<section>/<slug>.md`. Pages with `llms: false` in frontmatter are left out. Each page links its export as `rel="alternate"` (`src/lib/docs/docs-llm-url.ts`) and Copy for LLM fetches it. For one release the generator also writes the old `src/public/llms-content/<slug>.txt` exports, under the slug a page had before the section move (`/llms-content/button.txt`), so published links keep working; `LEGACY_LLMS_DIR` in `scripts/generate-llm-docs.ts` says what to delete afterwards. Both trees are generator-owned and staged before replacement, so a failed generation preserves the previous complete trees. `ECOPAGES_BASE_URL` is the canonical origin for configuration, generated links, and page metadata.

## Deployment

The build writes public files to `apps/radiant-ui/dist/client` and private server files to `dist/server`. Configure the Cloudflare Pages build output directory as `apps/radiant-ui/dist/client` when the repository root is the build root (or `dist/client` when this app is the build root).

The build also writes `dist/client/_redirects` from `src/lib/docs/moved-docs-paths.ts`. Cloudflare Pages reads it and answers every docs URL from before the section-folder move with a 301 to the page's current URL.
