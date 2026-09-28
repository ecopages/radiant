/** Viewports at or below this width use mobile layout rules (pairs with Tailwind `sm` / 640px). */
export const MOBILE_LAYOUT_MAX_WIDTH_PX = 639;

/** Sidebar switches to drawer mode at this viewport width and below. */
export const SIDEBAR_MOBILE_BREAKPOINT_PX = 768;

/** Max width for sidebar mobile drawer media queries (`max-width` in CSS). */
export const SIDEBAR_MOBILE_MAX_WIDTH_PX = SIDEBAR_MOBILE_BREAKPOINT_PX - 1;
