import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const GLOBAL_KEYS = [
	'CSS',
	'CustomEvent',
	'Document',
	'Element',
	'Event',
	'EventTarget',
	'HTMLScriptElement',
	'HTMLElement',
	'Node',
	'document',
	'customElements',
	'window',
	'requestAnimationFrame',
	'cancelAnimationFrame',
] as const;

const globalRecord = globalThis as unknown as Record<string, unknown>;

function snapshotGlobals(): Map<string, PropertyDescriptor | undefined> {
	return new Map(GLOBAL_KEYS.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
}

function restoreGlobals(snapshot: Map<string, PropertyDescriptor | undefined>): void {
	for (const key of GLOBAL_KEYS) {
		const descriptor = snapshot.get(key);
		if (descriptor) {
			Object.defineProperty(globalThis, key, descriptor);
		} else {
			delete globalRecord[key];
		}
	}
}

function clearDomGlobals(): void {
	for (const key of GLOBAL_KEYS) {
		if (key === 'EventTarget') {
			continue;
		}
		delete globalRecord[key];
	}
}

function installForeignPartialDom(): {
	ForeignHTMLElement: typeof HTMLElement;
	foreignDocument: Document;
} {
	class ForeignNode extends EventTarget {}
	class ForeignElement extends ForeignNode {
		localName = 'div';
		tagName = 'DIV';

		get children(): unknown {
			return [];
		}

		get style(): unknown {
			return { setProperty() {} };
		}
	}
	class ForeignHTMLElement extends ForeignElement {
		override get style(): undefined {
			return undefined;
		}
	}

	const foreignDocument = {
		createElement(): ForeignElement {
			return new ForeignElement();
		},
		getElementById(): null {
			return null;
		},
	};

	globalRecord.Node = ForeignNode;
	globalRecord.Element = ForeignElement;
	globalRecord.HTMLElement = ForeignHTMLElement;
	globalRecord.Document = class ForeignDocument {};
	globalRecord.document = foreignDocument;
	globalRecord.customElements = {
		define() {},
		get() {
			return undefined;
		},
	};
	globalRecord.requestAnimationFrame = () => 0;
	globalRecord.cancelAnimationFrame = () => {};

	return {
		ForeignHTMLElement: ForeignHTMLElement as unknown as typeof HTMLElement,
		foreignDocument: foreignDocument as unknown as Document,
	};
}

describe('minimal DOM installation boundary', () => {
	let globals: Map<string, PropertyDescriptor | undefined>;

	beforeEach(() => {
		globals = snapshotGlobals();
		vi.resetModules();
	});

	afterEach(() => {
		restoreGlobals(globals);
	});

	test('installs and reuses a coherent minimal DOM when no DOM exists', async () => {
		clearDomGlobals();

		const { installLightDomShim } = await import('../../src/server/shim/minimal-dom/install');
		const first = installLightDomShim();
		const installedGlobalWindow = globalThis.window;
		const second = installLightDomShim();

		expect(globalThis.document).toBe(first.document);
		expect(globalThis.window).toBe(first);
		expect(globalThis.window).toBe(installedGlobalWindow);
		expect(second.document).toBe(first.document);
		expect(second.HTMLElement).toBe(first.HTMLElement);
		expect(globalThis.requestAnimationFrame).toBeTypeOf('function');
		expect(globalThis.cancelAnimationFrame).toBeTypeOf('function');
	});

	test('replaces a foreign DOM when a custom-element host fails the style probe', async () => {
		const { ForeignHTMLElement, foreignDocument } = installForeignPartialDom();
		const { installLightDomShim } = await import('../../src/server/shim/minimal-dom/install');

		const runtime = installLightDomShim();
		class ProbeHost extends HTMLElement {
			probe(): void {
				this.style.setProperty('--width', '320px');
			}
		}
		const host = new ProbeHost();
		host.probe();

		expect(globalThis.HTMLElement).not.toBe(ForeignHTMLElement);
		expect(globalThis.document).not.toBe(foreignDocument);
		expect(host.style.getPropertyValue('--width')).toBe('320px');
		expect(runtime.document).toBe(globalThis.document);
	});

	test('treats malformed globals as partial instead of throwing during capability detection', async () => {
		clearDomGlobals();
		globalRecord.HTMLElement = {};
		globalRecord.document = null;

		const { installLightDomShim } = await import('../../src/server/shim/minimal-dom/install');
		const runtime = installLightDomShim();

		expect(runtime.document).toBe(globalThis.document);
		expect(globalThis.HTMLElement).toBe(runtime.HTMLElement);
	});

	test('does not trust an incoherent global window', async () => {
		clearDomGlobals();
		const { installLightDomShim } = await import('../../src/server/shim/minimal-dom/install');
		const installed = installLightDomShim();
		const document = globalThis.document;
		const foreignWindow = {};
		globalRecord.window = foreignWindow;

		const { ensureLightDomShim } = await import('../../src/server/shim/minimal-dom/install');
		const runtime = ensureLightDomShim();

		expect(runtime.document).toBe(document);
		expect(runtime.document).toBe(installed.document);
		expect(globalThis.window).toBe(foreignWindow);
	});

	test('repairs globals changed after an earlier minimal-DOM installation', async () => {
		clearDomGlobals();
		const { installLightDomShim } = await import('../../src/server/shim/minimal-dom/install');
		const first = installLightDomShim();
		const foreignDocument = {
			createElement: () => ({ style: {}, children: [] }),
		};
		const foreignRegistry = {
			define() {},
			get() {
				return undefined;
			},
		};
		globalRecord.document = foreignDocument;
		globalRecord.customElements = foreignRegistry;

		const second = installLightDomShim();

		expect(second.document).not.toBe(first.document);
		expect(globalThis.document).toBe(second.document);
		expect(globalThis.customElements).toBe(second.customElements);
		expect(globalThis.window).toBe(second);
	});

	test('fails before mutation when a required global is locked', async () => {
		clearDomGlobals();
		const foreignDocument = {};
		Object.defineProperty(globalThis, 'document', {
			configurable: true,
			enumerable: true,
			value: foreignDocument,
			writable: false,
		});

		const { installLightDomShim } = await import('../../src/server/shim/minimal-dom/install');

		expect(() => installLightDomShim()).toThrow(/not writable: document/);
		expect(globalThis.document).toBe(foreignDocument);
		expect(globalThis.HTMLElement).toBeUndefined();
	});
});

describe('SSR import order', () => {
	let globals: Map<string, PropertyDescriptor | undefined>;

	beforeEach(() => {
		globals = snapshotGlobals();
		vi.resetModules();
	});

	afterEach(() => {
		restoreGlobals(globals);
	});

	test('installs the runtime before RadiantElement resolves its base class', async () => {
		clearDomGlobals();
		await import('../../src/server/install-ssr-runtime');
		const { RadiantElement } = await import('../../src/core/radiant-element');

		expect(RadiantElement.prototype).toBeInstanceOf(globalThis.HTMLElement);
	});
});
