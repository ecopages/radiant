import packageJson from '../../../../packages/radiant-ui/package.json';

/**
 * @remarks
 * Read from the workspace package so the header chip follows each release.
 */
export const radiantUiVersion: string = packageJson.version;
