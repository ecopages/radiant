import { createSubscribableJsxValue, type JsxCustomElementAttributes, type JsxRenderable } from '@ecopages/jsx';
import { RadiantElement, customElement, debounce, event, onEvent, onUpdated, prop, state } from '@ecopages/radiant';
import { isServer } from '@ecopages/radiant/is-server';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { RuiButton } from '../../components/ui/button';
import { RuiCheckbox } from '../../components/ui/checkbox';
import type { RuiCheckboxChangeDetail } from '../../components/ui/checkbox/checkbox.script';
import { RuiDialog, RuiDialogBody, RuiDialogClose, RuiDialogTitle } from '../../components/ui/dialog';
import { RuiField } from '../../components/ui/field';
import { RuiForm } from '../../components/ui/form';
import { RuiInput } from '../../components/ui/input';
import { RuiInputGroup, RuiInputGroupAddon, RuiInputGroupText } from '../../components/ui/input-group';
import { RuiLabel } from '../../components/ui/label';
import {
	RuiMenuButton,
	RuiMenuButtonContent,
	RuiMenuButtonItem,
	RuiMenuButtonTrigger,
} from '../../components/ui/menu-button';
import { RuiPopover, RuiPopoverContent, RuiPopoverTrigger } from '../../components/ui/popover';
import { RuiPagination } from '../../components/ui/pagination';
import { RuiSelect } from '../../components/ui/select';
import { RuiSpinner } from '../../components/ui/spinner';
import {
	RuiTable,
	RuiTableBody,
	RuiTableCell,
	RuiTableColumn,
	RuiTableEmptyState,
	RuiTableHeader,
	RuiTableRow,
} from '../../components/ui/table';
import {
	defaultTableFilters,
	milkOptions,
	normalizeDraft,
	originOptions,
	pageSizeOptions,
	resolveFilters,
	textureOptions,
	type Item,
	type ItemDraft,
	type SortColumn,
	type TableFilters,
	type ResolvedTableFilters,
} from './data';

type DialogMode = 'create' | 'edit' | 'delete' | null;

function DataTableSearchField() {
	return (
		<RuiField name="search" class="data-table__search-field">
			<RuiLabel class="data-table__sr-only" htmlFor="data-table-search">
				Search cheeses
			</RuiLabel>
			<RuiInputGroup>
				<RuiInputGroupAddon>
					<RuiInputGroupText>Search</RuiInputGroupText>
				</RuiInputGroupAddon>
				<RuiInput id="data-table-search" data-table-search aria-label="Search cheeses" placeholder="Cheeses" />
			</RuiInputGroup>
		</RuiField>
	);
}

type DataTableToolbarActionsProps = {
	filters: ResolvedTableFilters;
	hasActiveFilters: boolean;
	appliedFilters: number;
};

function DataTableToolbarActions({ filters, hasActiveFilters, appliedFilters }: DataTableToolbarActionsProps) {
	return (
		<div class="data-table__toolbar-actions">
			<RuiButton
				type="button"
				variant="ghost"
				size="sm"
				data-clear-filters
				hidden={hasActiveFilters ? undefined : true}
			>
				Clear filters
			</RuiButton>
			<RuiPopoverTrigger
				trigger={
					<RuiButton variant="outline" aria-label="Filters">
						Filters{appliedFilters ? ` (${appliedFilters})` : ''}
					</RuiButton>
				}
			>
				<RuiPopover placement="bottom-end" portal={false}>
					<RuiPopoverContent class="data-table__filters">
						<span class="data-table__filters-title">Filters</span>
						<div class="data-table__filters-groups">
							<div class="data-table__filter-group">
								<span class="data-table__filter-group-label">Milk</span>
								{milkOptions.map((option) => (
									<RuiCheckbox
										data-filter="milk"
										data-filter-value={option.value}
										checked={filters.milk === option.value}
									>
										{option.label}
									</RuiCheckbox>
								))}
							</div>
							<div class="data-table__filter-group">
								<span class="data-table__filter-group-label">Texture</span>
								{textureOptions.map((option) => (
									<RuiCheckbox
										data-filter="texture"
										data-filter-value={option.value}
										checked={filters.texture === option.value}
									>
										{option.label}
									</RuiCheckbox>
								))}
							</div>
							<div class="data-table__filter-group">
								<span class="data-table__filter-group-label">Origin</span>
								{originOptions.map((option) => (
									<RuiCheckbox
										data-filter="origin"
										data-filter-value={option.value}
										checked={filters.origin === option.value}
									>
										{option.label}
									</RuiCheckbox>
								))}
							</div>
						</div>
					</RuiPopoverContent>
				</RuiPopover>
			</RuiPopoverTrigger>
			<RuiButton type="button" data-create-item>
				Add cheese
			</RuiButton>
		</div>
	);
}

