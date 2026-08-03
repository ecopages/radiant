/**
 * `true` in server environments like Node when the `"node"` export condition is active;
 * `false` in browser environments.
 *
 * @remarks
 * Prefer this over `typeof window` when skipping browser-only work during SSR.
 * Radiant's light-DOM shim defines `window` / `document`, so environment checks
 * based on globals are unreliable.
 */
export const isServer = false;
