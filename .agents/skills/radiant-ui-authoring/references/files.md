# File layout

One directory: `packages/radiant-ui/src/components/ui/<name>/`.

| File | Role |
| --- | --- |
| `<name>.script.tsx` (or `.ts`) | Custom element: state, APG, queries, events. |
| `<name>.tsx` | `Rui*` view and Composition Helpers. |
| `<name>.css` | Atomic BEM. No theme `@import`. |
| `<name>.stories.tsx` | `parameters.radiant.element` + `cssImports`. |
| `<name>.test.tsx` / `*.ssr.test.tsx` | Behavior and range ownership. |
| `index.ts` | Re-export CE types from script, views from tsx. |

Optional: extra scripts for nested hosts (`disclosure-group.script.tsx`, `sidebar-trigger.script.tsx`).

## Package export

Add `./<name>` in `packages/radiant-ui/package.json` exports (same shape as a neighbor). Do not invent a second public path.

## Storybook

```ts
const meta = {
	title: 'Components/Foo',
	component: RuiFoo,
	parameters: {
		radiant: {
			element: RuiFooElement,
			cssImports: ['./foo.css'],
		},
	},
} satisfies Meta<typeof RuiFoo>;
```

Extra skins: `withStylesheets([otherCss])` from `@sb/with-stylesheets` on that story only.

## Docs app

If the component is documented: `apps/radiant-ui/src/content/stories/<slug>.tsx` + `src/content/components/<slug>.mdx`. Register the story module where other stories are imported. See `apps/radiant-ui/README.md`.

## Style dependencies

Do not hand-edit `style-dependencies.json` unless the generate script requires it. The manifest is produced from rendered default composition. After adding CSS imports between components, regenerate the way this repo already does (package script / CI). Consumers of `styles.css` should not need a new import path for a single component beyond the package export.
