import type { JsxRenderable } from '@ecopages/jsx';
import { RuiAlert, RuiAlertDescription, RuiAlertIcon, RuiAlertTitle } from '@ecopages/radiant-ui/alert';
import {
	RuiAutocomplete,
	RuiAutocompleteCollection,
	RuiAutocompleteEmpty,
	RuiAutocompleteInput,
} from '@ecopages/radiant-ui/autocomplete';
import { RuiAvatar } from '@ecopages/radiant-ui/avatar';
import {
	RuiBreadcrumb,
	RuiBreadcrumbItem,
	RuiBreadcrumbLink,
	RuiBreadcrumbList,
	RuiBreadcrumbPage,
	RuiBreadcrumbSeparator,
} from '@ecopages/radiant-ui/breadcrumb';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiButtonGroup } from '@ecopages/radiant-ui/button-group';
import { RuiCycleToggle, RuiCycleToggleItem } from '@ecopages/radiant-ui/cycle-toggle';
import { RuiCalendar } from '@ecopages/radiant-ui/calendar';
import { RuiCarousel, RuiCarouselNext, RuiCarouselPrev, RuiCarouselSlide } from '@ecopages/radiant-ui/carousel';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import { RuiChipList, RuiChipListItem } from '@ecopages/radiant-ui/chip-list';
import { RuiCombobox } from '@ecopages/radiant-ui/combobox';
import { RuiDateField } from '@ecopages/radiant-ui/date-field';
import { RuiDateRangePicker } from '@ecopages/radiant-ui/date-range-picker';
import { RuiDialog } from '@ecopages/radiant-ui/dialog';
import { RuiDisclosure } from '@ecopages/radiant-ui/disclosure';
import {
	RuiFeed,
	RuiFeedArticle,
	RuiFeedArticleContent,
	RuiFeedArticleHeader,
	RuiFeedByline,
} from '@ecopages/radiant-ui/feed';
import { RuiField, RuiFieldDescription, RuiFieldError } from '@ecopages/radiant-ui/field';
import { RuiForm } from '@ecopages/radiant-ui/form';
import { RuiGrid } from '@ecopages/radiant-ui/grid';
import { RuiHeading, RuiHeadingDescription, RuiHeadingEyebrow, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';
import { RuiHeadline } from '@ecopages/radiant-ui/headline';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiListbox } from '@ecopages/radiant-ui/listbox';
import { RuiMenuButton } from '@ecopages/radiant-ui/menu-button';
import { RuiMenubar } from '@ecopages/radiant-ui/menubar';
import { RuiMeter } from '@ecopages/radiant-ui/meter';
import {
	RuiNavigationMenu,
	RuiNavigationMenuLink,
	RuiNavigationMenuPanel,
	RuiNavigationMenuTrigger,
} from '@ecopages/radiant-ui/navigation-menu';
import {
	RuiNumberField,
	RuiNumberFieldDecrementButton,
	RuiNumberFieldGroup,
	RuiNumberFieldIncrementButton,
	RuiNumberFieldInput,
	RuiNumberFieldSteppers,
} from '@ecopages/radiant-ui/number-field';
import { RuiPopover, RuiPopoverContent, RuiPopoverTrigger } from '@ecopages/radiant-ui/popover';
import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import {
	RuiSidebar,
	RuiSidebarContent,
	RuiSidebarGroup,
	RuiSidebarGroupHeader,
	RuiSidebarInset,
	RuiSidebarMenu,
	RuiSidebarMenuButton,
	RuiSidebarMenuItem,
	RuiSidebarProvider,
	RuiSidebarTrigger,
} from '@ecopages/radiant-ui/sidebar';
import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RuiTagGroup } from '@ecopages/radiant-ui/tag-group';
import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { RuiToaster } from '@ecopages/radiant-ui/toast';
import { RuiToc } from '@ecopages/radiant-ui/toc';
import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';
import { RuiTooltip } from '@ecopages/radiant-ui/tooltip';
import { RuiTree } from '@ecopages/radiant-ui/tree';
import { RuiTreegrid } from '@ecopages/radiant-ui/treegrid';
import { RuiWindowSplitter } from '@ecopages/radiant-ui/window-splitter';

