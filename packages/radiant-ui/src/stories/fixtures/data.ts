export type Milk = 'Cow' | 'Sheep' | 'Goat' | 'Mixed';
export type Texture = 'Soft' | 'Semi-hard' | 'Hard';
export type Origin = 'France' | 'Italy' | 'Spain' | 'Switzerland' | 'Netherlands' | 'Greece' | 'United Kingdom';

export type Item = {
	id: string;
	name: string;
	milk: Milk;
	texture: Texture;
	origin: Origin;
};

export type ItemDraft = Omit<Item, 'id'>;
export type SortColumn = Exclude<keyof Item, 'id'>;

export type TableFilters = {
	search?: string;
	milk?: Milk | '';
	texture?: Texture | '';
	origin?: Origin | '';
	sortColumn?: SortColumn;
	sortDirection?: 'ascending' | 'descending';
	page?: number;
	pageSize?: number;
};

export type ResolvedTableFilters = Required<TableFilters>;

export const defaultTableFilters: ResolvedTableFilters = {
	search: '',
	milk: '',
	texture: '',
	origin: '',
	sortColumn: 'name',
	sortDirection: 'ascending',
	page: 1,
	pageSize: 5,
};

export const initialItems: Item[] = [
	{ id: 'appenzeller', name: 'Appenzeller', milk: 'Cow', texture: 'Semi-hard', origin: 'Switzerland' },
	{ id: 'beaufort', name: 'Beaufort', milk: 'Cow', texture: 'Hard', origin: 'France' },
	{ id: 'brie', name: 'Brie', milk: 'Cow', texture: 'Soft', origin: 'France' },
	{ id: 'burrata', name: 'Burrata', milk: 'Cow', texture: 'Soft', origin: 'Italy' },
	{ id: 'camembert', name: 'Camembert', milk: 'Cow', texture: 'Soft', origin: 'France' },
	{ id: 'cheddar', name: 'Cheddar', milk: 'Cow', texture: 'Hard', origin: 'United Kingdom' },
	{ id: 'comte', name: 'Comté', milk: 'Cow', texture: 'Hard', origin: 'France' },
	{ id: 'edam', name: 'Edam', milk: 'Cow', texture: 'Semi-hard', origin: 'Netherlands' },
	{ id: 'emmental', name: 'Emmental', milk: 'Cow', texture: 'Hard', origin: 'Switzerland' },
	{ id: 'feta', name: 'Feta', milk: 'Sheep', texture: 'Soft', origin: 'Greece' },
	{ id: 'gorgonzola', name: 'Gorgonzola', milk: 'Cow', texture: 'Semi-hard', origin: 'Italy' },
	{ id: 'gouda', name: 'Gouda', milk: 'Cow', texture: 'Semi-hard', origin: 'Netherlands' },
	{ id: 'gruyere', name: 'Gruyère', milk: 'Cow', texture: 'Hard', origin: 'Switzerland' },
	{ id: 'halloumi', name: 'Halloumi', milk: 'Mixed', texture: 'Semi-hard', origin: 'Greece' },
	{ id: 'idiazabal', name: 'Idiazábal', milk: 'Sheep', texture: 'Hard', origin: 'Spain' },
	{ id: 'mahon', name: 'Mahón', milk: 'Cow', texture: 'Semi-hard', origin: 'Spain' },
	{ id: 'manchego', name: 'Manchego', milk: 'Sheep', texture: 'Semi-hard', origin: 'Spain' },
	{ id: 'mimolette', name: 'Mimolette', milk: 'Cow', texture: 'Hard', origin: 'France' },
	{ id: 'mozzarella', name: 'Mozzarella', milk: 'Cow', texture: 'Soft', origin: 'Italy' },
	{ id: 'parmigiano', name: 'Parmigiano Reggiano', milk: 'Cow', texture: 'Hard', origin: 'Italy' },
	{ id: 'pecorino', name: 'Pecorino Romano', milk: 'Sheep', texture: 'Hard', origin: 'Italy' },
	{ id: 'raclette', name: 'Raclette', milk: 'Cow', texture: 'Semi-hard', origin: 'Switzerland' },
	{ id: 'reblochon', name: 'Reblochon', milk: 'Cow', texture: 'Soft', origin: 'France' },
	{ id: 'roquefort', name: 'Roquefort', milk: 'Sheep', texture: 'Semi-hard', origin: 'France' },
	{ id: 'stilton', name: 'Stilton', milk: 'Cow', texture: 'Semi-hard', origin: 'United Kingdom' },
	{ id: 'taleggio', name: 'Taleggio', milk: 'Cow', texture: 'Soft', origin: 'Italy' },
];

export const pageSizeOptions = [
	{ value: '5', label: '5' },
	{ value: '10', label: '10' },
	{ value: '20', label: '20' },
];

export const milkOptions = [
	{ value: 'Cow', label: 'Cow' },
	{ value: 'Sheep', label: 'Sheep' },
	{ value: 'Goat', label: 'Goat' },
	{ value: 'Mixed', label: 'Mixed' },
];

export const textureOptions = [
	{ value: 'Soft', label: 'Soft' },
	{ value: 'Semi-hard', label: 'Semi-hard' },
	{ value: 'Hard', label: 'Hard' },
];

export const originOptions = [
	{ value: 'France', label: 'France' },
	{ value: 'Italy', label: 'Italy' },
	{ value: 'Spain', label: 'Spain' },
	{ value: 'Switzerland', label: 'Switzerland' },
	{ value: 'Netherlands', label: 'Netherlands' },
	{ value: 'Greece', label: 'Greece' },
	{ value: 'United Kingdom', label: 'United Kingdom' },
];

export function resolveFilters(filters: TableFilters): ResolvedTableFilters {
	return {
		search: filters.search ?? defaultTableFilters.search,
		milk: filters.milk ?? defaultTableFilters.milk,
		texture: filters.texture ?? defaultTableFilters.texture,
		origin: filters.origin ?? defaultTableFilters.origin,
		sortColumn: filters.sortColumn ?? defaultTableFilters.sortColumn,
		sortDirection: filters.sortDirection ?? defaultTableFilters.sortDirection,
		page: Math.max(1, Math.floor(filters.page ?? defaultTableFilters.page)),
		pageSize: Math.max(1, Math.floor(filters.pageSize ?? defaultTableFilters.pageSize)),
	};
}

export function cloneItems(): Item[] {
	return structuredClone(initialItems);
}

const validMilkOptions = new Set<ItemDraft['milk']>(['Cow', 'Sheep', 'Goat', 'Mixed']);
const validTextureOptions = new Set<ItemDraft['texture']>(['Soft', 'Semi-hard', 'Hard']);
const validOriginOptions = new Set<ItemDraft['origin']>([
	'France',
	'Italy',
	'Spain',
	'Switzerland',
	'Netherlands',
	'Greece',
	'United Kingdom',
]);

export function normalizeDraft(value: unknown): ItemDraft | null {
	if (!isRecord(value)) {
		return null;
	}
	const name = typeof value.name === 'string' ? value.name.trim() : '';
	if (
		!name ||
		!validMilkOptions.has(value.milk as ItemDraft['milk']) ||
		!validTextureOptions.has(value.texture as ItemDraft['texture']) ||
		!validOriginOptions.has(value.origin as ItemDraft['origin'])
	) {
		return null;
	}
	return {
		name,
		milk: value.milk as ItemDraft['milk'],
		texture: value.texture as ItemDraft['texture'],
		origin: value.origin as ItemDraft['origin'],
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
