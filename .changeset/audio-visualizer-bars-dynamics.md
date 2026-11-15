---
'@ecopages/radiant-ui': patch
---

The `bars` preset can now leave gaps inside the sound. New options shape a band's level: `floorLevel` (the analyser level at or below which a band is off), `range`, `curve` and `adapt` (scale against a decaying running maximum); the defaults keep the level as it was. Two defaults change for segmented canvas bars (`segments`): they no longer apply `floor` while playing, so a band that is off lights no segment, where it used to light at least two of 14, and a peak cap is not drawn on an empty bar. `idle: 'floor'` now rests segmented bars as one dim lowest segment instead of the `floor` height.

The canvas bars also take a `variant`: `led` (the default when `segments` is set), `solid` (rounded tops), `line` (hairlines, with `lineWidth`) and `mirror` (grows up and down from the middle). They share the level shaping, have no minimum height, and rest as nothing or one dim hairline with `idle: 'floor'`; without `variant` the bars look as before.
