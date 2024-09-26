---
"@ecopages/radiant": patch
---

- added propertyConfigMap and updatesRegistry to keep a more detailed overview of the element.
- Removed the prefixed property and just kept the base one to simplify the code in @reactiveProp
- Added observedAttributes to keep track of the dom changes happening via setAttribute
