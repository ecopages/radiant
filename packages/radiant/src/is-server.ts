/**
 * `true` in server environments like Node when the `"node"` export condition is active;
 * `false` in browser environments.
 *
 * @remarks
 * Prefer this over `typeof window !== 'undefined'` or `typeof document !== 'undefined'`
 * when skipping browser-only work during SSR. Radiant's light-DOM shim defines `window`
 * and `document` on `globalThis`, so environment checks based on globals are unreliable.
 * Top-level event listeners on `document` or `window` (such as navigation or layout listeners)
 * should always be guarded with `!isServer` to prevent dead listeners on the server.
 */
export const isServer = false;
