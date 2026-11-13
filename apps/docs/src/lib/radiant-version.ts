import packageJson from '../../../../packages/radiant/package.json';

/**
 * @remarks
 * Read from the workspace package so the header chip follows each release.
 */
export const radiantVersion: string = packageJson.version;