function DataTableError({ message }: { message: string }) {
	return (
		<p class="data-table__error" role="alert">
			{message}
		</p>
	);
}

type DataTableInventoryProps = {
	filters: ResolvedTableFilters;
	items: Item[];
	loading: boolean;
	refreshing: boolean;
};

function DataTableInventory({ filters, items, loading, refreshing }: DataTableInventoryProps) {
	return (
		<RuiTable
			label="European cheese inventory"
			sortColumn={filters.sortColumn}
			sortDirection={filters.sortDirection}
			ariaBusy={loading || refreshing ? 'true' : undefined}
		>
			<RuiTableHeader>
				<RuiTableColumn id="name" allowsSorting isRowHeader>
					Cheese
				</RuiTableColumn>
				<RuiTableColumn id="milk" allowsSorting>
					Milk
				</RuiTableColumn>
				<RuiTableColumn id="texture" allowsSorting>
					Texture
				</RuiTableColumn>
				<RuiTableColumn id="origin" allowsSorting>
					Origin
				</RuiTableColumn>
				<RuiTableColumn id="actions" class="data-table__actions-column">
					<span class="data-table__actions-header">
						Actions
						<RuiSpinner
							size="sm"
							class="data-table__refresh-spinner"
							data-table-refreshing
							hidden={refreshing ? undefined : true}
							aria={{ label: 'Updating cheeses' }}
						/>
					</span>
				</RuiTableColumn>
			</RuiTableHeader>
			<RuiTableBody>
				{loading || items.length === 0 ? (
					<RuiTableEmptyState key="table-body" colSpan={5}>
						{loading ? 'Loading cheeses…' : 'No cheeses match the active filters.'}
					</RuiTableEmptyState>
				) : (
					items.map((item) => (
						<RuiTableRow key={item.id} id={item.id}>
							<RuiTableCell isRowHeader>{item.name}</RuiTableCell>
							<RuiTableCell>{item.milk}</RuiTableCell>
							<RuiTableCell>{item.texture}</RuiTableCell>
							<RuiTableCell>{item.origin}</RuiTableCell>
							<RuiTableCell>
								<RuiMenuButton data-item-id={item.id}>
									<RuiMenuButtonTrigger
										variant="ghost"
										size="sm"
										square
										aria-label={`Actions for ${item.name}`}
									/>
									<RuiMenuButtonContent>
										<RuiMenuButtonItem value="edit">Edit</RuiMenuButtonItem>
										<RuiMenuButtonItem value="delete">Delete</RuiMenuButtonItem>
									</RuiMenuButtonContent>
								</RuiMenuButton>
							</RuiTableCell>
						</RuiTableRow>
					))
				)}
			</RuiTableBody>
		</RuiTable>
	);
}

function dataTablePaginationMeta(filters: ResolvedTableFilters, total: number) {
	const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));
	const pageStart = total === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
	const pageEnd = Math.min(filters.page * filters.pageSize, total);
	return { pageCount, pageEnd, pageStart };
}

type DataTableFooterProps = {
	filters: ResolvedTableFilters;
	refreshing: boolean;
	total: number;
};

function DataTableFooter({ filters, refreshing, total }: DataTableFooterProps) {
	const { pageCount, pageEnd, pageStart } = dataTablePaginationMeta(filters, total);
	return (
		<div class="data-table__footer">
			<span class="data-table__summary" aria-live="polite">
				{pageStart}–{pageEnd} of {total} cheeses
			</span>
			<div class="data-table__pagination">
				<RuiPagination
					label="Cheese inventory pages"
					page={filters.page}
					pageCount={pageCount}
					disabled={refreshing}
				/>
			</div>
			<RuiSelect
				data-page-size
				class="data-table__page-size"
				label="Cheeses per page"
				value={String(filters.pageSize)}
				options={pageSizeOptions}
			/>
		</div>
	);
}

type DataTableEditorDialogProps = {
	defaults: ItemDraft;
	mode: 'create' | 'edit';
	onSubmit: (values: Record<string, unknown>) => void;
	saving: boolean;
};