const TREE_DEMO_NODES = [
	{
		id: 'src',
		label: 'src',
		expanded: true,
		children: [
			{
				id: 'components',
				label: 'components',
				expanded: true,
				children: [
					{ id: 'button', label: 'button.tsx' },
					{ id: 'dialog', label: 'dialog.tsx' },
					{ id: 'sidebar', label: 'sidebar.tsx' },
				],
			},
			{
				id: 'lib',
				label: 'lib',
				expanded: true,
				children: [
					{ id: 'utils', label: 'utils.ts' },
					{ id: 'hooks', label: 'hooks.ts' },
				],
			},
			{ id: 'index', label: 'index.ts' },
		],
	},
	{ id: 'public', label: 'public', children: [{ id: 'favicon', label: 'favicon.ico' }] },
	{ id: 'package', label: 'package.json' },
	{ id: 'readme', label: 'README.md' },
];

const NAVIGATION_MENU_PRODUCT_LINKS = [
	{ href: '/analytics', label: 'Analytics' },
	{ href: '/automation', label: 'Automation' },
	{ href: '/integrations', label: 'Integrations' },
	{ href: '/support', label: 'Support plans' },
	{ href: '/training', label: 'Training' },
	{ href: '/security', label: 'Security center' },
];

const NAVIGATION_MENU_INDUSTRY_LINKS = [
	{ href: '/healthcare', label: 'Healthcare' },
	{ href: '/finance', label: 'Finance' },
	{ href: '/retail', label: 'Retail' },
];

const NAVIGATION_MENU_TEAM_LINKS = [
	{ href: '/design', label: 'Design' },
	{ href: '/engineering', label: 'Engineering' },
	{ href: '/operations', label: 'Operations' },
];

const TREEGRID_DEMO_ROWS = [
	{
		id: 'src',
		cells: ['src', 'folder'],
		expanded: true,
		children: [
			{
				id: 'components',
				cells: ['components', 'folder'],
				expanded: true,
				children: [
					{ id: 'button', cells: ['button.tsx', '4.2 KB'] },
					{ id: 'dialog', cells: ['dialog.tsx', '6.8 KB'] },
					{ id: 'sidebar', cells: ['sidebar.tsx', '12.1 KB'] },
				],
			},
			{
				id: 'lib',
				cells: ['lib', 'folder'],
				expanded: true,
				children: [
					{ id: 'utils', cells: ['utils.ts', '2.4 KB'] },
					{ id: 'hooks', cells: ['hooks.ts', '3.1 KB'] },
				],
			},
			{ id: 'index', cells: ['index.ts', '1.1 KB'] },
		],
	},
	{
		id: 'public',
		cells: ['public', 'folder'],
		children: [{ id: 'favicon', cells: ['favicon.ico', '15 KB'] }],
	},
	{ id: 'package', cells: ['package.json', '1.8 KB'] },
	{ id: 'readme', cells: ['README.md', '3.4 KB'] },
];

const ANIMAL_OPTIONS = [
	{ value: 'cat', label: 'Cat' },
	{ value: 'dog', label: 'Dog' },
];

const AUTOCOMPLETE_DEMO_OPTIONS = [
	{ value: 'news', label: 'News' },
	{ value: 'travel', label: 'Travel' },
	{ value: 'shopping', label: 'Shopping' },
	{ value: 'business', label: 'Business' },
	{ value: 'entertainment', label: 'Entertainment' },
	{ value: 'food', label: 'Food' },
	{ value: 'technology', label: 'Technology' },
	{ value: 'health', label: 'Health' },
	{ value: 'science', label: 'Science' },
];

function str(props: Record<string, unknown>, key: string, fallback = ''): string {
	const value = props[key];
	return value == null ? fallback : String(value);
}

function bool(props: Record<string, unknown>, key: string, fallback = false): boolean {
	const value = props[key];
	if (typeof value === 'boolean') return value;
	if (value === 'true') return true;
	if (value === 'false') return false;
	return fallback;
}

function num(props: Record<string, unknown>, key: string, fallback: number): number {
	const value = props[key];
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && value !== '') {
		const parsed = Number(value);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return fallback;
}

function selectProp<T extends string>(props: Record<string, unknown>, key: string, fallback: T): T {
	return str(props, key, fallback) as T;
}

