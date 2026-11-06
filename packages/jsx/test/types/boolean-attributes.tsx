const flag = true as boolean;

export const nativePresence = <input bool:webkitdirectory={flag} />;
export const customPresence = <demo-panel bool:expanded={flag} />;
export const removed = <demo-panel bool:expanded={null} />;
// @ts-expect-error bool: takes a boolean, not a string
export const stringValue = <demo-panel bool:expanded="false" />;
