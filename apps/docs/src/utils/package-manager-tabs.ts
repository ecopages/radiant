const PACKAGE_MANAGERS = [
	{ id: 'bun', label: 'bun', command: 'bun add' },
	{ id: 'pnpm', label: 'pnpm', command: 'pnpm add' },
	{ id: 'npm', label: 'npm', command: 'npm install' },
] as const;

/**
 * Builds the `radiant-code-tabs` payload for package installation commands.
 */
export function createPackageManagerTabs(packageNames: readonly string[]): string {
	const packageList = packageNames.join(' ');

	return JSON.stringify(
		PACKAGE_MANAGERS.map((manager) => ({
			id: manager.id,
			label: manager.label,
			code: `${manager.command} ${packageList}`,
		})),
	);
}
