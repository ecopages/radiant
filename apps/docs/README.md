# Radiant Docs

This documentation application serves as a comprehensive guide to the functionalities and operations of @ecopages/radiant.

It encompasses valuable information detailing its usage and provides a thorough explanation of its working mechanisms.

The aim is to offer users a clear understanding of how to effectively utilize @ecopages/radiant and leverage its capabilities to their full extent.

## Mermaid diagrams

Mermaid code fences are converted to static SVG images during the docs build with `rehype-mermaid`. Playwright is a build-only dependency; it is not sent to visitors and does not render diagrams in the browser. A fresh environment needs the Chromium binary before building:

```sh
pnpm exec playwright install chromium
```
