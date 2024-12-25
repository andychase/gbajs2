import {
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  type IconButtonProps,
  type TextFieldProps
} from '@mui/material';
import { forwardRef, type MouseEvent, useRef } from 'react';
import { BiSolidUpArrow, BiSolidDownArrow } from 'react-icons/bi';

type NumberInputProps = TextFieldProps & {
  max?: number | string;
  min?: number | string;
  step?: number;
};

const commonAdornmentButtonProps: IconButtonProps = {
  edge: 'end',
  sx: { p: '1px' }
};

const preventDefault = (event: MouseEvent<HTMLButtonElement>) =>
  event.preventDefault();

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    { disabled = false, size, slotProps, step = 1, min, max, sx, ...rest },
    externalRef
  ) => {
    const internalRef = useRef<HTMLInputElement | null>(null);

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
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(internalRef.current, value);
      internalRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const increment = (e: MouseEvent<HTMLButtonElement>) => {
      preventDefault(e);

      if (!internalRef.current) return;

      const currentValue = internalRef.current.valueAsNumber;
      const newValue = clamp(currentValue + step);

      dispatchEvent(newValue);
    };

    const decrement = (e: MouseEvent<HTMLButtonElement>) => {
      preventDefault(e);

      if (!internalRef.current) return;

      const currentValue = internalRef.current.valueAsNumber;
      const newValue = clamp(currentValue - step);

      dispatchEvent(newValue);
    };

    const enforceRange = () => {
      if (internalRef.current) {
        const currentValue = Number(internalRef.current.valueAsNumber || 0);
        internalRef.current.value = clamp(currentValue);
        internalRef.current.dispatchEvent(
          new Event('input', { bubbles: true })
        );
      }
    };

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
            onInput: () => {
              if (internalRef.current) {
                const value = internalRef?.current.valueAsNumber;
                if (isNaN(value) || value === undefined)
                  internalRef.current.value = min ? min.toString() : '0';
                else internalRef.current.value = value.toString();
              }
            },
            onBlur: enforceRange,
            ...slotProps?.input
          },
          htmlInput: {
            min: min,
            max: max,
            step: step,
            ...slotProps?.htmlInput
          }
        }}
        sx={{
          'input::-webkit-outer-spin-button, input::-webkit-inner-spin-button':
            {
              WebkitAppearance: 'none',
              margin: 0
            },
          ...sx
        }}
        {...rest}
      />
    );
  }
);
