import {
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  type SxProps,
  type Theme,
  type IconButtonProps,
  type TextFieldProps
} from '@mui/material';
import { useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { BiSolidDownArrow, BiSolidUpArrow } from 'react-icons/bi';

import type { SlotComponentProps } from '@mui/utils/types';

type NumberInputProps = TextFieldProps & {
  max?: number | string;
  min?: number | string;
  step?: number;
};

const commonAdornmentButtonProps: IconButtonProps = {
  edge: 'end',
  sx: { p: '1px' }
};

const preventDefault = (event: MouseEvent<HTMLButtonElement>) => {
  event.preventDefault();
};

const replaceLeadingZeros = (value: string) => value.replace(/^0+/, '');

function resolveSlotComponentProps<
  TSlotComponent extends React.ElementType,
  TOverrides,
  TOwnerState
>(
  value:
    | SlotComponentProps<TSlotComponent, TOverrides, TOwnerState>
    | undefined,
  ownerState: TOwnerState
): Partial<TOverrides> {
  if (!value) return {};
  return typeof value === 'function' ? value(ownerState) : value;
}

type InferSystemStyleObject<S, T = object> = S extends readonly unknown[]
  ? never
  : S extends (theme: T) => unknown
  ? never
  : S;

type SystemStyleObject<T extends object> = InferSystemStyleObject<
  SxProps<T>,
  T
>;

const isSxArray = (
  sx?: SxProps<Theme>
): sx is readonly (
  | boolean
  | SystemStyleObject<Theme>
  | ((theme: Theme) => SystemStyleObject<Theme>)
)[] => Array.isArray(sx);

export const NumberInput = ({
  disabled = false,
  size,
  slotProps,
  step = 1,
  min,
  max,
  sx,
  ref: externalRef,
  ...rest
}: NumberInputProps) => {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const isIntermediateValue = useRef(false);

  const callbackRef = (element: HTMLInputElement | null) => {
    internalRef.current = element;
    if (typeof externalRef === 'function') externalRef(element);
    else if (externalRef) externalRef.current = element;
  };

  const clamp = (value: number): string => {
    if (min !== undefined && value < Number(min)) return min.toString();
    if (max !== undefined && value > Number(max)) return max.toString();
    return value.toString();
  };

  const dispatchEvent = (value: string) => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set?.call(internalRef.current, value);
    internalRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const increment = (e: MouseEvent<HTMLButtonElement>) => {
    preventDefault(e);
    if (!internalRef.current) return;

    const currentValue = internalRef.current.valueAsNumber;
    dispatchEvent(clamp(currentValue + step));
  };

  const decrement = (e: MouseEvent<HTMLButtonElement>) => {
    preventDefault(e);
    if (!internalRef.current) return;

    const currentValue = internalRef.current.valueAsNumber;
    dispatchEvent(clamp(currentValue - step));
  };

  const enforceRange = () => {
    if (!internalRef.current) return;

    const currentValue = internalRef.current.valueAsNumber || 0;
    internalRef.current.value = clamp(currentValue);
    internalRef.current.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const sanitizeInput = () => {
    if (!internalRef.current || isIntermediateValue.current) return;

    const value = internalRef.current.valueAsNumber;
    internalRef.current.value = Number.isNaN(value) ? '0' : clamp(value);
  };

  const handleIntermediateValue = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== '-') {
      isIntermediateValue.current = false;
      return;
    }

    if (min !== undefined && Number(min) >= 0) {
      e.preventDefault();
      return;
    }

    if (internalRef.current) {
      internalRef.current.value = replaceLeadingZeros(
        internalRef.current.value
      );
      isIntermediateValue.current = true;
    }
  };

  const ownerState = { disabled, size, ...rest };
  const inputSlotProps = resolveSlotComponentProps(
    slotProps?.input,
    ownerState
  );
  const htmlInputSlotProps = resolveSlotComponentProps(
    slotProps?.htmlInput,
    ownerState
  );

  return (
    <TextField
      inputRef={callbackRef}
      type="number"
      disabled={disabled}
      size={size}
      slotProps={{
        ...slotProps,
        input: {
          sx: { paddingRight: '8px' },
          endAdornment: (
            <InputAdornment
              position="end"
              sx={{
                position: 'absolute',
                paddingRight: '8px',
                right: '0px',
                height: '100%',
                maxHeight: '100%'
              }}
            >
              <Stack spacing={0.1}>
                <IconButton
                  aria-label="Increment"
                  disabled={disabled}
                  onClick={increment}
                  {...commonAdornmentButtonProps}
                >
                  <BiSolidUpArrow fontSize={16} />
                </IconButton>
                <IconButton
                  aria-label="Decrement"
                  disabled={disabled}
                  onClick={decrement}
                  {...commonAdornmentButtonProps}
                >
                  <BiSolidDownArrow fontSize={16} />
                </IconButton>
              </Stack>
            </InputAdornment>
          ),
          onInput: sanitizeInput,
          onKeyDown: handleIntermediateValue,
          onBlur: enforceRange,
          ...inputSlotProps
        },
        htmlInput: {
          min,
          max,
          step,
          ...htmlInputSlotProps
        }
      }}
      sx={[
        {
          'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button':
            {
              WebkitAppearance: 'none',
              margin: 0
            }
        },
        ...(isSxArray(sx) ? sx : sx ? [sx] : [])
      ]}
      {...rest}
    />
  );
};
