# Radiant Docs

This documentation application serves as a comprehensive guide to the functionalities and operations of @ecopages/radiant.

It encompasses valuable information detailing its usage and provides a thorough explanation of its working mechanisms.

The aim is to offer users a clear understanding of how to effectively utilize @ecopages/radiant and leverage its capabilities to their full extent.

The default Open Graph and Twitter preview is `src/public/assets/images/default-og.png`. It uses the site logo, Karla heading font, and the homepage hook; `src/lib/docs/site-meta.ts` supplies its public URL when a page has no custom image.

## Docs shell

Pages live in section folders: `src/content/docs/<section>/<slug>.mdx` is served at `/docs/<section>/<slug>`. The section is the first path segment; its sidebar title, icon and position come from `DOCS_SECTION_CONFIG` in `src/content/docs.ts`, and pages within a section sort by frontmatter `order`, then slug. Pages named `index.mdx` stay routable but are left out of the sidebar. When a page moves, add its old path to `MOVED_DOCS_PATHS` in `src/lib/docs/moved-docs-paths.ts`; `scripts/generate-redirects.test.ts` checks that every old path lands on an existing page.

Fenced code blocks get a Copy button from `rehype-pretty-code` and `transformerCopyButton`. `src/mdx/rehype-pretty-copy-compatibility.ts` moves the button next to the `pre` inside its figure, and the click handler lives in `src/layouts/base-layout/code-copy.ts`, registered by the base layout script. The button text changes to Copied or Try again for 1.2 s while its accessible name stays "Copy code"; the result is announced through the visually hidden `role="status"` region that `BaseLayout` renders at the end of every page body, so it survives browser-router navigation. `src/mdx/rehype-heading-ids.ts` gives headings build-time ids so `#fragment` links land correctly. Previous and next links render on the server from `src/layouts/docs-layout/components/docs-pagination`.

`pnpm --filter radiant-docs test` runs the Node and browser (Chromium) Vitest projects; `test:e2e` builds and checks the site.

## Agent-facing exports

`pnpm --filter radiant-docs generate:llms` (also run by `dev`, `build` and `preview`) writes `llms.txt` and one raw-MDX text export per page under `src/public/llms-content/`. The export tree is generator-owned and staged before replacement, so a failed generation preserves the previous complete tree. `ECOPAGES_BASE_URL` is the canonical origin for configuration, generated links, and page metadata.

Server-rendered catalog views do not register their custom elements in the browser. A docs example that uses a behavior host must import its package in a client script. The [controller decorator visualizer](./src/components/controller-decorator-visualizer/README.md) shows this boundary and tests native radio exclusivity after hydration.

## Deployment

The build writes public files to `apps/docs/dist/client` and private server files to `dist/server`. Configure the Cloudflare Pages build output directory as `apps/docs/dist/client` when the repository root is the build root (or `dist/client` when this app is the build root).

The build also writes `dist/client/_redirects` from `src/lib/docs/moved-docs-paths.ts`. Cloudflare Pages reads it and answers every docs URL from before the section-folder move with a 301 to the page's current URL.
