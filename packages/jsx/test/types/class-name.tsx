// @ts-expect-error className is not an HTML attribute; use class
export const nativeClassName = <div className="card" />;
// @ts-expect-error className is rejected on custom elements too; use class
export const customClassName = <demo-card className="card" />;
export const nativeClass = <div class="card" />;
export const customClass = <demo-card class="card" />;
