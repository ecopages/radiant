import '@ecopages/radiant-ui/toolbar';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { isServer } from '@ecopages/radiant/is-server';
import { syncExamples } from '../primitive-example/mount-example';
import { startControllersOnce } from './start-controllers-once';

const STORAGE_KEY = 'radiant-ui-docs:recipe-pattern';

/**
 * The Radiant controller form of a recipe is markup with a `data-controller` attribute, so the page needs one running
 * registry. It watches the document, which is why a pattern inserted by a switch is connected and a removed one is
 * disconnected without anything here calling them.
 *
 * @remarks
 * Started through `startControllersOnce`, so evaluating this module again does not start a second registry. The
 * registry stays up for the rest of the session and attaches any `data-controller` host of any page, which is the
 * contract of the form.
 */
if (!isServer) {
	startControllersOnce(document);
}

/**
 * @remarks
 * `localStorage` throws when site data is blocked, so reading and writing the choice must not break the page.
 */
function readChoice(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

function writeChoice(pattern: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, pattern);
	} catch {
		return;
	}
}

/**
 * Shows the stored authoring pattern on connect and stores the reader's next choice.
 *
 * @remarks
 * The stage holds the one pattern that is running. A switch replaces it with a copy of the new pattern's template,
 * so the old example is removed from the document, which disconnects its elements and, through `syncExamples`, runs
 * the cleanup of a plain example, and the new one starts from its pristine markup.
 *
 * A reader whose stored choice is not the page's first pattern sees the first pattern for a moment: the server
 * renders it live because it cannot read `localStorage`, and this element swaps it on connect, so the first pattern's
 * elements connect and disconnect once and the stage changes height. Hiding the stage until the script runs would
 * avoid that for them and cost every other reader, and anyone without JavaScript, a blank example, so the swap is
 * accepted. The buttons are pressed on the server, so none is ever shown unselected.
 */
@customElement('recipe-patterns')
export class RecipePatterns extends RadiantElement {
	override onConnected(): void {
		const choice = readChoice();
		if (choice && choice !== this.dataset.pattern && this.template(choice)) {
			this.select(choice);
		} else {
			this.press(this.dataset.pattern!);
		}
	}

	@onEvent({ selector: '[data-pattern-button]', type: 'click' })
	onPick(event: Event): void {
		const pattern = (event.target as Element).closest<HTMLElement>('[data-pattern-button]')!.dataset.patternButton!;
		if (pattern !== this.dataset.pattern) {
			this.select(pattern);
		}
		writeChoice(pattern);
	}

	private template(pattern: string): HTMLTemplateElement | null {
		return this.querySelector<HTMLTemplateElement>(`:scope > template[data-pattern-template="${pattern}"]`);
	}

	private select(pattern: string): void {
		const stage = this.querySelector<HTMLElement>(':scope > [data-pattern-stage]')!;
		stage.replaceChildren(document.importNode(this.template(pattern)!.content, true));
		this.dataset.pattern = pattern;
		this.press(pattern);
		syncExamples();
	}

	private press(pattern: string): void {
		for (const button of this.querySelectorAll<HTMLElement>('[data-pattern-button]')) {
			button.setAttribute('aria-pressed', String(button.dataset.patternButton === pattern));
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'recipe-patterns': RecipePatterns;
	}
}
