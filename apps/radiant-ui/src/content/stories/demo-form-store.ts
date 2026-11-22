import type { FieldError, FormStateStore, NativeValidity } from '@ecopages/radiant-ui/form';

type Tree = Record<string, unknown>;

function getPath(tree: unknown, path: string): unknown {
	return path
		.split('.')
		.reduce<unknown>((node, key) => (node && typeof node === 'object' ? Reflect.get(node, key) : undefined), tree);
}

function setPath(tree: Tree, path: string, value: unknown): Tree {
	const [head = '', ...rest] = path.split('.');
	const child = tree[head];
	const next =
		rest.length === 0
			? value
			: setPath(child && typeof child === 'object' ? { ...child } : {}, rest.join('.'), value);
	return { ...tree, [head]: next };
}

export type DemoStoreOptions = {
	initial: Tree;
	/** A rule per path: the message to show while the value is wrong, or nothing. */
	rules?: Record<string, (value: unknown) => string | undefined>;
	/** Advice per path; it shows but never blocks. */
	warnings?: Record<string, (value: unknown) => string | undefined>;
};

/**
 * A minimal `FormStateStore` for the docs. It shows an error only for a path the user
 * has changed or left, or after a validate; native validity is evidence it folds in.
 */
export function createDemoStore({ initial, rules = {}, warnings = {} }: DemoStoreOptions): FormStateStore {
	let values: Tree = initial;
	let facts: Record<string, NativeValidity> = {};
	const checked = new Set<string>();
	const listeners = new Set<() => void>();
	const problems = (path: string): FieldError | undefined => {
		const message = rules[path]?.(getPath(values, path));
		if (message) return { type: 'rule', message };
		const fact = facts[path];
		return fact ? { type: fact.type, params: fact.params, message: fact.message } : undefined;
	};
	const build = () => {
		const errors: Record<string, FieldError> = {};
		for (const path of checked) {
			const error = problems(path);
			if (error) errors[path] = error;
		}
		const advice: Record<string, FieldError> = {};
		for (const [path, check] of Object.entries(warnings)) {
			const message = check(getPath(values, path));
			if (message) advice[path] = { type: 'warning', message };
		}
		return { values, errors, warnings: advice };
	};
	let snapshot = build();
	const publish = () => {
		snapshot = build();
		for (const listener of [...listeners]) listener();
	};
	const keep = (path: string, fact: NativeValidity | null | undefined) => {
		const { [path]: _old, ...rest } = facts;
		facts = fact ? { ...rest, [path]: fact } : rest;
	};
	return {
		getValue: (path) => getPath(values, path),
		setValue(path, value, options) {
			values = setPath(values, path, value);
			keep(path, options?.native);
			checked.add(path);
			publish();
		},
		blur(path, options) {
			if (options && 'value' in options) values = setPath(values, path, options.value);
			if (options?.native !== undefined) keep(path, options.native);
			checked.add(path);
			publish();
		},
		getSnapshot: () => snapshot,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		reset() {
			values = initial;
			facts = {};
			checked.clear();
			publish();
		},
		async validate(paths, options) {
			if (options?.native) {
				facts = Object.fromEntries(
					Object.entries(options.native).filter(
						(entry): entry is [string, NativeValidity] => entry[1] !== null,
					),
				);
			}
			const scope = paths ?? [...new Set([...Object.keys(rules), ...Object.keys(facts)])];
			for (const path of scope) checked.add(path);
			publish();
			return scope.every((path) => !problems(path));
		},
		reportNative(path, fact) {
			if (getPath(values, path) === undefined) return;
			keep(path, fact);
			if (checked.has(path)) publish();
		},
	};
}
