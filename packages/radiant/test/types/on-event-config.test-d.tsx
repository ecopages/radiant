/**
 * `OnEventConfig` takes exactly one target.
 *
 * @remarks Typecheck only. A config with two targets would attach both listeners, so a
 * `host` listener next to a `selector` would fire for every event on the host.
 */
import type { OnEventConfig } from '../../src/decorators/on-event';

export const hostConfig: OnEventConfig = { host: true, type: 'pointerenter', options: { passive: true } };
export const selectorConfig: OnEventConfig = { selector: '[data-item]', type: 'click' };
export const mediaQueryConfig: OnEventConfig = { mediaQuery: '(min-width: 40rem)', type: 'change' };

// @ts-expect-error host and selector are exclusive
export const hostAndSelector: OnEventConfig = { host: true, selector: '[data-item]', type: 'click' };
// @ts-expect-error host and window are exclusive
export const hostAndWindow: OnEventConfig = { host: true, window: true, type: 'click' };
// @ts-expect-error selector and ref are exclusive
export const selectorAndRef: OnEventConfig = { selector: '[data-item]', ref: 'item', type: 'click' };
// @ts-expect-error a target is required
export const noTarget: OnEventConfig = { type: 'click' };
