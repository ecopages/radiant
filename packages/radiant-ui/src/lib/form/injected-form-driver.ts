import type { FormDriver } from './form-driver';
import type { FormStateStore, NativeValidity } from './form-state-store';
import type { FieldError, FieldRegistration, FieldRegistrationHandle, FieldValues, RegisterOptions } from './types';

/**
 * Structural equality for control values; at the top level `null` and `undefined`
 * both mean "no value".
 *
 * @remarks Inside arrays and objects the two differ and a missing key differs from
 * a key holding `null`. Dates compare by time. Any other non-plain object compares
 * by identity, so it is rewritten rather than wrongly treated as equal.
 */
function isSameValue(a: unknown, b: unknown): boolean {
	return (a == null && b == null) || isSameNested(a, b);
}

function isSameNested(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) {
		return true;
	}
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((item, i) => isSameNested(item, b[i]))
		);
	}
	if (a instanceof Date || b instanceof Date) {
		return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
	}
	return isSameRecord(a, b);
}

function isSameRecord(a: unknown, b: unknown): boolean {
	if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
		return false;
	}
	if (!isPlainObject(a) || !isPlainObject(b)) {
		return false;
	}
	const keys = Object.keys(a);
	return (
		keys.length === Object.keys(b).length &&
		keys.every((key) => Object.hasOwn(b, key) && isSameNested(Reflect.get(a, key), Reflect.get(b, key)))
	);
}

