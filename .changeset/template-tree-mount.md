---
'@ecopages/jsx': patch
---

Mounting nested JSX is faster: a template and the element templates nested in its child slots are built once per combination of shapes and then cloned whole, instead of being cloned and inserted one element at a time. Clearing or replacing every row of a keyed list empties it in one operation, and the factory no longer copies each element's props.