function DataTableEditorDialog({ defaults, mode, onSubmit, saving }: DataTableEditorDialogProps) {
	const editing = mode === 'edit';
	return (
		<RuiDialog id="data-table-item-editor" open>
			<RuiDialogClose />
			<RuiDialogTitle>{editing ? 'Edit cheese' : 'Add cheese'}</RuiDialogTitle>
			<RuiDialogBody>
				<RuiForm defaultValues={defaults} onSubmit={onSubmit}>
					<RuiField name="name" rules={{ required: 'Name is required' }}>
						<RuiLabel>Name</RuiLabel>
						<RuiInput placeholder="Cheese name" />
					</RuiField>
					<RuiField name="milk">
						<RuiLabel>Milk</RuiLabel>
						<RuiSelect value={defaults.milk} options={milkOptions} />
					</RuiField>
					<RuiField name="texture">
						<RuiLabel>Texture</RuiLabel>
						<RuiSelect value={defaults.texture} options={textureOptions} />
					</RuiField>
					<RuiField name="origin">
						<RuiLabel>Origin</RuiLabel>
						<RuiSelect value={defaults.origin} options={originOptions} />
					</RuiField>
					<div class="rui-dialog__actions">
						<RuiButton type="button" variant="ghost" data-dialog-dismiss disabled={saving}>
							Cancel
						</RuiButton>
						<RuiButton type="submit" disabled={saving}>
							{editing ? 'Save changes' : 'Create cheese'}
						</RuiButton>
					</div>
				</RuiForm>
			</RuiDialogBody>
		</RuiDialog>
	);
}

type DataTableDeleteDialogProps = {
	itemName?: string;
	saving: boolean;
};

function DataTableDeleteDialog({ itemName, saving }: DataTableDeleteDialogProps) {
	return (
		<RuiDialog id="data-table-item-delete" open alert>
			<RuiDialogClose />
			<RuiDialogTitle>Delete cheese?</RuiDialogTitle>
			<RuiDialogBody>Delete {itemName ?? 'this cheese'} permanently? This action cannot be undone.</RuiDialogBody>
			<div class="rui-dialog__actions">
				<RuiButton type="button" variant="ghost" data-dialog-dismiss disabled={saving}>
					Cancel
				</RuiButton>
				<RuiButton type="button" variant="destructive" data-confirm-delete disabled={saving}>
					Delete
				</RuiButton>
			</div>
		</RuiDialog>
	);
}

/**
 * Story-only controller that consumes the mocked item API through the public table primitives.
 *
 * @remarks Copy with `data-table.css`, `data.ts`, and (for Storybook) `handlers.msw.ts`.
 */
@customElement('rui-data-table')
export class RuiDataTable extends RadiantElement {
	/** Controlled query state. Replace this object from a parent to refresh the inventory. */
	@prop({ type: Object, defaultValue: defaultTableFilters }) filters: TableFilters;

	@state private items: Item[] = [];
	@state private loading = true;
	@state private refreshing = false;
	@state private saving = false;
	@state private error = '';
	@state private dialog: DialogMode = null;
	@state private activeItemId = '';
	@state private hasLoaded = false;
	@state private total = 0;
	private latestRequest = 0;
	private searchRevision = 0;
	private readonly toolbarActionsView = createSubscribableJsxValue({
		getValue: () => this.renderToolbarActions(),
		subscribe: (notify) => this.registerUpdateCallback('filters', () => notify(this.renderToolbarActions())),
	});
	private readonly resultsView = createSubscribableJsxValue({
		getValue: () => this.renderResults(),
		subscribe: (notify) =>
			this.subscribeHostKeys(['items', 'loading', 'refreshing', 'error', 'total', 'filters'], () =>
				notify(this.renderResults()),
			),
	});
	private readonly dialogsView = createSubscribableJsxValue({
		getValue: () => this.renderDialogs(),
		subscribe: (notify) =>
			this.subscribeHostKeys(['dialog', 'saving', 'activeItemId', 'items'], () => notify(this.renderDialogs())),
	});

	@event({ name: 'rui-filters-change', bubbles: true, composed: true })
	filtersChangeEvent: EventEmitter<ResolvedTableFilters>;

	override connectedCallback(): void {
		super.connectedCallback();
		if (!isServer) {
			void this.loadItems();
		}
	}

	override disconnectedCallback(): void {
		this.searchRevision += 1;
		super.disconnectedCallback();
	}

	@onUpdated(['filters'])
	onFiltersUpdated(): void {
		this.syncSearchInput();
		if (!isServer && this.isConnected) {
			void this.loadItems();
		}
	}

	private subscribeHostKeys(keys: string[], notify: () => void): () => void {
		const stops = keys.map((key) => this.registerUpdateCallback(key, notify));
		return () => {
			for (const stop of stops) stop();
		};
	}

	private syncSearchInput(): void {
		const input = this.querySelector<HTMLInputElement>('[data-table-search]');
		if (!input || document.activeElement === input) {
			return;
		}
		input.value = this.currentFilters().search;
	}

