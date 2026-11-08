import { state } from '@ecopages/signals';
import { createSubscribableJsxValue } from '../../src/index.ts';

const cls = state('danger');
const flags = state<Record<string, boolean>>({ selected: true });
const label = createSubscribableJsxValue({ getValue: () => 'item', subscribe: () => () => undefined });

export const plainClass = <p class="card" />;
export const signalClasses = <tr classes={cls} />;
export const listClasses = <p classes={['card', { active: true }]} />;
export const mapClasses = <p classes={{ card: true, active: false }} />;
export const signalMapClasses = <li class="item" classes={flags} />;
export const subscribableClasses = <p classes={label} />;

// @ts-expect-error class is a plain string; a signal goes in classes
export const signalClass = <tr class={cls} />;
