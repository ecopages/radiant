import { delay, http, HttpResponse } from 'msw';
import { cloneItems, defaultTableFilters, normalizeDraft, type Item } from './data';

export function createHandlers(latency = 20) {
	let items = cloneItems();

	return [
		http.get('/api/items', async ({ request }) => {
			await delay(latency);
			const url = new URL(request.url);
			const search = url.searchParams.get('search')?.toLocaleLowerCase() ?? '';
			const milk = url.searchParams.get('milk');
			const texture = url.searchParams.get('texture');
			const origin = url.searchParams.get('origin');
			const sort = url.searchParams.get('sort') ?? 'name';
			const direction = url.searchParams.get('direction') === 'descending' ? -1 : 1;
			const pageSize = Math.max(1, Number(url.searchParams.get('pageSize')) || defaultTableFilters.pageSize);
			const requestedPage = Math.max(1, Number(url.searchParams.get('page')) || defaultTableFilters.page);
			const matches = items
				.filter((item) => {
					return (
						(!search || item.name.toLocaleLowerCase().includes(search)) &&
						(!milk || item.milk === milk) &&
						(!texture || item.texture === texture) &&
						(!origin || item.origin === origin)
					);
				})
				.toSorted((left, right) => {
					const leftValue = left[sort as keyof Item] ?? '';
					const rightValue = right[sort as keyof Item] ?? '';
					return String(leftValue).localeCompare(String(rightValue)) * direction;
				});
			const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
			const page = Math.min(requestedPage, pageCount);
			const start = (page - 1) * pageSize;
			return HttpResponse.json({
				items: matches.slice(start, start + pageSize),
				page,
				pageSize,
				total: matches.length,
			});
		}),
		http.post('/api/items', async ({ request }) => {
			const draft = normalizeDraft(await request.json());
			if (!draft) {
				return HttpResponse.json({ message: 'Invalid item' }, { status: 400 });
			}
			const id = `${draft.name.toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${items.length + 1}`;
			const item = { id, ...draft };
			items = [...items, item];
			return HttpResponse.json(item, { status: 201 });
		}),
		http.patch('/api/items/:id', async ({ params, request }) => {
			const draft = normalizeDraft(await request.json());
			const id = String(params.id);
			const index = items.findIndex((item) => item.id === id);
			if (!draft || index < 0) {
				return HttpResponse.json({ message: 'Item not found' }, { status: 404 });
			}
			const item = { id, ...draft };
			items = items.with(index, item);
			return HttpResponse.json(item);
		}),
		http.delete('/api/items/:id', ({ params }) => {
			const id = String(params.id);
			if (!items.some((item) => item.id === id)) {
				return HttpResponse.json({ message: 'Item not found' }, { status: 404 });
			}
			items = items.filter((item) => item.id !== id);
			return new HttpResponse(null, { status: 204 });
		}),
	];
}
