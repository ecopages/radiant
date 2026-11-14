/**
 * Stateful behaviors a component composes, each attached to a host element, plus the DOM utilities
 * they are built from.
 *
 * @remarks
 * Pure logic with no DOM is in `@ecopages/radiant-ui/helpers`. The module is named `controllers.ts`,
 * not `index.ts`, so the package `sideEffects` entry for built `index.js` files does not match the built
 * entry and a bundler can drop what a consumer does not import. Controllers that read catalog components
 * (`ListboxHostController`) are internal and not exported.
 */
export { bindController, type Controller, type ControllerHost } from './controllers/controller';
export {
	CalendarPopoverController,
	createCalendarPopoverController,
	focusCalendarPickerDay,
	type CalendarPopoverControllerConfig,
} from './controllers/calendar-popover-controller';
export {
	clearCollectionActive,
	getVisibleCollectionOptions,
	setCollectionActive,
} from './controllers/collection-navigation';
export {
	DismissController,
	createDismissController,
	type DismissControllerConfig,
	type DismissReason,
} from './controllers/dismiss-controller';
export {
	EventListenerController,
	createEventListenerController,
	type EventListenerControllerConfig,
	type EventOf,
} from './controllers/event-listener-controller';
export {
	applyFloatingPosition,
	attachFloating,
	computeFloatingCoords,
	computeFloatingPosition,
	type AttachFloatingOptions,
	type FloatingCoords,
	type FloatingPositionResult,
	type FloatingSize,
	type FloatingViewport,
} from './controllers/floating-position';
export {
	FocusTrapController,
	createFocusTrapController,
	type FocusTrapControllerConfig,
} from './controllers/focus-trap-controller';
export {
	ListboxPopoverController,
	createListboxPopoverController,
	type ListboxActivation,
	type ListboxKeydownConfig,
	type ListboxPopoverControllerConfig,
} from './controllers/listbox-popover-controller';
export {
	MenuTreeController,
	createMenuTreeController,
	type MenuTreeControllerConfig,
} from './controllers/menu-tree-controller';
export {
	MutationController,
	createMutationController,
	type MutationControllerConfig,
} from './controllers/mutation-controller';
export type { RuiPlacement } from './controllers/placement';
export {
	PointerDragController,
	createPointerDragController,
	type PointerDragControllerConfig,
	type PointerDragEnd,
	type PointerDragEndReason,
	type PointerDragInfo,
} from './controllers/pointer-drag-controller';
export {
	PopoverController,
	createPopoverController,
	type PopoverControllerConfig,
} from './controllers/popover-controller';
export { PortalController, createPortalController, type PortalControllerConfig } from './controllers/portal-controller';
export { ResizeController, createResizeController, type ResizeControllerConfig } from './controllers/resize-controller';
export { RovingController, createRovingController, type RovingControllerConfig } from './controllers/roving-controller';
export { ScrollLockController, createScrollLockController } from './controllers/scroll-lock-controller';
export {
	SORTABLE_ACTIVE_ATTRIBUTE,
	SORTABLE_DROP_ATTRIBUTE,
	SORTABLE_OFFSET_PROPERTIES,
	SORTABLE_OVER_ATTRIBUTE,
	SORTABLE_STATE_ATTRIBUTE,
	SortableController,
	createSortableController,
	type SortableChange,
	type SortableControllerConfig,
	type SortableSource,
	type SortableState,
} from './controllers/sortable-controller';
export { SortableGroup, type SortableMember } from './controllers/sortable-group';
export {
	DEFAULT_SORTABLE_MESSAGES,
	type SortableMessageContext,
	type SortableMessages,
} from './controllers/sortable-messages';
export { SwipeController, createSwipeController, type SwipeControllerConfig } from './controllers/swipe-controller';
export type { SortableAxis, SortableRect } from './controllers/sortable-order';
export type { SwipeAxis, SwipeDirection, SwipeOptions } from './controllers/swipe-direction';
export {
	findFirstFocusableCandidate,
	getFocusableElements,
	queryFocusableCandidates,
	queryRovingTabindexItems,
} from './lib/focusable-elements';
export {
	applyRovingTabindex,
	focusRovingItem,
	navigateRovingTabindex,
	type RovingNavResult,
	type RovingOrientation,
} from './lib/roving-tabindex';
