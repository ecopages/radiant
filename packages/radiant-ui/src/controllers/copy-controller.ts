import { bindController, type Controller, type ControllerHost } from './controller';
import { EventListenerController } from './event-listener-controller';

/** What a copy is doing: nothing yet, succeeded and still showing it, or failed and still showing it. */
export type CopyState = 'idle' | 'copied' | 'error';

/**
 * How one `copy()` ended. `idle` means nothing was copied: `copy()` was called before `attach()` or after
 * `destroy()`, or a newer `copy()` superseded this one while it was waiting.
 */
export type CopyOutcome = { state: 'copied'; text: string } | { state: 'error'; error: unknown } | { state: 'idle' };

const MESSAGES = { copied: 'Copied', error: 'Could not copy' } as const;

/** The attribute the state is written to on the trigger or feedback target. It is removed, not set to `idle`, when the state returns to idle. */
export const COPY_STATE_ATTRIBUTE = 'data-copy-state';

const DEFAULT_RESET_DELAY_MS = 2000;

/** The text, trigger, feedback and callbacks of a `CopyController`. */
export type CopyControllerConfig = {
	/**
	 * The text to copy, read at copy time. A function may be async, and receives the trigger the copy came from
	 * (`null` for a `copy()` call without one).
	 */
	getText: string | ((trigger: HTMLElement | null) => string | Promise<string>);
	/** The element whose click copies. Read on `attach()`. */
	getTrigger?: () => HTMLElement | null;
	/** With `selector`, one listener on this element copies for every matching descendant. Read on `attach()`. */
	getRoot?: () => HTMLElement | null;
	/** The delegated trigger selector, used with `getRoot`. */
	selector?: string;
	/** The element that carries `data-copy-state`. Defaults to the trigger. */
	getFeedbackTarget?: (trigger: HTMLElement | null) => HTMLElement | null;
	/** How long `copied` and `error` show before the state returns to `idle`, in ms. Default 2000. */
	resetDelay?: number;
	onCopy?: (text: string) => void;
	onError?: (error: unknown) => void;
	/** Receives "Copied" or "Could not copy" for a polite live region the host owns. The controller creates no DOM for it. */
	announce?: (message: string) => void;
};

/**
 * Copies text to the clipboard on a click and reports the outcome as a state.
 *
 * @remarks
 * Uses `navigator.clipboard.writeText`. Only when that API does not exist (an insecure context) it selects a
 * hidden textarea and runs `document.execCommand('copy')`, then puts focus back where it was. A failure of
 * either is the `error` state and `onError`, never a thrown error, so `copy()` always resolves.
 *
 * The state is written as `data-copy-state` on the trigger (or `getFeedbackTarget`) and returns to `idle` after
 * `resetDelay`. A second copy while `copied` shows starts the delay again. The clipboard write needs a user
 * gesture in most browsers: call `copy()` from an event handler, or let the controller's own click listener do it.
 * Calling `copy()` before `attach()` or after `destroy()` does nothing.
 *
 * The fallback needs the user gesture to be alive when it runs. An async `getText` spends time before the copy, and
 * on that path `execCommand` can return `false`, which is the `error` state; the async API is more forgiving.
 * Resolve the text ahead of time when the page may lack it.
 *
 * Screen readers do not announce an attribute change, so pass `announce` and write its message into a polite live
 * region that stays in the page. Repeating the same message may need the region cleared first; that is the
 * region owner's concern.
 *
 * @example
 * ```ts
 * const copy = new CopyController({
 *   getText: () => code.textContent ?? '',
 *   getTrigger: () => button,
 *   announce: (message) => (status.textContent = message),
 * });
 * copy.attach(); // clicking `button` copies and sets data-copy-state
 * ```
 */
export class CopyController implements Controller {
	private state: CopyState = 'idle';
	private attached = false;
	private run = 0;
	private timer: ReturnType<typeof setTimeout> | undefined;
	private marked: HTMLElement | null = null;
	private listener: EventListenerController<HTMLElement, 'click'> | null = null;

	constructor(private readonly config: CopyControllerConfig) {}

