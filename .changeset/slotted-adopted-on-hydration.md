---
'@ecopages/radiant': patch
---

A server-rendered host sends its Authored Children once, inside its view, between `<!--radiant-slotted-->` comments, and the client adopts those same nodes before its first render instead of rebuilding copies from a JSON payload. Children the server-time view does not place travel in an inert `<template data-radiant-slotted>`. The `data-radiant-slot-projection` script is gone.
