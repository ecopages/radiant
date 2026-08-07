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
import { RuiCalendar } from '@ecopages/radiant-ui/calendar';
import { RuiCarousel, RuiCarouselNext, RuiCarouselPrev, RuiCarouselSlide } from '@ecopages/radiant-ui/carousel';
import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import { RuiChipList, RuiChipListItem } from '@ecopages/radiant-ui/chip-list';
import { RuiCombobox } from '@ecopages/radiant-ui/combobox';
import { RuiDateField } from '@ecopages/radiant-ui/date-field';
import { RuiDateRangePicker } from '@ecopages/radiant-ui/date-range-picker';
import { RuiDialog, RuiDialogActions, RuiDialogClose } from '@ecopages/radiant-ui/dialog';
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
import { RuiPopover, RuiPopoverContent } from '@ecopages/radiant-ui/popover';
import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { RuiSelect } from '@ecopages/radiant-ui/select';
import { RuiSlider } from '@ecopages/radiant-ui/slider';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from '@ecopages/radiant-ui/tabs';
import { RuiTagGroup } from '@ecopages/radiant-ui/tag-group';
import { RuiTextarea } from '@ecopages/radiant-ui/textarea';
import { RuiToaster, toast } from '@ecopages/radiant-ui/toast';
import { RuiToc } from '@ecopages/radiant-ui/toc';
import { RuiToolbar } from '@ecopages/radiant-ui/toolbar';
import { RuiTooltip } from '@ecopages/radiant-ui/tooltip';
import { RuiTree } from '@ecopages/radiant-ui/tree';
import { RuiTreegrid } from '@ecopages/radiant-ui/treegrid';
import { RuiWindowSplitter } from '@ecopages/radiant-ui/window-splitter';

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

	if (layout === 'banner') {
		const title = str(props, 'title', 'Documentation preview');
		const description = str(
			props,
			'description',
			children ?? 'This release includes breaking changes to the routing API.',
		);
		return (
			<RuiAlert variant={variant} layout={layout}>
				<RuiAlertTitle>{title}</RuiAlertTitle>
				<RuiAlertDescription>
					<p>{description}</p>
				</RuiAlertDescription>
			</RuiAlert>
		);
	}

	const message = str(props, 'message', children ?? 'Your session will expire in 5 minutes.');
	return (
		<RuiAlert variant={variant} layout={layout}>
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
					<RuiBreadcrumbLink href="/components/button">Components</RuiBreadcrumbLink>
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

function renderCalendarPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiCalendar
			selectionMode={str(props, 'selectionMode', 'single')}
			disabled={bool(props, 'disabled')}
			visibleMonths={num(props, 'visibleMonths', 1)}
			pageBehavior={str(props, 'pageBehavior', 'visible')}
			value="2026-08-07"
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
		<RuiField name="startDate">
			<RuiLabel>Start date</RuiLabel>
			<RuiDateField
				value={str(props, 'value', '2026-08-07')}
				dateStyle={str(props, 'dateStyle', 'medium')}
				disabled={bool(props, 'disabled')}
				readOnly={bool(props, 'readOnly')}
				masked={bool(props, 'masked', true)}
			/>
		</RuiField>
	);
}

function renderDateRangePickerPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiField name="tripDates">
			<RuiLabel>Trip dates</RuiLabel>
			<RuiDateRangePicker
				value={str(props, 'value', '2026-08-01/2026-08-14')}
				dateStyle={str(props, 'dateStyle', 'medium')}
				visibleMonths={num(props, 'visibleMonths', 2)}
				disabled={bool(props, 'disabled')}
				readOnly={bool(props, 'readOnly')}
			/>
		</RuiField>
	);
}

