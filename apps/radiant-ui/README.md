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

Use `<Demo of={Default} meta={ButtonMeta} />` under **Try it**. Put copy-paste examples in **Usage** as fenced `tsx` blocks. `rehype-pretty-code` highlights every fenced block and its `transformerCopyButton` adds the Copy button automatically; do not add one in MDX.

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
- `test/mdx-code-copy.test.browser.ts` — the copy button is a sibling of `pre`
- `src/layouts/base-layout/code-copy.test.browser.ts` — the click handler copies from `data-rehype-pretty-copy`, keeps the accessible name "Copy code" and announces the result through the base layout's `role="status"` region

Add a render test when a story layout is easy to regress (trees, sidebars, overlays).

`*.test.ts` files run on Node and own server rendering. `*.test.browser.ts` files run in Chromium through Vitest browser mode. A component that is server-rendered and then hydrated is split in two: a `*.ssr.test.ts` writes its markup to `__snapshots__/`, and the browser test hydrates that snapshot.

## Controllers, helpers and recipes

Three sections sit after the component sections: `controllers`, `helpers` and `recipes` (`DOCS_SECTION_ORDER` in `src/content/components.ts`). They are not catalog components, so `NON_COMPONENT_SECTIONS` keeps them out of the component count, the home page groups and the theme lab. Each folder under `src/content/components/` has an `overview.mdx` with `order: 0`.

- **Controller page** (`controllers/<slug>.mdx`): lede, import line, the example, config table, lifecycle and protected hooks. The example is `<PrimitiveExample name="<slug>">` (`src/components/primitive-example`) around plain elements, plus `controllers/<slug>.script.ts` listed in the page's `config.dependencies.scripts`. The page shows the markup in an `html` fence wrapped in `<div data-example="<slug>">` and the script in a `ts` fence; keep both identical to what runs. The frame styles the plain elements and `data-box`, `data-status` hooks from the theme variables, so add no colors of your own.
- **Helper page** (`helpers/<slug>.mdx`): `<HelperResults rows={[{ code, result }]} />` lists calls with results computed while the page renders, so the output cannot drift from the helper.
- **Recipe page** (`recipes/<slug>.mdx`): the shape is described in `recipes/overview.mdx`. A recipe's example follows the controller page pattern; its full source goes in a fence.

Add a test to `test/controller-examples.test.browser.ts` for every interactive example. Descriptions in frontmatter are quoted when they contain a colon.

## LLM docs export

```bash
pnpm --filter @ecopages/radiant-ui-docs generate:llms
```

Runs before `dev`, `build` and `preview`. Pages appear in sidebar order (section, then frontmatter `order`).

The command writes `llms.txt` and one raw-MDX Markdown export per page at `src/public/docs-llm/<section>/<slug>.md`. Pages with `llms: false` in frontmatter are left out. Each page links its export as `rel="alternate"` (`src/lib/docs/docs-llm-url.ts`) and Copy for LLM fetches it. For one release the generator also writes the old `src/public/llms-content/<slug>.txt` exports, under the slug a page had before the section move (`/llms-content/button.txt`), so published links keep working; `LEGACY_LLMS_DIR` in `scripts/generate-llm-docs.ts` says what to delete afterwards. Both trees are generator-owned and staged before replacement, so a failed generation preserves the previous complete trees. `ECOPAGES_BASE_URL` is the canonical origin for configuration, generated links, and page metadata.

## Deployment

The build writes public files to `apps/radiant-ui/dist/client` and private server files to `dist/server`. Configure the Cloudflare Pages build output directory as `apps/radiant-ui/dist/client` when the repository root is the build root (or `dist/client` when this app is the build root).

The build also writes `dist/client/_redirects` from `src/lib/docs/moved-docs-paths.ts`. Cloudflare Pages reads it and answers every docs URL from before the section-folder move with a 301 to the page's current URL.
