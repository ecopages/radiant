export type Card = { id: string; title: string };
export type Column = { id: string; title: string; cards: Card[] };

export const initialColumns: Column[] = [
	{
		id: 'todo',
		title: 'To do',
		cards: [
			{ id: 'brief', title: 'Write the brief' },
			{ id: 'layout', title: 'Sketch the layout' },
			{ id: 'colors', title: 'Pick the colors' },
			{ id: 'copy', title: 'Draft the copy' },
			{ id: 'a11y', title: 'Review accessibility' },
			{ id: 'launch', title: 'Plan the launch' },
		],
	},
	{
		id: 'doing',
		title: 'Doing',
		cards: [
			{ id: 'header', title: 'Build the header' },
			{ id: 'form', title: 'Wire the form' },
		],
	},
	{ id: 'done', title: 'Done', cards: [{ id: 'repo', title: 'Set up the repo' }] },
];

export function moveCard(columns: Column[], cardId: string, toColumn: string, to: number): Column[] {
	const card = columns.flatMap((column) => column.cards).find((candidate) => candidate.id === cardId)!;
	return columns.map((column) => {
		const cards = column.cards.filter((candidate) => candidate.id !== cardId);
		if (column.id === toColumn) cards.splice(to, 0, card);
		return { ...column, cards };
	});
}
