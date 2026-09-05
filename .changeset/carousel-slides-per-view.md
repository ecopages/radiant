---
'@ecopages/radiant-ui': minor
---

Add `slidesPerView` and `slidesPerGroup` so a carousel can show a window of slides.

**@ecopages/radiant-ui**

- `slides-per-view` (`>= 1`, fractional peek allowed) is how many slides fill the viewport. `index` is the first visible slide.
- `slides-per-group` is how far prev/next/autoplay/swipe move. A window of more than one slide paints separate cards; a single pane keeps chrome on the viewport.
- Card gap, radius, border, fill, and padding are `--rui-carousel-*` custom properties with theme-token defaults. Override them on `rui-carousel`.
