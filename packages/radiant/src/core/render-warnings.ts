import { warnOnceInDevelopment } from '../helpers/dev-warnings';
import type { ReactiveState } from './reactivity-contract';

const HOT_RENDER_COUNT = 30;
const HOT_RENDER_WINDOW_MS = 1000;

const classIds = new WeakMap<object, number>();
let classCount = 0;

function classIdOf(host: object): number {
	const constructor = host.constructor;
	let id = classIds.get(constructor);

	if (id === undefined) {
		id = ++classCount;
		classIds.set(constructor, id);
	}

	return id;
}

function describeHost(host: object): string {
	const { localName, element } = host as { localName?: string; element?: { localName?: string } };

	if (localName) {
		return `<${localName}>`;
	}

	return `${host.constructor.name}${element?.localName ? ` on <${element.localName}>` : ''}`;
}

/**
 * Development-only diagnostics for whole-render reads, one instance per host.
 *
 * @remarks
 * A tracked render knows it was invalidated, not by which member, so attribution is the intersection of two
 * facts the host already has: the members that changed since the last render, and the members the previous
 * `render()` read through their accessors. A field in both re-ran the render. Two cases warn, once per class and
 * field: the field also patches a `this.$` Binding (the change does the work twice), or it re-ran the render
 * {@link HOT_RENDER_COUNT} times within {@link HOT_RENDER_WINDOW_MS} ms.
 *
 * The host creates this only behind its `process.env.NODE_ENV` guard, so a production build drops the class and
 * its text.
 */
export class RenderWarnings {
	private reads?: Set<string>;
	private lastReads?: ReadonlySet<string>;
	private readonly changed = new Set<string>();
	private readonly bindingSubscribers = new Map<string, number>();
	private readonly renderTimes = new Map<string, number[]>();

	constructor(private readonly host: object) {}

	public trackReads<Value>(name: string, read: () => Value): () => Value {
		return () => {
			this.reads?.add(name);
			return read();
		};
	}

	public noteChange(name: string): void {
		this.changed.add(name);
	}

	/** Counts the subscriptions a member's `this.$` Binding holds, which are the nodes it patches. */
	public observeBinding<Value>(
		name: string,
		source: Pick<ReactiveState<Value>, 'get' | 'subscribe'>,
	): Pick<ReactiveState<Value>, 'get' | 'subscribe'> {
		return {
			get: () => source.get(),
			subscribe: (notify) => {
				const unsubscribe = source.subscribe(notify);
				let active = true;
				this.bindingSubscribers.set(name, (this.bindingSubscribers.get(name) ?? 0) + 1);

				return () => {
					if (!active) return;
					active = false;
					this.bindingSubscribers.set(name, (this.bindingSubscribers.get(name) ?? 1) - 1);
					unsubscribe();
				};
			},
		};
	}

	/** Runs `render`, then attributes it to the fields that changed since the previous one and that it read. */
	public run<Value>(render: () => Value): Value {
		const previous = this.lastReads;
		const reads = new Set<string>();
		this.reads = reads;
		let value: Value;

		try {
			value = render();
		} finally {
			this.reads = undefined;
			this.lastReads = reads;
		}

		if (previous) {
			for (const name of this.changed) {
				if (previous.has(name)) this.attribute(name);
			}
		}

		this.changed.clear();
		return value;
	}

	private attribute(name: string): void {
		const host = describeHost(this.host);
		const prefix = `render:${classIdOf(this.host)}:${name}`;

		if ((this.bindingSubscribers.get(name) ?? 0) > 0) {
			warnOnceInDevelopment(
				`${prefix}:redundant`,
				() =>
					`[@ecopages/radiant] ${host} binds "${name}" with this.$.${name} and also reads it in render(), so a change patches the bound node and then re-renders the whole view. Use {this.$.${name}} where render() shows it and stop reading this.${name} directly, or drop the binding.`,
			);
			return;
		}

		const now = Date.now();
		const times = this.renderTimes.get(name) ?? [];
		this.renderTimes.set(name, times);
		times.push(now);

		if (times.length > HOT_RENDER_COUNT) {
			times.shift();
		}

		if (times.length === HOT_RENDER_COUNT && now - times[0]! <= HOT_RENDER_WINDOW_MS) {
			warnOnceInDevelopment(
				`${prefix}:hot`,
				() =>
					`[@ecopages/radiant] ${host} re-ran render() ${HOT_RENDER_COUNT} times within ${HOT_RENDER_WINDOW_MS}ms because "${name}" changed. Bind it with {this.$.${name}} so a change patches only its node instead of re-rendering the view.`,
			);
		}
	}
}