function parseCsv(value: string): string[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

function playgroundFallback(message: string): JsxRenderable {
	return <p class="playground-fallback">{message}</p>;
}

function renderAlertPreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	const variant = selectProp(props, 'variant', 'info');
	const layout = str(props, 'layout', 'inline');
	const dismissible = bool(props, 'dismissible', false);

	if (layout === 'banner') {
		const title = str(props, 'title', 'Documentation preview');
		const description = str(
			props,
			'description',
			children ?? 'This release includes breaking changes to the routing API.',
		);
		return (
			<RuiAlert variant={variant} layout={layout} dismissible={dismissible}>
				<RuiAlertTitle>{title}</RuiAlertTitle>
				<RuiAlertDescription>
					<p>{description}</p>
				</RuiAlertDescription>
			</RuiAlert>
		);
	}

	const message = str(props, 'message', children ?? 'Your session will expire in 5 minutes.');
	return (
		<RuiAlert variant={variant} layout={layout} dismissible={dismissible}>
			<RuiAlertIcon variant={variant} />
			<span>{message}</span>
		</RuiAlert>
	);
}

function renderAutocompletePreview(props: Record<string, unknown>): JsxRenderable {
	const sensitivity = str(props, 'sensitivity', 'base');
	return (
		<div class="flex w-64 max-w-full flex-col gap-2">
			<RuiAutocomplete sensitivity={sensitivity}>
				<RuiAutocompleteInput aria-label="Search tags" placeholder="Search tags" />
				<RuiAutocompleteCollection>
					<RuiListbox label="Tags" options={AUTOCOMPLETE_DEMO_OPTIONS} />
					<RuiAutocompleteEmpty>No matches found.</RuiAutocompleteEmpty>
				</RuiAutocompleteCollection>
			</RuiAutocomplete>
		</div>
	);
}

function renderAvatarPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiAvatar
			size={selectProp(props, 'size', 'md')}
			fallback={str(props, 'fallback', 'JC')}
			alt={str(props, 'alt', 'Jane Cooper')}
		/>
	);
}

function renderBreadcrumbPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiBreadcrumb label={str(props, 'label', 'Breadcrumb')} separator={str(props, 'separator', '/')}>
			<RuiBreadcrumbList>
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/">Home</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbLink href="/docs/button">Components</RuiBreadcrumbLink>
				</RuiBreadcrumbItem>
				<RuiBreadcrumbSeparator />
				<RuiBreadcrumbItem>
					<RuiBreadcrumbPage>Breadcrumb</RuiBreadcrumbPage>
				</RuiBreadcrumbItem>
			</RuiBreadcrumbList>
		</RuiBreadcrumb>
	);
}

function renderButtonPreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	return (
		<RuiButton
			variant={selectProp(props, 'variant', 'filled')}
			size={selectProp(props, 'size', 'md')}
			disabled={bool(props, 'disabled')}
			toggle={bool(props, 'toggle')}
			pressed={bool(props, 'pressed')}
		>
			{children ?? 'Continue'}
		</RuiButton>
	);
}

function renderButtonGroupPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiButtonGroup orientation={selectProp(props, 'orientation', 'horizontal')}>
			<RuiButton variant="outline">Cancel</RuiButton>
			<RuiButton variant="filled">Save</RuiButton>
		</RuiButtonGroup>
	);
}

function renderThemeCycleTogglePreview(props: Record<string, unknown>): JsxRenderable {
	const value = str(props, 'value', 'system') || 'system';
	const label = str(props, 'label', 'Theme');

	return (
		<RuiCycleToggle
			value={value}
			variant={selectProp(props, 'variant', 'ghost')}
			size={selectProp(props, 'size', 'sm')}
			disabled={bool(props, 'disabled')}
			label={label}
		>
			<RuiCycleToggleItem id="system" selected={value === 'system'}>
				System
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="light" selected={value === 'light'}>
				Light
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="dark" selected={value === 'dark'}>
				Dark
			</RuiCycleToggleItem>
		</RuiCycleToggle>
	);
}

function renderSortOrderCycleTogglePreview(props: Record<string, unknown>): JsxRenderable {
	const value = str(props, 'value', 'newest') || 'newest';

	return (
		<RuiCycleToggle
			value={value}
			variant={selectProp(props, 'variant', 'outline')}
			size={selectProp(props, 'size', 'md')}
			disabled={bool(props, 'disabled')}
			label={str(props, 'label', 'Sort order')}
		>
			<RuiCycleToggleItem id="newest" selected={value === 'newest'}>
				Newest
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="oldest" selected={value === 'oldest'}>
				Oldest
			</RuiCycleToggleItem>
			<RuiCycleToggleItem id="popular" selected={value === 'popular'}>
				Popular
			</RuiCycleToggleItem>
		</RuiCycleToggle>
	);
}

function renderCalendarPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiCalendar
			selectionMode={str(props, 'selectionMode', 'single')}
			disabled={bool(props, 'disabled')}
			visibleMonths={num(props, 'visibleMonths', 1)}
			pageBehavior={str(props, 'pageBehavior', 'visible')}
			value={str(props, 'value', '2026-08-07')}
		/>
	);
}

function renderCarouselPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiCarousel
			index={num(props, 'index', 0)}
			transition={str(props, 'transition', 'slide')}
			autoplay={bool(props, 'autoplay')}
			interval={num(props, 'interval', 4000)}
			showIndicators={bool(props, 'showIndicators')}
			loop={bool(props, 'loop', true)}
		>
			<RuiCarouselSlide id="slide-1">First panel</RuiCarouselSlide>
			<RuiCarouselSlide id="slide-2">Second panel</RuiCarouselSlide>
			<RuiCarouselSlide id="slide-3">Third panel</RuiCarouselSlide>
			<RuiCarouselPrev />
			<RuiCarouselNext />
		</RuiCarousel>
	);
}

function renderCheckboxPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiCheckbox
			checked={bool(props, 'checked')}
			indeterminate={bool(props, 'indeterminate')}
			disabled={bool(props, 'disabled')}
			value={str(props, 'value', 'on')}
		>
			Email me product updates
		</RuiCheckbox>
	);
}

function renderChipPreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	return <RuiChip variant={selectProp(props, 'variant', 'default')}>{children ?? 'Design system'}</RuiChip>;
}

function renderChipListPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiChipList aria-label={str(props, 'aria-label', 'Topics')}>
			<RuiChipListItem>
				<RuiChip>React</RuiChip>
			</RuiChipListItem>
			<RuiChipListItem>
				<RuiChip>TypeScript</RuiChip>
			</RuiChipListItem>
		</RuiChipList>
	);
}

function renderComboboxPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiCombobox
			value={str(props, 'value')}
			placeholder={str(props, 'placeholder', 'Choose an animal')}
			disabled={bool(props, 'disabled')}
			openOnFocus={bool(props, 'openOnFocus')}
			options={ANIMAL_OPTIONS}
		/>
	);
}

function renderDateFieldPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiDateField
			label="Start date"
			value={str(props, 'value', '2026-08-07')}
			dateStyle={str(props, 'dateStyle', 'medium')}
			disabled={bool(props, 'disabled')}
			readOnly={bool(props, 'readOnly')}
			masked={bool(props, 'masked', true)}
		/>
	);
}

function renderDateRangePickerPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<>
			<RuiLabel>Trip dates</RuiLabel>
			<RuiDateRangePicker
				value={str(props, 'value', '2026-08-01/2026-08-14')}
				dateStyle={str(props, 'dateStyle', 'medium')}
				visibleMonths={num(props, 'visibleMonths', 2)}
				disabled={bool(props, 'disabled')}
				readOnly={bool(props, 'readOnly')}
			/>
		</>
	);
}

function renderDialogPreview(props: Record<string, unknown>): JsxRenderable {
	const label = str(props, 'label', 'Edit profile');

	return (
		<RuiDialog
			id={str(props, 'id', 'playground-dialog')}
			open={bool(props, 'open')}
			alert={bool(props, 'alert')}
			label={label}
			title={label}
			actions={
				<>
					<RuiButton variant="ghost" type="button" data-dialog-close>
						Cancel
					</RuiButton>
					<RuiButton type="button">Save</RuiButton>
				</>
			}
		>
			Update your display name and email.
		</RuiDialog>
	);
}

function renderDisclosurePreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	return (
		<RuiDisclosure
			open={bool(props, 'open')}
			animated={bool(props, 'animated')}
			trigger={children ?? 'Shipping details'}
		>
			Delivered in 3–5 business days.
		</RuiDisclosure>
	);
}

function renderFeedPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiFeed label={str(props, 'label', 'Activity')} aria-busy={bool(props, 'aria-busy') ? 'true' : undefined}>
			<RuiFeedArticle>
				<RuiFeedArticleHeader>
					<RuiFeedByline>Jane Cooper · 2 hours ago</RuiFeedByline>
				</RuiFeedArticleHeader>
				<RuiFeedArticleContent>Shipped order #4821.</RuiFeedArticleContent>
			</RuiFeedArticle>
		</RuiFeed>
	);
}

