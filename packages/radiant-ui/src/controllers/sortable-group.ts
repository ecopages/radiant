/** What a group knows about one container: enough to find, fill and name it. Built by `SortableController`. */
export type SortableMember = {
	getContainer: () => HTMLElement | null;
	getItems: () => HTMLElement[];
	/** Whether this container takes `item`, which comes from another container of the group. */
	accepts: (item: HTMLElement, fromContainer: HTMLElement) => boolean;
	/** The name announced for the container. */
	getLabel: () => string;
};

/**
 * The containers that can exchange items, in the order `PageUp` and `PageDown` walk them.
 *
 * @remarks
 * Create one and pass it as `group` to the `SortableController` of every container. A controller joins on
 * `attach()` and leaves on `destroy()`, so the order is the order the controllers attach in. A container with no
 * items is a drop zone as it is. The group holds no DOM and starts nothing.
 */
export class SortableGroup {
	private readonly list: SortableMember[] = [];

	/** The joined containers, in join order. */
	get members(): readonly SortableMember[] {
		return this.list;
	}

	add(member: SortableMember): void {
		if (!this.list.includes(member)) {
			this.list.push(member);
		}
	}

	remove(member: SortableMember): void {
		const index = this.list.indexOf(member);
		if (index !== -1) {
			this.list.splice(index, 1);
		}
	}
}
