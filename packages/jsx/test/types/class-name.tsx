// @ts-expect-error className is not an HTML attribute; use class
export const nativeClassName = <div className="card" />;
// @ts-expect-error SVG tags reject className too
export const svgClassName = <svg className="icon" />;
export const nativeClass = <div class="card" />;
export const customClassName = <demo-card className="card" />;
