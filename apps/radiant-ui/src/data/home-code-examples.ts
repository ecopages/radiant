export const previewExampleCode = `import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiChip } from '@ecopages/radiant-ui/chip';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';

export const Preview = () => (
  <>
    <RuiButton>Save</RuiButton>
    <RuiButton variant="outline">Cancel</RuiButton>
    <RuiChip variant="primary">light DOM</RuiChip>
    <RuiSwitch checked>Notifications</RuiSwitch>
    <RuiLabel htmlFor="name">Name</RuiLabel>
    <RuiInput id="name" placeholder="Andrea" />
  </>
);`;
