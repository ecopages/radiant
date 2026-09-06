---
'@ecopages/jsx': patch
---

Keep fragment hydration subscriptions owned through unmount, preserve keyed fragment identity when every child has a key, render `textarea`/`title`/`style`/`script` children as character data without clobbering unchanged textarea edits, and consume generator children once on mount and hydrate.
