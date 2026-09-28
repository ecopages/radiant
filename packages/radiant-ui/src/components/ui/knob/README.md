# Knob

`rui-knob` is a form-associated host with view-owned light DOM. The host submits its clamped numeric value when named. Native reset restores the initial `value`, including when the name is assigned after the first connect. `formState()` stores that value separately from the submission value, which is `null` while unnamed.

The host's own `disabled` prop and ancestor fieldset disability both drive the inner control through `effectiveDisabled`; fieldset disability does not write the host's `disabled` attribute. `RuiForm` validation uses its store. The knob does not set native constraint validity or handle browser state restoration.
