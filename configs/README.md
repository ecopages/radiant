# Shared TypeScript configuration

`tsconfig.base.json` contains the compiler options shared by all workspaces.

Individual `tsconfig` files own their target runtime, libraries, types, aliases, source selection, and build output. Keep the base small: TypeScript replaces object and array options such as `paths`, `lib`, `types`, `include`, and `exclude` rather than merging them.
