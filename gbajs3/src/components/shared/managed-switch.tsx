import { Switch, FormControlLabel, type SwitchProps } from '@mui/material';

type ManagedSwitchProps = {
  label: string;
  watcher?: boolean;
} & SwitchProps;

// Shared managed switch component with label
// Params: takes in label, switch props,
//         and a watcher indicating the current value
export const ManagedSwitch = ({
  id,
  label,
  watcher,
  ref,
  ...rest
}: ManagedSwitchProps) => (
  <FormControlLabel
    data-testid="managed-switch:label"
    id={id}
    control={<Switch ref={ref} checked={!!watcher} {...rest} />}
    label={label}
    style={{ margin: 0 }}
  />
);