	private currentFilters(): ResolvedTableFilters {
		return resolveFilters(this.filters);
	}

	private updateFilters(next: Partial<TableFilters>, resetPage = false): void {
		this.filters = {
			...this.currentFilters(),
			...next,
			page: resetPage ? 1 : (next.page ?? this.currentFilters().page),
		};
		this.filtersChangeEvent.emit(this.currentFilters());
	}

	private selectedItem(): Item | undefined {
		return this.items.find((item) => item.id === this.activeItemId);
	}

	private requestUrl(): string {
		const filters = this.currentFilters();
		const params = new URLSearchParams({
			sort: filters.sortColumn,
			direction: filters.sortDirection,
			page: String(filters.page),
			pageSize: String(filters.pageSize),
		});
		if (filters.search) params.set('search', filters.search);
		if (filters.milk) params.set('milk', filters.milk);
		if (filters.texture) params.set('texture', filters.texture);
		if (filters.origin) params.set('origin', filters.origin);
		return `/api/items?${params}`;
	}

	private async loadItems(): Promise<void> {
		const requestId = ++this.latestRequest;
		if (!this.hasLoaded) {
			this.loading = true;
		} else {
			this.refreshing = true;
		}
		this.error = '';
		try {
			const response = await fetch(this.requestUrl());
			if (!response.ok) {
				throw new Error('Unable to load items');
			}
			const payload = (await response.json()) as {
				items?: unknown;
				page?: unknown;
				pageSize?: unknown;
				total?: unknown;
			};
			if (requestId !== this.latestRequest) {
				return;
			}
			this.items = Array.isArray(payload.items) ? (payload.items as Item[]) : [];
			this.total = typeof payload.total === 'number' ? payload.total : 0;
			this.hasLoaded = true;
			const page = typeof payload.page === 'number' ? payload.page : this.currentFilters().page;
			const pageSize = typeof payload.pageSize === 'number' ? payload.pageSize : this.currentFilters().pageSize;
			if (page !== this.currentFilters().page || pageSize !== this.currentFilters().pageSize) {
				this.updateFilters({ page, pageSize });
			}
		} catch {
			if (requestId !== this.latestRequest) {
				return;
			}
			this.error = 'Unable to load cheeses. Try again.';
			this.items = [];
		} finally {
			if (requestId === this.latestRequest) {
				this.loading = false;
				this.refreshing = false;
			}
		}
	}

	private setDialog(dialog: DialogMode, itemId = ''): void {
		this.dialog = dialog;
		this.activeItemId = itemId;
	}

	private clearFilters(): void {
		this.updateFilters({ search: '', milk: '', texture: '', origin: '' }, true);
	}

	private async saveItem(values: Record<string, unknown>): Promise<void> {
		const draft = normalizeDraft(values);
		if (!draft) {
			return;
		}
		this.saving = true;
		this.error = '';
		try {
			const editing = this.dialog === 'edit';
			const response = await fetch(editing ? `/api/items/${this.activeItemId}` : '/api/items', {
				method: editing ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(draft),
			});
			if (!response.ok) {
				throw new Error('Unable to save item');
			}
			this.setDialog(null);
			await this.loadItems();
		} catch {
			this.error = 'Unable to save cheese. Try again.';
		} finally {
			this.saving = false;
		}
	}

	private async deleteItem(): Promise<void> {
		if (!this.activeItemId) {
			return;
		}
		this.saving = true;
		this.error = '';
		try {
			const response = await fetch(`/api/items/${this.activeItemId}`, { method: 'DELETE' });
			if (!response.ok) {
				throw new Error('Unable to delete item');
			}
			this.setDialog(null);
			await this.loadItems();
		} catch {
			this.error = 'Unable to delete cheese. Try again.';
		} finally {
			this.saving = false;
		}
	}

	@onEvent({ selector: '[data-table-search]', type: 'input' })
	onSearchInput(event: Event): void {
		this.updateSearch((event.target as HTMLInputElement).value, this.searchRevision);
	}

	@debounce(150)
	private updateSearch(search: string, revision: number): void {
		if (revision === this.searchRevision) this.updateFilters({ search }, true);
	}

	private setFilter(filter: 'milk' | 'texture' | 'origin', value: string, checked: boolean): void {
		this.updateFilters({ [filter]: checked ? value : '' } as Partial<TableFilters>, true);
	}

	@onEvent({ selector: '[data-clear-filters]', type: 'click' })
	onClearFilters(): void {
		this.searchRevision += 1;
		const input = this.querySelector<HTMLInputElement>('[data-table-search]');
		if (input) {
			input.value = '';
		}
		this.clearFilters();
	}

