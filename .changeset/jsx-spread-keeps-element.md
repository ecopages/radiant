---
'@ecopages/jsx': patch
---

Keep an element when the set of attributes it binds changes. `<input {...attrs} />` used to be replaced whenever `attrs` gained or lost a key (or a value became `undefined`), because the template shape named every bound attribute: focus, caret and anything attached to the node were lost. The renderer now reuses an element with the same tag and child slots and sets, removes and rebinds its attributes, properties and listeners in place; a dropped `prop:` binding is assigned `undefined`. A different tag or a different number of children still replaces the element. Templates that bind the same attributes take the same path as before. As in React, same-tag elements swapped at the same position (such as a ternary) are now reused; give them distinct `key`s when they must be different nodes. Migration: add a distinct `key` to same-tag elements that you swap at one position and that must stay separate nodes.

Things to check when upgrading:

- On a custom element most names are property bindings by default, so a key a spread drops now sets `el.<key> = undefined` on the kept element, where the element used to be recreated with its `@prop` defaults.
- Reuse also crosses component boundaries: two different function components that render the same root tag at the same position share the node, where React would remount. Give such elements distinct `key`s.
- JSX-attached native listeners are registered through a wrapper per binding, so `el.removeEventListener(type, handler)` with your own function no longer removes a listener that JSX attached. Remove it by changing the JSX instead.
