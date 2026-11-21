const INDEX = /^(0|[1-9]\d*)$/;

function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
	return typeof value === 'object' && value !== null;
}

/** Read the value at a dotted path; `undefined` when any segment is missing. */
export function getPath(tree: unknown, path: string): unknown {
	let node = tree;
	for (const key of path.split('.')) {
		if (!isBranch(node)) {
			return undefined;
		}
		node = Reflect.get(node, key);
	}
	return node;
}

/**
 * Return a copy of `tree` with the branch at a dotted path replaced.
 *
 * @remarks Branches off the path keep their identity. A missing parent becomes an
 * array when the next segment is a non-negative integer, otherwise an object, so
 * `rows.0.name` addresses `{ rows: [{ name }] }`.
 */
export function setPath<R extends object>(tree: R, path: string, value: unknown): R {
	return write(tree, path.split('.'), value) as R;
}

function write(node: unknown, keys: string[], value: unknown): unknown {
	const [key, ...rest] = keys;
	if (key === undefined) {
		return value;
	}
	const base: Record<string, unknown> | unknown[] = isBranch(node) ? node : INDEX.test(key) ? [] : {};
	const child = Reflect.get(base, key);
	const nextChild = rest.length === 0 ? value : write(child ?? (INDEX.test(rest[0] ?? '') ? [] : {}), rest, value);
	if (Array.isArray(base)) {
		const copy = [...base];
		copy[Number(key)] = nextChild;
		return copy;
	}
	return { ...base, [key]: nextChild };
}

/** Return a copy of `tree` without the leaf at a dotted path, or `tree` itself when the path is absent. */
export function deletePath<R extends object>(tree: R, path: string): R {
	return remove(tree, path.split('.')) as R;
}

function remove(node: unknown, keys: string[]): unknown {
	const [key, ...rest] = keys;
	if (key === undefined || !isBranch(node) || !(key in node)) {
		return node;
	}
	if (rest.length === 0) {
		if (Array.isArray(node)) {
			const copy = [...node];
			delete copy[Number(key)];
			return copy;
		}
		const { [key]: _removed, ...others } = node;
		return others;
	}
	const child = Reflect.get(node, key);
	const nextChild = remove(child, rest);
	if (nextChild === child) {
		return node;
	}
	return Array.isArray(node) ? Object.assign([...node], { [key]: nextChild }) : { ...node, [key]: nextChild };
}
