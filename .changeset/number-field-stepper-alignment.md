---
'@ecopages/radiant-ui': patch
---

Fix the number field's value and steppers sitting off the center line, most visibly in a field that is sized smaller than the default control. The group now owns the control height and the input fills it, so a caller that sets the group's height no longer clips an input that insisted on its own taller minimum. The increment and decrement steppers now draw a plus and a minus icon (`RuiIconPlus` and `RuiIconMinus`, also exported from `@ecopages/radiant-ui/icons`) instead of the text characters `+` and `-`, whose vertical position followed the font's metrics. A stepper that is given its own children is unchanged.
