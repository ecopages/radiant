import { startControllers, type ControllerRegistryRuntime } from '@ecopages/radiant/controller-registry';

const RUNTIME_KEY = Symbol.for('radiant-ui-docs:controller-runtime');

type DocumentWithRuntime = Document & { [RUNTIME_KEY]?: ControllerRegistryRuntime };

/**
 * The one controller registry runtime of a document, started on the first call and returned by every later one.
 *
 * @remarks
 * `startControllers` creates a new runtime on every call, and each runtime connects its own instance of every
 * `data-controller` host: listeners twice, and for the audio recipe a second `AudioContext`. A module that calls it at
 * the top level runs it again whenever the module is evaluated again, which HMR and a re-import do. The runtime is kept
 * on the document under a `Symbol.for` key, so a fresh evaluation of this module, which has lost its own variables,
 * still finds it.
 */
export function startControllersOnce(root: Document = document): ControllerRegistryRuntime {
	const owner: DocumentWithRuntime = root;
	return (owner[RUNTIME_KEY] ??= startControllers(root));
}