function renderFieldPreview(props: Record<string, unknown>): JsxRenderable {
	const error = str(props, 'error');

	return (
		<RuiField
			name={str(props, 'name', 'email')}
			disabled={bool(props, 'disabled')}
			invalid={bool(props, 'invalid')}
			error={error || undefined}
		>
			<RuiLabel>Email</RuiLabel>
			<RuiInput type="email" placeholder="you@example.com" />
			<RuiFieldDescription>We will never share your email.</RuiFieldDescription>
			<RuiFieldError />
		</RuiField>
	);
}

function renderFormPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiForm mode={str(props, 'mode', 'onSubmit')}>
			<RuiField name="email" rules={{ required: 'Email is required' }}>
				<RuiLabel>Email</RuiLabel>
				<RuiInput type="email" placeholder="you@example.com" />
				<RuiFieldError />
			</RuiField>
			<RuiField name="bio" rules={{ minLength: { value: 10, message: 'At least 10 characters' } }}>
				<RuiLabel>Bio</RuiLabel>
				<RuiTextarea placeholder="Tell us about yourself" />
				<RuiFieldError />
			</RuiField>
			<RuiButton type="submit">Create account</RuiButton>
		</RuiForm>
	);
}

function renderGridPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiGrid
			label={str(props, 'label', 'Team members')}
			rows={[
				['Name', 'Role'],
				['Jane Cooper', 'Engineer'],
				['Alex Rivera', 'Designer'],
			]}
		/>
	);
}

function renderHeadingPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiHeading size={selectProp(props, 'size', 'lg')} align={selectProp(props, 'align', 'start')}>
			<RuiHeadingEyebrow>Components</RuiHeadingEyebrow>
			<RuiHeadingTitle>Button</RuiHeadingTitle>
			<RuiHeadingDescription>Trigger actions with clear, accessible labels.</RuiHeadingDescription>
		</RuiHeading>
	);
}

function renderHeadlinePreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	return (
		<RuiHeadline as={selectProp(props, 'as', 'h1')} size={selectProp(props, 'size', 'xl')}>
			{children ?? 'radiant UI'}
		</RuiHeadline>
	);
}

function renderInputPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiField name="preview">
			<RuiLabel>Email</RuiLabel>
			<RuiInput
				type={str(props, 'type', 'text')}
				size={selectProp(props, 'size', 'md')}
				disabled={bool(props, 'disabled')}
				placeholder={str(props, 'placeholder', 'you@example.com')}
			/>
		</RuiField>
	);
}

function renderLabelPreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	const htmlFor = str(props, 'htmlFor');

	return <RuiLabel htmlFor={htmlFor || undefined}>{children ?? 'Username'}</RuiLabel>;
}

function renderListboxPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiListbox
			value={str(props, 'value', 'cat')}
			disabled={bool(props, 'disabled')}
			embedded={bool(props, 'embedded')}
			label={str(props, 'label', 'Animal')}
			options={ANIMAL_OPTIONS}
		/>
	);
}

function renderMenuButtonPreview(props: Record<string, unknown>, children?: string): JsxRenderable {
	const forceOpen = bool(props, 'open');

	return (
		<div class="playground-menu-button-demo">
			<RuiMenuButton
				{...(forceOpen ? { open: true } : {})}
				placement={selectProp(props, 'placement', 'bottom-start')}
				trigger={children ?? 'Actions'}
				items={[
					{ value: 'edit', label: 'Edit' },
					{ value: 'duplicate', label: 'Duplicate' },
					{ value: 'delete', label: 'Delete' },
				]}
			/>
		</div>
	);
}

function renderMenubarPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiMenubar
			label={str(props, 'label', 'Application menu')}
			items={[
				{
					id: 'file',
					label: 'File',
					items: [
						{ id: 'new', label: 'New' },
						{ id: 'open', label: 'Open' },
					],
				},
				{
					id: 'edit',
					label: 'Edit',
					items: [{ id: 'undo', label: 'Undo' }],
				},
			]}
		/>
	);
}

function renderMeterPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiMeter
			value={num(props, 'value', 72)}
			min={num(props, 'min', 0)}
			max={num(props, 'max', 100)}
			label={str(props, 'label', 'Storage used')}
		/>
	);
}

function renderNavigationMenuPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<div class="playground-navigation-menu">
			<RuiNavigationMenu label={str(props, 'label', 'Main')}>
				<RuiNavigationMenuTrigger value="products">Products</RuiNavigationMenuTrigger>
				<RuiNavigationMenuTrigger value="solutions">Solutions</RuiNavigationMenuTrigger>
				<RuiNavigationMenuLink href="/pricing">Pricing</RuiNavigationMenuLink>

				<RuiNavigationMenuPanel value="products">
					<nav aria-label="Products">
						<ul class="rui-navigation-menu__link-list">
							{NAVIGATION_MENU_PRODUCT_LINKS.map((link) => (
								<li>
									<a href={link.href}>{link.label}</a>
								</li>
							))}
						</ul>
					</nav>
				</RuiNavigationMenuPanel>

				<RuiNavigationMenuPanel value="solutions" class="rui-navigation-menu__megamenu">
					<div class="rui-navigation-menu__link-columns">
						<nav aria-label="By industry">
							<p class="rui-navigation-menu__link-group-label">By industry</p>
							<ul class="rui-navigation-menu__link-list">
								{NAVIGATION_MENU_INDUSTRY_LINKS.map((link) => (
									<li>
										<a href={link.href}>{link.label}</a>
									</li>
								))}
							</ul>
						</nav>
						<nav aria-label="By team">
							<p class="rui-navigation-menu__link-group-label">By team</p>
							<ul class="rui-navigation-menu__link-list">
								{NAVIGATION_MENU_TEAM_LINKS.map((link) => (
									<li>
										<a href={link.href}>{link.label}</a>
									</li>
								))}
							</ul>
						</nav>
					</div>
					<RuiDisclosure trigger="Why these solutions?">
						<p class="rui-navigation-menu__disclosure-copy">
							Decorative supporting copy — starter kits, migration guides, and customer stories.
						</p>
					</RuiDisclosure>
				</RuiNavigationMenuPanel>
			</RuiNavigationMenu>
		</div>
	);
}

function renderNumberFieldPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiNumberField
			value={num(props, 'value', 3)}
			minValue={num(props, 'minValue', 0)}
			maxValue={num(props, 'maxValue', 10)}
			step={num(props, 'step', 1)}
			disabled={bool(props, 'disabled')}
			wheelDisabled={bool(props, 'wheelDisabled')}
		>
			<RuiNumberFieldGroup>
				<RuiNumberFieldInput />
				<RuiNumberFieldSteppers>
					<RuiNumberFieldDecrementButton />
					<RuiNumberFieldIncrementButton />
				</RuiNumberFieldSteppers>
			</RuiNumberFieldGroup>
		</RuiNumberField>
	);
}

function renderPopoverPreview(props: Record<string, unknown>): JsxRenderable {
	const forceOpen = bool(props, 'open');

	return (
		<RuiPopoverTrigger
			{...(forceOpen ? { open: true } : {})}
			trigger={<RuiButton variant="outline">Filter</RuiButton>}
		>
			<RuiPopover
				placement={str(props, 'placement', 'bottom-start')}
				portal={bool(props, 'portal', true)}
				matchAnchorWidth={bool(props, 'matchAnchorWidth')}
				offset={num(props, 'offset', 8)}
			>
				<RuiPopoverContent>
					<p>Show items from the last 7 days.</p>
				</RuiPopoverContent>
			</RuiPopover>
		</RuiPopoverTrigger>
	);
}

function renderRadioGroupPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiRadioGroup
			value={str(props, 'value', 'pro')}
			disabled={bool(props, 'disabled')}
			label={str(props, 'label', 'Plan')}
			options={[
				{ value: 'free', label: 'Free' },
				{ value: 'pro', label: 'Pro' },
			]}
		/>
	);
}

function renderSelectPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<>
			<RuiLabel>Animal</RuiLabel>
			<RuiSelect
				value={str(props, 'value', 'cat')}
				placeholder={str(props, 'placeholder', 'Select an animal')}
				disabled={bool(props, 'disabled')}
				selectionMode={str(props, 'selectionMode', 'single')}
				options={ANIMAL_OPTIONS}
			/>
		</>
	);
}

