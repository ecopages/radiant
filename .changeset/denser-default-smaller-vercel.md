---
'@ecopages/radiant-ui': minor
'@ecopages/radiant-themes': minor
---

Radiant Default is close to the Zed theme's density, one step larger on the controls: 28, 32, and 36px controls (was 32, 40, and 48px), 14px control text, 10px by 4px control padding, and the 4px-base spacing scale, so control rows are compact inside evenly spaced layouts while hit areas stay well above the 24px WCAG 2.2 minimum. `--rui-density` still scales the sizes and the spacing together. The Vercel theme is also one size step smaller: 28, 32, and 40px controls with 13px control text and trimmed menu, tab, and tooltip padding; its colors, borders, and radii are unchanged.

The `@ecopages/radiant-ui/tokens/spacing/comfortable` pack keeps the earlier 32/40/48px controls, and every other complete theme in `@ecopages/radiant-themes` imports it, so their sizes do not change. Import it after `themes/default` to restore the earlier Radiant Default density. The `compact` and `wide` packs are unchanged.
