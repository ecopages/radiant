import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';
import { isTextEntry } from './roving-tabindex';

/** One key string and what it does. */
export type Hotkey = {
	/** A key string, such as `'mod+k'`, `'shift+ArrowLeft'`, `'Space'` or `'?'`. See `HotkeyController` for the grammar. */
	keys: string;
	/** Returns `false` to decline: the default is left alone and the next matching hotkey is tried. */
	handler(event: KeyboardEvent): void | boolean;
};

/** The target, hotkeys and phase of a `HotkeyController`. */
export type HotkeyControllerConfig = {
	/** Resolved on every `attach()`; `null` attaches nothing. There is no default: pass `() => document` for page-wide keys. */
	getTarget: () => EventTarget | null;
	/** Tried in order; the first match whose handler does not return `false` wins. */
	hotkeys: readonly Hotkey[];
	/** Listen in the capture phase, so the keys run before the target's own handlers. Default `false`. */
	capture?: boolean;
};

type ParsedHotkey = { key: string; mod: boolean; shift: boolean };

type KeyPress = Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'>;

const MODIFIER_NAMES = new Set(['mod', 'shift', 'alt', 'ctrl', 'control', 'meta', 'cmd', 'command', 'option']);

const NAMED_KEYS: ReadonlyMap<string, string> = new Map([
	['space', ' '],
	['plus', '+'],
]);

function syntaxError(keys: string, reason: string): SyntaxError {
	return new SyntaxError(`Invalid hotkey "${keys}": ${reason}.`);
}

function parseSegments(keys: string): string[] {
	if (/\s/.test(keys)) {
		throw syntaxError(keys, 'whitespace is reserved, write the space bar as "Space"');
	}
	const segments = keys.split('+');
	if (segments.some((segment) => segment === '')) {
		throw syntaxError(keys, 'empty segment, write the "+" key as "Plus"');
	}
	return segments;
}

function parseModifiers(keys: string, names: readonly string[]): Pick<ParsedHotkey, 'mod' | 'shift'> {
	const seen = new Set<string>();
	for (const name of names) {
		const modifier = name.toLowerCase();
		if (modifier !== 'mod' && modifier !== 'shift') {
			throw syntaxError(keys, `"${name}" is not a modifier, only "mod" and "shift" are`);
		}
		if (seen.has(modifier)) {
			throw syntaxError(keys, `"${name}" is repeated`);
		}
		seen.add(modifier);
	}
	return { mod: seen.has('mod'), shift: seen.has('shift') };
}

function parseKey(keys: string, name: string): string {
	const key = name.toLowerCase();
	if (MODIFIER_NAMES.has(key)) {
		throw syntaxError(keys, `"${name}" is a modifier and needs a key after it`);
	}
	return NAMED_KEYS.get(key) ?? key;
}

function parseHotkey(keys: string): ParsedHotkey {
	const segments = parseSegments(keys);
	const key = parseKey(keys, segments[segments.length - 1]);
	return { key, ...parseModifiers(keys, segments.slice(0, -1)) };
}

function matchesParsed(event: KeyPress, hotkey: ParsedHotkey): boolean {
	if (event.altKey || (event.metaKey || event.ctrlKey) !== hotkey.mod) {
		return false;
	}
	if (hotkey.shift && !event.shiftKey) {
		return false;
	}
	return event.key.toLowerCase() === hotkey.key;
}

/**
 * Whether a key press matches a key string. Throws a `SyntaxError` for a string the grammar rejects.
 *
 * @remarks
 * Not exported from the package entry: the controller parses each string once, this parses on every call and is
 * here so the grammar can be tested on plain objects.
 */
export function matchesHotkey(event: KeyPress, keys: string): boolean {
	return matchesParsed(event, parseHotkey(keys));
}

/**
 * Runs a handler for a key string on a target, from `attach()` until `destroy()`.
 *
 * @remarks
 * A key string is modifiers and one key joined by `+`. The modifiers are `mod` and `shift`, in any order, each at
 * most once. `mod` is Meta or Ctrl on every platform, as the sidebar already treats it. The key is a single
 * character or a `KeyboardEvent.key` name such as `ArrowLeft` or `Escape`, compared without case; the space bar is
 * written `Space` and the `+` key `Plus`, because whitespace is reserved for key sequences and an empty segment is
 * an error. A bare modifier, `alt`, `ctrl` and `meta` are errors, and a bad string throws a `SyntaxError` from the
 * constructor, before anything is attached.
 *
 * Alt must be up for every binding (Option changes `event.key` on macOS, so Alt chords are not supported). AltGr
 * sets both `altKey` and `ctrlKey`, so a character typed with it, such as `@` on a German layout, never matches. Without
 * `mod` in the string both Meta and Ctrl must be up, so `k` is not Ctrl+K. Shift is checked only when the string
 * names it, so `ArrowLeft` also matches Shift+ArrowLeft and `?` matches the Shift+/ press that produces it; list
 * `shift+ArrowLeft` before `ArrowLeft` when both are bound.
 *
 * Keys typed in a text field, while composing, and with a default another handler already prevented are skipped.
 * The first match whose handler does not return `false` gets `preventDefault()`. The controller never calls
 * `stopPropagation()`; a handler that needs it calls it. Scope single-character keys to an element with
 * `getTarget` rather than `document` (WCAG 2.1.4); a screen reader's browse mode also swallows them elsewhere.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createHotkeyController(this, {
 *   getTarget: () => this.stage,
 *   hotkeys: [
 *     { keys: 'k', handler: () => this.toggle() },
 *     { keys: 'shift+ArrowLeft', handler: () => this.skip(-1) },
 *     { keys: 'ArrowLeft', handler: () => this.skip(-5) },
 *   ],
 * });
 * ```
 */
export class HotkeyController implements Controller {
	private readonly entries: ReadonlyArray<{ hotkey: ParsedHotkey; handler: Hotkey['handler'] }>;
	private readonly listener: EventListenerController<EventTarget, 'keydown'>;

	constructor(config: HotkeyControllerConfig) {
		this.entries = config.hotkeys.map(({ keys, handler }) => ({ hotkey: parseHotkey(keys), handler }));
		this.listener = new EventListenerController<EventTarget, 'keydown'>({
			getTarget: config.getTarget,
			type: 'keydown',
			options: config.capture ? { capture: true } : undefined,
			listener: (event) => this.onKey(event),
		});
	}

	attach(): void {
		this.listener.attach();
	}

	destroy(): void {
		this.listener.destroy();
	}

	private onKey(event: Event): void {
		if (
			!(event instanceof KeyboardEvent) ||
			event.isComposing ||
			event.defaultPrevented ||
			isTextEntry(event.target)
		) {
			return;
		}
		for (const { hotkey, handler } of this.entries) {
			if (!matchesParsed(event, hotkey) || handler(event) === false) {
				continue;
			}
			event.preventDefault();
			return;
		}
	}
}

/**
 * Creates a `HotkeyController` that attaches when `host` connects and is destroyed when it disconnects.
 *
 * @example
 * ```ts
 * createHotkeyController(this, {
 *   getTarget: () => document,
 *   hotkeys: [{ keys: 'mod+b', handler: () => this.toggle() }],
 * });
 * ```
 */
export function createHotkeyController(host: ControllerHost, config: HotkeyControllerConfig): HotkeyController {
	return bindController(host, new HotkeyController(config));
}