function renderSidebarPreview(props: Record<string, unknown>): JsxRenderable {
	const sidebarId = 'playground-sidebar';

	return (
		<div class="playground-sidebar-demo">
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar
						id={sidebarId}
						collapsible={selectProp(props, 'collapsible', 'off')}
						side={selectProp(props, 'side', 'left')}
						defaultOpen={bool(props, 'defaultOpen', true)}
						resizable={bool(props, 'resizable')}
						defaultWidth={num(props, 'defaultWidth', 256)}
						mobileBreakpoint={768}
						label="Workspace"
					>
						<RuiSidebarContent aria-label="Primary navigation">
							<RuiSidebarGroup aria-label="Workspace">
								<RuiSidebarGroupHeader label="Workspace" />
								<RuiSidebarMenu aria-label="Workspace links">
									<RuiSidebarMenuItem>
										<RuiSidebarMenuButton as="a" href="#" isActive>
											Dashboard
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
									<RuiSidebarMenuItem>
										<RuiSidebarMenuButton as="a" href="#">
											Projects
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
									<RuiSidebarMenuItem>
										<RuiSidebarMenuButton as="a" href="#">
											Team
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
								</RuiSidebarMenu>
							</RuiSidebarGroup>
						</RuiSidebarContent>
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<div class="playground-sidebar-demo__main">
						<RuiSidebarTrigger controls={sidebarId} triggerLabel="Toggle sidebar" />
						<p class="playground-sidebar-demo__copy">Main content area beside the sidebar.</p>
					</div>
				</RuiSidebarInset>
			</RuiSidebarProvider>
		</div>
	);
}

function renderSliderPreview(props: Record<string, unknown>): JsxRenderable {
	const variant = str(props, 'variant', 'single');
	const value = num(props, 'value', 50);

	if (variant === 'range') {
		return (
			<RuiField name="preview">
				<RuiLabel>Volume range</RuiLabel>
				<RuiSlider
					variant="range"
					min={num(props, 'min', 0)}
					max={num(props, 'max', 100)}
					step={num(props, 'step', 1)}
					disabled={bool(props, 'disabled')}
					values={[Math.max(value - 15, num(props, 'min', 0)), Math.min(value + 15, num(props, 'max', 100))]}
				/>
			</RuiField>
		);
	}

	return (
		<RuiField name="preview">
			<RuiLabel>Volume</RuiLabel>
			<RuiSlider
				variant="single"
				value={value}
				min={num(props, 'min', 0)}
				max={num(props, 'max', 100)}
				step={num(props, 'step', 1)}
				disabled={bool(props, 'disabled')}
			/>
		</RuiField>
	);
}

function renderSwitchPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiField name="preview">
			<RuiSwitch checked={bool(props, 'checked')} disabled={bool(props, 'disabled')} name="notifications">
				Email notifications
			</RuiSwitch>
		</RuiField>
	);
}

function renderTabsPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiTabs
			variant={str(props, 'variant', 'boxed')}
			value={str(props, 'value', 'account')}
			automatic={bool(props, 'automatic', true)}
			label={str(props, 'label', 'Settings')}
		>
			<RuiTabList>
				<RuiTab id="account">Account</RuiTab>
				<RuiTab id="security">Security</RuiTab>
			</RuiTabList>
			<RuiTabPanels>
				<RuiTabPanel id="account">Account settings</RuiTabPanel>
				<RuiTabPanel id="security">Security settings</RuiTabPanel>
			</RuiTabPanels>
		</RuiTabs>
	);
}

function renderTagGroupPreview(props: Record<string, unknown>): JsxRenderable {
	const tagValues = parseCsv(str(props, 'value', 'react,typescript'));

	return (
		<RuiTagGroup
			value={str(props, 'value', 'react,typescript')}
			selectionMode={str(props, 'selectionMode', 'multiple')}
			disabled={bool(props, 'disabled')}
			embedded={bool(props, 'embedded')}
			label="Skills"
			tags={tagValues.map((tag) => ({ value: tag, label: tag }))}
		/>
	);
}

function renderTextareaPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiField name="preview">
			<RuiLabel>Bio</RuiLabel>
			<RuiTextarea
				size={selectProp(props, 'size', 'md')}
				rows={num(props, 'rows', 3)}
				disabled={bool(props, 'disabled')}
				placeholder={str(props, 'placeholder', 'Tell us about yourself')}
			/>
		</RuiField>
	);
}

function renderToastPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiToaster
			position={selectProp(props, 'position', 'bottom-end')}
			duration={num(props, 'duration', 4000)}
			visibleToasts={num(props, 'visibleToasts', 3)}
			closeButton={bool(props, 'closeButton', true)}
			expand={bool(props, 'expand')}
		/>
	);
}