function renderDialogPreview(props: Record<string, unknown>): JsxRenderable {
	const label = str(props, 'label', 'Edit profile');

	return (
		<RuiDialog
			id="playground-dialog"
			open={bool(props, 'open')}
			alert={bool(props, 'alert')}
			label={label}
			title={label}
			actions={
				<>
					<RuiDialogClose>Cancel</RuiDialogClose>
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
			<RuiField name="name">
				<RuiLabel>Full name</RuiLabel>
				<RuiInput />
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
			{children ?? 'Radiant UI'}
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
	return (
		<RuiMenuButton
			open={bool(props, 'open')}
			placement={str(props, 'placement', 'bottom-start')}
			trigger={children ?? 'Actions'}
			items={[
				{ value: 'edit', label: 'Edit' },
				{ value: 'delete', label: 'Delete' },
			]}
		/>
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
		<RuiNavigationMenu label={str(props, 'label', 'Main')}>
			<RuiNavigationMenuTrigger value="products">Products</RuiNavigationMenuTrigger>
			<RuiNavigationMenuPanel value="products">
				<RuiNavigationMenuLink href="/widgets">Widgets</RuiNavigationMenuLink>
			</RuiNavigationMenuPanel>
			<RuiNavigationMenuLink href="/pricing">Pricing</RuiNavigationMenuLink>
		</RuiNavigationMenu>
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
	return (
		<RuiPopover
			open={bool(props, 'open')}
			placement={str(props, 'placement', 'bottom-start')}
			portal={bool(props, 'portal', true)}
			matchAnchorWidth={bool(props, 'matchAnchorWidth')}
			offset={num(props, 'offset', 8)}
			trigger={<RuiButton variant="outline">Filter</RuiButton>}
		>
			<RuiPopoverContent>
				<p>Show items from the last 7 days.</p>
			</RuiPopoverContent>
		</RuiPopover>
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
	return (
		<p class="playground-fallback">
			Sidebar requires layout context (<code>RuiSidebarProvider</code>). Collapsible:{' '}
			{str(props, 'collapsible', 'off')}, side: {str(props, 'side', 'left')}, default open:{' '}
			{String(bool(props, 'defaultOpen', true))}.
		</p>
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
		<>
			<RuiButton variant="outline" on:click={() => toast.success('Changes saved')}>
				Show toast
			</RuiButton>
			<RuiToaster
				position={str(props, 'position', 'bottom-end')}
				duration={num(props, 'duration', 4000)}
				visibleToasts={num(props, 'visibleToasts', 3)}
				closeButton={bool(props, 'closeButton')}
				expand={bool(props, 'expand')}
			/>
		</>
	);
}

function renderTocPreview(props: Record<string, unknown>): JsxRenderable {
	const target = str(props, 'target', '.docs-content');

	return (
		<>
			<RuiToc
				target={target}
				headingSelector={str(props, 'headingSelector', 'h2,h3')}
				label={str(props, 'label', 'On this page')}
				scrollOffset={num(props, 'scrollOffset', 120)}
			/>
			<p class="playground-fallback">
				TOC scans <code>{target}</code> for headings on the page.
			</p>
		</>
	);
}

function renderToolbarPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiToolbar label={str(props, 'label', 'Text formatting')} exclusiveToggles={bool(props, 'exclusiveToggles')}>
			<RuiButton toggle pressed variant="ghost">
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
			value={str(props, 'value', 'app')}
			label={str(props, 'label', 'Project files')}
			nodes={[
				{
					id: 'src',
					label: 'src',
					expanded: true,
					children: [{ id: 'app', label: 'app.ts' }],
				},
			]}
		/>
	);
}

function renderTreegridPreview(props: Record<string, unknown>): JsxRenderable {
	return (
		<RuiTreegrid
			value={str(props, 'value', 'intro')}
			label={str(props, 'label', 'Repository')}
			columns={['Name', 'Type']}
			rows={[
				{
					id: 'docs',
					cells: ['docs', 'folder'],
					expanded: true,
					children: [{ id: 'intro', cells: ['introduction.md', 'file'] }],
				},
			]}
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
