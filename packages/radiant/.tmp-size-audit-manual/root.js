import { hasHydrationMarkers as oH, jsx as tH } from '@ecopages/jsx';
var l = Symbol.for('@ecopages/radiant.legacy-instance-initializers');
function G(H, R) {
	let M = H[l];
	if (Array.isArray(M)) {
		M.push(R);
		return;
	}
	Object.defineProperty(H, l, { value: [R], configurable: !0 });
}
function w(H) {
	let R = [],
		F = Object.getPrototypeOf(H);
	while (F && F !== Object.prototype) (R.push(F), (F = Object.getPrototypeOf(F)));
	for (let M = R.length - 1; M >= 0; M -= 1) {
		let B = R[M][l];
		if (!Array.isArray(B)) continue;
		for (let P of B) P(H);
	}
}
import { hydrate as bH, render as VH } from '@ecopages/jsx';
import { Computed as vH, subtle as NH } from '@ecopages/signals';
function x0(H) {
	return H.replace(/&/g, '\\u0026')
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
}
var q = 'data-hydration',
	A0 = 'data-hydration-type',
	o = 'data-hydration-key';
function W0(H) {
	let R = H.hydrationKey ? ` ${o}="${_H(H.hydrationKey)}"` : '';
	return `<script type="application/json" ${q} ${A0}="${H.type}"${R}>${H.serializedValue}</script>`;
}
function Z0(H) {
	return x0(H);
}
function X0(H, R) {
	let F = H.textContent;
	if (!F) return R;
	try {
		return JSON.parse(F);
	} catch {
		if (typeof console < 'u')
			console.warn(`[@ecopages/radiant] Failed to parse hydration payload from <script ${q}>:`, F.slice(0, 120));
		return R;
	}
}
function G0(H, R, F) {
	let M = H.children;
	if (!M || M.length === 0) {
		let B = H.childNodes;
		if (!B || B.length === 0) return null;
		for (let P = 0; P < B.length; P += 1) {
			let x = B[P];
			if (x.nodeType !== 1) continue;
			let $ = x;
			if ($0($, R, F)) return $;
		}
		return null;
	}
	for (let B = 0; B < M.length; B += 1) if ($0(M[B], R, F)) return M[B];
	return null;
}
function $0(H, R, F) {
	if (H.tagName !== 'SCRIPT' || !H.hasAttribute(q) || H.getAttribute(A0) !== R) return !1;
	if (F !== void 0) return H.getAttribute(o) === F;
	return !H.hasAttribute(o);
}
function _H(H) {
	return H.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
import { createMarkupNodeLike as SH, isKeyedJsxValue as Q0, isSlotJsxValue as EH } from '@ecopages/jsx';
var Y = '',
	O = 'data-radiant-slot-projection';
function j0(H) {
	let R = new Map();
	for (let F of Array.from(H.childNodes)) {
		if (CH(F)) continue;
		KH(R, wH(F), F);
	}
	return R;
}
function D0(H) {
	let R;
	try {
		R = JSON.parse(H);
	} catch {
		if (typeof console < 'u')
			console.warn('[@ecopages/radiant] Failed to parse slot projection payload:', H.slice(0, 120));
		return new Map();
	}
	let F = new Map();
	for (let [M, B] of Object.entries(R)) {
		if (!Array.isArray(B) || B.length === 0) continue;
		F.set(
			t(M),
			B.map((P) => SH(P)),
		);
	}
	return F;
}
function J0(H) {
	let R = Array.from(H.childNodes)
		.filter((F) => k0(F))
		.map((F) => C(F) ?? '')
		.filter((F) => F !== '');
	return R.length > 0 ? R.join('') : void 0;
}
function U0(H) {
	let R = {};
	for (let [F, M] of H.entries()) {
		let B = M.map((P) => C(P)).filter((P) => P !== void 0 && P !== '');
		if (B.length > 0) R[F] = B;
	}
	return Object.keys(R).length > 0 ? JSON.stringify(R) : void 0;
}
function q0(H, R) {
	let F = !1,
		M = (P) => {
			if (EH(P)) return ((F = !0), fH(P, R, M));
			if (Q0(P)) return IH(P, M(P.value));
			if (OH(P))
				return {
					_$rType$: 1,
					rootLocalName: P.rootLocalName,
					strings: P.strings,
					values: P.values.map((x) => M(x)),
				};
			if (T0(P)) return Array.from(P, (x) => M(x));
			return P;
		},
		B = M(H);
	return { containsSlots: F, value: B };
}
function L0(H) {
	for (let R of Array.from(H.childNodes)) {
		if (!Y0(R)) continue;
		let F = R.textContent ?? void 0;
		return (R.parentNode?.removeChild(R), F);
	}
	return;
}
function KH(H, R, F) {
	let M = H.get(R);
	if (M) {
		M.push(F);
		return;
	}
	H.set(R, [F]);
}
function IH(H, R) {
	return { ...H, value: R };
}
function wH(H) {
	if (H instanceof Element) return t(H.getAttribute('slot'));
	return Y;
}
function T0(H) {
	return typeof H !== 'string' && typeof H === 'object' && H !== null && Symbol.iterator in H;
}
function Y0(H) {
	return H instanceof HTMLScriptElement && H.hasAttribute(O);
}
function k0(H) {
	return H instanceof HTMLScriptElement && H.hasAttribute(q);
}
function CH(H) {
	return Y0(H) || k0(H);
}
function OH(H) {
	return (
		typeof H === 'object' && H !== null && H._$rType$ === 1 && Array.isArray(H.strings) && Array.isArray(H.values)
	);
}
function t(H) {
	return H ?? Y;
}
function C(H) {
	if (H === void 0 || H === null || H === !1 || H === !0) return;
	if (typeof Node < 'u' && H instanceof Node) {
		if (H.nodeType === Node.TEXT_NODE) return H.textContent ?? '';
		return H.outerHTML ?? H.textContent ?? void 0;
	}
	if (Q0(H)) return C(H.value);
	if (typeof H === 'string' || typeof H === 'number' || typeof H === 'bigint') return String(H);
	if (typeof H === 'object' && H !== null && 'outerHTML' in H)
		return typeof H.outerHTML === 'string' ? H.outerHTML : (H.textContent ?? void 0);
	if (T0(H)) return Array.from(H, (R) => C(R) ?? '').join('');
	return;
}
function fH(H, R, F) {
	let M = R.get(t(H.name));
	if (M && M.length > 0) return M.length === 1 ? M[0] : M;
	if (H.fallback === void 0) return '';
	return F(H.fallback);
}
var a = Symbol('radiant.renderRuntime');
class z0 {
	#H;
	#R = new Map();
	#F;
	#B;
	#M;
	#P = 0;
	constructor(H) {
		((this.#H = H),
			(this.#B = new NH.Watcher(() => {
				this.#H.requestUpdate();
			})));
	}
	get slotProjectionVersion() {
		return this.#P;
	}
	getSlotElement(H) {
		return this.getSlotElements(H)[0] ?? null;
	}
	getSlotElements(H) {
		return (
			this.ensureSlotProjectionState(),
			(this.#R.get(H ?? Y) ?? []).filter((R) => typeof Node < 'u' && R instanceof Element)
		);
	}
	getSlotProjectionScriptTag() {
		this.ensureSlotProjectionState();
		let H = U0(this.#R);
		if (!H) return;
		return `<script type="application/json" ${O}>${gH(H)}</script>`;
	}
	getAuthoredHydrationScriptMarkup() {
		return J0(this.#H) ?? void 0;
	}
	hydrate(H) {
		this.disconnectSlotProjectionObserver();
		try {
			bH(this.resolveTrackedRenderOutput().value, H);
		} finally {
			this.observeSlotProjection();
		}
	}
	render(H) {
		this.disconnectSlotProjectionObserver();
		try {
			VH(this.resolveTrackedRenderOutput().value, H);
		} finally {
			this.observeSlotProjection();
		}
	}
	observeSlotProjection() {
		if (typeof MutationObserver > 'u' || this.#M || !this.#H.isConnected) return;
		((this.#M = new MutationObserver((H) => this.handleSlotProjectionMutations(H))),
			this.#M.observe(this.#H, { childList: !0 }));
	}
	disconnectSlotProjectionObserver() {
		(this.#M?.disconnect(), (this.#M = void 0));
	}
	disconnectRenderWatcher() {
		if (!this.#F) return;
		(this.#B.unwatch(this.#F), (this.#F = void 0));
	}
	resolveTrackedRenderOutput() {
		let H = new vH(() => this.resolveRenderOutput()),
			R = H.get();
		if (!this.#H.isConnected) return R;
		if (this.#F) this.#B.unwatch(this.#F);
		return ((this.#F = H), this.#B.watch(H), R);
	}
	dispose() {
		(this.disconnectSlotProjectionObserver(), this.disconnectRenderWatcher());
	}
	ensureSlotProjectionState() {
		if (this.#R.size > 0) return;
		let H = this.#H.isConnected ? L0(this.#H) : void 0;
		if (typeof H === 'string' && H !== '') {
			((this.#R = D0(H)), (this.#P += 1));
			return;
		}
		if (this.#H.childNodes.length > 0) ((this.#R = j0(this.#H)), (this.#P += 1));
	}
	handleSlotProjectionMutations(H) {
		let R = !1;
		for (let F of H) {
			for (let M of Array.from(F.removedNodes)) if (this.removeProjectedSlotNode(M)) R = !0;
			for (let M of Array.from(F.addedNodes)) {
				if (M.parentNode !== this.#H) continue;
				if (this.addProjectedSlotNode(M)) R = !0;
			}
		}
		if (R) ((this.#P += 1), this.#H.requestUpdate());
	}
	addProjectedSlotNode(H) {
		if (H instanceof HTMLScriptElement && (H.hasAttribute(O) || H.hasAttribute(q))) return !1;
		let R = H instanceof Element ? (H.getAttribute('slot') ?? Y) : Y,
			F = this.#R.get(R);
		if (F) {
			if (F.includes(H)) return !1;
			return (F.push(H), !0);
		}
		return (this.#R.set(R, [H]), !0);
	}
	removeProjectedSlotNode(H) {
		for (let [R, F] of this.#R.entries()) {
			let M = F.indexOf(H);
			if (M === -1) continue;
			if ((F.splice(M, 1), F.length === 0)) this.#R.delete(R);
			return !0;
		}
		return !1;
	}
	resolveRenderOutput() {
		return (this.ensureSlotProjectionState(), q0(this.#H.render(), this.#R));
	}
}
function _0(H) {
	return H[a];
}
function S0(H) {
	let R = H,
		F = R[a];
	if (F) return F;
	let M = new z0(H);
	return ((R[a] = M), M);
}
function E0(H) {
	return _0(H)?.slotProjectionVersion ?? 0;
}
function K0(H) {
	_0(H)?.dispose();
}
function gH(H) {
	return H.replace(/</g, '\\u003c');
}
var k = Symbol.for('@ecopages/radiant.element-ssr-host-bridge'),
	I0 = new WeakMap();
function w0(H) {
	let R = I0.get(H);
	if (R) return R;
	let F = {
		constructor: H.constructor,
		getAttribute: (M) => H.getAttribute(M),
		getAttributeNames: () => H.getAttributeNames(),
		getAuthoredHydrationScriptMarkup: () => H.getAuthoredHydrationScriptMarkup(),
		getContextProviders: () => H.getContextProviders(),
		getHostSsrAttributes: () => H.getHostSsrAttributes(),
		getHydrationBindings: () => H.getHydrationBindings(),
		getPropertyValue: (M) => H[M],
		getReactiveProperties: () => H.getReactiveProperties(),
		getSlotProjectionScriptTag: () => H.getSlotProjectionScriptTag(),
		resolveTrackedRenderOutput: () => H.resolveTrackedRenderOutput(),
		resolveSsrRenderBridge: () => H.resolveSsrRenderBridge(),
		renderHost: () => H.renderHost(),
		renderHostToString: (M) => H.renderHostToString(M),
		renderToString: (M) => H.renderToString(M),
	};
	return (I0.set(H, F), F);
}
import { createSubscribableJsxValue as uH } from '@ecopages/jsx';
import { trackDependency as C0 } from '@ecopages/signals';
class O0 {
	read;
	subscribers = new Set();
	watcherListeners = new Set();
	version = 0;
	constructor(H) {
		this.read = H;
	}
	get() {
		return (C0(this), this.read());
	}
	subscribe(H) {
		return (
			this.subscribers.add(H),
			() => {
				this.subscribers.delete(H);
			}
		);
	}
	addWatcher(H) {
		return (
			this.watcherListeners.add(H),
			() => {
				this.watcherListeners.delete(H);
			}
		);
	}
	getVersion() {
		return this.version;
	}
	notify(H) {
		this.version += 1;
		let R;
		try {
			this.notifyWatchers();
		} catch (F) {
			R = F;
		}
		if ((this.publish(H), R)) throw R;
	}
	publish(H) {
		for (let R of this.subscribers) R(H);
	}
	notifyWatchers() {
		let H = [];
		for (let R of this.watcherListeners)
			try {
				R();
			} catch (F) {
				H.push(F);
			}
		if (H.length === 1) throw H[0];
		if (H.length > 1) throw AggregateError(H, 'Multiple reactive dependency notifications failed.');
	}
}
function hH(H) {
	return typeof H === 'object' && H !== null && typeof H.get === 'function';
}
class S {
	host;
	access;
	shouldAutoBind;
	bindings;
	$;
	reactiveFields = new Map();
	reactiveDependencies = new Map();
	reactiveDependencyReaders = new Map();
	reactiveBindings = new Map();
	updateCallbacks = new Map();
	onConnectedCallbacks = [];
	onDisconnectedCallback = [];
	constructor(H, R, F) {
		this.host = H;
		this.access = R;
		this.shouldAutoBind = F;
		let M = this.createReactiveBindingNamespace();
		((this.bindings = M), (this.$ = M));
	}
	connectHost() {
		for (let H of this.onConnectedCallbacks) H();
	}
	disconnectHost() {
		for (let H of this.onDisconnectedCallback) H();
	}
	notifyUpdate(H, R, F) {
		if (R === F) return;
		this.reactiveDependencies.get(H)?.notify(F);
		let M = this.updateCallbacks.get(H);
		if (M) for (let B of M) B();
	}
	registerCleanupCallback(H) {
		this.onDisconnectedCallback.push(H);
	}
	registerConnectedCallback(H) {
		this.onConnectedCallbacks.push(H);
	}
	registerHydrationBinding(H, R) {}
	registerReactiveDependencyReader(H, R) {
		this.reactiveDependencyReaders.set(H, R);
	}
	registerUpdateCallback(H, R) {
		if (!this.updateCallbacks.has(H)) this.updateCallbacks.set(H, new Set());
		let F = this.updateCallbacks.get(H);
		return (
			F.add(R),
			() => {
				if ((F.delete(R), F.size === 0)) this.updateCallbacks.delete(H);
			}
		);
	}
	getReactiveBinding(H) {
		let R = this.reactiveBindings.get(H);
		if (R) return R;
		let F = uH({
			getValue: () => this.readReactiveBindingValue(H),
			subscribe: (M) =>
				this.registerUpdateCallback(H, () => {
					M(this.readReactiveBindingValue(H));
				}),
		});
		return (this.reactiveBindings.set(H, F), F);
	}
	bind(H) {
		return this.getReactiveBinding(H);
	}
	defineReactiveBinding(H, R = !0) {
		let F = typeof R === 'string' ? R : R ? `$${H}` : void 0,
			M = this.access.getBindingTarget?.(this.host) ?? this.host;
		if (!F || this.access.hasProperty(this.host, F)) return;
		this.access.defineProperty(M, F, { get: () => this.getReactiveBinding(H), enumerable: !1, configurable: !0 });
	}
	trackReactiveRead(H) {
		C0(this.getReactiveDependency(H));
	}
	defineReactiveAccessor(H, R) {
		let F = R.bind ?? this.shouldAutoBind();
		if (
			(this.defineReactiveBinding(H, F),
			this.registerReactiveDependencyReader(H, R.getValue),
			this.access.defineProperty(this.host, H, {
				get: () => {
					return (this.trackReactiveRead(H), R.getValue());
				},
				set: (M) => {
					let B = R.getValue();
					if (B === M) return;
					(R.setValue(M), this.notifyUpdate(H, B, M));
				},
				enumerable: !0,
				configurable: !0,
			}),
			R.notifyInitialValue !== void 0)
		)
			this.notifyUpdate(H, void 0, R.notifyInitialValue);
	}
	createReactiveField(H, R, F = {}) {
		let M = { name: H, value: R, initialValue: R };
		(this.reactiveFields.set(H, M),
			this.defineReactiveAccessor(H, {
				bind: F.bind,
				getValue: () => this.reactiveFields.get(H)?.value,
				setValue: (B) => {
					this.reactiveFields.set(H, { ...M, value: B });
				},
				notifyInitialValue: R,
			}));
	}
	createReactiveBindingNamespace() {
		return new Proxy(Object.create(null), {
			get: (H, R) => {
				if (typeof R !== 'string') return;
				return this.getReactiveBinding(R);
			},
		});
	}
	getReactiveDependency(H) {
		let R = this.reactiveDependencies.get(H);
		if (R) return R;
		let F = new O0(() => this.readReactiveDependencyValue(H));
		return (this.reactiveDependencies.set(H, F), F);
	}
	readReactiveDependencyValue(H) {
		let R = this.reactiveDependencyReaders.get(H);
		if (R) return R();
		return this.readReactiveBindingValue(H);
	}
	readReactiveBindingValue(H) {
		let R = this.access.readProperty(this.host, H);
		if (hH(R)) return R.get();
		return R;
	}
}
var e = Symbol.for('@ecopages/radiant.ssr-preparation-callbacks'),
	f0 = Symbol.for('@ecopages/radiant.ssr-preparation-running');
function b0(H, R) {
	let M = H[e];
	if (Array.isArray(M)) {
		M.push(R);
		return;
	}
	Object.defineProperty(H, e, { value: [R], configurable: !0 });
}
function V0(H) {
	let R = H,
		F = R[e];
	if (!Array.isArray(F)) return;
	R[f0] = !0;
	try {
		for (let M of F) M();
	} finally {
		delete R[f0];
	}
}
var yH = Symbol.for('@ecopages/radiant.hydrator-installed');
function v0() {
	return globalThis[yH] === !0;
}
var dH = Symbol.for('@ecopages/radiant.component-ssr-runtime');
function N0() {
	return globalThis[dH];
}
function h0(H) {
	switch (H) {
		case Array:
			return 'array';
		case Boolean:
			return 'boolean';
		case Number:
			return 'number';
		case Object:
			return 'object';
		case String:
			return 'string';
	}
}
function mH(H) {
	switch (typeof H) {
		case 'boolean':
			return 'boolean';
		case 'number':
			return 'number';
		case 'string':
			return 'string';
	}
	if (Array.isArray(H)) return 'array';
	if (Object.prototype.toString.call(H) === '[object Object]') return 'object';
}
function E(H) {
	switch (H) {
		case Number:
			return 0;
		case String:
			return '';
		case Boolean:
			return !1;
		default:
			return null;
	}
}
function cH(H) {
	try {
		return JSON.parse(H);
	} catch {
		throw TypeError('Invalid JSON string');
	}
}
var sH = {
		array(H) {
			let R = cH(H);
			if (!Array.isArray(R)) throw TypeError(`Expected an array but got a value of type "${typeof R}"`);
			return R;
		},
		boolean(H) {
			return !(H === '0' || String(H).toLowerCase() === 'false');
		},
		number(H) {
			return Number(H.replace(/_/g, ''));
		},
		object(H) {
			let R = JSON.parse(H);
			if (R === null || typeof R !== 'object' || Array.isArray(R))
				throw TypeError(`expected value of type "object" but instead got value "${H}" of type "${mH(R)}"`);
			return R;
		},
		string(H) {
			return H;
		},
	},
	g0 = { default: y0, array: u0, object: u0 };
function u0(H) {
	return JSON.stringify(H);
}
function y0(H) {
	return `${H}`;
}
function z(H, R) {
	let F = h0(R);
	if (!F) throw TypeError(`[radiant-element] Unknown type "${R}"`);
	return sH[F](H);
}
function f(H, R) {
	let F = h0(R);
	if (!F) throw TypeError(`[radiant-element] Unknown type "${R}"`);
	return (g0[F] ?? g0.default ?? y0)(H);
}
function iH(H) {
	return typeof H === 'boolean';
}
function pH(H) {
	return typeof H === 'number';
}
function nH(H) {
	return typeof H === 'string';
}
function rH(H) {
	return Array.isArray(H);
}
function lH(H) {
	return typeof H === 'object' && !Array.isArray(H) && H !== null;
}
function D(H, R) {
	switch (H) {
		case Boolean:
			return iH(R);
		case Number:
			return pH(R);
		case String:
			return nH(R);
		case Array:
			return rH(R);
		case Object:
			return lH(R);
		default:
			return !1;
	}
}
var d0 = (H, R, F, M) => {
	if (R === Boolean) {
		let P = H.getAttribute(F);
		if (P === null) return M;
		return P === '' ? !0 : z(P, R);
	}
	let B = H.getAttribute(F);
	return B !== null ? z(B, R) : (M ?? E(R));
};
var aH = eH();
function eH() {
	if (typeof HTMLElement < 'u') return HTMLElement;
	throw Error(
		"RadiantElement requires HTMLElement. Install '@ecopages/radiant/server/light-dom-shim' before importing Radiant components in SSR.",
	);
}
class V extends aH {
	renderRootMode = 'light';
	bindings;
	$;
	reactiveHost;
	reactiveProperties = new Map();
	contextProviders = new Map();
	hydrationBindings = new Map();
	eventSubscriptions = new Map();
	eventEmitters = new Map();
	elementReady = !1;
	isRendering = !1;
	isFirstConnectPending = !1;
	isRenderScheduled = !1;
	needsRender = !1;
	preUpgradePropertyValues = new Map();
	constructor() {
		super();
		for (let H of Object.getOwnPropertyNames(this)) this.preUpgradePropertyValues.set(H, this[H]);
		((this.reactiveHost = new S(
			this,
			{
				defineProperty: (H, R, F) => Object.defineProperty(H, R, F),
				getBindingTarget: (H) => Object.getPrototypeOf(H) ?? H,
				hasProperty: (H, R) => R in H,
				readProperty: (H, R) => H[R],
			},
			() => this.shouldAutoBindReactiveMembers(),
		)),
			(this.bindings = this.reactiveHost.bindings),
			(this.$ = this.reactiveHost.$),
			w(this));
	}
	get slotProjectionVersion() {
		return E0(this);
	}
	connectedCallback() {
		let H = this.isFirstConnectPending;
		if (((this.elementReady = !0), this.reactiveHost.connectHost(), H)) return;
		((this.isFirstConnectPending = !0),
			queueMicrotask(() => {
				if (((this.isFirstConnectPending = !1), !this.isConnected)) return;
				if (!this.shouldRunRenderLifecycle()) return;
				if ((this.getOrCreateRenderRuntime().observeSlotProjection(), m0(this))) {
					if (((this.needsRender = !1), this.hydrate(), this.needsRender)) this.update();
					return;
				}
				this.update();
			}));
	}
	connectedContextCallback(H) {}
	disconnectedCallback() {
		(K0(this), this.removeAllSubscribedEvents(), this.reactiveHost.disconnectHost());
	}
	notifyUpdate(H, R, F) {
		this.reactiveHost.notifyUpdate(H, R, F);
	}
	transformAttributeValue(H, R) {
		return H !== null ? R?.converter.fromAttribute(H) : H;
	}
	attributeChangedCallback(H, R, F) {
		if (R === F || !this.elementReady) return;
		if (this.reactiveProperties.has(H)) {
			let M = this.reactiveProperties.get(H),
				B = this.transformAttributeValue(F, M),
				P = this.transformAttributeValue(R, M),
				x = M ? M.attribute : H;
			((this[x] = B), this.notifyUpdate(H, P, B));
		}
	}
	renderTemplate({ target: H = this, template: R, insert: F = 'replace', sanitize: M }) {
		let B = M ? M(R) : R;
		switch (F) {
			case 'replace':
				H.innerHTML = B;
				break;
			case 'beforeend':
				H.insertAdjacentHTML('beforeend', B);
				break;
			case 'afterbegin':
				H.insertAdjacentHTML('afterbegin', B);
				break;
			case 'beforebegin':
				H.insertAdjacentHTML('beforebegin', B);
				break;
			case 'afterend':
				H.insertAdjacentHTML('afterend', B);
				break;
		}
	}
	render() {
		return tH('slot', {});
	}
	renderToString(H = {}) {
		if (!this.shouldRunRenderLifecycle()) return this.innerHTML;
		return (this.prepareForSsr(), b().renderView(this[k](), H));
	}
	renderHost() {
		return (this.assertSupportsHostSsrRendering(), b().renderHost(this[k]()));
	}
	renderHostToString(H = {}) {
		return (this.assertSupportsHostSsrRendering(), b().renderHostToString(this[k](), H));
	}
	hydrate() {
		if (!this.shouldRunRenderLifecycle() || !this.isConnected || this.isRendering) return;
		let H = this.getRenderTarget(),
			R = this.getOrCreateRenderRuntime();
		this.isRendering = !0;
		try {
			R.hydrate(H);
		} finally {
			this.isRendering = !1;
		}
	}
	requestUpdate() {
		if (!this.shouldRunRenderLifecycle()) return;
		if (((this.needsRender = !0), this.isRenderScheduled)) return;
		((this.isRenderScheduled = !0),
			queueMicrotask(() => {
				if (((this.isRenderScheduled = !1), !this.needsRender)) return;
				this.update();
			}));
	}
	update() {
		if (!this.shouldRunRenderLifecycle()) return;
		let H = this.getRenderTarget(),
			R = this.getOrCreateRenderRuntime();
		if (((this.needsRender = !0), !this.isConnected || this.isRendering)) return;
		if (this.isFirstConnectPending && m0(this)) return;
		while (this.needsRender && this.isConnected) {
			((this.needsRender = !1), (this.isRendering = !0));
			try {
				R.render(H);
			} finally {
				this.isRendering = !1;
			}
		}
	}
	registerReactiveProperty(H) {
		this.reactiveProperties.set(H.name, H);
	}
	getReactiveProperties() {
		return Array.from(this.reactiveProperties.values());
	}
	registerReactiveDependencyReader(H, R) {
		this.reactiveHost.registerReactiveDependencyReader(H, R);
	}
	registerContextProvider(H, R) {
		(this.contextProviders.set(H, R), this.registerHydrationBinding(H, R));
	}
	registerHydrationBinding(H, R) {
		this.hydrationBindings.set(H, R);
	}
	getContextProviders() {
		return Array.from(this.contextProviders.values());
	}
	getHydrationBindings() {
		return Array.from(this.hydrationBindings.values());
	}
	prepareForSsr() {
		V0(this);
	}
	shouldAutoBindReactiveMembers() {
		return !0;
	}
	shouldRunRenderLifecycle() {
		return this.render !== V.prototype.render;
	}
	getRenderTarget() {
		if (this.renderRootMode !== 'shadow') return this;
		if (this.shadowRoot) return this.shadowRoot;
		if (typeof this.attachShadow !== 'function')
			throw Error('RadiantElement shadow render mode requires attachShadow().');
		return this.attachShadow({ mode: 'open' });
	}
	getHostSsrAttributes() {
		return b().getHostAttributes(this[k]());
	}
	resolveSsrRenderBridge() {
		let H = {};
		if (this.renderHostToString === V.prototype.renderHostToString)
			H.renderHostToString = (R) => this.renderHostToString(R);
		if (this.renderHost === V.prototype.renderHost) H.renderHost = () => this.renderHost();
		return H;
	}
	registerUpdateCallback(H, R) {
		return this.reactiveHost.registerUpdateCallback(H, R);
	}
	getReactiveBinding(H) {
		return this.reactiveHost.getReactiveBinding(H);
	}
	bind(H) {
		return this.reactiveHost.bind(H);
	}
	defineReactiveBinding(H, R = !0) {
		this.reactiveHost.defineReactiveBinding(H, R);
	}
	trackReactiveRead(H) {
		this.reactiveHost.trackReactiveRead(H);
	}
	subscribeEvents(H) {
		let R = [];
		for (let F of H) R.push(this.subscribeEvent(F));
		return R;
	}
	subscribeEvent(H) {
		let R = this.getEventSubscriptionTarget(),
			F = (B) => {
				if (B.target && B.target.matches(H.selector)) H.listener.call(this, B);
			},
			M = `${H.type}:${H.selector}`;
		return (
			R.addEventListener(H.type, F, H.options),
			this.eventSubscriptions.set(M, { ...H, listener: F, target: R }),
			this.unsubscribeEvent.bind(this, M)
		);
	}
	unsubscribeEvent(H) {
		let R = this.eventSubscriptions.get(H);
		if (R) (R.target.removeEventListener(R.type, R.listener, R.options), this.eventSubscriptions.delete(H));
	}
	removeAllSubscribedEvents() {
		for (let H of this.eventSubscriptions.values()) H.target.removeEventListener(H.type, H.listener, H.options);
		this.eventSubscriptions.clear();
	}
	registerCleanupCallback(H) {
		this.reactiveHost.registerCleanupCallback(H);
	}
	registerConnectedCallback(H) {
		this.reactiveHost.registerConnectedCallback(H);
	}
	registerEventEmitter(H, R) {
		this.eventEmitters.set(H, R);
	}
	getRef(H, R = !1) {
		let F = `[data-ref="${H}"]`,
			M = this.getQueryRoot();
		if (R) return Array.from(M.querySelectorAll(F));
		return M.querySelector(F) ?? null;
	}
	getSlotElement(H) {
		return this.getOrCreateRenderRuntime().getSlotElement(H);
	}
	getSlotElements(H) {
		return this.getOrCreateRenderRuntime().getSlotElements(H);
	}
	createReactiveField(H, R, F = {}) {
		this.reactiveHost.createReactiveField(H, R, F);
	}
	createReactiveProp(H, R) {
		let { type: F, attribute: M, reflect: B, defaultValue: P } = R,
			x = M ?? H,
			$ = this.preUpgradePropertyValues.has(H),
			A = $ ? this.preUpgradePropertyValues.get(H) : void 0;
		if (P !== void 0 && !D(F, P)) throw Error(`defaultValue does not match the expected type for ${F.name}`);
		let W = $ ? A : d0(this, F, x, P);
		if (this.hasAttribute(x) && (!B || W == null || W === '')) this.removeAttribute(x);
		if ($ && Object.prototype.hasOwnProperty.call(this, H)) Reflect.deleteProperty(this, H);
		let X = {
			type: F,
			name: H,
			value: W,
			initialValue: W,
			attribute: x,
			converter: { fromAttribute: (Z) => z(Z, F), toAttribute: (Z) => f(Z, F) },
		};
		this.registerReactiveProperty(X);
		let Q = (Z) => {
			if (B)
				if (Z == null || Z === '' || Z === !1) this.removeAttribute(x);
				else {
					let J = X.converter.toAttribute(Z);
					this.setAttribute(x, J);
				}
		};
		if (
			(this.reactiveHost.defineReactiveAccessor(H, {
				bind: R.bind,
				getValue: () => this.reactiveProperties.get(H)?.value,
				setValue: (Z) => {
					(this.reactiveProperties.set(H, { ...X, value: Z }), Q(Z));
				},
			}),
			W !== void 0)
		)
			queueMicrotask(() => {
				let Z = this.reactiveProperties.get(H)?.value;
				if (Z === void 0) return;
				(Q(Z), this.notifyUpdate(H, void 0, Z));
			});
	}
	getSlotProjectionScriptTag() {
		return this.getOrCreateRenderRuntime().getSlotProjectionScriptTag();
	}
	getAuthoredHydrationScriptMarkup() {
		return this.getOrCreateRenderRuntime().getAuthoredHydrationScriptMarkup();
	}
	resolveTrackedRenderOutput() {
		return this.getOrCreateRenderRuntime().resolveTrackedRenderOutput();
	}
	getOrCreateRenderRuntime() {
		return S0(this);
	}
	[k]() {
		return w0(this);
	}
	getEventSubscriptionTarget() {
		let H = this.getRenderTarget();
		return H instanceof ShadowRoot ? H : this;
	}
	getQueryRoot() {
		let H = this.getRenderTarget();
		return H instanceof ShadowRoot ? H : this;
	}
	assertSupportsHostSsrRendering() {
		if (this.renderRootMode === 'shadow')
			throw Error('RadiantElement shadow render mode does not support renderHost() or renderHostToString().');
	}
}
function b() {
	let H = N0();
	if (!H)
		throw Error(
			'Radiant SSR runtime is unavailable. Import `@ecopages/radiant/server/render-component` before using instance SSR methods.',
		);
	return H;
}
function m0(H) {
	return v0() && oH(H);
}
import { render as HR } from '@ecopages/jsx';
import { Computed as RR, subtle as FR } from '@ecopages/signals';
class c0 {
	host;
	element;
	bindings;
	$;
	reactiveHost;
	connected = !1;
	isRendering = !1;
	isRenderScheduled = !1;
	isSsrLifecycle = !1;
	needsRender = !1;
	renderSignal;
	renderWatcher = new FR.Watcher(() => {
		this.requestUpdate();
	});
	constructor(H) {
		((this.host = H),
			(this.element = H),
			(this.reactiveHost = new S(
				this,
				{
					defineProperty: (R, F, M) => Object.defineProperty(R, F, M),
					hasProperty: (R, F) => F in R,
					readProperty: (R, F) => R[F],
				},
				() => this.shouldAutoBindReactiveMembers(),
			)),
			(this.bindings = this.reactiveHost.bindings),
			(this.$ = this.reactiveHost.$),
			w(this));
	}
	connect() {
		if (((this.connected = !0), this.reactiveHost.connectHost(), this.shouldRunRenderLifecycle())) this.update();
	}
	connectForSsrRender() {
		this.isSsrLifecycle = !0;
		try {
			this.connect();
		} finally {
			this.isSsrLifecycle = !1;
		}
	}
	disconnect() {
		((this.connected = !1), this.disconnectRenderWatcher(), this.reactiveHost.disconnectHost());
	}
	disconnectForSsrRender() {
		this.disconnect();
	}
	get isConnected() {
		return this.connected;
	}
	render() {
		return null;
	}
	requestUpdate() {
		if (!this.shouldRunRenderLifecycle()) return;
		if (((this.needsRender = !0), this.isRenderScheduled)) return;
		((this.isRenderScheduled = !0),
			queueMicrotask(() => {
				if (((this.isRenderScheduled = !1), !this.needsRender)) return;
				this.update();
			}));
	}
	update() {
		if (!this.shouldRunRenderLifecycle()) return;
		let H = this.getRenderTarget();
		if (!H) return;
		if (((this.needsRender = !0), !this.connected || this.isRendering)) return;
		while (this.needsRender) {
			((this.needsRender = !1), (this.isRendering = !0));
			try {
				HR(this.resolveTrackedRenderOutput(), H);
			} finally {
				this.isRendering = !1;
			}
		}
	}
	bind(H) {
		return this.reactiveHost.bind(H);
	}
	getReactiveBinding(H) {
		return this.reactiveHost.getReactiveBinding(H);
	}
	createReactiveField(H, R, F = {}) {
		this.reactiveHost.createReactiveField(H, R, F);
	}
	createReactiveProp(H, R) {
		let { type: F, defaultValue: M, bind: B } = R;
		if (M !== void 0 && !D(F, M)) throw Error(`defaultValue does not match the expected type for ${F.name}`);
		let P = Object.getOwnPropertyDescriptor(this.host, H),
			x = this.host,
			A = x[H] ?? M ?? E(F);
		(this.reactiveHost.defineReactiveAccessor(H, {
			bind: B,
			getValue: () => A,
			setValue: (W) => {
				A = W;
			},
			notifyInitialValue: A,
		}),
			Object.defineProperty(this.host, H, {
				get: () => this[H],
				set: (W) => {
					this[H] = W;
				},
				enumerable: P?.enumerable ?? !0,
				configurable: !0,
			}),
			this.registerCleanupCallback(() => {
				let W = this[H];
				if (P) {
					if ((Object.defineProperty(this.host, H, P), 'value' in P && P.writable)) x[H] = W;
					return;
				}
				delete x[H];
				try {
					x[H] = W;
				} catch {
					Object.defineProperty(this.host, H, { value: W, writable: !0, enumerable: !0, configurable: !0 });
				}
			}));
	}
	defineReactiveBinding(H, R = !0) {
		this.reactiveHost.defineReactiveBinding(H, R);
	}
	notifyUpdate(H, R, F) {
		this.reactiveHost.notifyUpdate(H, R, F);
	}
	registerUpdateCallback(H, R) {
		return this.reactiveHost.registerUpdateCallback(H, R);
	}
	connectedContextCallback(H) {}
	registerContextProvider(H, R) {}
	registerHydrationBinding(H, R) {}
	registerCleanupCallback(H) {
		this.reactiveHost.registerCleanupCallback(H);
	}
	registerConnectedCallback(H) {
		this.reactiveHost.registerConnectedCallback(H);
	}
	registerReactiveDependencyReader(H, R) {
		this.reactiveHost.registerReactiveDependencyReader(H, R);
	}
	trackReactiveRead(H) {
		this.reactiveHost.trackReactiveRead(H);
	}
	addEventListener(H, R, F) {
		this.host.addEventListener(H, R, F);
	}
	removeEventListener(H, R, F) {
		this.host.removeEventListener(H, R, F);
	}
	dispatchEvent(H) {
		return this.host.dispatchEvent(H);
	}
	getRef(H, R = !1) {
		let F = `[data-ref="${H}"]`;
		if (R) return Array.from(this.host.querySelectorAll(F));
		return this.host.querySelector(F) ?? null;
	}
	shouldAutoBindReactiveMembers() {
		return !0;
	}
	shouldRunRenderLifecycle() {
		return !this.isSsrLifecycle && this.render !== c0.prototype.render;
	}
	getRenderTarget() {
		return this.host instanceof HTMLElement ? this.host : null;
	}
	disconnectRenderWatcher() {
		if (!this.renderSignal) return;
		(this.renderWatcher.unwatch(this.renderSignal), (this.renderSignal = void 0));
	}
	resolveTrackedRenderOutput() {
		let H = new RR(() => this.render()),
			R = H.get();
		if (!this.connected) return R;
		if (this.renderSignal) this.renderWatcher.unwatch(this.renderSignal);
		return ((this.renderSignal = H), this.renderWatcher.watch(H), R);
	}
}
var MR = Symbol.for('@ecopages/radiant.controllerIdentifier');
function H0(H, R) {
	H[MR] = R;
}
var N = 'data-controller',
	s0 = Symbol.for('@ecopages/radiant.controller-registry-state');
function BR() {
	let H = globalThis,
		R = H[s0];
	if (R) return R;
	let F = {
		activeRuntimes: new Set(),
		controllerRegistrationStrategy: 'keep-current',
		controllerRegistry: new Map(),
	};
	return ((H[s0] = F), F);
}
var g = BR(),
	L = g.controllerRegistry,
	_ = g.activeRuntimes;
function i0(H) {
	let R = H.getAttribute(N);
	if (!R) return [];
	return R.split(/\s+/)
		.map((F) => F.trim())
		.filter((F) => F.length > 0);
}
function v(H, R) {
	if (H instanceof Element && H.hasAttribute(N)) R(H);
	for (let F of Array.from(H.querySelectorAll(`[${N}]`))) R(F);
}
class p0 {
	root;
	controllersByElement = new Map();
	observer;
	stopped = !1;
	constructor(H = document) {
		this.root = H;
		this.start();
	}
	stop() {
		if (this.stopped) return;
		((this.stopped = !0), this.observer?.disconnect(), (this.observer = void 0));
		for (let [H, R] of this.controllersByElement) for (let [F] of R) this.disconnectController(H, F);
		_.delete(this);
	}
	reconcileRegisteredController(H) {
		v(this.root, (R) => {
			if (!i0(R).includes(H)) return;
			this.connectController(R, H);
		});
	}
	replaceRegisteredController(H) {
		for (let [R, F] of Array.from(this.controllersByElement.entries())) {
			if (!F.has(H)) continue;
			this.disconnectController(R, H);
		}
		this.reconcileRegisteredController(H);
	}
	start() {
		if (
			(v(this.root, (R) => {
				this.reconcileElement(R);
			}),
			typeof MutationObserver > 'u')
		) {
			_.add(this);
			return;
		}
		this.observer = new MutationObserver((R) => {
			for (let F of R) {
				if (F.type === 'attributes' && F.target instanceof Element) {
					this.reconcileElement(F.target);
					continue;
				}
				for (let M of Array.from(F.removedNodes)) {
					if (!(M instanceof Element)) continue;
					v(M, (B) => {
						this.disconnectElementControllers(B);
					});
				}
				for (let M of Array.from(F.addedNodes)) {
					if (!(M instanceof Element)) continue;
					v(M, (B) => {
						this.reconcileElement(B);
					});
				}
			}
		});
		let H = this.root instanceof Document ? this.root.documentElement : this.root;
		(this.observer.observe(H, { attributeFilter: [N], attributes: !0, childList: !0, subtree: !0 }), _.add(this));
	}
	reconcileElement(H) {
		let R = new Set(i0(H)),
			F = this.controllersByElement.get(H);
		if (F) {
			for (let M of F.keys()) if (!R.has(M)) this.disconnectController(H, M);
		}
		for (let M of R) this.connectController(H, M);
	}
	connectController(H, R) {
		let F = L.get(R);
		if (!F) return;
		let M = this.controllersByElement.get(H);
		if (!M) ((M = new Map()), this.controllersByElement.set(H, M));
		if (M.has(R)) return;
		let B = new F(H);
		(M.set(R, B), B.connect());
	}
	disconnectController(H, R) {
		let F = this.controllersByElement.get(H);
		if (!F) return;
		let M = F.get(R);
		if (!M) return;
		if ((M.disconnect(), F.delete(R), F.size === 0)) this.controllersByElement.delete(H);
	}
	disconnectElementControllers(H) {
		let R = this.controllersByElement.get(H);
		if (!R) return;
		for (let F of Array.from(R.keys())) this.disconnectController(H, F);
	}
}
function PR(H, R) {
	let F = L.get(H);
	if (F) return F;
	(H0(R, H), L.set(H, R));
	for (let M of Array.from(_)) M.reconcileRegisteredController(H);
	return R;
}
function BF(H) {
	return L.has(H);
}
function PF(H) {
	return L.get(H);
}
function xR(H, R) {
	if (L.get(H) === R) return R;
	(H0(R, H), L.set(H, R));
	for (let M of Array.from(_)) M.replaceRegisteredController(H);
	return R;
}
function n0(H) {
	g.controllerRegistrationStrategy = H;
}
function xF() {
	n0('replace');
}
function $F() {
	n0('keep-current');
}
function r0(H, R) {
	if (g.controllerRegistrationStrategy === 'replace') return xR(H, R);
	return PR(H, R);
}
function AF(H = document) {
	return new p0(H);
}
function WF() {
	for (let H of Array.from(_)) H.stop();
}
function $R(H) {
	return typeof H === 'function';
}
function j(H, R, F, M) {
	if (typeof M === 'object') return H(void 0, M);
	return R(F, M);
}
function U(H, R, F, M, B) {
	if (typeof M === 'object') {
		if (!$R(F)) throw TypeError('Standard method decorators require a method target');
		return H(F, M);
	}
	if (!B) throw TypeError('Legacy method decorators require a property descriptor');
	return R(F, M, B);
}
function R0(H) {
	if (H instanceof Element) return H;
	if ('host' in H) return H.host;
	return H.element;
}
function AR(H) {
	return H.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/_/g, '-')
		.toLowerCase();
}
function WR(H, R) {
	if (R.converter?.fromAttribute) {
		let F = R.converter.fromAttribute(H);
		if (H === null && F === void 0 && 'defaultValue' in R) return R.defaultValue;
		return F;
	}
	if (R.type) {
		if (H === null) return R.defaultValue ?? E(R.type);
		if (R.type === Boolean && H === '') return !0;
		return z(H, R.type);
	}
	if (H === null) return R.defaultValue;
	return H;
}
function T(H, R, F) {
	return WR(R0(H).getAttribute(R), F);
}
function ZR(H, R, F, M) {
	let B = M.converter?.toAttribute
		? M.converter.toAttribute(F)
		: M.type
			? f(F, M.type)
			: F == null
				? null
				: String(F);
	if (B === null) {
		H.removeAttribute(R);
		return;
	}
	H.setAttribute(R, B);
}
function u(H, R, F = {}) {
	if (F.type && F.defaultValue !== void 0 && !D(F.type, F.defaultValue))
		throw Error(`defaultValue does not match the expected type for ${F.type.name}`);
	let M = H,
		B = F.source ?? AR(R),
		P = Symbol(`@ecopages/radiant/attr:${R}:observer`),
		x = Symbol(`@ecopages/radiant/attr:${R}:last-value`),
		$ = F.bind ?? H.shouldAutoBindReactiveMembers?.() ?? !1;
	(H.defineReactiveBinding(R, $),
		H.registerReactiveDependencyReader(R, () => T(H, B, F)),
		(M[x] = T(H, B, F)),
		Object.defineProperty(H, R, {
			get() {
				return (H.trackReactiveRead(R), T(this, B, F));
			},
			set(X) {
				let Q = R0(this),
					Z = T(this, B, F);
				ZR(Q, B, X, F);
				let J = T(this, B, F);
				if (Object.is(Z, J)) return;
				((this[x] = J), H.notifyUpdate(R, Z, J));
			},
			enumerable: !0,
			configurable: !0,
		}));
	let A = () => {
			M[P]?.disconnect();
		},
		W = () => {
			let X = T(H, B, F),
				Q = M[x];
			if (!Object.is(Q, X)) ((M[x] = X), H.notifyUpdate(R, Q, X));
			if (typeof MutationObserver > 'u') return;
			let Z = R0(H);
			A();
			let J = new MutationObserver(() => {
				let r = T(H, B, F),
					P0 = M[x];
				if (Object.is(P0, r)) return;
				((M[x] = r), H.notifyUpdate(R, P0, r));
			});
			(J.observe(Z, { attributeFilter: [B], attributes: !0 }), (M[P] = J));
		};
	(W(), H.registerConnectedCallback(W), H.registerCleanupCallback(A));
}
function l0(H = {}) {
	return (R, F) => {
		let M = Symbol(`@ecopages/radiant/attr:${F}:installed`);
		G(R, (B) => {
			B.registerConnectedCallback(() => {
				if (B[M]) return;
				let P = B[F],
					x = H.defaultValue === void 0 ? P : H.defaultValue;
				(u(B, F, { ...H, defaultValue: x }), (B[M] = !0));
			});
		});
	};
}
function o0(H = {}) {
	return function (R, F) {
		let M = String(F.name),
			B = Symbol(`@ecopages/radiant/attr:${M}:initializer`);
		return (
			F.addInitializer(function () {
				let P = this[B],
					x = H.defaultValue === void 0 ? P : H.defaultValue;
				u(this, M, { ...H, defaultValue: x });
			}),
			function (P) {
				return ((this[B] = P), P);
			}
		);
	};
}
function kF(H = {}) {
	function R(F, M) {
		return j(o0(H), l0(H), F, M);
	}
	return R;
}
function t0(H, R, F) {
	let M = F.value;
	return {
		configurable: !0,
		get() {
			if (this === H.prototype || Object.prototype.hasOwnProperty.call(this, R)) return M;
			let B = M.bind(this);
			return (Object.defineProperty(this, R, { value: B, configurable: !0, writable: !0 }), B);
		},
	};
}
function a0(H, R) {
	let F = String(R.name);
	if (R.private) throw Error(`'bound' cannot decorate private properties like ${F}.`);
	R.addInitializer(function () {
		this[F] = this[F].bind(this);
	});
}
function wF(H, R, F) {
	return U(a0, t0, H, R, F);
}
function fF(H) {
	return function (R) {
		return r0(H, R);
	};
}
var XR = Symbol.for('@ecopages/radiant.customElementTagName');
function h(H, R) {
	H[XR] = R;
}
function e0(H, R) {
	return (F) => {
		if ((h(F, H), typeof customElements < 'u' && !customElements.get(H))) customElements.define(H, F, R);
	};
}
function HH(H, R) {
	return function (F, M) {
		M.addInitializer(function () {
			if ((h(this, H), typeof customElements < 'u' && !customElements.get(H))) customElements.define(H, this, R);
		});
	};
}
function dF(H, R) {
	function F(M, B) {
		if (typeof B < 'u') return HH(H, R)(M, B);
		return e0(H, R)(M);
	}
	return F;
}
function y(H, R) {
	let F = null,
		M = null,
		B,
		P = () => {
			if (F !== null) (clearTimeout(F), (F = null));
		},
		x = () => {
			if (M === null) return B;
			let A = M;
			return ((M = null), P(), (B = A()), B);
		},
		$ = function (...A) {
			((M = () => H.apply(this, A)),
				P(),
				(F = setTimeout(() => {
					x();
				}, R)));
		};
	return (
		($.cancel = () => {
			(P(), (M = null));
		}),
		($.flush = () => {
			if (M === null) return B;
			return x();
		}),
		($.pending = () => M !== null),
		$
	);
}
function RH(H) {
	return (R, F, M) => {
		let B = M.value,
			P = new WeakMap();
		return (
			(M.value = function (...$) {
				let A = P.get(this);
				if (!A)
					((A = y((...W) => {
						return B.apply(this, W);
					}, H)),
						P.set(this, A));
				A(...$);
			}),
			M
		);
	};
}
function FH(H) {
	return (R) => {
		let F = new WeakMap();
		return function (...M) {
			let B = F.get(this);
			if (!B)
				((B = y((...P) => {
					return R.apply(this, P);
				}, H)),
					F.set(this, B));
			B(...M);
		};
	};
}
function tF(H) {
	function R(F, M, B) {
		return U(FH(H), RH(H), F, M, B);
	}
	return R;
}
class F0 {
	host;
	eventConfig;
	constructor(H, R) {
		((this.host = H), (this.eventConfig = R));
	}
	emit(H) {
		let R = new CustomEvent(this.eventConfig.name, {
			detail: H,
			bubbles: this.eventConfig.bubbles,
			cancelable: this.eventConfig.cancelable,
			composed: this.eventConfig.composed,
		});
		this.host.dispatchEvent(R);
	}
}
function d(H, R) {
	let F = new F0(H, R);
	return (H.registerEventEmitter(R.name, F), F);
}
function MH(H) {
	return (R, F) => {
		G(R, (M) => {
			let B = d(M, H);
			M.registerConnectedCallback(() => {
				Object.defineProperty(M, F, {
					get() {
						return B;
					},
					enumerable: !0,
					configurable: !0,
				});
			});
		});
	};
}
function BH(H) {
	return function (R, F) {
		F.addInitializer(function () {
			let M = d(this, H);
			Object.defineProperty(this, F.name, {
				get() {
					return M;
				},
				enumerable: !0,
				configurable: !0,
			});
		});
	};
}
function ZM(H) {
	function R(F, M) {
		return j(BH(H), MH(H), F, M);
	}
	return R;
}
function PH(H) {
	let R = globalThis.CSS;
	if (typeof R?.escape === 'function') return R.escape(H);
	let F = '';
	for (let M = 0; M < H.length; M += 1) {
		let B = H[M] ?? '',
			P = B.codePointAt(0) ?? 0;
		if (P === 0) {
			F += '�';
			continue;
		}
		let x = (P >= 1 && P <= 31) || P === 127,
			$ = M === 0 && P >= 48 && P <= 57,
			A = M === 1 && P >= 48 && P <= 57 && (H[0] ?? '') === '-',
			W = M === 0 && B === '-' && H.length === 1;
		if (x || $ || A) {
			F += `\\${P.toString(16)} `;
			continue;
		}
		if (
			P >= 128 ||
			B === '-' ||
			B === '_' ||
			(P >= 48 && P <= 57) ||
			(P >= 65 && P <= 90) ||
			(P >= 97 && P <= 122)
		) {
			F += W ? `\\${B}` : B;
			continue;
		}
		F += `\\${B}`;
	}
	return F;
}
var m = Symbol('radiant.shadowRootListenerHooks'),
	xH = Symbol('radiant.patchedAttachShadow');
function AH(H) {
	if (H instanceof Element) return H;
	if ('host' in H) return H.host;
	return H.element;
}
function GR(H) {
	return !(H instanceof Element);
}
function $H(H, R, F, M) {
	let B = (P) => {
		if (P.target instanceof Element && P.target.matches(F)) M(P);
	};
	return (
		H.addEventListener(R.type, B, R.options),
		() => {
			H.removeEventListener(R.type, B, R.options);
		}
	);
}
function QR(H, R) {
	let F = AH(H);
	if (!F[m]) F[m] = new Set();
	if ((F[m].add(R), F[xH])) return;
	let M = F.attachShadow;
	((F.attachShadow = function (P) {
		let x = M.call(this, P);
		for (let $ of F[m] ?? []) $();
		return x;
	}),
		(F[xH] = !0));
}
function c(H, R, F) {
	if (GR(H) && 'scope' in R && R.scope && R.scope !== 'light')
		throw Error('RadiantController event listeners only support light DOM scope.');
	let M = AH(H),
		B = F.bind(H),
		P = null,
		x = null,
		$ = null,
		A = null,
		W = !1,
		X = () => {
			(P?.(), x?.(), $?.(), A?.(), (P = null), (x = null), ($ = null), (A = null));
		},
		Q = () => {
			if (W) return;
			if ('window' in R && !P)
				(window.addEventListener(R.type, B, R.options),
					(P = () => {
						window.removeEventListener(R.type, B, R.options);
					}));
			if ('document' in R && !x)
				(document.addEventListener(R.type, B, R.options),
					(x = () => {
						document.removeEventListener(R.type, B, R.options);
					}));
			if ('selector' in R || 'ref' in R) {
				let Z = 'selector' in R ? R.selector : `[data-ref='${PH(R.ref)}']`;
				if (R.scope !== 'shadow' && !$) $ = $H(M, R, Z, B);
				if (R.scope !== 'light' && M.shadowRoot && !A) A = $H(M.shadowRoot, R, Z, B);
			}
		};
	if ('selector' in R || 'ref' in R) {
		if (R.scope !== 'light')
			QR(H, () => {
				if (H.isConnected) Q();
			});
	}
	if ((H.registerConnectedCallback(Q), H.registerCleanupCallback(X), H.isConnected)) Q();
	return () => {
		((W = !0), X());
	};
}
function WH(H) {
	return (R, F, M) => {
		let B = M.value;
		return (
			G(R, (P) => {
				c(P, H, B.bind(P));
			}),
			M
		);
	};
}
function ZH(H) {
	return function (R, F) {
		F.addInitializer(function () {
			c(this, H, R.bind(this));
		});
	};
}
function zM(H) {
	function R(F, M, B) {
		return U(ZH(H), WH(H), F, M, B);
	}
	return R;
}
function XH(H) {
	return (R, F) => {
		let M = Symbol(`@ecopages/radiant/on-updated:${F}:cleanup`);
		G(R, (B) => {
			(B.registerConnectedCallback(() => {
				let P = B[F].bind(B),
					x = [];
				if (Array.isArray(H)) for (let $ of H) x.push(B.registerUpdateCallback($, P));
				else if (typeof H === 'string') x.push(B.registerUpdateCallback(H, P));
				B[M] = () => {
					for (let $ of x) $();
				};
			}),
				B.registerCleanupCallback(() => {
					let P = B[M];
					if (typeof P === 'function') (P(), delete B[M]);
				}));
		});
	};
}
function GH(H) {
	return function (R, F) {
		F.addInitializer(function () {
			let M = R.bind(this);
			if ((Object.defineProperty(this, F.name, { value: M, configurable: !0, writable: !0 }), Array.isArray(H)))
				for (let B of H) this.registerUpdateCallback(B, M);
			else if (typeof H === 'string') this.registerUpdateCallback(H, M);
		});
	};
}
function OM(H) {
	function R(F, M, B) {
		return U(GH(H), XH(H), F, M, B);
	}
	return R;
}
var QH = Symbol.for('@ecopages/radiant.reactivePropDefinitions');
function s(H, R, F) {
	let M = H.constructor,
		B = M[QH] ?? [];
	if (B.some((P) => P.name === R)) return;
	(B.push({ name: R, options: F }), (M[QH] = B));
}
function jH({ type: H, attribute: R, reflect: F, defaultValue: M, bind: B }) {
	if (M !== void 0 && !D(H, M)) throw Error(`defaultValue does not match the expected type for ${H.name}`);
	return (P, x) => {
		let $ = R ?? x;
		s(P, x, { type: H, reflect: F, attribute: $, defaultValue: M, bind: B });
		let A = Symbol.for(`@ecopages/radiant.ssr-prop:${x}`);
		(Object.defineProperty(P, x, {
			get() {
				return this[A] ?? M;
			},
			set(W) {
				this[A] = W;
			},
			configurable: !0,
			enumerable: !0,
		}),
			G(P, (W) => {
				W.registerConnectedCallback(() => {
					let X = W[x],
						Q = M === void 0 ? X : M;
					W.createReactiveProp(x, { type: H, reflect: F, attribute: $, defaultValue: Q, bind: B });
				});
			}));
	};
}
function DH({ type: H, attribute: R, reflect: F, defaultValue: M, bind: B }) {
	if (M !== void 0 && !D(H, M)) throw Error(`defaultValue does not match the expected type for ${H.name}`);
	return function (P, x) {
		let $ = String(x.name),
			A = R ?? $,
			W = Symbol(`@ecopages/radiant/reactive-prop:${$}:initializer`);
		return (
			x.addInitializer(function () {
				let X = this[W],
					Q = M === void 0 ? X : M;
				(s(this, $, { type: H, reflect: F, attribute: A, defaultValue: M, bind: B }),
					this.createReactiveProp($, { type: H, reflect: F, attribute: A, defaultValue: Q, bind: B }));
			}),
			function (X) {
				return ((this[W] = X), X);
			}
		);
	};
}
function sM(H) {
	function R(F, M) {
		return j(DH(H), jH(H), F, M);
	}
	return R;
}
function jR(H) {
	return !(H instanceof Element);
}
function DR(H) {
	return 'shadowRoot' in H ? (H.shadowRoot ?? null) : null;
}
function JR(H) {
	return H instanceof Element ? H : H.host;
}
function UR(H, R = 'light') {
	let F = DR(H);
	if (R === 'shadow') return F ? [F] : [];
	if (R === 'both') return F ? [H, F] : [H];
	return [H];
}
function i(H, R) {
	if (jR(H) && R.scope && R.scope !== 'light') throw Error('RadiantController queries only support light DOM scope.');
	let F = JR(H),
		M = 'selector' in R ? R.selector : `[data-ref="${R.ref}"]`,
		B = null,
		P = () => {
			let x = UR(F, R.scope);
			if (R.all) return x.flatMap(($) => Array.from($.querySelectorAll(M)));
			for (let $ of x) {
				let A = $.querySelector(M);
				if (A) return A;
			}
			return null;
		};
	return {
		get value() {
			if (R.cache) {
				if (B === null || (R.all && Array.isArray(B) && !B.length)) B = P();
				return B;
			}
			return P();
		},
	};
}
function JH({ cache: H = !0, ...R }) {
	return (F, M) => {
		G(F, (B) => {
			B.registerConnectedCallback(() => {
				let P = i(B, { cache: H, ...R });
				Object.defineProperty(B, M, {
					get() {
						return P.value;
					},
					enumerable: !0,
					configurable: !0,
				});
			});
		});
	};
}
function UH(H) {
	return function (R, F) {
		let M = String(F.name);
		F.addInitializer(function () {
			let B = i(this, H);
			Object.defineProperty(this, M, {
				get() {
					return B.value;
				},
				enumerable: !0,
				configurable: !0,
			});
		});
	};
}
function RB(H) {
	function R(F, M) {
		return j(UH(H), JH(H), F, M);
	}
	return R;
}
function K(H, R = {}) {
	let F = null,
		M,
		B = () => {
			if (R.all) return typeof H.getSlotElements === 'function' ? H.getSlotElements(R.name) : [];
			return typeof H.getSlotElement === 'function' ? H.getSlotElement(R.name) : null;
		};
	return {
		get value() {
			if (R.cache === !1) return B();
			let P = H.slotProjectionVersion ?? 0;
			if (M !== P) ((F = B()), (M = P));
			return F;
		},
	};
}
function qH(H = {}) {
	return (R, F) => {
		let M = (x) => {
				return typeof Object.getOwnPropertyDescriptor(x, F)?.get === 'function';
			},
			B = (x) => {
				if (M(x)) return;
				let $ = K(x, H);
				Object.defineProperty(x, F, {
					get() {
						return $.value;
					},
					enumerable: !0,
					configurable: !0,
				});
			},
			P = new WeakMap();
		(Object.defineProperty(R, F, {
			get() {
				let x = P.get(this);
				if (!x) ((x = K(this, H)), P.set(this, x));
				return x.value;
			},
			enumerable: !0,
			configurable: !0,
		}),
			G(R, (x) => {
				(b0(x, () => {
					B(x);
				}),
					x.registerConnectedCallback(() => {
						B(x);
					}));
			}));
	};
}
function LH(H = {}) {
	return function (R, F) {
		let M = String(F.name);
		F.addInitializer(function () {
			let B = K(this, H);
			Object.defineProperty(this, M, {
				get() {
					return B.value;
				},
				enumerable: !0,
				configurable: !0,
			});
		});
	};
}
function QB(H = {}) {
	function R(F, M) {
		return j(LH(H), qH(H), F, M);
	}
	return R;
}
import { createMarkupNodeLike as qR } from '@ecopages/jsx';
import { state as LR } from '@ecopages/signals';
function TH(H) {
	return W0({ type: 'signal', ...H });
}
function YH(H) {
	return Z0(H);
}
function p(H) {
	return (
		typeof H === 'object' &&
		H !== null &&
		typeof H.get === 'function' &&
		typeof H.set === 'function' &&
		typeof H.subscribe === 'function' &&
		typeof H.update === 'function'
	);
}
class I {
	host;
	hydrate;
	hydrationKey;
	property;
	source;
	currentValue;
	hasAppliedHostHydration = !1;
	sourceUnsubscribe;
	constructor(H) {
		((this.host = H.host),
			(this.hydrate = H.hydrate),
			(this.hydrationKey = H.hydrationKey),
			(this.property = H.property),
			(this.source = H.source ?? LR(this.resolveInitialValue(H.initialValue))),
			(this.currentValue = this.source.get()));
	}
	get() {
		return this.source.get();
	}
	set(H) {
		this.source.set(H);
	}
	subscribe(H) {
		return this.source.subscribe(H);
	}
	update(H) {
		this.set(H(this.get()));
	}
	connectToSource() {
		if (this.sourceUnsubscribe) return;
		let H = this.source.get();
		if (!Object.is(this.currentValue, H)) {
			let R = this.currentValue;
			((this.currentValue = H), this.host.notifyUpdate(this.property, R, H));
		}
		this.sourceUnsubscribe = this.source.subscribe((R) => {
			this.handleSourceChange(R);
		});
	}
	disconnectFromSource() {
		(this.sourceUnsubscribe?.(), (this.sourceUnsubscribe = void 0));
	}
	hydrateFromHost() {
		if (!this.hydrate || this.hasAppliedHostHydration) return;
		this.hasAppliedHostHydration = !0;
		let H = this.source.get(),
			R = this.resolveInitialValue(H);
		if (!Object.is(H, R))
			(this.source.set(R),
				(this.currentValue = this.source.get()),
				this.host.notifyUpdate(this.property, H, this.currentValue));
	}
	renderHydrationScript() {
		let H = this.renderHydrationScriptTag();
		if (!H) return;
		return qR(H);
	}
	renderHydrationScriptTag() {
		let H = this.serializeHydrationValue();
		if (!H) return;
		return TH({ hydrationKey: this.hydrationKey, serializedValue: H });
	}
	findHydrationScriptElement() {
		if (!(this.host instanceof Element)) return null;
		return G0(this.host, 'signal', this.hydrationKey);
	}
	isObject(H) {
		return typeof H === 'object' && !Array.isArray(H) && H !== null;
	}
	resolveInitialValue(H) {
		if (!this.hydrate) return H;
		let R = this.findHydrationScriptElement();
		if (!R) return H;
		let F = X0(R, H);
		if (this.hydrate === Object && this.isObject(F) && this.isObject(H)) return { ...H, ...F };
		return F;
	}
	serializeHydrationValue() {
		if (!this.hydrate) return;
		let H = JSON.stringify(this.get());
		if (typeof H !== 'string') return;
		return YH(H);
	}
	handleSourceChange(H) {
		let R = this.currentValue;
		if (((this.currentValue = H), !Object.is(R, H))) this.host.notifyUpdate(this.property, R, H);
	}
}
function n(H) {
	return new I(H);
}
function M0(H = {}) {
	return (R, F) => {
		let M = (B) => {
			let P = B[F];
			if (P instanceof I) return P;
			let x = typeof H.source === 'function' ? H.source(B) : (H.source ?? (p(P) ? P : void 0)),
				$ = H.bind ?? B.shouldAutoBindReactiveMembers?.() ?? !1,
				A = x !== void 0 ? H.initial : P === void 0 ? H.initial : P;
			B.defineReactiveBinding(F, $);
			let W = n({ host: B, hydrate: H.hydrate, hydrationKey: F, initialValue: A, property: F, source: x });
			if (
				(B.registerConnectedCallback(() => {
					(W.hydrateFromHost(), W.connectToSource());
				}),
				B.registerCleanupCallback(() => {
					W.disconnectFromSource();
				}),
				H.hydrate)
			)
				B.registerHydrationBinding(F, W);
			return ((B[F] = W), W);
		};
		G(R, (B) => {
			let P = M(B);
			B.registerConnectedCallback(() => {
				if (!(B[F] instanceof I)) B[F] = P;
			});
		});
	};
}
function B0(H = {}) {
	return function (R, F) {
		let M = String(F.name);
		return function (B) {
			let P = typeof H.source === 'function' ? H.source(this) : (H.source ?? (p(B) ? B : void 0)),
				x = P !== void 0 ? H.initial : B === void 0 ? H.initial : B,
				$ = H.bind ?? this.shouldAutoBindReactiveMembers?.() ?? !1;
			this.defineReactiveBinding(M, $);
			let A = n({ host: this, hydrate: H.hydrate, hydrationKey: M, initialValue: x, property: M, source: P });
			if (
				(this.registerConnectedCallback(() => {
					(A.hydrateFromHost(), A.connectToSource());
				}),
				this.registerCleanupCallback(() => {
					A.disconnectFromSource();
				}),
				H.hydrate)
			)
				this.registerHydrationBinding(M, A);
			return A;
		};
	};
}
function wB(H, R) {
	if (typeof R < 'u') {
		if (typeof R === 'object') {
			if (H !== void 0) throw TypeError('@signal standard decorators require an undefined target');
			return B0()(void 0, R);
		}
		if (H === void 0) throw TypeError('@signal legacy decorators require a host target');
		return M0()(H, R);
	}
	let F = H ?? {};
	function M(B, P) {
		if (typeof P === 'object') {
			if (B !== void 0) throw TypeError('@signal standard decorators require an undefined target');
			return B0(F)(void 0, P);
		}
		if (B === void 0) throw TypeError('@signal legacy decorators require a host target');
		return M0(F)(B, P);
	}
	return M;
}
function kH(H, R) {
	G(H, (F) => {
		F.registerConnectedCallback(() => {
			F.createReactiveField(R, F[R], { bind: F.shouldAutoBindReactiveMembers?.() ?? !1 });
		});
	});
}
function zH(H, R) {
	let F = Symbol(`__${String(R.name)}__value`),
		M = String(R.name);
	return (
		R.addInitializer(function () {
			(this.defineReactiveBinding(M, this.shouldAutoBindReactiveMembers?.() ?? !1),
				this.registerReactiveDependencyReader(M, () => this[F]),
				Object.defineProperty(this, R.name, {
					get() {
						return (this.trackReactiveRead(M), this[F]);
					},
					set(B) {
						let P = this[F];
						if (P !== B) ((this[F] = B), this.notifyUpdate(M, P, B));
					},
					enumerable: !0,
					configurable: !0,
				}));
		}),
		function (B) {
			return ((this[F] = B), B);
		}
	);
}
function gB(H, R) {
	return j(zH, kH, H, R);
}
export {
	v as visitControllerElements,
	WF as stopControllers,
	gB as state,
	AF as startControllers,
	wB as signal,
	n0 as setControllerRegistrationStrategy,
	PF as resolveRegisteredController,
	xR as replaceController,
	r0 as registerControllerWithConfiguredStrategy,
	PR as registerController,
	QB as querySlot,
	RB as query,
	sM as prop,
	i0 as parseControllerIdentifiers,
	OM as onUpdated,
	zM as onEvent,
	BF as hasRegisteredController,
	ZM as event,
	xF as enableControllerReplacementForHmr,
	$F as disableControllerReplacementForHmr,
	tF as debounce,
	dF as customElement,
	fF as controller,
	wF as bound,
	kF as attr,
	V as RadiantElement,
	c0 as RadiantController,
	p0 as ControllerRegistryRuntime,
	s0 as CONTROLLER_REGISTRY_STATE_KEY,
	N as CONTROLLER_ATTRIBUTE,
};
