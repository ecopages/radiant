import assert from 'node:assert/strict';
import test from 'node:test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function importDistModule(relativePath) {
	return import(pathToFileURL(resolve(packageDirectory, 'dist', relativePath)).href);
}

test('dist decorator and registry entrypoints share controller registration state', async () => {
	const [{ controller }, { registerController }] = await Promise.all([
		importDistModule('decorators/controller.js'),
		importDistModule('controller-registry.js'),
	]);

	class DecoratedController {}
	class DuplicateController {}

	const identifier = `dist-controller-registry-${Date.now()}-subpath`;
	const decorated = controller(identifier)(DecoratedController);
	const registered = registerController(identifier, DuplicateController);

	assert.equal(decorated, DecoratedController);
	assert.equal(registered, DecoratedController);
	assert.notEqual(registered, DuplicateController);
});

test('dist root and subpath entrypoints share controller registration state', async () => {
	await importDistModule('server/install-light-dom-shim.js');

	const [{ controller }, { registerController }] = await Promise.all([
		importDistModule('index.js'),
		importDistModule('controller-registry.js'),
	]);

	class RootDecoratedController {}
	class DuplicateController {}

	const identifier = `dist-controller-registry-${Date.now()}-root`;
	const decorated = controller(identifier)(RootDecoratedController);
	const registered = registerController(identifier, DuplicateController);

	assert.equal(decorated, RootDecoratedController);
	assert.equal(registered, RootDecoratedController);
	assert.notEqual(registered, DuplicateController);
});
