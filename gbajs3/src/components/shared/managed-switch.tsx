import { Switch, FormControlLabel } from '@mui/material';

import type { UseFormRegisterReturn } from 'react-hook-form';

type ManagedSwitchBoxProps = {
  label: string;
  registerProps: UseFormRegisterReturn;
  id?: string;
  watcher?: boolean;
};

// Shared managed switch component with label
// Params: takes in label, react hook form register props,
//         and a watcher indicating the current value
export const ManagedSwitch = ({
  id,
  label,
  registerProps,
  watcher
}: ManagedSwitchBoxProps) => {
  return (
    <FormControlLabel
      data-testid="managed-switch:label"
      id={id}
      control={<Switch {...registerProps} checked={!!watcher} />}
      label={label}
      style={{ margin: 0 }}
    />
  );
};