function renderTocPreview(props: Record<string, unknown>): JsxRenderable {
	const target = '.playground-toc-demo__article';

	return (
		<div class="playground-toc-demo">
			<RuiToc
				target={target}
				headingSelector={str(props, 'headingSelector', 'h2,h3')}
				label={str(props, 'label', 'On this page')}
				scrollOffset={num(props, 'scrollOffset', 80)}
			/>
			<article class="playground-toc-demo__article">
				<h2 id="overview">Overview</h2>
				<p>First section content with enough copy to show how the table of contents tracks headings.</p>
				<h2 id="configuration">Configuration</h2>
				<p>Second section content describing how to wire the component into your layout.</p>
				<h3 id="tokens">Design tokens</h3>
				<p>Nested section content for third-level headings in the outline.</p>
				<h2 id="next-steps">Next steps</h2>
				<p>Final section content with links and follow-up guidance.</p>
			</article>
		</div>
	);
}

function renderToolbarPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiToolbar label={str(props, 'label', 'Text formatting')} exclusiveToggles={bool(props, 'exclusiveToggles')}>
			<RuiButton toggle variant="ghost">
				Bold
			</RuiButton>
			<RuiButton toggle variant="ghost">
				Italic
			</RuiButton>
		</RuiToolbar>
	);
}

function renderTooltipPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiTooltip
			content={str(props, 'content', 'Download report')}
			placement={str(props, 'placement', 'top')}
			delay={num(props, 'delay', 200)}
		>
			<RuiButton variant="ghost" aria-label="Download">
				↓
			</RuiButton>
		</RuiTooltip>
	);
}

function renderTreePreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiTree
			value={str(props, 'value', 'button')}
			label={str(props, 'label', 'Project files')}
			nodes={TREE_DEMO_NODES}
		/>
	);
}

function renderTreegridPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiTreegrid
			value={str(props, 'value', 'button')}
			label={str(props, 'label', 'Repository')}
			columns={['Name', 'Size']}
			rows={TREEGRID_DEMO_ROWS}
		/>
	);
}

function renderWindowSplitterPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiWindowSplitter
			value={num(props, 'value', 50)}
			orientation={str(props, 'orientation', 'horizontal')}
			label={str(props, 'label', 'Split view')}
			primary={<div>Editor</div>}
			secondary={<div>Preview</div>}
		/>
	);
}

const PREVIEW_RENDERERS: Record<string, (props: Record<string, unknown>, children?: string) => JsxRenderable> = {
	alert: renderAlertPreview,
	autocomplete: renderAutocompletePreview,
	avatar: renderAvatarPreview,
	breadcrumb: renderBreadcrumbPreview,
	button: renderButtonPreview,
	'button-group': renderButtonGroupPreview,
	'cycle-toggle-theme': renderThemeCycleTogglePreview,
	'cycle-toggle-sort-order': renderSortOrderCycleTogglePreview,
	calendar: renderCalendarPreview,
	carousel: renderCarouselPreview,
	checkbox: renderCheckboxPreview,
	chip: renderChipPreview,
	'chip-list': renderChipListPreview,
	combobox: renderComboboxPreview,
	'date-field': renderDateFieldPreview,
	'date-range-picker': renderDateRangePickerPreview,
	dialog: renderDialogPreview,
	disclosure: renderDisclosurePreview,
	feed: renderFeedPreview,
	field: renderFieldPreview,
	form: renderFormPreview,
	grid: renderGridPreview,
	heading: renderHeadingPreview,
	headline: renderHeadlinePreview,
	input: renderInputPreview,
	label: renderLabelPreview,
	listbox: renderListboxPreview,
	'menu-button': renderMenuButtonPreview,
	menubar: renderMenubarPreview,
	meter: renderMeterPreview,
	'navigation-menu': renderNavigationMenuPreview,
	'number-field': renderNumberFieldPreview,
	popover: renderPopoverPreview,
	'radio-group': renderRadioGroupPreview,
	select: renderSelectPreview,
	sidebar: renderSidebarPreview,
	slider: renderSliderPreview,
	switch: renderSwitchPreview,
	tabs: renderTabsPreview,
	'tag-group': renderTagGroupPreview,
	textarea: renderTextareaPreview,
	toast: renderToastPreview,
	toc: renderTocPreview,
	toolbar: renderToolbarPreview,
	tooltip: renderTooltipPreview,
	tree: renderTreePreview,
	treegrid: renderTreegridPreview,
	'window-splitter': renderWindowSplitterPreview,
};

export function renderPlaygroundPreview(
	slug: string,
	props: Record<string, unknown>,
	children?: string,
): JsxRenderable {
	const render = PREVIEW_RENDERERS[slug];
	if (render) {
		return render(props, children);
	}

	return playgroundFallback(`No preview available for "${slug}".`);
}
