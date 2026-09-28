/**
 * `true` when the `"node"` export condition is active; `false` in browser builds.
 *
 * @remarks
 * Prefer this over `typeof window !== 'undefined'` or `typeof document !== 'undefined'`
 * when skipping browser-only work during SSR. Radiant's light-DOM shim defines `window`
 * and `document` on `globalThis`, so environment checks based on globals are unreliable.
 * Top-level event listeners on `document` or `window` (such as navigation or layout listeners)
 * should always be guarded with `!isServer` to prevent dead listeners on the server.
 * Node tests with a browser-like DOM still resolve `isServer` as `true`. Use a DOM
 * capability check when behavior depends on the available DOM implementation.
 */
export const isServer = false;
