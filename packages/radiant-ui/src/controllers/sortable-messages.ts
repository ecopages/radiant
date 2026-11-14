/** What a message builder is told about the item being sorted. Positions are 1-based, indexes 0-based. */
export type SortableMessageContext = {
	label: string;
	from: number;
	to: number;
	position: number;
	total: number;
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
	lift: ({ label, position, total }) =>
		`Picked up ${label}, position ${position} of ${total}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
	move: ({ label, position, total }) => `${label}, position ${position} of ${total}.`,
	drop: ({ label, position, total }) => `Dropped ${label}, position ${position} of ${total}.`,
	cancel: ({ label, from, total }) => `Cancelled. ${label} returned to position ${from + 1} of ${total}.`,
};
