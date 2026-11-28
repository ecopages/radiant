---
'@ecopages/radiant-ui': patch
---

Fix `RuiInput` with a `mask`, and add the unmasked value to the mask helpers.

- A character typed in the middle of a masked value no longer drops the digits after it: typing `9` after `(55` in `(555) 123-4567` gives `(559) 512-3456`, and the caret stays after the `9`. A paste is read the same way, skipping what fits no slot and dropping what overflows the last one.
- Backspace over a literal, such as the space in `(555) 123`, deletes the digit before it, and Delete before a literal deletes the digit after it.
- `RuiInput` takes `definitions` for custom slot characters.
- An authored `placeholder` wins over the one the mask gives, and an authored `inputmode` is kept, with or without a mask; `numeric` is set only when every slot is a digit.
- `applyInputMask` reads raw text the same way, and a literal inside an optional section, such as the `-` of `000[-00]`, shows only once the section is entered.
- New `extractUnmaskedValue(masked, tokens)` and `formatUnmaskedValue(unmasked, tokens)` read and write the value IMask calls unmasked: the slot characters and the `{text}` fixed text, in order. `extractMaskInput` still returns the slot characters only, and its documentation now says so.
