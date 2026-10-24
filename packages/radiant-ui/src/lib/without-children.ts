/**
 * Props of a view whose custom element renders its own content.
 *
 * @remarks `children?: never` is what makes TypeScript reject body children. `Omit<Props, 'children'>` does not,
 * because the props type has a `data-*` index signature and a tag with no other attributes then accepts any
 * JSX body. Import it by relative path: the `@/` alias is not rewritten in the published declarations.
 */
export type WithoutChildren<Props> = Props & { children?: never };
