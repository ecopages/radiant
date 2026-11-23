import { execFileSync, spawnSync } from 'node:child_process';

const WORKSPACE_DIRECTORIES = ['packages', 'apps', 'playground'];

/**
 * Runs `test:all` only for the workspace packages with staged changes and the packages that depend on them.
 *
 * @remarks
 * The pre-commit hook used to run every package's suite on every commit, which overloaded the machine and made
 * tests time out. CI still runs everything. A staged file outside the workspace directories, other than a changeset
 * or a root Markdown file, can change every package, so it runs the full suite. Renames count both paths, and tests
 * run against the working tree, as before. The hook builds every package first, because a package's tests import
 * its dependencies from their built `dist`, which is stale until the build runs.
 */
function stagedPaths() {
	const output = execFileSync('git', ['diff', '--cached', '--name-only', '--no-renames', '-z'], {
		encoding: 'utf8',
	});
	return output.split('\0').filter(Boolean);
}

function touchedDirectories(paths) {
	const directories = new Set();
	let full = false;

	for (const path of paths) {
		const [root, name] = path.split('/');
		if (WORKSPACE_DIRECTORIES.includes(root) && name !== undefined && path.split('/').length > 2) {
			directories.add(`${root}/${name}`);
		} else if (!path.startsWith('.changeset/') && !(path.endsWith('.md') && !path.includes('/'))) {
			full = true;
		}
	}

	return { directories, full };
}

function runTests(args) {
	const result = spawnSync('pnpm', args, { stdio: 'inherit' });
	process.exit(result.status ?? 1);
}

const { directories, full } = touchedDirectories(stagedPaths());

if (full) {
	runTests(['run', 'test:all']);
} else if (directories.size === 0) {
	console.log('No staged workspace changes: skipping package tests.');
} else {
	const filters = [...directories].flatMap((directory) => ['--filter', `...{./${directory}}`]);
	runTests(['--workspace-concurrency=1', ...filters, '--if-present', 'run', 'test:all']);
}
