# Radiant Docs

This documentation application serves as a comprehensive guide to the functionalities and operations of @ecopages/radiant.

It encompasses valuable information detailing its usage and provides a thorough explanation of its working mechanisms.

The aim is to offer users a clear understanding of how to effectively utilize @ecopages/radiant and leverage its capabilities to their full extent.

## Agent-facing exports

`pnpm --filter radiant-docs generate:llms` writes `llms.txt` and one raw-MDX text export per page under `src/public/llms-content/`. The export tree is generator-owned and staged before replacement, so a failed generation preserves the previous complete tree. `ECOPAGES_BASE_URL` is the canonical origin for configuration, generated links, and page metadata.