	attach(): void {
		if (this.attached) {
			return;
		}
		this.attached = true;
		const { getRoot, getTrigger, selector } = this.config;
		this.listener = new EventListenerController<HTMLElement, 'click'>({
			getTarget: () => (selector ? (getRoot?.() ?? null) : (getTrigger?.() ?? null)),
			type: 'click',
			listener: (event) => {
				const trigger = selector
					? (event.target as Element).closest<HTMLElement>(selector)
					: (event.currentTarget as HTMLElement);
				if (trigger) {
					void this.copy(trigger);
				}
			},
		});
		this.listener.attach();
	}

	destroy(): void {
		if (!this.attached) {
			return;
		}
		this.attached = false;
		this.run += 1;
		clearTimeout(this.timer);
		this.listener?.destroy();
		this.listener = null;
		this.mark(null, 'idle');
		this.state = 'idle';
	}

	getState(): CopyState {
		return this.state;
	}

	/** Copies now. Resolves with how it ended and never rejects. */
	async copy(trigger: HTMLElement | null = this.config.getTrigger?.() ?? null): Promise<CopyOutcome> {
		if (!this.attached) {
			return { state: 'idle' };
		}
		const run = (this.run += 1);
		try {
			const { getText } = this.config;
			const text = typeof getText === 'string' ? getText : await getText(trigger);
			await writeToClipboard(text, trigger);
			if (run !== this.run) {
				return { state: 'idle' };
			}
			this.show('copied', trigger);
			this.config.onCopy?.(text);
			return { state: 'copied', text };
		} catch (error) {
			if (run !== this.run) {
				return { state: 'idle' };
			}
			this.show('error', trigger);
			this.config.onError?.(error);
			return { state: 'error', error };
		}
	}

	private show(state: Exclude<CopyState, 'idle'>, trigger: HTMLElement | null): void {
		clearTimeout(this.timer);
		this.state = state;
		this.mark(this.config.getFeedbackTarget?.(trigger) ?? trigger, state);
		this.config.announce?.(MESSAGES[state]);
		this.timer = setTimeout(() => {
			this.state = 'idle';
			this.mark(null, 'idle');
		}, this.config.resetDelay ?? DEFAULT_RESET_DELAY_MS);
	}

	/** Writes the state to `element` and clears it from the element that showed the previous state. */
	private mark(element: HTMLElement | null, state: CopyState): void {
		if (this.marked && this.marked !== element) {
			this.marked.removeAttribute(COPY_STATE_ATTRIBUTE);
		}
		element?.setAttribute(COPY_STATE_ATTRIBUTE, state);
		this.marked = element;
	}
}

/**
 * @remarks
 * `execCommand` returns `false` instead of throwing when the browser refuses, so that is turned into an error.
 * The textarea is mounted inside the trigger's modal (`[aria-modal="true"]` or an open `dialog`) so a focus trap
 * or an inert background does not refuse the focus, else beside the trigger. Selecting it replaces the page
 * selection and moves focus, so both are restored afterwards.
 */
async function writeToClipboard(text: string, trigger: HTMLElement | null): Promise<void> {
	if (navigator.clipboard) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const previous = document.activeElement;
	const selection = document.getSelection()!;
	const ranges = Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index));
	const container = trigger?.closest('[aria-modal="true"], dialog[open]') ?? trigger?.parentElement ?? document.body;
	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	container.append(textarea);
	try {
		textarea.select();
		textarea.setSelectionRange(0, text.length);
		if (!document.execCommand('copy')) {
			throw new Error('The browser rejected the copy command');
		}
	} finally {
		textarea.remove();
		selection.removeAllRanges();
		ranges.forEach((range) => selection.addRange(range));
		if (previous instanceof HTMLElement) {
			previous.focus({ preventScroll: true });
		}
	}
}

/**
 * Creates a `CopyController` that listens when `host` connects and stops when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createCopyController(this, {
 *   getText: () => this.value,
 *   getTrigger: () => this.querySelector('button'),
 * });
 * ```
 */
export function createCopyController(host: ControllerHost, config: CopyControllerConfig): CopyController {
	return bindController(host, new CopyController(config));
}
