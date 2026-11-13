# Radiant Docs

This documentation application serves as a comprehensive guide to the functionalities and operations of @ecopages/radiant.

It encompasses valuable information detailing its usage and provides a thorough explanation of its working mechanisms.

The aim is to offer users a clear understanding of how to effectively utilize @ecopages/radiant and leverage its capabilities to their full extent.

The default Open Graph and Twitter preview is `src/public/assets/images/default-og.png`. It uses the site logo, Karla heading font, and the homepage hook; `src/lib/docs/site-meta.ts` supplies its public URL when a page has no custom image.

## Docs shell

Fenced code blocks get a Copy button from `rehype-pretty-code` and `transformerCopyButton`. `src/mdx/rehype-pretty-copy-compatibility.ts` moves the button next to the `pre` inside its figure, and the click handler lives in `src/layouts/base-layout/code-copy.ts`, registered by the base layout script. The button text changes to Copied or Try again for 1.2 s while its accessible name stays "Copy code"; the result is announced through the visually hidden `role="status"` region that `BaseLayout` renders at the end of every page body, so it survives browser-router navigation. `src/mdx/rehype-heading-ids.ts` gives headings build-time ids so `#fragment` links land correctly. Previous and next links render on the server from `src/layouts/docs-layout/components/docs-pagination`.

`pnpm --filter radiant-docs test` runs the Node and browser (Chromium) Vitest projects; `test:e2e` builds and checks the site.

## Agent-facing exports

`pnpm --filter radiant-docs generate:llms` (also run by `dev`, `build` and `preview`) writes `llms.txt` and one raw-MDX text export per page under `src/public/llms-content/`. The export tree is generator-owned and staged before replacement, so a failed generation preserves the previous complete tree. `ECOPAGES_BASE_URL` is the canonical origin for configuration, generated links, and page metadata.

Server-rendered catalog views do not register their custom elements in the browser. A docs example that uses a behavior host must import its package in a client script. The [controller decorator visualizer](./src/components/controller-decorator-visualizer/README.md) shows this boundary and tests native radio exclusivity after hydration.

## Deployment

The build writes public files to `apps/docs/dist/client` and private server files to `dist/server`. Configure the Cloudflare Pages build output directory as `apps/docs/dist/client` when the repository root is the build root (or `dist/client` when this app is the build root).
