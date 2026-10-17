---
'@ecopages/radiant': patch
---

Slot projection payloads no longer include the data of comment nodes. The payload is turned into markup on the client, and comment data was written into it unescaped.
