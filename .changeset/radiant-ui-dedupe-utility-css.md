---
'@ecopages/radiant-ui': patch
---

Stop repeating `@utility` output once per component in the built `styles.css`. `styles.css` shrinks from 241,873 B to 202,740 B (about 16%) and each `.rui-button--*` rule carries one `background-image: none` instead of 61.

In forced-colors mode the sheen is now removed as `sheen.css` intends; the old output let the `background-image` declaration override the `none` override.
