---
'@ecopages/radiant': patch
---

`registerSsrPreparationCallback` and `runSsrPreparationCallbacks` take a named phase instead of a boolean: `'beforeOnUpdated'` where you passed `true`, and `'afterOnUpdated'`, which is the default, where you passed `false` or nothing. Add the `'beforeAuthoredChildren'` phase, whose callbacks run before a host's Authored Children are built, so descendants can read context published from host props. The SSR bridge and `renderComponent` run it. Export the `SsrPreparationPhase` type from `@ecopages/radiant` and `resolveSsrContextValue` from `@ecopages/radiant/context`.
