---
'@ecopages/jsx': minor
'@ecopages/radiant': patch
---

Server-rendered Radiant hosts now receive their JSX children as light-DOM nodes rather than an HTML string that the minimal DOM parses back. Text and attribute values are never escaped and re-parsed, and `<style>` children keep their CSS (the string path escaped `>` and `&` inside it).

New in jsx:

- **`renderServerLightDom(value, ownerDocument)`** is exported from `@ecopages/jsx/server`.
- **Text-only element helpers** for `script`, `style`, `textarea` and `title` now live in a DOM-free module that the server and the client share.
