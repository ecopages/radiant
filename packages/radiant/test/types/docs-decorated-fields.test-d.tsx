/**
 * Type-level check that the decorated fields shown in the docs compile with
 * standard decorators and full strict mode.
 *
 * @remarks
 * Checked by `tsc --noEmit -p test/types/tsconfig.json`, which turns
 * `strictPropertyInitialization` back on, not by the vitest run. The classes are
 * the `@prop`, `@attr` and `@signal` examples from `apps/docs`, with package
 * imports replaced by source paths. A `declare` field fails here with TS1206, a
 * bare field with TS2564.
 */
import { State, type WritableSignal } from '@ecopages/signals';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';

@customElement('user-card')
export class UserCard extends RadiantElement {
	@prop({ type: String }) name!: string;
	@prop({ type: Number, defaultValue: 0 }) visits!: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) active!: boolean;
}

@customElement('status-pill')
export class StatusPill extends RadiantElement {
	@attr({ source: 'data-status' }) status?: string;
	@attr({ source: 'aria-label' }) label?: string;

	override render() {
		return <span>{this.status ?? 'unknown'}</span>;
	}
}

const sharedCount = new State(0);

@customElement('shared-counter')
export class SharedCounter extends RadiantElement {
	@signal({ source: sharedCount }) count!: WritableSignal<number>;
	@signal({ initial: 'idle' }) status!: WritableSignal<string>;
}