function isPlainObject(value: object): boolean {
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

type BoundField = {
	registration: FieldRegistration;
	/** The path the control is bound to; it changes on rename. */
	name: string;
	live: boolean;
	/** The store value at `name` the last time this driver looked. */
	lastSeen?: unknown;
	/** What the control read right after this driver last synchronised it with the store. */
	baseline?: unknown;
	/** True while this driver writes the control, so events that write raises are not user changes. */
	writing?: boolean;
};

/**
 * Bridges a host {@link FormStateStore} to the form's controls. It owns control
 * registration, the control value bridge and native validity, and keeps no
 * touched, dirty or submitted state: the store owns validation timing, field
 * state and which errors show.
 *
 * @remarks Field `rules`, `resolver`, `defaultValue`, `defaultValues`, `mode` and
 * `revalidate-mode` are ignored here. Native validity is pushed to the store with
 * `reportNative` whenever a control's value or presence changes. The store
 * subscription lives only while the driver has a listener, so a disconnected form
 * does not keep the host store alive.
 */
export class InjectedFormDriver implements FormDriver {
	private readonly fields = new Map<string, BoundField>();
	private readonly pendingFactReports = new Set<BoundField>();
	private readonly withdrawnPaths = new Set<string>();
	private reportQueued = false;
	private readonly listeners = new Set<() => void>();
	private revision = 0;
	private unsubscribeStore: (() => void) | undefined;
	private resetTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly state: FormStateStore) {}

	get errors(): Partial<Record<string, FieldError>> {
		return this.state.getSnapshot().errors;
	}

	get warnings(): Partial<Record<string, FieldError>> {
		return this.state.getSnapshot().warnings;
	}

	getRevision(): number {
		return this.revision;
	}

	subscribe(listener: () => void): () => void {
		if (this.listeners.size === 0) {
			this.unsubscribeStore = this.state.subscribe(() => {
				this.syncControls();
				this.bump();
			});
			this.syncControls();
		}
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
			if (this.listeners.size === 0) {
				this.unsubscribeStore?.();
				this.unsubscribeStore = undefined;
			}
		};
	}

	private bump(): void {
		this.revision += 1;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	/**
	 * Write a path's store value into its control, but only when the store value
	 * changed since this driver last saw it (or `force` is set, as on reset).
	 * A forced pass reports every control's fact again, because a reset clears the
	 * facts the store holds.
	 *
	 * @remarks Comparing with the last seen store value, not only with the control,
	 * keeps an unrelated store notification, such as a `setErrors` call or another
	 * field's validation, from reverting input a control holds but has not yet
	 * committed. A control's own write reaches the store and then equals the store
	 * value, so it is never echoed back.
	 */
	private syncControls(force = false): void {
		for (const [name, entry] of this.fields) {
			const next = this.state.getValue(name);
			const changed = !isSameValue(next, entry.lastSeen);
			entry.lastSeen = next;
			if (!force && !changed) {
				continue;
			}
			const held = entry.registration.getValue();
			let unreported = force;
			if (isSameValue(next, held)) {
				unreported ||= !isSameValue(held, entry.baseline);
				entry.baseline = held;
			} else {
				this.writeToControl(entry, next);
				unreported = true;
			}
			if (unreported) {
				this.scheduleFactReport(entry);
			}
		}
	}

	/**
	 * Report a control's fact when it is seeded and whenever the store's value at its
	 * path changes, whether or not the control had to be written.
	 *
	 * @remarks A store write is not a user change, and an untouched control has never
	 * reported, so nothing else tells the store what the control says about the value
	 * it holds: `setValue('email', 'not-an-email')` would otherwise leave
	 * `typeMismatch` unreported. The report runs after the notification that wrote
	 * the control, not inside it, and one call carries every fact queued meanwhile. A
	 * control that was removed or renamed in the meantime is skipped.
	 */
	private scheduleFactReport(entry: BoundField): void {
		this.pendingFactReports.add(entry);
		this.queueReport();
	}

	/**
	 * Withdraw the fact at a path whose control left it, unless another live control
	 * is bound there when the report runs.
	 *
	 * @remarks The check runs at flush time so a row that moves, which leaves one
	 * path and arrives at another in the same task, does not withdraw the fact of the
	 * control that took its place.
	 */
	private scheduleWithdrawal(path: string): void {
		this.withdrawnPaths.add(path);
		this.queueReport();
	}

	private queueReport(): void {
		if (this.reportQueued) {
			return;
		}
		this.reportQueued = true;
		queueMicrotask(() => {
			this.reportQueued = false;
			const entries = [...this.pendingFactReports];
			const withdrawn = [...this.withdrawnPaths];
			this.withdrawnPaths.clear();
			this.pendingFactReports.clear();
			try {
				const facts: Record<string, NativeValidity | null> = {};
				for (const path of withdrawn) {
					if (!this.fields.has(path)) {
						facts[path] = null;
					}
				}
				for (const entry of entries) {
					if (entry.live && this.fields.get(entry.name) === entry) {
						try {
							facts[entry.name] = this.factOf(entry);
						} catch (error) {
							reportError(error);
						}
					}
				}
				if (Object.keys(facts).length > 0) {
					this.state.reportNative(facts);
				}
			} catch (error) {
				reportError(error);
			}
		});
	}

	getRegisteredFieldNames(): string[] {
		return Array.from(this.fields.keys());
	}

	register(registration: FieldRegistration): FieldRegistrationHandle {
		const entry: BoundField = { registration, name: registration.name, live: true };
		this.fields.set(entry.name, entry);
		this.seed(entry);
		return {
			rename: (name) => this.renameEntry(entry, name),
			unregister: () => this.removeEntry(entry),
			refresh: () => this.refreshEntry(entry),
		};
	}

	/** Write the store's value at the entry's path into its control, even when the store holds nothing. */
	private seed(entry: BoundField): void {
		const value = this.state.getValue(entry.name);
		entry.lastSeen = value;
		this.writeToControl(entry, value);
		this.scheduleFactReport(entry);
	}

	/**
	 * Write `value` into a control and take its read-back as the baseline.
	 *
	 * @remarks A control does not always read back what it was given: an empty text
	 * input reads `''` after it is given `undefined`. Taking the read-back is how
	 * the driver tells a control the user changed from one it only synchronised.
	 */
	private writeToControl(entry: BoundField, value: unknown): void {
		entry.writing = true;
		try {
			entry.registration.setValue(value);
		} finally {
			entry.writing = false;
		}
		entry.baseline = entry.registration.getValue();
	}

	/** Seed a control that appeared after its registration, and report its fact. */
	private refreshEntry(entry: BoundField): void {
		if (entry.live) {
			this.seed(entry);
		}
	}

	private removeEntry(entry: BoundField): void {
		if (!entry.live) {
			return;
		}
		entry.live = false;
		if (this.fields.get(entry.name) === entry) {
			this.fields.delete(entry.name);
		}
		this.scheduleWithdrawal(entry.name);
		this.bump();
	}

	/**
	 * @remarks The store owns values, so a rename never writes one: the control is
	 * rebound to the new path and seeded from the store, even when the store holds
	 * nothing there. Deleting the old path is the host's decision.
	 */
	private renameEntry(entry: BoundField, to: string): void {
		if (!entry.live || entry.name === to) {
			return;
		}
		const from = entry.name;
		if (this.fields.get(from) === entry) {
			this.fields.delete(from);
		}
		entry.name = to;
		this.fields.set(to, entry);
		this.scheduleWithdrawal(from);
		this.seed(entry);
		this.bump();
	}

	updateFieldOptions(_name: string, _options: RegisterOptions): void {}

	/** The store decides which errors show, so every error in the snapshot is presented. */
	shouldDisplayFieldError(name: string): boolean {
		return Object.hasOwn(this.errors, name);
	}

	/**
	 * The control's validity as a fact, or `null` when it reports valid.
	 *
	 * @remarks Reads `validity` data only; it never calls `checkValidity()`, which
	 * fires an `invalid` event.
	 */
	private factOf(entry: BoundField): NativeValidity | null {
		const validity = entry.registration.getValidity?.();
		if (!validity || validity.valid) {
			return null;
		}
		return {
			type: validity.type ?? 'customError',
			params: validity.params,
			message: validity.message || undefined,
		};
	}

	/**
	 * The current fact of every registered control, `null` for a valid one.
	 *
	 * @remarks A control whose validity read throws is reported with `reportError` and
	 * left out, so it does not hold back the other facts.
	 */
	private factsOfAll(): Record<string, NativeValidity | null> {
		const facts: Record<string, NativeValidity | null> = {};
		for (const [name, entry] of this.fields) {
			try {
				facts[name] = this.factOf(entry);
			} catch (error) {
				reportError(error);
			}
		}
		return facts;
	}

	/** Whether the user changed a control since the driver last synchronised it. */
	private isChanged(entry: BoundField): boolean {
		return !entry.writing && !isSameValue(entry.registration.getValue(), entry.baseline);
	}

	/** Write a control's value into the store and take it as the new baseline. */
	private writeControlValue(name: string, entry: BoundField): void {
		const value = entry.registration.getValue();
		const previous = entry.baseline;
		entry.baseline = value;
		try {
			this.state.setValue(name, value);
		} catch (error) {
			entry.baseline = previous;
			throw error;
		}
	}

	/**
	 * Write a control the user changed, then report its fact for the value it holds.
	 *
	 * @remarks A report the store rejects goes to `reportError`, so the write that
	 * already landed is not undone and a following `blur` still runs.
	 */
	private pushUserChange(name: string, entry: BoundField): void {
		this.writeControlValue(name, entry);
		try {
			this.state.reportNative({ [name]: this.factOf(entry) });
		} catch (error) {
			reportError(error);
		}
	}

	/**
	 * Write every control the user changed into the store, then report every
	 * control's fact, as submit needs.
	 *
	 * @remarks The comparison is with the control's own baseline, not with the
	 * store, so a sync writes only what the user changed. Comparing with the store
	 * would write an untouched empty text input, which reads `''`, over a store
	 * value of `undefined`, marking it dirty and dropping its server error.
	 */
	sync(): void {
		for (const [name, entry] of this.fields) {
			if (this.isChanged(entry)) {
				this.writeControlValue(name, entry);
			}
		}
		this.state.reportNative(this.factsOfAll());
	}

	async handleFieldChange(name: string): Promise<void> {
		const entry = this.fields.get(name);
		if (!entry || entry.writing) {
			return;
		}
		this.pushUserChange(name, entry);
		this.bump();
	}

	async handleFieldBlur(name: string): Promise<void> {
		const entry = this.fields.get(name);
		if (!entry) {
			return;
		}
		if (this.isChanged(entry)) {
			this.pushUserChange(name, entry);
		}
		this.state.blur(name);
		this.bump();
	}

	/** Validate through the store; the form calls {@link InjectedFormDriver.sync} first. */
	async handleSubmit(
		onValid: (values: FieldValues) => void | Promise<void>,
		onInvalid?: (errors: Partial<Record<string, FieldError>>, error?: unknown) => void,
	): Promise<void> {
		let valid: boolean;
		try {
			valid = await this.state.validate();
		} catch (error) {
			this.bump();
			onInvalid?.(this.state.getSnapshot().errors, error);
			return;
		}
		this.bump();
		const snapshot = this.state.getSnapshot();
		if (valid) {
			await onValid(snapshot.values);
			return;
		}
		onInvalid?.(snapshot.errors);
	}

	/**
	 * Cancel pending writes; call before leaving the store.
	 */
	dispose(): void {
		clearTimeout(this.resetTimer);
		this.pendingFactReports.clear();
		this.withdrawnPaths.clear();
	}

	/**
	 * Reset the store and rewrite the controls from it, again after the current task.
	 */
	reset(): void {
		this.state.reset();
		this.syncControls(true);
		this.resyncAfterNativeReset();
		this.bump();
	}

	/**
	 * Let the host reset its own state, then rewrite the controls from the store.
	 *
	 * @remarks The handler may be async, so the controls are rewritten once it settles
	 * and again after the browser's own reset.
	 */
	async resetThrough(handler: () => void | Promise<void>): Promise<void> {
		this.resyncAfterNativeReset();
		try {
			await handler();
		} finally {
			this.syncControls(true);
			this.bump();
		}
	}

	/**
	 * Write the store values into the controls once more after the current task.
	 *
	 * @remarks The `reset` event fires before the browser resets the form's controls
	 * to their default attributes, which would overwrite the values just restored.
	 */
	private resyncAfterNativeReset(): void {
		clearTimeout(this.resetTimer);
		this.resetTimer = setTimeout(() => {
			this.syncControls(true);
			this.bump();
		}, 0);
	}
}
