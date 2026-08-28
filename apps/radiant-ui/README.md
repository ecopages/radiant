# Radiant UI Docs

Documentation app for Radiant UI: landing page at `/`, component reference under `/docs`.

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

### 3. Add the MDX page

Create `src/content/components/<slug>.mdx` with frontmatter (`title`, `description`, `category`).

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

Use `<Demo of={Default} meta={ButtonMeta} />` under **Try it**. Put copy-paste examples in **Usage** as fenced `tsx` blocks (highlighted by `rehype-pretty-code`).

Use `<Canvas of={Destructive} meta={ButtonMeta} />` for extra stories that should preview without controls.

For a **behavior host** (the script queries `data-ref` / `data-*` / roles in light DOM — never BEM classes), Usage shows the `Rui*` helpers. Also document the query contract: a **Custom markup** section and an API **Light-DOM contract** table so authors can stamp the same targets without the helpers. Diff every snippet against the view — do not invent props (`id` vs `value`) or nest chrome a helper already renders. Add `<Canvas>` stories for extra capabilities (multiple selection, range mode, …). Playbook: [`.agents/skills/radiant-ui-docs/`](../../.agents/skills/radiant-ui-docs/SKILL.md). Tag Group (`src/content/components/tag-group.mdx`) is the filled example.

### 4. Multiple stories

Export additional stories from the same module with different `args`, `render`, or `parameters.docs.id`. See `button.tsx` and `cycle-toggle.tsx`.

### 5. Shared demo data

Reuse fixtures such as option lists from `src/content/stories/demo-data.ts` when several stories need the same data.

### 6. Tests

- `test/story-previews.test.ts` — complex `render` output smoke tests
- `test/canvas.test.ts` — client repaint when story context args change
- `test/docs-demo.test.ts` — shell wiring guards (no example-code panel in `Demo`)

Add a render test when a story layout is easy to regress (trees, sidebars, overlays).

## LLM docs export

```bash
pnpm --filter @ecopages/radiant-ui-docs generate:llms
```

Runs before `build` and `preview`.
