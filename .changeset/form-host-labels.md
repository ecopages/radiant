---
'@ecopages/radiant-ui': patch
---

`rui-slider`, `rui-knob`, `rui-number-field` and `rui-date-input` forward the labels associated with the host (`<label for="host-id">` outside a `rui-field`, or a `<label>` ancestor, through `FormAssociatedElement.labels`) to the `aria-labelledby` of the inner part that holds the role: each slider thumb, the knob control, the number-field text box and the date-input group. A range thumb keeps its own minimum or maximum name beside the label. The hosts add no role or ARIA state of their own. A label added after connect is picked up on the next focus. `rui-knob` also restores its value and dispatches `input` only when a drag is cancelled, as `rui-slider` does.
