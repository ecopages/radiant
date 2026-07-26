/** Vite-resolved module URL stamped on RadiantElement constructors (`.script` modules). */
export const RADIANT_SCRIPT_MODULE = Symbol.for('@ecopages/storybook-radiant.scriptModule');

/** Export name stamped alongside {@link RADIANT_SCRIPT_MODULE}. */
export const RADIANT_SCRIPT_EXPORT = Symbol.for('@ecopages/storybook-radiant.scriptExport');

/** Vite-resolved module URL stamped on JSX view exports (`defineRadiantView`). */
export const RADIANT_VIEW_MODULE = Symbol.for('@ecopages/storybook-radiant.viewModule');

/** Vite-resolved module URL stamped on CSF story files (`*.stories.*`). */
export const RADIANT_STORY_MODULE = Symbol.for('@ecopages/storybook-radiant.storyModule');

/** RadiantElement constructor linked from a JSX view used as `meta.component`. */
export const RADIANT_VIEW_ELEMENT = Symbol.for('@ecopages/storybook-radiant.viewElement');
