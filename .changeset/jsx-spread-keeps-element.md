---
'@ecopages/jsx': patch
---

Keep an element when the set of attributes it binds changes. `<input {...attrs} />` used to be replaced whenever `attrs` gained or lost a key (or a value became `undefined`), because the template shape named every bound attribute: focus, caret and anything attached to the node were lost. The renderer now reuses an element with the same tag and child slots and sets, removes and rebinds its attributes, properties and listeners in place; a dropped `prop:` binding is assigned `undefined`. A different tag or a different number of children still replaces the element. Templates that bind the same attributes take the same path as before.
