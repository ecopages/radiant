import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import { createRovingController } from '@ecopages/radiant-ui/controllers';
import { textContains } from '@ecopages/radiant-ui/helpers';

const fruit = ['Apple', 'Apricot', 'Banana', 'Cherry', 'Date'];

@customElement('searchable-list-app')
export class SearchableListApp extends RadiantElement<{ status: string }> {
	@state query = '';
	@state status = `${fruit.length} of ${fruit.length} shown`;

	private readonly roving = createRovingController(this, {
		getItems: () => this.items,
		getTarget: () => this.querySelector('ul'),
		orientation: 'vertical',
		wrap: false,
	});

	private get items(): HTMLElement[] {
		return [...this.querySelectorAll<HTMLElement>('li')];
	}

	private get matching(): string[] {
		return fruit.filter((name) => textContains(name, this.query));
	}

	/**
	 * Attaches the roving controller to the list the render produced, and gives the tab stop back to its rows.
	 *
	 * @remarks
	 * The controller attaches when the element connects, before the first render, when no list exists yet to listen
	 * on; a second `attach()` resolves it again and changes nothing once it is attached. A filter replaces the rows,
	 * so each commit syncs the tab stop.
	 */
	protected override updated(): void {
		this.roving.attach();
		this.roving.sync();
	}

	@onEvent({ selector: 'input', type: 'input' })
	filter(event: Event): void {
		this.query = (event.target as HTMLInputElement).value;
		const shown = this.matching.length;
		this.status = shown === 0 ? 'No matches' : `${shown} of ${fruit.length} shown`;
	}

	@onEvent({ selector: 'input', type: 'keydown' })
	enterList(event: KeyboardEvent): void {
		const first = this.items[0];
		if (event.key === 'ArrowDown' && first) {
			event.preventDefault();
			this.roving.focus(first);
		}
	}

	@onEvent({ selector: 'ul', type: 'keydown' })
	choose(event: KeyboardEvent): void {
		if (event.key === 'Enter' && event.target instanceof HTMLElement) {
			this.status = `Chose ${event.target.textContent}`;
		}
	}

	override render() {
		return (
			<>
				<label for="fruit-filter">Filter fruit</label>
				<input id="fruit-filter" type="search" placeholder="Type a fruit" />
				<ul role="listbox" aria-label="Fruit">
					{this.matching.map((name) => (
						<li key={name} role="option">
							{name}
						</li>
					))}
				</ul>
				<p data-status aria-live="polite">
					{this.$.status}
				</p>
			</>
		);
	}
}
