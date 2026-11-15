import { RadiantElement, customElement, state } from '@ecopages/radiant';
import { createRovingController, createSortableController } from '@ecopages/radiant-ui/controllers';
import { reorder } from '@ecopages/radiant-ui/helpers';

const initialTasks = ['Plan', 'Build', 'Test', 'Ship'];

@customElement('sortable-list-app')
export class SortableListApp extends RadiantElement<{ status: string }> {
	@state tasks = initialTasks;
	@state status = 'Focus an item, press Space, move with the arrows, press Space to drop';

	private focusTask: string | null = null;

	private readonly roving = createRovingController(this, {
		getItems: () => this.items(),
		getTarget: () => this.querySelector('ul'),
		orientation: 'vertical',
		getEnabled: () => this.sortable.getState() === null,
	});

	private readonly sortable = createSortableController(this, {
		preview: true,
		createPlaceholder: () => document.createElement('li'),
		getContainer: () => this.querySelector('ul'),
		getItems: () => this.items(),
		announce: (message) => (this.status = message),
		onChange: ({ item, from, to }) => {
			this.focusTask = item.dataset.sortableTask!;
			this.tasks = reorder(this.tasks, from, to);
		},
	});

	private items(): HTMLElement[] {
		return [...(this.querySelector('ul')?.children ?? [])] as HTMLElement[];
	}

	/**
	 * Attaches both controllers to the list the render produced, and focuses the item that was just moved.
	 *
	 * @remarks
	 * The controllers attach when the element connects, before the first render, when no list exists yet; the
	 * `attach()` again resolves the list each controller listens on, and `sync()` gives the roving controller the items of the committed list. The keyed items keep
	 * their nodes across renders, so the moved item is the same node, found by its task.
	 */
	protected override updated(): void {
		this.sortable.attach();
		this.roving.attach();
		this.roving.sync();
		if (this.focusTask) {
			this.roving.focus(this.querySelector<HTMLElement>(`[data-sortable-task="${this.focusTask}"]`)!);
			this.focusTask = null;
		}
	}

	override render() {
		return (
			<>
				<ul aria-label="Tasks">
					{this.tasks.map((task) => (
						<li key={task} data-sortable-task={task}>
							{task}
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
