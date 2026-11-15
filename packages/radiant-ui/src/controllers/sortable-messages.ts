/** What a message builder is told about the item being sorted. Positions are 1-based, indexes 0-based. */
export type SortableMessageContext = {
	label: string;
	from: number;
	to: number;
	position: number;
	/** The size of the list the item is in now, itself included. */
	total: number;
	/** The name of the container the item is over (`getContainerLabel`). */
	container: string;
	/** The name of the container the item was lifted from. */
	fromContainer: string;
	/** Whether the item is over another container than the one it was lifted from. */
	crossed: boolean;
	/** How many containers the group has, `1` without a group. */
	containers: number;
};

/** Builds the text announced to a live region at each step of a sort. */
export type SortableMessages = {
	lift: (context: SortableMessageContext) => string;
	move: (context: SortableMessageContext) => string;
	drop: (context: SortableMessageContext) => string;
	cancel: (context: SortableMessageContext) => string;
};

/**
 * The English messages `SortableController` announces when the owner passes none.
 *
 * @remarks
 * Pass `messages` with any subset of these to translate or reword; the rest keep the defaults. `position` is
 * where the item is now (`to + 1`) and `from` and `to` are indexes.
 */
export const DEFAULT_SORTABLE_MESSAGES: SortableMessages = {
	lift: ({ label, position, total, containers }) =>
		`Picked up ${label}, position ${position} of ${total}. Use the arrow keys to move, ${containers > 1 ? 'Page Up and Page Down to switch list, ' : ''}Space to drop, Escape to cancel.`,
	move: ({ label, position, total, container, crossed }) =>
		`${label}, ${crossed ? `${container}, ` : ''}position ${position} of ${total}.`,
	drop: ({ label, position, total, container, crossed }) =>
		`Dropped ${label}${crossed ? ` in ${container}` : ''}, position ${position} of ${total}.`,
	cancel: ({ label, from, total, fromContainer, containers }) =>
		`Cancelled. ${label} returned to ${containers > 1 ? `${fromContainer}, ` : ''}position ${from + 1} of ${total}.`,
};
