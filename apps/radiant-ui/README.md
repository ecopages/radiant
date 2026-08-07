# Radiant UI Docs

The Radiant UI documentation application has a standalone landing page at `/` and documentation pages under `/docs` and `/components`. Documentation pages use the shared docs shell with component navigation and an automatically refreshed table of contents.

## Local development

```bash
pnpm --filter @ecopages/radiant-ui-docs dev
```

`src/components/component-workbench` owns the interactive Button example shown on the landing page and Button reference page. Keep its controls keyboard-accessible and use Radiant UI primitives for component previews so the workbench remains a real integration, not a static imitation.
