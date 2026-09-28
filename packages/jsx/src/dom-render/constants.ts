/** Comment marker prefix that denotes the start of a dynamic child range in a compiled template blueprint. */
export const CHILD_BINDING_START_PREFIX = 'radiant-jsx-child-start:';

/** Comment marker prefix that denotes the end of a dynamic child range in a compiled template blueprint. */
export const CHILD_BINDING_END_PREFIX = 'radiant-jsx-child-end:';

/**
 * Locator attribute written onto text-content elements during blueprint compilation.
 *
 * Chromium parses HTML comments as literal text inside `textarea`, `title`, `style`,
 * and `script`, so those child bindings cannot use comment anchors. The locator is
 * stripped from the compiled blueprint before clones or hydration see it.
 */
export const TEXT_CONTENT_LOCATOR_PREFIX = 'data-radiant-jsx-text-';
