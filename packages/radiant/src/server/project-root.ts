import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Options that constrain how {@link resolveProjectRoot} searches ancestor
 * directories.
 */
export type ResolveProjectRootOptions = {
	/** Expected `package.json#name` value for the resolved project root. */
	packageName?: string;
	/** Additional relative paths that must exist inside the resolved directory. */
	requiredPaths?: string[];
	/** Starting directories to search upward from before giving up. */
	startDirectories?: string[];
	/** Absolute or relative directory where the upward search must stop. */
	stopAt?: string;
};

/**
 * Resolves the nearest ancestor directory that matches the provided package and
 * path markers. Framework adapters can use this to find their project root
 * without hardcoding a fixed number of parent-directory guesses.
 */
export function resolveProjectRoot(options: ResolveProjectRootOptions = {}): string {
	const candidateStarts = dedupeDirectories(
		options.startDirectories?.length
			? options.startDirectories
			: [process.cwd(), import.meta.dirname],
	);
	const stopAt = resolve(options.stopAt ?? '/');

	for (const startDirectory of candidateStarts) {
		const resolvedRoot = resolveProjectRootFrom(startDirectory, stopAt, options);

		if (resolvedRoot) {
			return resolvedRoot;
		}
	}

	throw new Error(createResolveProjectRootError(options, candidateStarts));
}

function resolveProjectRootFrom(
	startDirectory: string,
	stopAt: string,
	options: ResolveProjectRootOptions,
): string | undefined {
	let currentDirectory = resolve(startDirectory);

	for (;;) {
		if (matchesProjectRoot(currentDirectory, options)) {
			return currentDirectory;
		}

		if (currentDirectory === stopAt) {
			return undefined;
		}

		const parentDirectory = dirname(currentDirectory);

		if (parentDirectory === currentDirectory) {
			return undefined;
		}

		currentDirectory = parentDirectory;
	}
}

function matchesProjectRoot(directory: string, options: ResolveProjectRootOptions): boolean {
	if (!matchesPackageName(directory, options.packageName)) {
		return false;
	}

	return (options.requiredPaths ?? []).every((requiredPath) => existsSync(resolve(directory, requiredPath)));
}

function matchesPackageName(directory: string, packageName: string | undefined): boolean {
	if (!packageName) {
		return true;
	}

	const packageJsonPath = resolve(directory, 'package.json');

	if (!existsSync(packageJsonPath)) {
		return false;
	}

	try {
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
		return packageJson.name === packageName;
	} catch {
		return false;
	}
}

function dedupeDirectories(directories: string[]): string[] {
	return Array.from(new Set(directories.map((directory) => resolve(directory))));
}

function createResolveProjectRootError(
	options: ResolveProjectRootOptions,
	startDirectories: string[],
): string {
	const markerSummary = [
		options.packageName ? `package name ${JSON.stringify(options.packageName)}` : undefined,
		options.requiredPaths?.length ? `paths ${options.requiredPaths.map((path) => JSON.stringify(path)).join(', ')}` : undefined,
	]
		.filter((marker): marker is string => typeof marker === 'string')
		.join(' and ');

	return `Unable to resolve a project root${markerSummary ? ` matching ${markerSummary}` : ''} from ${startDirectories.join(', ')}.`;
}