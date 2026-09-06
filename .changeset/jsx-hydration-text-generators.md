---
'@ecopages/jsx': patch
---

Keep fragment hydration subscriptions owned through unmount, preserve keyed fragment identity when every child has a key, render `textarea`/`title`/`style`/`script` children as character data without clobbering unchanged textarea edits, and snapshot one-shot generator children by iterator identity so mount, hydrate, and later renders can read them without a second consume.