	@onEvent({ selector: 'rui-checkbox[data-filter]', type: 'rui-change' })
	onFilterChange(event: CustomEvent<RuiCheckboxChangeDetail>): void {
		const checkbox = event.target as HTMLElement;
		const filter = checkbox.getAttribute('data-filter');
		const value = checkbox.getAttribute('data-filter-value') ?? '';
		if (filter === 'milk' || filter === 'texture' || filter === 'origin') {
			this.setFilter(filter, value, event.detail.checked);
		}
	}

	@onEvent({ selector: '[data-create-item]', type: 'click' })
	onCreateItem(): void {
		this.setDialog('create');
	}

	@onEvent({ selector: 'rui-menu-button[data-item-id]', type: 'rui-change' })
	onRowMenuChange(event: CustomEvent<{ value: string }>): void {
		const menu = event.target as HTMLElement;
		const itemId = menu.getAttribute('data-item-id') ?? '';
		if (event.detail.value === 'edit') this.setDialog('edit', itemId);
		if (event.detail.value === 'delete') this.setDialog('delete', itemId);
	}

	@onEvent({ selector: 'rui-table', type: 'rui-sort-change' })
	onTableSortChange(event: CustomEvent<{ column: string; direction: 'ascending' | 'descending' }>): void {
		this.updateFilters(
			{
				sortColumn: event.detail.column as SortColumn,
				sortDirection: event.detail.direction,
			},
			true,
		);
	}

	@onEvent({ selector: 'rui-pagination', type: 'rui-page-change' })
	onPageChange(event: CustomEvent<{ page: number }>): void {
		this.updateFilters({ page: event.detail.page });
	}

	@onEvent({ selector: 'rui-select[data-page-size]', type: 'rui-change' })
	onPageSizeChange(event: CustomEvent<{ value: string }>): void {
		const pageSize = Number(event.detail.value);
		if (pageSize === 5 || pageSize === 10 || pageSize === 20) {
			this.updateFilters({ pageSize }, true);
		}
	}

	@onEvent({ selector: '[data-dialog-dismiss]', type: 'click' })
	onDialogDismiss(): void {
		this.setDialog(null);
	}

	@onEvent({ selector: '[data-confirm-delete]', type: 'click' })
	onConfirmDelete(): void {
		void this.deleteItem();
	}

	@onEvent({ selector: 'rui-dialog', type: 'rui-close' })
	onDialogClose(): void {
		this.setDialog(null);
	}

	private renderToolbarActions(): JsxRenderable {
		const filters = this.currentFilters();
		const appliedFilters = [filters.milk, filters.texture, filters.origin].filter(Boolean).length;
		return (
			<DataTableToolbarActions
				filters={filters}
				hasActiveFilters={Boolean(filters.search || appliedFilters)}
				appliedFilters={appliedFilters}
			/>
		);
	}

	private renderResults(): JsxRenderable {
		const filters = this.currentFilters();
		return (
			<>
				{this.error ? <DataTableError message={this.error} /> : null}
				<DataTableInventory
					filters={filters}
					items={this.items}
					loading={this.loading}
					refreshing={this.refreshing}
				/>
				<DataTableFooter filters={filters} refreshing={this.refreshing} total={this.total} />
			</>
		);
	}

	private renderDialogs(): JsxRenderable {
		const editorDefaults: ItemDraft = this.selectedItem() ?? {
			name: '',
			milk: 'Cow',
			texture: 'Semi-hard',
			origin: 'France',
		};

		return (
			<>
				{this.dialog === 'create' || this.dialog === 'edit' ? (
					<DataTableEditorDialog
						mode={this.dialog}
						defaults={editorDefaults}
						saving={this.saving}
						onSubmit={(values) => void this.saveItem(values)}
					/>
				) : null}
				{this.dialog === 'delete' ? (
					<DataTableDeleteDialog itemName={this.selectedItem()?.name} saving={this.saving} />
				) : null}
			</>
		);
	}

	override render() {
		return (
			<div class="data-table">
				<div class="data-table__panel">
					<div class="data-table__toolbar">
						<DataTableSearchField />
						{this.toolbarActionsView}
					</div>
					{this.resultsView}
				</div>
				{this.dialogsView}
			</div>
		);
	}
}

declare module '@ecopages/jsx/jsx-runtime' {
	interface JsxCustomIntrinsicElements {
		'rui-data-table': JsxCustomElementAttributes<RuiDataTable, { filters?: TableFilters }>;
	}
}
