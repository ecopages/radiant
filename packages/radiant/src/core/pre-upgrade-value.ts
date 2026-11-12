/**
 * Internal hook a host exposes so decorators can ask whether a value was assigned to it before upgrade.
 *
 * @remarks Symbol-keyed so it stays off the public host API. `@prop` adopts such a value; `@state` and `@signal`
 * only use the answer to warn in development.
 */
export const HAS_PRE_UPGRADE_VALUE = Symbol.for('@ecopages/radiant.has-pre-upgrade-value');
