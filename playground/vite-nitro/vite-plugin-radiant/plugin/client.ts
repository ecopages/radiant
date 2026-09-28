export function createClientRegistryModule(componentGlob: string): string {
	return `const radiantClientModuleLoaders = import.meta.glob(${JSON.stringify(componentGlob)});

export function hasRadiantClientModule(moduleKey) {
	return moduleKey in radiantClientModuleLoaders;
}

export async function loadRadiantClientModule(moduleKey) {
	const loader = radiantClientModuleLoaders[moduleKey];

	if (!loader) {
		throw new Error(\`Unknown Radiant client module: \${moduleKey}.\`);
	}

	return loader();
}
`;
}

export function createDomRegistryModule(componentGlob: string, metadataQuery: string): string {
	return `import {
	CONTROLLER_ATTRIBUTE,
	CONTROLLER_REGISTRY_STATE_KEY,
	parseControllerIdentifiers,
	visitControllerElements,
} from '@ecopages/radiant/controller-registry';

const radiantDomModuleMetadata = import.meta.glob(${JSON.stringify(componentGlob)}, {
	eager: true,
	import: 'default',
	query: ${JSON.stringify(`?${metadataQuery}`)},
});
const radiantClientModuleLoaders = import.meta.glob(${JSON.stringify(componentGlob)});
const radiantElementModuleKeys = new Map();
const radiantControllerModuleKeys = new Map();

for (const [moduleKey, metadata] of Object.entries(radiantDomModuleMetadata)) {
	for (const tagName of metadata.customElementTagNames ?? []) {
		radiantElementModuleKeys.set(tagName, moduleKey);
	}

	for (const identifier of metadata.controllerIdentifiers ?? []) {
		radiantControllerModuleKeys.set(identifier, moduleKey);
	}
}

export function resolveRadiantElementModuleKey(tagName) {
	return radiantElementModuleKeys.get(String(tagName).toLowerCase());
}

export function resolveRadiantControllerModuleKey(identifier) {
	return radiantControllerModuleKeys.get(String(identifier));
}

export async function loadRadiantDomModules(root = document) {
	const moduleKeys = new Set();
	collectRadiantElementModuleKeys(root, moduleKeys);
	collectRadiantControllerModuleKeys(root, moduleKeys);
	await Promise.all(Array.from(moduleKeys, loadRadiantDomModuleByKey));
	await Promise.all(Array.from(moduleKeys, waitForLoadedCustomElements));
	return Array.from(moduleKeys);
}

async function loadRadiantDomModuleByKey(moduleKey) {
	const loader = radiantClientModuleLoaders[moduleKey];

	if (!loader) {
		throw new Error(\`Unknown Radiant client module: \${moduleKey}.\`);
	}

	return loader();
}

function collectRadiantElementModuleKeys(root, moduleKeys) {
	for (const element of visitElements(root)) {
		const tagName = element.tagName.toLowerCase();

		if (!tagName.includes('-')) {
			continue;
		}

		if (typeof customElements !== 'undefined' && customElements.get(tagName)) {
			continue;
		}

		const moduleKey = resolveRadiantElementModuleKey(tagName);

		if (moduleKey) {
			moduleKeys.add(moduleKey);
		}
	}
}

function collectRadiantControllerModuleKeys(root, moduleKeys) {
	visitControllerElements(root, (element) => {
		for (const identifier of parseControllerIdentifiers(element)) {
			if (hasRegisteredRadiantController(identifier)) {
				continue;
			}

			const moduleKey = resolveRadiantControllerModuleKey(identifier);

			if (moduleKey) {
				moduleKeys.add(moduleKey);
			}
		}
	});
}

function* visitElements(root) {
	if (root instanceof Element) {
		yield root;
	}

	for (const element of Array.from(root.querySelectorAll('*'))) {
		yield element;
	}
}

function hasRegisteredRadiantController(identifier) {
	const controllerRegistryState = globalThis[CONTROLLER_REGISTRY_STATE_KEY];
	return Boolean(controllerRegistryState?.controllerRegistry?.has(identifier));
}

async function waitForLoadedCustomElements(moduleKey) {
	const metadata = radiantDomModuleMetadata[moduleKey];

	if (!metadata || typeof customElements === 'undefined') {
		return;
	}

	await Promise.all(
		(metadata.customElementTagNames ?? []).map((tagName) => customElements.whenDefined(tagName)),
	);
}
`;
}
