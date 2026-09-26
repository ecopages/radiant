---
'@ecopages/radiant-ui': patch
---

`rui-date-input` commits the draft once per keystroke, focus move, or blur. Blurring no longer runs the leave and blur passes back to back, and completing a unit no longer rebuilds the segments twice. Focus reaches the next unit by the time `updateComplete` resolves, and a segment rebuild no longer pulls focus back after it has left the control.
